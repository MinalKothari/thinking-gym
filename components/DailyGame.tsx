"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Flame, Brain, Lightbulb, Check, X, Mic, Share2, Sparkles, Send, Eye, Trophy, Plus, Target,
} from "lucide-react";
import type { PublicPuzzle, Profile, RevealResult } from "@/lib/types";
import {
  ensureGuest, getTodayPuzzle, getProfile, askOracle, matchAngles, checkDaily, revealPuzzle,
} from "@/lib/supabase";

const INK = "#17171F", PAPER = "#F3F5F1", CARD = "#FFFFFF";
const LIME = "#B4E42A", LIME_DK = "#5E7A0E", MUTED = "#6C6C77", LINE = "#E5E7E1";
const FONT = '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const OPEN = new Set(["second_order", "reframe"]);
const TYPE_NAME: Record<string, string> = {
  lateral: "Lateral", spot_flaw: "Spot the flaw", fermi: "Fermi estimate",
  deduction: "Deduction", second_order: "Second-order", reframe: "Reframe", boss: "Boss",
};

function fmt(n: number) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  return (Math.round(n * 100) / 100).toString();
}

export default function DailyGame() {
  const [loading, setLoading] = useState(true);
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  // lateral
  const [log, setLog] = useState<{ q: string; a: string; hit: boolean }[]>([]);
  const [q, setQ] = useState("");
  const [clueCover, setClueCover] = useState<boolean[]>([]);
  // spot_flaw
  const [chosen, setChosen] = useState<number | null>(null);
  // fermi + deduction
  const [guess, setGuess] = useState("");
  const [locked, setLocked] = useState(false);
  // open
  const [angles, setAngles] = useState<string[]>([]);
  const [covered, setCovered] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const logEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await ensureGuest();
        const [pz, pr] = await Promise.all([getTodayPuzzle(), getProfile()]);
        setPuzzle(pz);
        setProfile(pr);
        if (pz && pz.payload.kind === "lateral") setClueCover(pz.payload.clues.map(() => false));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  async function doReveal() {
    if (!puzzle) return;
    try {
      const r = await revealPuzzle(puzzle.id);
      setReveal(r);
      setRevealed(true);
      setProfile(await getProfile());
    } catch (e) { console.error(e); }
  }

  const isSolved = revealed;

  // ---- lateral ----
  async function ask(text: string) {
    if (!puzzle || !text.trim()) return;
    const r = await askOracle(puzzle.id, text);
    setLog((l) => [...l, { q: text, a: r.solved ? "That's it! 🎯" : r.answer, hit: r.solved }]);
    setQ("");
    if (r.clueHits?.length) {
      setClueCover((c) => c.map((v, i) => v || r.clueHits.includes(i)));
    }
    if (r.solved) {
      await checkDaily(puzzle.id, { solved: true, coverage: clueCover.filter(Boolean).length, hints: hintLevel });
      await doReveal();
    }
  }
  async function lateralGiveUp() {
    if (!puzzle) return;
    await checkDaily(puzzle.id, { solved: true, hints: hintLevel });
    await doReveal();
  }

  // ---- spot_flaw ----
  async function pick(i: number) {
    if (!puzzle || chosen !== null) return;
    setChosen(i);
    const res = await checkDaily(puzzle.id, { choice: i, hints: hintLevel });
    setLastCorrect(res.correct);
    await doReveal();
  }

  // ---- fermi ----
  async function lockFermi(result: number) {
    if (!puzzle) return;
    setGuess(String(result));
    setLocked(true);
    const res = await checkDaily(puzzle.id, { value: result, hints: hintLevel });
    setLastCorrect(res.correct);
    await doReveal();
  }

  // ---- deduction ----
  async function checkDeduction() {
    if (!puzzle) return;
    const res = await checkDaily(puzzle.id, { text: guess, hints: hintLevel });
    setLocked(true);
    setLastCorrect(res.correct);
    if (res.correct) await doReveal();
  }
  async function deductionGiveUp() {
    if (!puzzle) return;
    await checkDaily(puzzle.id, { text: "", hints: hintLevel });
    await doReveal();
  }

  // ---- open ----
  async function addAngle(text: string) {
    if (!puzzle || !text.trim()) return;
    const next = [...angles, text.trim()].slice(0, 6);
    setAngles(next);
    setCovered(await matchAngles(puzzle.id, next));
  }
  async function openReveal() {
    if (!puzzle) return;
    await checkDaily(puzzle.id, { solved: true, coverage: covered.length, angles: covered, hints: hintLevel });
    await doReveal();
  }
  function voiceDemo() {
    if (!puzzle || puzzle.payload.kind !== "open") return;
    setListening(true);
    setTimeout(() => { setListening(false); addAngle("waiting feels boring, it's not really speed"); }, 1100);
  }

  function copyShare() {
    if (!puzzle?.shareLine) return;
    const text = puzzle.shareLine.replace("⬛", String(log.length || 1));
    try { navigator.clipboard?.writeText(text + " Thinking Gym"); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  if (loading) return <Shell><Center>Loading today's rep…</Center></Shell>;
  if (!puzzle) return <Shell><Center>No puzzle scheduled for today. Check back tomorrow.</Center></Shell>;

  const pay = puzzle.payload;
  return (
    <Shell>
      <div className="mx-auto" style={{ maxWidth: 480, padding: "20px 16px" }}>
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 34, height: 34, background: INK }}>
              <Brain size={19} color={LIME} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.2 }}>Thinking Gym</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: -2 }}>Today's rep</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
            <Flame size={16} color={LIME_DK} fill={LIME} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{profile?.currentStreak ?? 0}</span>
          </div>
        </div>

        {/* puzzle card */}
        <div className="rounded-2xl p-5 mb-3" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="rounded-full px-2.5 py-1" style={{ background: "#7C6AE818", color: "#7C6AE8", fontSize: 11, fontWeight: 600 }}>
              {TYPE_NAME[puzzle.type]}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((d) => (
                <span key={d} style={{ width: 6, height: 6, borderRadius: 6, background: d <= puzzle.difficulty ? INK : LINE }} />
              ))}
            </div>
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4, marginBottom: 8 }}>{puzzle.title}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: "#2C2C33" }}>{puzzle.prompt}</p>

          <div className="mt-4">
            {pay.kind === "lateral" && (
              <LateralInput puzzle={puzzle} pay={pay} log={log} q={q} setQ={setQ} ask={ask}
                clueCover={clueCover} revealed={revealed} onReveal={lateralGiveUp} logEnd={logEnd} />
            )}

            {pay.kind === "spot_flaw" && (
              <div className="flex flex-col gap-2">
                {pay.options.map((opt, i) => {
                  const show = chosen !== null;
                  const correctIdx = reveal?.solution?.correct;
                  const picked = chosen === i;
                  let bg = CARD, bd = LINE, ic: React.ReactNode = null;
                  if (show && correctIdx === i) { bg = LIME + "22"; bd = LIME_DK; ic = <Check size={16} color={LIME_DK} />; }
                  else if (show && picked) { bg = "#F8D7DA"; bd = "#D6456B"; ic = <X size={16} color="#D6456B" />; }
                  return (
                    <button key={i} disabled={show} onClick={() => pick(i)}
                      className="text-left rounded-xl px-3.5 py-3 flex items-start gap-2"
                      style={{ background: bg, border: `1px solid ${bd}`, fontSize: 14, cursor: show ? "default" : "pointer" }}>
                      <span style={{ marginTop: 1, minWidth: 16 }}>{ic}</span><span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {pay.kind === "fermi" && (
              <>
                <FermiScratch pay={pay} locked={locked} onLock={lockFermi} />
                {locked && lastCorrect !== null && (
                  <div className="mt-2" style={{ fontSize: 13, color: MUTED }}>
                    {lastCorrect ? "Nice — within an order of magnitude. The reasoning path is what counts:"
                                 : "Off this time — but here's the path that matters more than the number:"}
                  </div>
                )}
              </>
            )}

            {pay.kind === "deduction" && (
              <>
                <div className="flex items-center gap-2">
                  <input value={guess} disabled={revealed} onChange={(e) => setGuess(e.target.value)}
                    placeholder="one word…" onKeyDown={(e) => e.key === "Enter" && checkDeduction()}
                    className="rounded-xl px-3.5 py-3 flex-1"
                    style={{ border: `1px solid ${locked && !revealed ? "#D6456B" : LINE}`, fontSize: 15, background: CARD }} />
                  <button onClick={checkDeduction} className="rounded-xl px-4 py-3"
                    style={{ background: INK, color: LIME, fontWeight: 600, fontSize: 14 }}>Check</button>
                </div>
                {locked && !revealed && lastCorrect === false && (
                  <div className="mt-2" style={{ fontSize: 13, color: "#D6456B" }}>Not quite — try a hint, then guess again.</div>
                )}
              </>
            )}

            {pay.kind === "open" && (
              <OpenWorkspace pay={pay} angles={angles} covered={covered} addAngle={addAngle}
                listening={listening} voiceDemo={voiceDemo} revealed={revealed} onReveal={openReveal} />
            )}
          </div>

          {/* hints (not for lateral — the oracle is the nudge) */}
          {!isSolved && pay.kind !== "lateral" && (
            <div className="mt-3">
              {hintLevel < 3 && (
                <button onClick={() => setHintLevel((h) => h + 1)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{ border: `1px solid ${LINE}`, background: PAPER, fontSize: 12.5, color: MUTED, fontWeight: 500 }}>
                  <Lightbulb size={14} color={LIME_DK} />{hintLevel === 0 ? "Need a nudge?" : `Hint ${hintLevel + 1} of 3`}
                </button>
              )}
              {hintLevel > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {puzzle.hints.slice(0, hintLevel).map((h, i) => (
                    <div key={i} className="rounded-xl px-3 py-2" style={{ background: LIME + "12", fontSize: 13.5, color: "#3A3A40" }}>
                      <b style={{ color: LIME_DK }}>Hint {i + 1}.</b> {h}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!revealed && pay.kind === "deduction" && (
            <button onClick={deductionGiveUp} className="mt-3 flex items-center gap-1" style={{ fontSize: 12.5, color: MUTED }}>
              <Eye size={13} /> I give up — reveal
            </button>
          )}

          {/* reveal */}
          {revealed && reveal && (
            <div className="mt-4 rounded-xl p-3.5" style={{ background: INK }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={14} color={LIME} />
                <span style={{ color: LIME, fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  {OPEN.has(puzzle.type) ? "How experts saw it" : "Answer"}
                </span>
              </div>
              <p style={{ color: "#EDEDEA", fontSize: 14, lineHeight: 1.5 }}>{reveal.answer}</p>
              {reveal.solution?.steps && (
                <div className="mt-2.5 flex flex-col gap-1">
                  {reveal.solution.steps.map((s, i) => (<div key={i} style={{ color: "#B9B9C2", fontSize: 12.5 }}>· {s}</div>))}
                </div>
              )}
              {reveal.solution?.keyAngles && (
                <div className="mt-3">
                  <div style={{ color: "#8B8B96", fontSize: 11, marginBottom: 6 }}>Key angles — did you land them?</div>
                  <div className="flex flex-col gap-1.5">
                    {reveal.solution.keyAngles.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 rounded-full" style={{ height: 6, background: "#2B2B36" }}>
                          <div className="rounded-full" style={{ width: `${c.pct}%`, height: 6, background: LIME }} />
                        </div>
                        <span style={{ color: "#B9B9C2", fontSize: 11, minWidth: 150 }}>{c.pct}% · {c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* solved footer */}
        {isSolved && (
          <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, background: "#7C6AE818" }}>
                  <Trophy size={16} color="#7C6AE8" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Muscle trained</div>
                  <div style={{ fontSize: 11.5, color: MUTED }}>{puzzle.muscle} · streak {profile?.currentStreak ?? 0}</div>
                </div>
              </div>
              <button onClick={copyShare} className="flex items-center gap-1.5 rounded-full px-3 py-2"
                style={{ background: LIME, color: INK, fontWeight: 600, fontSize: 12.5 }}>
                <Share2 size={13} /> {copied ? "Copied!" : "Share"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 10, textAlign: "center" }}>
              Come back tomorrow for a fresh one.
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: PAPER, minHeight: "100vh", color: INK, fontFamily: FONT }}>{children}</div>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "80px 20px", textAlign: "center", color: MUTED, fontSize: 14 }}>{children}</div>;
}

function LateralInput({ puzzle, pay, log, q, setQ, ask, clueCover, revealed, onReveal, logEnd }: any) {
  const count = clueCover.filter(Boolean).length;
  const all = count === pay.clues.length && pay.clues.length > 0;
  return (
    <div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Ask yes/no questions to crack it — the thinking is in the asking.</div>
      <div className="rounded-xl px-3 py-2.5 mb-2" style={{ background: PAPER }}>
        <div className="flex items-center justify-between mb-1.5">
          <span style={{ fontSize: 11, fontWeight: 600, color: "#4A4A52" }}>Key facts uncovered</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: all ? LIME_DK : MUTED }}>{count} / {pay.clues.length}</span>
        </div>
        <div className="flex flex-col gap-1">
          {pay.clues.map((c: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5" style={{ fontSize: 12, color: clueCover[i] ? INK : "#B7B7BE" }}>
              {clueCover[i] ? <Check size={13} color={LIME_DK} /> : <div style={{ width: 13, height: 13, borderRadius: 8, border: `1.5px solid ${LINE}` }} />}
              {clueCover[i] ? c.label : "· · · · ·"}
            </div>
          ))}
        </div>
        {all && !revealed && <div style={{ fontSize: 11.5, color: LIME_DK, marginTop: 6, fontWeight: 600 }}>You've got the key facts — try naming it below.</div>}
      </div>
      {log.length > 0 && (
        <div className="rounded-xl p-2.5 mb-2 flex flex-col gap-2" style={{ background: PAPER, maxHeight: 150, overflowY: "auto" }}>
          {log.map((e: any, i: number) => (
            <div key={i}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{e.q}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: e.hit ? LIME_DK : e.a === "Yes" ? "#2FA36B" : e.a === "No" ? "#D6456B" : MUTED }}>→ {e.a}</div>
            </div>
          ))}
          <div ref={logEnd} />
        </div>
      )}
      {!revealed && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pay.suggested.map((s: string, i: number) => (
              <button key={i} onClick={() => ask(s)} className="rounded-full px-2.5 py-1.5" style={{ border: `1px solid ${LINE}`, background: CARD, fontSize: 12, color: "#3A3A40" }}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)}
              placeholder="ask your own yes/no question…" className="rounded-xl px-3.5 py-2.5 flex-1" style={{ border: `1px solid ${LINE}`, fontSize: 14, background: CARD }} />
            <button onClick={() => ask(q)} className="rounded-xl p-2.5" style={{ background: INK }}><Send size={16} color={LIME} /></button>
          </div>
          <button onClick={onReveal} className="mt-2 flex items-center gap-1" style={{ fontSize: 12, color: MUTED }}><Eye size={13} /> I've got it — reveal</button>
        </>
      )}
    </div>
  );
}

function FermiScratch({ pay, locked, onLock }: any) {
  const [rows, setRows] = useState<any[]>(() =>
    pay.seed?.length ? pay.seed.map((r: any) => ({ ...r, value: "" })) : [{ label: "", value: "", op: "×" }, { label: "", value: "", op: "×" }]);
  const filled = rows.filter((r) => r.value !== "" && !isNaN(parseFloat(r.value)));
  let result: number | null = null;
  if (filled.length) {
    result = parseFloat(filled[0].value);
    for (let i = 1; i < filled.length; i++) {
      const v = parseFloat(filled[i].value), op = filled[i].op;
      result = op === "×" ? result * v : op === "÷" ? result / v : op === "+" ? result + v : result - v;
    }
  }
  const upd = (i: number, k: string, val: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
  return (
    <div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Your scratchpad — break it into steps. You supply the reasoning; the app does the maths.</div>
      <div className="rounded-xl p-2.5" style={{ background: PAPER }}>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5 mb-1.5">
            {i > 0 && !pay.seed?.length && (
              <select value={r.op} disabled={locked} onChange={(e) => upd(i, "op", e.target.value)} className="rounded-lg px-1 py-2" style={{ border: `1px solid ${LINE}`, background: CARD, fontSize: 14, width: 40 }}>
                <option>×</option><option>÷</option><option>+</option><option>−</option>
              </select>
            )}
            {(i === 0 || pay.seed?.length) && <span style={{ width: 40, textAlign: "center", fontSize: 14, color: MUTED }}>{pay.seed?.length && i > 0 ? r.op : ""}</span>}
            <input value={r.label} disabled={locked} onChange={(e) => upd(i, "label", e.target.value)} placeholder="what is this?" className="rounded-lg px-2.5 py-2 flex-1" style={{ border: `1px solid ${LINE}`, background: CARD, fontSize: 13 }} />
            <input inputMode="numeric" value={r.value} disabled={locked} onChange={(e) => upd(i, "value", e.target.value)} placeholder="0" className="rounded-lg px-2.5 py-2" style={{ border: `1px solid ${LINE}`, background: CARD, fontSize: 13, width: 92 }} />
          </div>
        ))}
        {!locked && rows.length < 6 && (
          <button onClick={() => setRows((rs) => [...rs, { label: "", value: "", op: "×" }])} className="flex items-center gap-1 mt-1" style={{ fontSize: 12, color: LIME_DK, fontWeight: 600 }}>
            <Plus size={13} /> add step
          </button>
        )}
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${LINE}` }}>
          <span style={{ fontSize: 12, color: MUTED }}>Running estimate</span>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{result === null ? "—" : fmt(result)}</span>
        </div>
      </div>
      {!locked && (
        <button onClick={() => result !== null && onLock(result)} disabled={result === null} className="rounded-xl px-4 py-2.5 mt-2 flex items-center gap-1.5"
          style={{ background: result === null ? LINE : INK, color: result === null ? MUTED : LIME, fontWeight: 600, fontSize: 14 }}>
          <Target size={15} /> Lock in estimate
        </button>
      )}
    </div>
  );
}

function OpenWorkspace({ pay, angles, covered, addAngle, listening, voiceDemo, revealed, onReveal }: any) {
  const [draft, setDraft] = useState("");
  const total = pay.keyAngles.length;
  const done = covered.length >= total;
  return (
    <div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Tap a lens or add your own. Short jots, go for breadth — strong thinkers find ~{total} angles.</div>
      <div className="rounded-xl px-3 py-2 mb-2 flex items-center justify-between" style={{ background: PAPER }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4A4A52" }}>Angles uncovered</span>
        <div className="flex items-center gap-1.5">
          {pay.keyAngles.map((_: any, i: number) => (
            <div key={i} style={{ width: 22, height: 6, borderRadius: 6, background: covered.includes(i) ? LIME : LINE, transition: "background .3s" }} />
          ))}
          <span style={{ fontSize: 11.5, fontWeight: 700, color: done ? LIME_DK : MUTED, marginLeft: 4 }}>{covered.length}/{total}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {pay.lenses.map((l: string, i: number) => (
          <button key={i} onClick={() => addAngle(l)} disabled={revealed} className="flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ border: `1px dashed ${MUTED}66`, background: CARD, fontSize: 12, color: "#3A3A40" }}>
            <Plus size={12} /> {l}
          </button>
        ))}
      </div>
      {angles.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {angles.map((a: string, i: number) => (
            <div key={i} className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: PAPER, fontSize: 13 }}>
              <span style={{ color: "#E08A1E", fontWeight: 700 }}>{i + 1}</span><span className="flex-1">{a}</span>
            </div>
          ))}
        </div>
      )}
      {!revealed && (
        <>
          <div className="flex items-center gap-2">
            <input value={listening ? "" : draft} disabled={listening} onChange={(e) => setDraft(e.target.value.slice(0, 90))}
              onKeyDown={(e) => { if (e.key === "Enter") { addAngle(draft); setDraft(""); } }}
              placeholder={listening ? "listening…" : "one short angle…"} className="rounded-xl px-3.5 py-2.5 flex-1"
              style={{ border: `1px solid ${LINE}`, fontSize: 14, background: listening ? LIME + "14" : CARD }} />
            <button onClick={voiceDemo} className="rounded-xl p-2.5" style={{ background: listening ? LIME : CARD, border: `1px solid ${listening ? LIME : LINE}` }}>
              <Mic size={16} color={listening ? INK : MUTED} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span style={{ fontSize: 10.5, color: MUTED }}>{draft.length}/90 · mic is a demo</span>
            <button onClick={onReveal} disabled={angles.length === 0} className="rounded-full px-3.5 py-2"
              style={{ background: angles.length ? INK : LINE, color: angles.length ? LIME : MUTED, fontWeight: 600, fontSize: 12.5 }}>
              {done ? "You've got them — see how others thought →" : "See how others thought →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
