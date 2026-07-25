import { createClient } from "@supabase/supabase-js";
import type {
  PublicPuzzle, Guess, CheckResult, RevealResult, Profile, ArchiveItem, AuthInfo,
} from "@/lib/types";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Sign the visitor in as a guest so they can play immediately (Feature 3 upgrades this). */
export async function ensureGuest(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
}

export async function getTodayPuzzle(): Promise<PublicPuzzle | null> {
  const { data, error } = await supabase.rpc("get_today_puzzle");
  if (error) throw error;
  return data as PublicPuzzle | null;
}

export async function getProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, is_pro, current_streak, longest_streak, last_played_on, streak_freezes")
    .eq("id", userData.user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    isPro: data.is_pro,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastPlayedOn: data.last_played_on,
    streakFreezes: data.streak_freezes,
  };
}

export async function askOracle(puzzleId: string, question: string) {
  const { data, error } = await supabase.rpc("ask_oracle", {
    p_puzzle_id: puzzleId,
    p_question: question,
  });
  if (error) throw error;
  return data as { answer: "Yes" | "No" | "Doesn't matter"; solved: boolean; clueHits: number[] };
}

export async function matchAngles(puzzleId: string, texts: string[]): Promise<number[]> {
  const { data, error } = await supabase.rpc("match_angles", {
    p_puzzle_id: puzzleId,
    p_texts: texts,
  });
  if (error) throw error;
  return (data as number[]) ?? [];
}

export async function checkDaily(puzzleId: string, guess: Guess): Promise<CheckResult> {
  const { data, error } = await supabase.rpc("check_daily", {
    p_puzzle_id: puzzleId,
    p_guess: guess,
  });
  if (error) throw error;
  return data as CheckResult;
}

export async function revealPuzzle(puzzleId: string): Promise<RevealResult> {
  const { data, error } = await supabase.rpc("reveal_puzzle", { p_puzzle_id: puzzleId });
  if (error) throw error;
  return data as RevealResult;
}

// ---------- Feature 3: real logins (upgrade guest → permanent account) ----------

export async function getAuthInfo(): Promise<AuthInfo> {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  return {
    userId: u?.id ?? null,
    email: u?.email || null,
    isAnonymous: Boolean((u as { is_anonymous?: boolean } | null)?.is_anonymous),
  };
}

/**
 * Upgrade the CURRENT anonymous user by attaching an email — same uid, so the
 * streak and history carry over. Supabase emails a confirmation link.
 */
export async function saveWithEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: window.location.origin }
  );
  if (error) throw error;
}

/** Returning user on a new device — email magic link (switches to that account). */
export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

/**
 * Google OAuth. When the current user is an anonymous guest we LINK the Google
 * identity (same uid → streak preserved); otherwise it's a normal sign-in.
 * Requires the Google provider (and "manual linking") enabled in Supabase.
 */
export async function continueWithGoogle(upgradeGuest: boolean): Promise<void> {
  const options = { redirectTo: window.location.origin };
  const { error } = upgradeGuest
    ? await supabase.auth.linkIdentity({ provider: "google", options })
    : await supabase.auth.signInWithOAuth({ provider: "google", options });
  if (error) throw error;
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/** Re-render on any auth change (magic-link return, OAuth return, sign-out). */
export function onAuthChange(cb: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

// ---------- Archive (the Pro hook) ----------

/** Past puzzles, metadata only — safe for everyone; used for the locked list. */
export async function listArchive(): Promise<ArchiveItem[]> {
  const { data, error } = await supabase.rpc("list_archive");
  if (error) throw error;
  return (data as ArchiveItem[]) ?? [];
}

/** Full past puzzle — server rejects unless profiles.is_pro (Feature 4 unlocks). */
export async function getArchivePuzzle(puzzleId: string): Promise<PublicPuzzle | null> {
  const { data, error } = await supabase.rpc("get_archive_puzzle", { p_puzzle_id: puzzleId });
  if (error) throw error;
  return data as PublicPuzzle | null;
}
