"use client";

import { useState } from "react";

export function ApprovalButtons({ token }: { token: string }) {
  const [status, setStatus] = useState("");
  async function decide(decision: "approve" | "deny") {
    setStatus("Working...");
    const response = await fetch(`/api/approvals/${encodeURIComponent(token)}/${decision}`, { method: "POST" });
    setStatus(response.ok ? (decision === "approve" ? "Approved and executed." : "Denied.") : "This approval is no longer available.");
  }
  return <div className="mt-5"><div className="flex gap-2"><button onClick={() => decide("approve")} className="product-button-primary px-4">Approve and run</button><button onClick={() => decide("deny")} className="product-button-secondary px-4">Deny</button></div>{status ? <p className="mt-3 text-sm font-medium text-muted">{status}</p> : null}</div>;
}
