"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Flame, Brain, Lightbulb, Check, X, Mic, Share2, Sparkles, Send, Eye, Trophy, Plus, Target,
  UserRound,
} from "lucide-react";
import type { PublicPuzzle, Profile, RevealResult, AuthInfo, CheckResult } from "@/lib/types";
import {
  ensureGuest, getTodayPuzzle, getProfile, askOracle, matchAngles, checkDaily, revealPuzzle,
  getAuthInfo, onAuthChange,
} from "@/lib/supabase";
import { SaveStreakCard, AccountSheet } from "@/components/Auth";
import Vault from "@/components/Vault";

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
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [wrongSubmits, setWrongSubmits] = useState(0);
  const startRef = useRef<number>(0);

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
        const [pz, pr, au] = await Promise.all([getTodayPuzzle(), getProfile(), getAuthInfo()]);
        setPuzzle(pz);
        setProfile(pr);
        setAuth(au);
        startRef.current = Date.now();
        if (pz && pz.payload.kind === "lateral") setClueCover(pz.payload.clues.map(() => false));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
    // Refresh identity + streak when a magic link / OAuth redirect lands or the user signs out.
    return onAuthChange(async () => {
      const au = await getAuthInfo();
      if (!au.userId) { await ensureGuest(); return; }   // signed out → new guest (fires again)
      setAuth(au);
      setProfile(await getProfile());
    });
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

  /** Grading meta sent with every attempt — the server computes the score from it. */
  function meta() {
    return { hints: hintLevel, timeMs: Date.now() - startRef.current };
  }

  // ---- lateral ----
  async function ask(text: string) {
    if (!puzzle || !text.trim()) return;
    const r = await askOracle(puzzle.id, text);
    setLog((l) => [...l, { q: text, a: r.solved ? "That's it! 🎯" : r.answer, hit: r.solved }]);
    setQ("");
    if (r.clueHits?.length) {
      setClueCover((c) => c.map((v, i) => v || r.clueHits.includes(i)));
    }
    if (r.solved) await submitLateral(text, log.length + 1);   // named it inside the question
  }
  /** The "Name it" submission — graded server-side against the solve words. */
  async function submitLateral(text: string, questions?: number): Promise<boolean> {
    if (!puzzle || !text.trim()) return false;
    const res = await checkDaily(puzzle.id, {
      text, questions: questions ?? log.length,
      coverage: clueCover.filter(Boolean).length, ...meta(),
    });
    if (res.correct) {
      setResult(res);
      setLastCorrect(true);
      await doReveal();
      return true;
    }
    setWrongSubmits((w) => w + 1);
    return false;
  }
  async function lateralGiveUp() {
    if (!puzzle) return;
    await checkDaily(puzzle.id, {
      text: "", questions: log.length,
      coverage: clueCover.filter(Boolean).length, ...meta(),
    });
    await doReveal();
  }

  // ---- spot_flaw ----
  async function pick(i: number) {
    if (!puzzle || chosen !== null) return;
    setChosen(i);
    const res = await checkDaily(puzzle.id, { choice: i, ...meta() });
    setLastCorrect(res.correct);
    if (res.correct) setResult(res);
    await doReveal();
  }

  // ---- fermi ----
  async function lockFermi(value: number) {
    if (!puzzle) return;
    setGuess(String(value));
    setLocked(true);
    const res = await checkDaily(puzzle.id, { value, ...meta() });
    setLastCorrect(res.correct);
    if (res.correct) setResult(res);
    await doReveal();
  }

  // ---- deduction ----
  async function checkDeduction() {
    if (!puzzle) return;
    const res = await checkDaily(puzzle.id, { text: guess, ...meta() });
    setLocked(true);
    setLastCorrect(res.correct);
    if (res.correct) { setResult(res); await doReveal(); }
    else setWrongSubmits((w) => w + 1);
  }
  async function deductionGiveUp() {
    if (!puzzle) return;
    await checkDaily(puzzle.id, { text: "", ...meta() });
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
    await checkDaily(puzzle.id, { solved: true, coverage: covered.length, angles: covered, ...meta() });
    await doReveal();
  }
  function voiceDemo() {
    if (!puzzle || puzzle.payload.kind !== "open") return;
    setListening(true);
    setTimeout(() => { setListening(false); addAngle("waiting feels boring, it's not really speed"); }, 1100);
  }

  const finalScore = result?.score ?? reveal?.myScore ?? null;
  const finalTopPct = result?.topPct ?? reveal?.myTopPct ?? null;
  const solvesToday = result?.solves ?? reveal?.stats?.solves ?? null;

  function copyShare() {
    if (!puzzle?.shareLine) return;
    let text = puzzle.shareLine.replace("⬛", String(log.length || 1));
    if (finalScore != null)
      text += ` Score ${finalScore}${finalTopPct != null ? ` · Top ${finalTopPct}%` : ""}.`;
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <Flame size={16} color={LIME_DK} fill={LIME} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{profile?.currentStreak ?? 0}</span>
            </div>
            <button onClick={() => setShowAccount(true)} className="rounded-full p-2"
              style={{ background: auth?.email ? INK : CARD, border: `1px solid ${auth?.email ? INK : LINE}` }}>
              <UserRound size={16} color={auth?.email ? LIME : MUTED} />
            </button>
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
              <LateralInput pay={pay} log={log} q={q} setQ={setQ} ask={ask}
                clueCover={clueCover} revealed={revealed} onGiveUp={lateralGiveUp}
                onSubmitAnswer={submitLateral} wrongSubmits={wrongSubmits} logEnd={logEnd} />
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

        {/* payoff — score + rank (convergent types, first solve) */}
        {isSolved && finalScore != null && (
          <ScoreCard
            score={finalScore} topPct={finalTopPct} solves={solvesToday}
            hints={hintLevel} wrong={wrongSubmits}
            questions={pay.kind === "lateral" ? log.length : 0}
            timeMs={Date.now() - startRef.current}
          />
        )}

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

        {/* save-your-streak nudge — guests only, at the moment it matters */}
        {isSolved && auth?.isAnonymous && (
          <SaveStreakCard streak={profile?.currentStreak ?? 0} onSignIn={() => setShowAccount(true)} />
        )}

        {/* the Pro hook — locked archive of past reps */}
        <Vault />
      </div>

      <AccountSheet open={showAccount} onClose={() => setShowAccount(false)} auth={auth} profile={profile} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: PAPER, minHeight: "100vh", color: INK, fontFamily: FONT }}>{children}</div>
  );
}

