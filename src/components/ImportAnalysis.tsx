"use client";

import { useState } from "react";

interface ImportAnalysisProps {
  dealId: string;
  onImport: (data: any) => Promise<void>;
  toast: (msg: string, type?: "success" | "error") => void;
}

export function ImportAnalysis({ dealId, onImport, toast }: ImportAnalysisProps) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!content.trim()) {
      toast("Paste the analysis dashboard code first", "error");
      return;
    }

    setImporting(true);
    try {
      // Try direct JSON parse first
      let data: any;
      try {
        const cleaned = content.trim()
          .replace(/```json\s*/g, "").replace(/```\s*/g, "");
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          data = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
        }
      } catch {
        // Not raw JSON — send to extraction API
      }

      if (!data) {
        // Send the pasted content to the extraction API
        const res = await fetch("/api/extract-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        });

        if (!res.ok) throw new Error("Extraction failed");
        const result = await res.json();
        data = result.data;
      }

      if (!data) throw new Error("Couldn't extract analysis data");

      await onImport(data);
      setContent("");
      setExpanded(false);
      toast("Analysis imported successfully!");
    } catch (err: any) {
      toast("Couldn't import: " + (err.message || "Check the pasted content"), "error");
    }
    setImporting(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full py-3 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl text-xs text-zinc-500 font-medium active:bg-zinc-800 transition-colors"
      >
        Import Full Analysis from Claude
      </button>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-blue-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
          Import Full Analysis
        </p>
        <button onClick={() => setExpanded(false)} className="text-xs text-zinc-600">
          Cancel
        </button>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        After running the full analysis in Claude, copy the ENTIRE dashboard artifact code
        (the React/JSX file) and paste it below. The app will extract all the deal data,
        comps, rehab scenarios, and verdict.
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste the dashboard artifact code here..."
        rows={6}
        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 placeholder-zinc-700 font-mono focus:outline-none focus:border-blue-500/50 resize-none"
      />

      <button
        onClick={handleImport}
        disabled={importing || !content.trim()}
        className="w-full py-3 bg-blue-500/20 text-blue-400 font-bold rounded-xl text-sm border border-blue-500/30 disabled:opacity-50 active:scale-[0.98]"
      >
        {importing ? "Extracting data..." : "Import Analysis"}
      </button>
    </div>
  );
}
