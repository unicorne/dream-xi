"use client";
import { useState } from "react";

export default function ShareBar({ path, label = "Copy share link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = `${location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
    >
      {copied ? "Link copied" : label}
    </button>
  );
}
