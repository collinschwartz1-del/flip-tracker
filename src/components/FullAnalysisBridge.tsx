"use client";

import { useState, useRef } from "react";
import { generateFullAnalysisPrompt } from "@/lib/full-analysis-bridge";
import type { PipelineDeal } from "@/lib/types";

export function FullAnalysisBridge({
  deal,
  toast,
}: {
  deal: PipelineDeal;
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const prompt = generateFullAnalysisPrompt(deal);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast("Copied to clipboard!");
    } catch {
      // Fallback: select the textarea text for manual copy
      if (textareaRef.current) {
        textareaRef.current.select();
        textareaRef.current.setSelectionRange(0, 99999);
        try {
          document.execCommand("copy");
          setCopied(true);
          toast("Copied to clipboard!");
        } catch {
          toast("Select all text above and copy manually", "error");
        }
      }
    }
    setTimeout(() => setCopied(false), 3000);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm transition-colors active:scale-[0.98] shadow-lg shadow-amber-500/20"
      >
        Run Full Analysis in Claude \u2192
      </button>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-amber-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          Full Analysis Prompt
        </p>
        <button onClick={() => setExpanded(false)} className="text-xs text-zinc-600">
          Close
        </button>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Copy the deal data below, then open Claude and paste it. The flip analyzer
        will run a full 8-phase adversarial analysis.
      </p>

      <textarea
        ref={textareaRef}
        readOnly
        value={prompt}
        rows={6}
        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-amber-500/50 resize-none"
        onFocus={(e) => e.target.select()}
      />

      <button
        onClick={handleCopy}
        className={`w-full py-3 font-bold rounded-xl text-sm border active:scale-[0.98] transition-colors ${
          copied
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
        }`}
      >
        {copied ? "\u2713 Copied!" : "Copy Deal Data"}
      </button>

      <a
        href="https://claude.ai/new"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3 bg-zinc-800 text-zinc-200 font-bold rounded-xl text-sm text-center border border-zinc-700 active:scale-[0.98] transition-colors"
      >
        Open Claude \u2192
      </a>

      <p className="text-[10px] text-zinc-600 text-center">
        Paste the copied text into Claude. The flip-deal-analyzer skill will fire
        automatically with full 8-phase adversarial analysis.
      </p>
    </div>
  );
}
