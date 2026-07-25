// Shared contract for the app + generator. (Same as the root types.ts — lives at @/lib/types.)

export type PuzzleType =
  | "lateral" | "spot_flaw" | "fermi" | "deduction"
  | "second_order" | "reframe" | "boss";

export type Op = "×" | "÷" | "+" | "−";

export type PublicPayload =
  | { kind: "lateral"; suggested: string[]; clues: { label: string }[] }
  | { kind: "spot_flaw"; options: string[] }
  | { kind: "fermi"; unit: string; seed: { label: string; op: Op }[] }
  | { kind: "deduction" }
  | { kind: "open"; lenses: string[]; keyAngles: { label: string }[] };

export interface PublicPuzzle {
  id: string;
  date: string | null;
  type: PuzzleType;
  muscle: string;
  difficulty: number;
  title: string;
  prompt: string;
  hints: string[];
  payload: PublicPayload;
  shareLine?: string;
}

export type Guess =
  | { choice: number; hints?: number }
  | { text: string; hints?: number }
  | { value: number; hints?: number }
  | { solved: boolean; coverage?: number; angles?: number[]; hints?: number };

export interface CheckResult { correct: boolean }

export interface RevealResult {
  answer: string;
  solution: {
    kind: string;
    steps?: string[];
    correct?: number;
    keyAngles?: { label: string; pct: number }[];
  };
  stats: { plays: number; solves: number; angles: Record<string, number> };
}

/** Safe metadata for the locked archive list — no prompt, payload, or answer. */
export interface ArchiveItem {
  id: string;
  date: string;
  type: PuzzleType;
  muscle: string;
  difficulty: number;
  title: string;
}

export interface AuthInfo {
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
}

export interface Profile {
  id: string;
  username: string | null;
  isPro: boolean;
  currentStreak: number;
  longestStreak: number;
  lastPlayedOn: string | null;
  streakFreezes: number;
}
