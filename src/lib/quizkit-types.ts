export type Screen = "register" | "start" | "loading" | "quiz" | "result" | "review" | "flashcards" | "hotseat-interstitial" | "hotseat-results";

export interface PlayerResult {
  name: string;
  score: number;
  correct: number;
  total: number;
  percentage: number;
  answers: AnswerRecord[];
  streak: number;
}
export type Difficulty = "Easy" | "Medium" | "Hard" | "All";
export type GameMode = "classic" | "accuracy" | "confidence" | "marathon";

export interface QItem {
  id: number;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface AnswerRecord {
  questionId: number;
  selected: number;
  correct: boolean;
  timeSpent: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  total: number;
  percentage: number;
  streak: number;
  category: string;
  difficulty: string;
  mode: string;
  date: string;
}

export interface Achievement {
  id: string;
  label: string;
  icon: string;
  unlocked?: boolean;
}

export interface PlayerStats {
  totalGames: number;
  totalQuestions: number;
  totalCorrect: number;
  bestStreak: number;
  bestScore: number;
  perfectGames: number;
  categoryStats: Record<string, { correct: number; total: number }>;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  "General Knowledge": "🌍", "Science & Nature": "🔬", "History": "📜", "Technology": "💻",
  "Movies": "🎬", "Sports": "⚽", "Music": "🎵", "Geography": "🗺️", "All": "🎯",
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  "Easy": "#22c55e", "Medium": "#f59e0b", "Hard": "#ef4444", "All": "#64748b",
};

export const ACHIEVEMENTS_DEF: Achievement[] = [
  { id: "first", label: "First Steps", icon: "🌟" },
  { id: "perfect", label: "Perfect Score", icon: "💯" },
  { id: "streak5", label: "Streak Master (5x)", icon: "🔥" },
  { id: "streak10", label: "Streak Legend (10x)", icon: "⚡" },
  { id: "marathon", label: "Marathon Runner", icon: "🏃" },
  { id: "century", label: "Century (100 Qs)", icon: "🏅" },
  { id: "daily", label: "Daily Player", icon: "📆" },
  { id: "all_categories", label: "Explorer", icon: "🧭" },
];

export const MODE_CONFIG = [
  { id: "classic" as GameMode, label: "Classic", icon: "⚡", desc: "Timed + speed bonus" },
  { id: "accuracy" as GameMode, label: "Accuracy", icon: "🎯", desc: "No timer, precise" },
  { id: "confidence" as GameMode, label: "Confidence", icon: "📈", desc: "Wager points" },
  { id: "marathon" as GameMode, label: "Marathon", icon: "🏆", desc: "Endless, 3 wrongs" },
];

export function getLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("quizkit_leaderboard");
    const entries: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    const seen = new Map<string, LeaderboardEntry>();
    for (const e of entries) {
      const prev = seen.get(e.name);
      if (!prev || e.percentage > prev.percentage) seen.set(e.name, e);
    }
    return [...seen.values()].sort((a, b) => b.percentage - a.percentage).slice(0, 20);
  } catch { return []; }
}

export function getAchievements(): Achievement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("quizkit_achievements");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const EMPTY_STATS: PlayerStats = { totalGames: 0, totalQuestions: 0, totalCorrect: 0, bestStreak: 0, bestScore: 0, perfectGames: 0, categoryStats: {} };

export function getPlayerStats(): PlayerStats {
  if (typeof window === "undefined") return { ...EMPTY_STATS };
  try {
    const raw = localStorage.getItem("quizkit_stats");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return { ...EMPTY_STATS };
    return { ...EMPTY_STATS, ...parsed, categoryStats: parsed.categoryStats || {} };
  } catch { return { ...EMPTY_STATS }; }
}
