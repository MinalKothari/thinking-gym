import { createClient } from "@supabase/supabase-js";
import type { PublicPuzzle, Guess, CheckResult, RevealResult, Profile } from "@/lib/types";

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