/**
 * The payoff: big score, rank vs today's solvers, and where the points went.
 * Display mirror of the server formula in 05_scoring.sql — keep in sync.
 */
function ScoreCard({ score, topPct, solves, hints, wrong, questions, timeMs }: {
  score: number; topPct: number | null; solves: number | null;
  hints: number; wrong: number; questions: number; timeMs: number;
}) {
  const qPen = 3 * Math.max(questions - 5, 0);
  const tPen = Math.min(20, 2 * Math.max(Math.floor(timeMs / 60000) - 3, 0));
  const lines = [
    hints > 0 && { label: `${hints} hint${hints > 1 ? "s" : ""} used`, pts: -10 * hints },
    wrong > 0 && { label: `${wrong} wrong ${wrong > 1 ? "guesses" : "guess"}`, pts: -15 * wrong },
    qPen > 0 && { label: `${questions} questions (first 5 free)`, pts: -qPen },
    tPen > 0 && { label: "took your time", pts: -tPen },
  ].filter(Boolean) as { label: string; pts: number }[];
  return (
    <div className="rounded-2xl p-4 mt-3" style={{ background: INK }}>
      <div className="flex items-center justify-between">
        <div>
          <div style={{ color: "#8B8B96", fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>
            Today's score
          </div>
          <div style={{ color: LIME, fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>{score}</div>
        </div>
        <div className="text-right">
          {topPct != null && (
            <div className="rounded-full px-3 py-1.5 inline-block" style={{ background: LIME, color: INK, fontSize: 13, fontWeight: 700 }}>
              Top {topPct}%
            </div>
          )}
          {solves != null && (
            <div style={{ color: "#8B8B96", fontSize: 11.5, marginTop: 6 }}>
              of {solves.toLocaleString()} solvers today
            </div>
          )}
        </div>
      </div>
      {lines.length > 0 && (
        <div className="mt-3 pt-3 flex flex-col gap-1" style={{ borderTop: "1px solid #2B2B36" }}>
          <div className="flex items-center justify-between">
            <span style={{ color: "#B9B9C2", fontSize: 12 }}>Clean solve</span>
            <span style={{ color: "#B9B9C2", fontSize: 12, fontWeight: 600 }}>100</span>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between">
              <span style={{ color: "#8B8B96", fontSize: 12 }}>{l.label}</span>
              <span style={{ color: "#E0906B", fontSize: 12, fontWeight: 600 }}>{l.pts}</span>
            </div>
          ))}
        </div>
      )}
      {lines.length === 0 && (
        <div className="mt-2" style={{ color: "#B9B9C2", fontSize: 12 }}>
          Flawless — no hints, no misses. That's the ceiling. 💪
        </div>
      )}
    </div>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "80px 20px", textAlign: "center", color: MUTED, fontSize: 14 }}>{children}</div>;
}

