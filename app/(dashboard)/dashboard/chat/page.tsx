import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { requireSession } from "@/lib/auth/session";
import { getPlanStatus } from "@/server/agent-models";
import { createConversation, getConversationMessages, listConversations } from "@/server/chat";
import { listPendingApprovals } from "@/server/approvals";
import { getGoogleIntegrationStatuses } from "@/server/google-integrations";
import { getByokStorageKey } from "@/server/byok";

export default async function ChatPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  let conversations = await listConversations(session.user.id);
  const requested = (await searchParams).conversation;
  let activeId = typeof requested === "string" && conversations.some((item) => item.id === requested) ? requested : conversations[0]?.id;
  if (!activeId) {
    activeId = await createConversation(session.user.id);
    conversations = await listConversations(session.user.id);
  }
  const [messages, plan, approvals, integrations] = await Promise.all([
    getConversationMessages(session.user.id, activeId),
    getPlanStatus(session.user.id),
    listPendingApprovals(session.user.id),
    getGoogleIntegrationStatuses(),
  ]);
  return <ChatWorkspace key={activeId} conversations={conversations} activeId={activeId} initialMessages={messages} plan={plan} approvals={approvals} integrations={integrations} byokStorageKey={getByokStorageKey(session.user.id)} userName={session.user.name} />;
}
