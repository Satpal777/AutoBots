import { redirect } from "next/navigation";

import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { requireSession } from "@/lib/auth/session";
import { getPlanStatus } from "@/server/agent-models";
import { createConversation, getConversationMessages, listConversations } from "@/server/chat";
import { listPendingApprovals } from "@/server/approvals";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { getByokStorageKey } from "@/server/byok";

export default async function ChatPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const requested = (await searchParams).conversation;

  if (typeof requested !== "string") {
    const conversationId = await createConversation(session.user.id);
    redirect(`/dashboard/chat?conversation=${conversationId}`);
  }

  const conversations = await listConversations(session.user.id);
  const activeId = conversations.some((item) => item.id === requested)
    ? requested
    : null;

  if (!activeId) {
    const conversationId = await createConversation(session.user.id);
    redirect(`/dashboard/chat?conversation=${conversationId}`);
  }

  const [messages, plan, approvals, integrations] = await Promise.all([
    getConversationMessages(session.user.id, activeId),
    getPlanStatus(session.user.id),
    listPendingApprovals(session.user.id),
    getGoogleIntegrationStatuses(),
  ]);
  return <ChatWorkspace key={activeId} conversations={conversations} activeId={activeId} initialMessages={messages} plan={plan} approvals={approvals} integrations={integrations} byokStorageKey={getByokStorageKey(session.user.id)} userName={session.user.name} />;
}
