"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  applyGmailLabel,
  archiveGmailThread,
  refreshGmailInbox,
  saveGmailDraft,
  sendGmailDraft,
  sendGmailMessage,
  setGmailThreadUnread,
} from "@/server/gmail";

const GmailIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);
const RecipientSchema = z
  .string()
  .trim()
  .min(3)
  .max(1_000)
  .refine(
    (value) =>
      value
        .split(",")
        .map((recipient) => recipient.trim())
        .every((recipient) => z.string().email().safeParse(recipient).success),
    "Use comma-separated email addresses.",
  );
const MessageSchema = z.object({
  to: RecipientSchema,
  subject: z.string().trim().max(998),
  body: z.string().max(500_000),
});
const DraftSchema = MessageSchema.extend({
  draftId: z.string().trim().max(256).optional(),
});

export async function refreshGmailInboxAction() {
  try {
    await refreshGmailInbox();
    revalidateGmail();
  } catch {
    redirect("/dashboard/inbox?status=error");
  }

  redirect("/dashboard/inbox?status=refreshed");
}

export async function archiveGmailThreadAction(formData: FormData) {
  const threadId = parseId(formData, "threadId");

  if (!threadId) {
    redirect("/dashboard/inbox?status=error");
  }

  try {
    await archiveGmailThread(threadId);
    revalidateGmail();
  } catch {
    redirect(`/dashboard/inbox/thread/${threadId}?status=error`);
  }

  redirect("/dashboard/inbox?status=archived");
}

export async function setGmailThreadUnreadAction(formData: FormData) {
  const result = z
    .object({
      threadId: GmailIdSchema,
      unread: z.enum(["true", "false"]).transform((value) => value === "true"),
    })
    .safeParse({
      threadId: formData.get("threadId"),
      unread: formData.get("unread"),
    });

  if (!result.success) {
    redirect("/dashboard/inbox?status=error");
  }

  try {
    await setGmailThreadUnread(result.data.threadId, result.data.unread);
    revalidateGmail();
  } catch {
    redirect(`/dashboard/inbox/thread/${result.data.threadId}?status=error`);
  }

  redirect(
    `/dashboard/inbox/thread/${result.data.threadId}?status=${
      result.data.unread ? "unread" : "read"
    }`,
  );
}

export async function applyGmailLabelAction(formData: FormData) {
  const result = z
    .object({
      threadId: GmailIdSchema,
      labelId: GmailIdSchema,
    })
    .safeParse({
      threadId: formData.get("threadId"),
      labelId: formData.get("labelId"),
    });

  if (!result.success) {
    redirect("/dashboard/inbox?status=error");
  }

  try {
    await applyGmailLabel(result.data.threadId, result.data.labelId);
    revalidateGmail();
  } catch {
    redirect(`/dashboard/inbox/thread/${result.data.threadId}?status=error`);
  }

  redirect(`/dashboard/inbox/thread/${result.data.threadId}?status=labeled`);
}

export async function sendGmailMessageAction(formData: FormData) {
  const result = DraftSchema.safeParse({
    ...getMessageInput(formData),
    draftId: formData.get("draftId") || undefined,
  });

  if (!result.success) {
    redirect("/dashboard/inbox/compose?status=invalid");
  }

  try {
    if (result.data.draftId) {
      await saveGmailDraft(result.data);
      await sendGmailDraft(result.data.draftId);
    } else {
      await sendGmailMessage(result.data);
    }
    revalidateGmail();
  } catch {
    redirect("/dashboard/inbox/compose?status=error");
  }

  redirect("/dashboard/inbox?status=sent");
}

export async function saveGmailDraftAction(formData: FormData) {
  const result = DraftSchema.safeParse({
    ...getMessageInput(formData),
    draftId: formData.get("draftId") || undefined,
  });

  if (!result.success) {
    redirect("/dashboard/inbox/compose?status=invalid");
  }

  try {
    await saveGmailDraft(result.data);
    revalidateGmail();
  } catch {
    redirect("/dashboard/inbox/compose?status=error");
  }

  redirect("/dashboard/inbox/drafts?status=saved");
}

export async function sendGmailDraftAction(formData: FormData) {
  const draftId = parseId(formData, "draftId");

  if (!draftId) {
    redirect("/dashboard/inbox/drafts?status=error");
  }

  try {
    await sendGmailDraft(draftId);
    revalidateGmail();
  } catch {
    redirect("/dashboard/inbox/drafts?status=error");
  }

  redirect("/dashboard/inbox/drafts?status=sent");
}

export async function replyToGmailThreadAction(formData: FormData) {
  const result = MessageSchema.extend({ threadId: GmailIdSchema }).safeParse({
    ...getMessageInput(formData),
    threadId: formData.get("threadId"),
  });

  if (!result.success) {
    redirect("/dashboard/inbox?status=invalid");
  }

  try {
    await sendGmailMessage(result.data);
    revalidateGmail();
  } catch {
    redirect(`/dashboard/inbox/thread/${result.data.threadId}?status=error`);
  }

  redirect(`/dashboard/inbox/thread/${result.data.threadId}?status=replied`);
}

function getMessageInput(formData: FormData) {
  return {
    to: formData.get("to"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  };
}

function parseId(formData: FormData, name: string): string | null {
  const result = GmailIdSchema.safeParse(formData.get(name));
  return result.success ? result.data : null;
}

function revalidateGmail() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
}
