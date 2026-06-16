"use server";

import { redirect } from "next/navigation";

import { requireApiSession } from "@/lib/auth/session";
import { deleteUserAccountAndData } from "@/server/account-deletion";

export async function deleteAccountAction() {
  const session = await requireApiSession();

  await deleteUserAccountAndData({
    userId: session.user.id,
    email: session.user.email,
  });

  redirect("/sign-in?status=account-deleted");
}
