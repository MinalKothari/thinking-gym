"use client";
import React, { useEffect, useState } from "react";
import { Lock, Archive, Snowflake, Layers, X } from "lucide-react";
import type { ArchiveItem } from "@/lib/types";
import { listArchive } from "@/lib/supabase";
import { INK, CARD, LIME, MUTED, LINE, PAPER, VIOLET } from "@/lib/theme";

const TYPE_NAME: Record<string, string> = {
  lateral: "Lateral", spot_flaw: "Spot the flaw", fermi: "Fermi estimate",
  deduction: "Deduction", second_order: "Second-order", reframe: "Reframe", boss: "Boss",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
}

/** The locked archive under the daily puzzle — the reason to go Pro. */
export default function Vault() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [showPro, setShowPro] = useState(false);

  useEffect(() => {
    listArchive().then(setItems).catch(() => {});
  }, []);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Archive size={14} color={MUTED} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>The Vault</span>
          <span style={{ fontSize: 11, color: MUTED }}>· every rep you've missed</span>
        </div>
        <span className="rounded-full px-2 py-0.5"
          style={{ background: VIOLET + "18", color: VIOLET, fontSize: 10.5, fontWeight: 700 }}>
          PRO
        </span>
      </div>

      {items.length === 0 ? (
        <button onClick={() => setShowPro(true)} className="w-full rounded-2xl p-4 text-left"
          style={{ background: CARD, border: `1px dashed ${LINE}` }}>
          <div className="flex items-center gap-2">
            <Lock size={14} color={MUTED} />
            <span style={{ fontSize: 12.5, color: MUTED }}>
              Past puzzles collect here. Miss a day? Pro lets you replay it — and keep the streak.
            </span>
          </div>
        </button>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          {items.slice(0, 7).map((it, i) => (
            <button key={it.id} onClick={() => setShowPro(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ borderTop: i > 0 ? `1px solid ${LINE}` : "none" }}>
              <span style={{ fontSize: 11.5, color: MUTED, minWidth: 46 }}>{fmtDate(it.date)}</span>
              <span className="flex-1">
                <span style={{ fontSize: 13, fontWeight: 600, display: "block" }}>{it.title}</span>
                <span style={{ fontSize: 11, color: MUTED }}>{TYPE_NAME[it.type]} · {it.muscle}</span>
              </span>
              <Lock size={13} color={MUTED} />
            </button>
          ))}
          {items.length > 7 && (
            <button onClick={() => setShowPro(true)} className="w-full px-4 py-2.5"
              style={{ borderTop: `1px solid ${LINE}`, fontSize: 12, color: MUTED }}>
              + {items.length - 7} more in the Vault
            </button>
          )}
        </div>
      )}

      {showPro && <ProSheet onClose={() => setShowPro(false)} />}
    </div>
  );
}

/** The upsell. Stripe checkout replaces the button in Feature 4 — copy stays honest until then. */
function ProSheet({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ background: "#17171F99", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-t-2xl sm:rounded-2xl p-5 w-full"
        style={{ background: INK, maxWidth: 440 }}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ color: LIME, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            Thinking Gym Pro
          </span>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ background: "#2B2B36" }}>
            <X size={14} color="#B9B9C2" />
          </button>
        </div>
        <div style={{ color: "#EDEDEA", fontSize: 17, fontWeight: 700, marginBottom: 12 }}>
          Train harder than one rep a day.
        </div>
        <div className="flex flex-col gap-2.5 mb-4">
          {[
            { icon: <Archive size={15} color={LIME} />, t: "The full Vault", d: "Replay every past puzzle you missed." },
            { icon: <Snowflake size={15} color={LIME} />, t: "Streak freezes", d: "Life happens — your streak survives a missed day." },
            { icon: <Layers size={15} color={LIME} />, t: "Deep Challenges", d: "Dig into WHY real problems exist. Coming with Pro." },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span style={{ marginTop: 2 }}>{f.icon}</span>
              <span>
                <span style={{ color: "#EDEDEA", fontSize: 13.5, fontWeight: 600, display: "block" }}>{f.t}</span>
                <span style={{ color: "#8B8B96", fontSize: 12 }}>{f.d}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#2B2B36" }}>
          <span style={{ color: "#B9B9C2", fontSize: 13, fontWeight: 600 }}>
            Launching soon — keep your streak alive and you'll be first in.
          </span>
        </div>
      </div>
    </div>
  );
}
