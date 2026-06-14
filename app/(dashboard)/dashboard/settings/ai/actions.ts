"use server";

import { redirect } from "next/navigation";
import { requireApiSession } from "@/lib/auth/session";
import { deleteAllChatHistory } from "@/server/agent-settings";

export async function deleteChatHistoryAction() {
  const session = await requireApiSession();
  await deleteAllChatHistory(session.user.id);
  redirect("/dashboard/chat");
}
