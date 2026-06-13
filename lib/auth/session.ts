import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { UnauthorizedError } from "@/lib/errors/app-error";

import { auth } from "./server";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function requireApiSession() {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError();
  }

  return session;
}

export async function getCorsairTenantId(): Promise<string> {
  const session = await requireApiSession();
  return session.user.id;
}
