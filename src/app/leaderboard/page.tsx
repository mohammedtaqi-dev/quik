"use client";

import { useState, useEffect } from "react";
import { Trophy, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getLeaderboard, CATEGORY_EMOJI, type LeaderboardEntry } from "@/lib/quizkit-types";
import { categories } from "@/lib/questions";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [modeFilter, setModeFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    setLeaderboard(getLeaderboard());
  }, []);

  const filtered = leaderboard
    .filter((e) => modeFilter === "All" || e.mode === modeFilter)
    .filter((e) => catFilter === "All" || e.category === catFilter)
    .sort((a, b) => b.percentage - a.percentage);

  return (
      <main className="h-full p-3 sm:p-5 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg btn-outline hover:scale-105 transition-all">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold text-gradient">Leaderboard</h1>
          </div>
          <span className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>{filtered.length} entries</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 rounded-xl text-sm btn-outline focus:outline-hidden"
            style={{ color: "var(--fg)", background: "var(--card-bg)" }}>
            <option value="All">🏁 All Modes</option>
            <option value="classic">⚡ Classic</option>
            <option value="accuracy">🎯 Accuracy</option>
            <option value="confidence">📈 Confidence</option>
            <option value="marathon">🏆 Marathon</option>
          </select>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 rounded-xl text-sm btn-outline focus:outline-hidden"
            style={{ color: "var(--fg)", background: "var(--card-bg)" }}>
            <option value="All">🎯 All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c] || "📚"} {c}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center accent-bar">
            <Trophy size={40} className="mx-auto mb-3" style={{ color: "var(--fg)", opacity: 0.2 }} />
            <p className="font-medium" style={{ color: "var(--fg)", opacity: 0.5 }}>No entries yet. Play a game first!</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden accent-bar">
            {filtered.map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 border-b last:border-0 transition-colors hover:bg-accent-subtle"
                style={{ borderColor: "color-mix(in srgb, var(--accent-1) 10%, transparent)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-bold w-7 text-center shrink-0 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-600" : ""}`}
                    style={i >= 3 ? { color: "var(--fg)", opacity: 0.4 } : {}}>{i + 1}.</span>
                  <span className="font-medium truncate" style={{ color: "var(--fg)" }}>{entry.name}</span>
                  <span className="font-semibold text-sm" style={{ color: "var(--accent-1)" }}>{entry.percentage}%</span>
                  <span className="text-xs" style={{ color: "var(--fg)", opacity: 0.4 }}>({entry.score}/{entry.total})</span>
                  {entry.streak >= 2 && <Zap size={12} className="text-yellow-500 shrink-0" />}
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--fg)", opacity: 0.4 }}>
                  {CATEGORY_EMOJI[entry.category] || "📚"} {entry.category} &middot; {entry.difficulty} &middot; {entry.mode}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
