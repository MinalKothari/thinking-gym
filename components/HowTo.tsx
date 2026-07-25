"use client";
import React from "react";
import { X, Search, Target, Lightbulb, ListChecks, Calculator, MessageCircleQuestion, Layers } from "lucide-react";
import { INK, CARD, LIME, LIME_DK, MUTED, LINE, PAPER } from "@/lib/theme";

const SCORING = "Start at 100. Hints and wrong guesses cost points — a clean solve is the flex.";

const GUIDES: Record<string, { title: string; steps: { icon: React.ReactNode; text: string }[]; scoring: string }> = {
  lateral: {
    title: "How this rep works",
    steps: [
      { icon: <Search size={15} />, text: "Something strange happened. Interrogate it with yes/no questions — the meter shows how many key facts you've uncovered." },
      { icon: <Lightbulb size={15} />, text: "Stuck? The 💡 button offers question ideas. Using them is free — but the thinking is the workout." },
      { icon: <Target size={15} />, text: "When you see it, name it in the answer box. Wrong guesses cost −15, so don't fish." },
    ],
    scoring: "Start at 100. Wrong guesses −15 · questions beyond the first 5 −3 each · slow solves lose a little. Clean and quick = top of the pack.",
  },
  spot_flaw: {
    title: "How this rep works",
    steps: [
      { icon: <MessageCircleQuestion size={15} />, text: "Read the argument. It sounds convincing — something is broken in it." },
      { icon: <ListChecks size={15} />, text: "Pick the option that names the real flaw. One shot, so reason before you tap." },
    ],
    scoring: SCORING,
  },
  fermi: {
    title: "How this rep works",
    steps: [
      { icon: <Calculator size={15} />, text: "Estimate the unestimatable by breaking it into steps you can guess — the scratchpad chains them and does the maths." },
      { icon: <Target size={15} />, text: "Lock in your estimate. Landing within 10× of the true number counts as a solve — the reasoning path is the win." },
    ],
    scoring: SCORING,
  },
  deduction: {
    title: "How this rep works",
    steps: [
      { icon: <MessageCircleQuestion size={15} />, text: "A tight logic riddle with exactly one answer." },
      { icon: <Target size={15} />, text: "Type it when you've got it. Wrong tries cost points; hints are there if you need a nudge." },
    ],
    scoring: SCORING,
  },
  open: {
    title: "How this rep works",
    steps: [
      { icon: <Layers size={15} />, text: "No single right answer here — the rep is finding the angles others miss. Jot short thoughts, tap lenses to steer." },
      { icon: <Search size={15} />, text: "The meter shows how much of the picture you've surfaced — coverage, not correctness." },
      { icon: <Target size={15} />, text: "Then compare with how experts and the community saw it. That comparison is the payoff." },
    ],
    scoring: "Open reps aren't scored — your words are never graded. The win is coverage: how many angles you found before the reveal.",
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
