"use client";
import React from "react";
import { X, Search, Target, Lightbulb, ListChecks, Calculator, MessageCircleQuestion, Layers } from "lucide-react";
import { INK, CARD, LIME, LIME_DK, MUTED, LINE, PAPER } from "@/lib/theme";

const SCORING = "Start at 100 · hints −10 · wrong guesses −15.";

const GUIDES: Record<string, { title: string; steps: { icon: React.ReactNode; text: string }[]; scoring: string }> = {
  lateral: {
    title: "How this rep works",
    steps: [
      { icon: <Search size={15} />, text: "Ask yes/no questions — uncover the 3 key facts." },
      { icon: <Lightbulb size={15} />, text: "Stuck? 💡 gives free question ideas." },
      { icon: <Target size={15} />, text: "See it? Name it. Wrong guesses −15." },
    ],
    scoring: "Start at 100 · wrong guesses −15 · extra questions −3.",
  },
  spot_flaw: {
    title: "How this rep works",
    steps: [
      { icon: <MessageCircleQuestion size={15} />, text: "The argument sounds right — it isn't." },
      { icon: <ListChecks size={15} />, text: "Pick the real flaw. One shot." },
    ],
    scoring: SCORING,
  },
  fermi: {
    title: "How this rep works",
    steps: [
      { icon: <Calculator size={15} />, text: "Break the big number into steps you can guess." },
      { icon: <Target size={15} />, text: "Within 10× of the truth = solved." },
    ],
    scoring: SCORING,
  },
  deduction: {
    title: "How this rep works",
    steps: [
      { icon: <MessageCircleQuestion size={15} />, text: "One riddle, one answer." },
      { icon: <Target size={15} />, text: "Type it when you've got it." },
    ],
    scoring: SCORING,
  },
  open: {
    title: "How this rep works",
    steps: [
      { icon: <Layers size={15} />, text: "No right answer — find angles others miss." },
      { icon: <Search size={15} />, text: "Short jots. The meter = coverage, not grades." },
      { icon: <Target size={15} />, text: "Reveal to compare with experts & the crowd." },
    ],
    scoring: "Open reps aren't scored — coverage is the win.",
  },
};

export function guideFor(kind: string): string {
  return GUIDES[kind] ? kind : "open";
}

export default function HowToSheet({ kind, onClose }: { kind: string; onClose: () => void }) {
  const g = GUIDES[guideFor(kind)];
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ background: "#17171F99", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-t-2xl sm:rounded-2xl p-5 w-full"
        style={{ background: PAPER, maxWidth: 440 }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontWeight: 700, fontSize: 15 }}>{g.title}</span>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
            <X size={14} color={MUTED} />
          </button>
        </div>
        <div className="flex flex-col gap-2.5 mb-3">
          {g.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <span className="rounded-lg flex items-center justify-center" style={{ minWidth: 26, height: 26, background: LIME + "2A", color: LIME_DK, marginTop: 1 }}>
                {s.icon}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.45, color: "#2C2C33" }}>{s.text}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: INK }}>
          <span style={{ fontSize: 12, color: "#B9B9C2", lineHeight: 1.45 }}>
            <b style={{ color: LIME }}>Scoring · </b>{g.scoring}
          </span>
        </div>
        <button onClick={onClose} className="w-full rounded-xl px-4 py-3"
          style={{ background: INK, color: LIME, fontWeight: 700, fontSize: 14 }}>
          Let's go
        </button>
      </div>
    </div>
  );
}
