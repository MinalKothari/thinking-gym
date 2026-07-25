"use client";
import React, { useState } from "react";
import { Flame, Mail, LogOut, X, Check } from "lucide-react";
import type { AuthInfo, Profile } from "@/lib/types";
import { saveWithEmail, signInWithEmail, continueWithGoogle, signOutUser } from "@/lib/supabase";
import { INK, CARD, LIME, LIME_DK, MUTED, LINE, PAPER } from "@/lib/theme";

const GOOGLE_HINT = "Google sign-in isn't switched on yet — use email for now.";

function friendly(e: unknown, upgrading: boolean): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/already.*(registered|in use|exists)/i.test(msg))
    return "That email already has an account — tap “I already have an account” below.";
  if (/provider is not enabled|Unsupported provider|manual linking/i.test(msg)) return GOOGLE_HINT;
  if (/rate limit/i.test(msg)) return "Too many attempts — give it a minute and try again.";
  return upgrading ? "Couldn't save — check the email and try again." : msg;
}

/**
 * Email capture that UPGRADES the anonymous guest in place (same uid, streak
 * carries over). `mode="signin"` sends a magic link for returning users instead.
 */
export function EmailForm({ mode, onDone }: { mode: "save" | "signin"; onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const clean = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(clean) || busy) return;
    setBusy(true); setErr(null);
    try {
      if (mode === "save") await saveWithEmail(clean);
      else await signInWithEmail(clean);
      setSent(true);
      onDone?.();
    } catch (e) { setErr(friendly(e, mode === "save")); }
    setBusy(false);
  }

  if (sent)
    return (
      <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: LIME + "22" }}>
        <Check size={15} color={LIME_DK} />
        <span style={{ fontSize: 13, color: "#3A3A40" }}>
          Check your inbox — tap the link and {mode === "save" ? "your streak is saved." : "you're in."}
        </span>
      </div>
    );

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={email} type="email" inputMode="email" autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="you@example.com"
          className="rounded-xl px-3.5 py-2.5 flex-1"
          style={{ border: `1px solid ${LINE}`, fontSize: 14, background: CARD }}
        />
        <button onClick={submit} disabled={busy}
          className="rounded-xl px-3.5 py-2.5 flex items-center gap-1.5"
          style={{ background: INK, color: LIME, fontWeight: 600, fontSize: 13, opacity: busy ? 0.6 : 1 }}>
          <Mail size={14} /> {busy ? "Sending…" : mode === "save" ? "Save" : "Send link"}
        </button>
      </div>
      {err && <div style={{ fontSize: 12, color: "#D6456B", marginTop: 6 }}>{err}</div>}
    </div>
  );
}

/** Post-solve nudge — shown only to anonymous guests, at the moment it matters. */
export function SaveStreakCard({ streak, onSignIn }: { streak: number; onSignIn: () => void }) {
  return (
    <div className="rounded-2xl p-4 mt-3" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Flame size={16} color={LIME_DK} fill={LIME} />
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>
          {streak > 1 ? `Don't lose your ${streak}-day streak` : "Keep your streak safe"}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>
        Right now it lives only in this browser. Add your email and it follows you anywhere.
      </div>
      <EmailForm mode="save" />
      <button onClick={onSignIn} className="mt-2.5" style={{ fontSize: 12, color: MUTED, textDecoration: "underline" }}>
        I already have an account
      </button>
    </div>
  );
}

/** Header account sheet — save/sign-in when guest, profile + sign-out when not. */
export function AccountSheet({
  open, onClose, auth, profile,
}: { open: boolean; onClose: () => void; auth: AuthInfo | null; profile: Profile | null }) {
  const [mode, setMode] = useState<"save" | "signin">("save");
  const [googleErr, setGoogleErr] = useState<string | null>(null);
  if (!open) return null;
  const isGuest = !auth || auth.isAnonymous || !auth.email;

  async function google() {
    setGoogleErr(null);
    try { await continueWithGoogle(isGuest); }
    catch (e) { setGoogleErr(friendly(e, isGuest)); }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ background: "#17171F99", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-t-2xl sm:rounded-2xl p-5 w-full"
        style={{ background: PAPER, maxWidth: 440 }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {isGuest ? (mode === "save" ? "Save your progress" : "Welcome back") : "Your account"}
          </span>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
            <X size={14} color={MUTED} />
          </button>
        </div>

        {isGuest ? (
          <>
            <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>
              {mode === "save"
                ? "You're playing as a guest. Add your email — your streak and history carry over."
                : "We'll email you a magic link. Heads up: signing in to another account replaces this guest session."}
            </div>
            <EmailForm mode={mode} />
            <button onClick={google} className="mt-2.5 w-full rounded-xl px-3.5 py-2.5"
              style={{ border: `1px solid ${LINE}`, background: CARD, fontSize: 13.5, fontWeight: 600 }}>
              Continue with Google
            </button>
            {googleErr && <div style={{ fontSize: 12, color: "#D6456B", marginTop: 6 }}>{googleErr}</div>}
            <button onClick={() => setMode(mode === "save" ? "signin" : "save")}
              className="mt-3" style={{ fontSize: 12, color: MUTED, textDecoration: "underline" }}>
              {mode === "save" ? "I already have an account" : "New here? Save this guest session instead"}
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl px-3.5 py-3 mb-3" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{auth!.email}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                Streak {profile?.currentStreak ?? 0} · best {profile?.longestStreak ?? 0}
                {profile?.isPro ? " · Pro" : ""}
              </div>
            </div>
            <button onClick={async () => { await signOutUser(); onClose(); }}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5"
              style={{ border: `1px solid ${LINE}`, background: CARD, fontSize: 13, color: "#D6456B", fontWeight: 600 }}>
              <LogOut size={14} /> Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