/**
 * Two distinct panels: INVESTIGATE (oracle Q&A + adaptive probe chips that steer
 * toward still-missing facts) and NAME IT (typed answer, graded server-side).
 */
function LateralInput({ pay, log, q, setQ, ask, clueCover, revealed, onGiveUp, onSubmitAnswer, wrongSubmits, logEnd }: any) {
  const [answer, setAnswer] = useState("");
  const [missed, setMissed] = useState(false);
  const count = clueCover.filter(Boolean).length;
  const all = count === pay.clues.length && pay.clues.length > 0;

  // Adaptive chips: start with the openers; once facts start landing, surface
  // probes aimed at the clues still hidden. Never repeat an asked question.
  const asked = new Set(log.map((e: any) => e.q.trim().toLowerCase()));
  const fresh = (xs: string[]) => xs.filter((s) => !asked.has(s.trim().toLowerCase()));
  let chips: string[] =
    count === 0
      ? fresh(pay.suggested)
      : pay.clues.flatMap((_: any, i: number) => (clueCover[i] ? [] : fresh(pay.probes?.[i] ?? [])));
  if (chips.length === 0) chips = fresh(pay.suggested);
  chips = chips.slice(0, 4);

  async function submit() {
    if (!answer.trim()) return;
    setMissed(false);
    const ok = await onSubmitAnswer(answer);
    if (!ok) { setMissed(true); setAnswer(""); }
  }

  return (
    <div>
      {/* ---- panel 1 · INVESTIGATE ---- */}
      <div className="rounded-xl p-3 mb-2.5" style={{ background: PAPER, border: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, color: "#4A4A52", textTransform: "uppercase" }}>
            🔎 Investigate
          </span>
          <span style={{ fontSize: 11, color: MUTED }}>yes/no questions · first 5 free</span>
        </div>
        <div className="rounded-xl px-3 py-2.5 mb-2" style={{ background: CARD }}>
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
        </div>
        {log.length > 0 && (
          <div className="rounded-xl p-2.5 mb-2 flex flex-col gap-2" style={{ background: CARD, maxHeight: 150, overflowY: "auto" }}>
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
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {count > 0 && <span className="px-1 py-1.5" style={{ fontSize: 11, color: LIME_DK, fontWeight: 600 }}>Dig here →</span>}
                {chips.map((s: string, i: number) => (
                  <button key={i} onClick={() => ask(s)} className="rounded-full px-2.5 py-1.5" style={{ border: `1px solid ${LINE}`, background: CARD, fontSize: 12, color: "#3A3A40" }}>{s}</button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)}
                placeholder="ask your own yes/no question…" className="rounded-xl px-3.5 py-2.5 flex-1" style={{ border: `1px solid ${LINE}`, fontSize: 14, background: CARD }} />
              <button onClick={() => ask(q)} className="rounded-xl p-2.5" style={{ background: INK }}><Send size={16} color={LIME} /></button>
            </div>
          </>
        )}
      </div>

      {/* ---- panel 2 · NAME IT ---- */}
      {!revealed && (
        <div className="rounded-xl p-3" style={{ background: LIME + "14", border: `1px solid ${all ? LIME_DK : LINE}` }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, color: LIME_DK, textTransform: "uppercase" }}>
              🎯 Name it
            </span>
            <span style={{ fontSize: 11, color: MUTED }}>wrong guesses cost −15</span>
          </div>
          {all && <div style={{ fontSize: 11.5, color: LIME_DK, marginBottom: 6, fontWeight: 600 }}>You've uncovered every key fact — you're ready.</div>}
          <div className="flex items-center gap-2">
            <input value={answer} onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="what's really going on?" className="rounded-xl px-3.5 py-2.5 flex-1"
              style={{ border: `1px solid ${missed ? "#D6456B" : LINE}`, fontSize: 14, background: CARD }} />
            <button onClick={submit} className="rounded-xl px-4 py-2.5" style={{ background: INK, color: LIME, fontWeight: 600, fontSize: 13.5 }}>
              Submit
            </button>
          </div>
          {missed && (
            <div style={{ fontSize: 12, color: "#D6456B", marginTop: 6 }}>
              Not it (−15) — {wrongSubmits >= 2 ? "the facts you've uncovered point somewhere. Re-read them." : "keep investigating above."}
            </div>
          )}
          <button onClick={onGiveUp} className="mt-2 flex items-center gap-1" style={{ fontSize: 12, color: MUTED }}>
            <Eye size={13} /> Show me the answer (no score)
          </button>
        </div>
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
