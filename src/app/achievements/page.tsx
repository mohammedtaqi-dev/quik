"use client";

import { useState, useEffect } from "react";
import { Award, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { getAchievements, ACHIEVEMENTS_DEF, type Achievement } from "@/lib/quizkit-types";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    setAchievements(getAchievements());
  }, []);

  const unlockedIds = new Set(achievements.map((a) => a.id));

  return (
      <main className="min-h-full p-3 sm:p-5 flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full space-y-4 overflow-y-auto">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg btn-outline hover:scale-105 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-gradient">Achievements</h1>
          <span className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>({achievements.length}/{ACHIEVEMENTS_DEF.length})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS_DEF.map((def) => {
            const unlocked = unlockedIds.has(def.id);
            return (
              <div key={def.id} className={`glass-card rounded-2xl p-5 flex items-center gap-4 transition-all ${unlocked ? "accent-bar" : "opacity-50"}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${unlocked ? "btn-accent" : "bg-gray-200 dark:bg-slate-700"}`}>
                  {unlocked ? def.icon : <Lock size={20} className="text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>{def.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg)", opacity: 0.5 }}>
                    {unlocked ? "Unlocked!" : "Keep playing to unlock"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center accent-bar">
            <Award size={40} className="mx-auto mb-3" style={{ color: "var(--fg)", opacity: 0.2 }} />
            <p className="font-medium" style={{ color: "var(--fg)", opacity: 0.5 }}>No achievements yet. Play your first game!</p>
          </div>
        )}
      </div>
    </main>
  );
}
