import "server-only";

import { randomUUID } from "node:crypto";
import { createOpenAI } from "@ai-sdk/openai";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiUsage, plans, userEntitlements } from "@/lib/db/schema";
import { getServerEnv } from "@/lib/env/server";

export type ChatMode = "auto" | "premium" | "free" | "byok";

export async function ensureDefaultPlans() {
  await getDb().insert(plans).values([
    { id: "silver", name: "Silver", dailyPremiumMessages: 5, features: { byok: true, freeFallback: true } },
    { id: "pro", name: "Pro", dailyPremiumMessages: 20, features: { byok: true, freeFallback: true } },
  ]).onConflictDoNothing();
}

export async function getPlanStatus(userId: string) {
  await ensureDefaultPlans();
  const entitlement = await getDb().select({
    id: plans.id, name: plans.name, limit: plans.dailyPremiumMessages,
  }).from(userEntitlements).innerJoin(plans, eq(userEntitlements.planId, plans.id))
    .where(and(eq(userEntitlements.userId, userId))).limit(1);
  const plan = entitlement[0] ?? (await getDb().select({
    id: plans.id, name: plans.name, limit: plans.dailyPremiumMessages,
  }).from(plans).where(eq(plans.id, "silver")).limit(1))[0];
  if (!plan) throw new Error("Default plan is not configured.");
  const usageDate = new Date().toISOString().slice(0, 10);
  const used = await getDb().select({ value: count() }).from(aiUsage).where(and(
    eq(aiUsage.userId, userId), eq(aiUsage.usageDate, usageDate), eq(aiUsage.mode, "premium"),
    inArray(aiUsage.status, ["reserved", "completed"]),
  ));
  return { ...plan, used: used[0]?.value ?? 0, remaining: Math.max(plan.limit - (used[0]?.value ?? 0), 0), usageDate };
}

export async function resolveAgentModel(
  userId: string,
  requestedMode: ChatMode,
  byok?: { provider: "openai" | "openrouter"; apiKey: string; model?: string },
) {
  const env = getServerEnv();
  const plan = await getPlanStatus(userId);
  let mode: ChatMode = requestedMode;
  if (mode === "auto") mode = plan.remaining > 0 ? "premium" : "free";

  if (mode === "premium") {
    if (plan.remaining <= 0) throw new Error("Premium daily allowance is exhausted.");
    if (!env.OPENAI_API_KEY) throw new Error("Platform OpenAI is not configured.");
    return { mode, provider: "openai", modelName: env.OPENAI_MODEL, model: createOpenAI({ apiKey: env.OPENAI_API_KEY }).chat(env.OPENAI_MODEL), plan };
  }

  if (mode === "free") {
    if (!env.OPENROUTER_API_KEY) throw new Error("Platform OpenRouter is not configured.");
    return { mode, provider: "openrouter", modelName: env.OPENROUTER_FREE_MODEL, model: createOpenAI({
      apiKey: env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1", name: "openrouter",
      headers: { "HTTP-Referer": env.APP_URL, "X-Title": "Autobot" },
    }).chat(env.OPENROUTER_FREE_MODEL), plan };
  }

  if (!byok) throw new Error("Add an OpenAI or OpenRouter key in Settings.");
  const provider = byok.provider;
  const modelName = byok.model || (provider === "openrouter" ? env.OPENROUTER_FREE_MODEL : env.OPENAI_MODEL);
  return {
    mode, provider, modelName, plan,
    model: createOpenAI(provider === "openrouter" ? {
      apiKey: byok.apiKey, baseURL: "https://openrouter.ai/api/v1", name: "openrouter",
      headers: { "HTTP-Referer": env.APP_URL, "X-Title": "Autobot" },
    } : { apiKey: byok.apiKey }).chat(modelName),
  };
}

export async function reserveUsage(input: {
  userId: string; conversationId: string; mode: ChatMode; provider: string; model: string;
}) {
  const id = randomUUID();
  const usageDate = new Date().toISOString().slice(0, 10);
  await getDb().transaction(async (tx) => {
    if (input.mode === "premium") {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${input.userId}:${usageDate}`}))`);
      const plan = await tx.select({ limit: plans.dailyPremiumMessages }).from(plans)
        .leftJoin(userEntitlements, and(eq(userEntitlements.planId, plans.id), eq(userEntitlements.userId, input.userId)))
        .where(eq(plans.id, "silver")).limit(1);
      const entitled = await tx.select({ limit: plans.dailyPremiumMessages }).from(userEntitlements)
        .innerJoin(plans, eq(userEntitlements.planId, plans.id))
        .where(eq(userEntitlements.userId, input.userId)).limit(1);
      const limit = entitled[0]?.limit ?? plan[0]?.limit ?? 5;
      const used = await tx.select({ value: count() }).from(aiUsage).where(and(
        eq(aiUsage.userId, input.userId), eq(aiUsage.usageDate, usageDate), eq(aiUsage.mode, "premium"),
        inArray(aiUsage.status, ["reserved", "completed"]),
      ));
      if ((used[0]?.value ?? 0) >= limit) throw new Error("Premium daily allowance is exhausted.");
    }
    await tx.insert(aiUsage).values({ id, usageDate, status: "reserved", ...input });
  });
  return id;
}

export async function finalizeUsage(id: string, status: "completed" | "failed", usage?: { inputTokens?: number; outputTokens?: number }) {
  await getDb().update(aiUsage).set({
    status,
    promptTokens: usage?.inputTokens,
    completionTokens: usage?.outputTokens,
  }).where(eq(aiUsage.id, id));
}
