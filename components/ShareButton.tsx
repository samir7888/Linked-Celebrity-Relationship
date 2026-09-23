"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${name}'s Relationship Timeline`,
          text: `Check out ${name}'s complete romantic relationship history on Linked.`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled or clipboard denied
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      title="Share timeline"
      className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-white/70 px-3 py-1.5 font-body text-xs font-medium text-ink-soft shadow-xs backdrop-blur-sm transition-all hover:border-line hover:bg-white hover:text-ink active:scale-95"
    >
      {copied ? (
        <>
          <Check size={13} className="text-emerald-600" />
          <span className="text-emerald-700">Copied Link</span>
        </>
      ) : (
        <>
          <Share2 size={13} />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
