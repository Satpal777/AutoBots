"use client";

import { useFormStatus } from "react-dom";

import { TrashIcon } from "@/components/ui/icons";

export function DeleteAccountButton() {
  const { pending } = useFormStatus();

  function confirmDeletion(event: React.MouseEvent<HTMLButtonElement>) {
    if (
      !window.confirm(
        "Permanently delete your Autobot account and all workspace data? This cannot be undone.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      onClick={confirmDeletion}
      disabled={pending}
      className="product-button-danger inline-flex items-center justify-center gap-2 px-4 disabled:cursor-wait disabled:opacity-60"
    >
      <TrashIcon aria-hidden="true" className="size-4" />
      {pending ? "Deleting account..." : "Delete account and data"}
    </button>
  );
}
