"use client";

import { useState } from "react";

export function ApprovalButtons({ token }: { token: string }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function decide(decision: "approve" | "deny") {
    if (pending) return;
    setPending(true);
    setStatus("Working...");
    try {
      const response = await fetch(`/api/approvals/${encodeURIComponent(token)}/${decision}`, { method: "POST" });
      if (response.ok) {
        setStatus(decision === "approve" ? "Approved and executed." : "Denied.");
      } else if (decision === "approve" && response.status === 502) {
        setStatus("Approved, but the action failed to execute.");
      } else {
        setStatus("This approval is no longer available.");
      }
    } catch {
      setStatus("This approval could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-5"><div className="flex gap-2"><button disabled={pending} onClick={() => decide("approve")} className="product-button-primary px-4 disabled:cursor-wait disabled:opacity-60">Approve and run</button><button disabled={pending} onClick={() => decide("deny")} className="product-button-secondary px-4 disabled:cursor-wait disabled:opacity-60">Deny</button></div>{status ? <p className="mt-3 text-sm font-medium text-muted">{status}</p> : null}</div>;
}
