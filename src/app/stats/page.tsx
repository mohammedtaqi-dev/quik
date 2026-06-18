"use client";

import { useState, useEffect } from "react";
import { BarChart3, ArrowLeft, Trophy, Target, Zap, Star, Flame } from "lucide-react";
import Link from "next/link";
import { getPlayerStats, type PlayerStats } from "@/lib/quizkit-types";

export default function StatsPage() {
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    setStats(getPlayerStats());
  }, []);

  if (!stats || stats.totalGames === 0) {
    return (
      <main className="min-h-full p-3 sm:p-5 flex flex-col">
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg btn-outline hover:scale-105 transition-all">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold text-gradient">Statistics</h1>
          </div>
          <div className="glass-card rounded-2xl p-8 text-center accent-bar">
            <BarChart3 size={40} className="mx-auto mb-3" style={{ color: "var(--fg)", opacity: 0.2 }} />
            <p className="font-medium" style={{ color: "var(--fg)", opacity: 0.5 }}>No stats yet. Play a game first!</p>
          </div>
        </div>
      </main>
    );
  }

  const accuracy = stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0;

  return (
    <main className="flex-1 p-4 sm:p-8 flex items-start justify-center pt-16 sm:pt-24">
      <div className="w-full max-w-2xl animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg btn-outline hover:scale-105 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-gradient">Statistics</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-5 text-center accent-bar">
            <Trophy size={24} className="mx-auto mb-2 text-accent" />
            <div className="font-bold text-2xl text-accent">{stats.totalGames}</div>
            <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Games Played</div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center accent-bar">
            <Target size={24} className="mx-auto mb-2 text-accent" />
            <div className="font-bold text-2xl" style={{ color: "var(--fg)" }}>{accuracy}%</div>
            <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Accuracy</div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center accent-bar">
            <Zap size={24} className="mx-auto mb-2 text-accent" />
            <div className="font-bold text-2xl text-accent">{stats.bestStreak}x</div>
            <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Best Streak</div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center accent-bar">
            <Star size={24} className="mx-auto mb-2 text-accent" />
            <div className="font-bold text-2xl" style={{ color: "var(--fg)" }}>{stats.totalQuestions}</div>
            <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Questions Answered</div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center accent-bar">
            <Flame size={24} className="mx-auto mb-2 text-accent" />
            <div className="font-bold text-2xl text-accent">{stats.totalCorrect}</div>
            <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Correct Answers</div>
          </div>
          <div className="glass-card rounded-2xl p-5 text-center accent-bar">
            <Star size={24} className="mx-auto mb-2 text-yellow-500" />
            <div className="font-bold text-2xl text-yellow-500">{stats.perfectGames}</div>
            <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Perfect Games</div>
          </div>
        </div>

          <div className="glass-card rounded-2xl p-5 accent-bar">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--fg)" }}>Best Score</h3>
            <div className="flex items-center gap-3">
              <Trophy size={28} className="text-yellow-500" />
              <span className="font-bold text-2xl text-accent">{stats.bestScore}</span>
              <span className="text-xs" style={{ color: "var(--fg)", opacity: 0.4 }}>points in a single game</span>
            </div>
          </div>

          {Object.keys(stats.categoryStats).length > 0 && (
            <div className="glass-card rounded-2xl p-5 accent-bar">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--fg)" }}>Category Performance</h3>
              <div className="space-y-2">
                {Object.entries(stats.categoryStats)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([cat, data]) => {
                    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-sm w-24 sm:w-32 truncate" style={{ color: "var(--fg)" }}>{cat}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--accent-1) 12%, transparent)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                        <span className="text-xs font-medium w-16 text-right" style={{ color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{data.correct}/{data.total}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
      </div>
    </main>
  );
}
