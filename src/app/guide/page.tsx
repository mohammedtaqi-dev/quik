"use client";

import { ArrowLeft, Zap, Trophy, Brain, Users, Clock, BarChart3, Sparkles, Play, RotateCcw, Star } from "lucide-react";
import Link from "next/link";

const SECTIONS = [
  {
    icon: <Play size={20} />,
    title: "Game Modes",
    items: [
      { label: "Classic", desc: "Timed quiz with speed bonus. Answer under 5s for +5 extra points per correct answer." },
      { label: "Accuracy", desc: "No timer — take all the time you need. Pure precision." },
      { label: "Confidence", desc: "Wager 5, 10, or 15 points before each question. Get it right to earn your wager, get it wrong to lose it." },
      { label: "Marathon", desc: "Endless mode — keep going until you get 3 wrong answers. How far can you go?" },
    ],
  },
  {
    icon: <Users size={20} />,
    title: "Pass & Play",
    desc: "Tap the Pass & Play toggle to add multiple players. Each player takes turns answering the same set of questions. Scores and wrong-answer retries are tracked separately per player.",
  },
  {
    icon: <Sparkles size={20} />,
    title: "Lifelines",
    items: [
      { label: "🔮 50/50", desc: "Removes two wrong answers, leaving one correct and one incorrect option." },
      { label: "⏭️ Skip", desc: "Skip the current question. Counted as wrong — use it wisely." },
    ],
  },
  {
    icon: <Clock size={20} />,
    title: "Timer & Scoring",
    items: [
      { label: "Timer bar", desc: "Depletes from left to right. Changes from accent → yellow (≤10s) → red (≤5s)." },
      { label: "Points", desc: "10 per correct answer in Classic/Accuracy/Marathon. Speed bonus adds +5 if answered in under 5s." },
      { label: "Confidence scoring", desc: "Wager 5/10/15 pts. Correct = +wager. Wrong = −wager." },
      { label: "Streak", desc: "Consecutive correct answers. Shown as a multiplier badge." },
    ],
  },
  {
    icon: <Trophy size={20} />,
    title: "Ghost Mode",
    desc: "Your best score for each mode/category/difficulty combo is saved automatically. A ghost dot on the progress bar shows where your personal best was. Beat it to get a \"New Personal Best!\" badge and confetti.",
  },
  {
    icon: <Brain size={20} />,
    title: "Flashcard Study",
    desc: "After a quiz, tap \"Study Wrong Answers\" to review each question you missed as a flip card. Tap to reveal the correct answer and explanation. Navigate with Prev/Next or arrow keys.",
  },
  {
    icon: <Star size={20} />,
    title: "Daily Challenge",
    desc: "One challenge per day — 10 questions on random topics. Completing it keeps your streak alive. View your streak in the header dots (28-day history).",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Stats & Achievements",
    desc: "Track total games, accuracy, best streak, perfect games, and per-category breakdown on the Stats page. Unlock achievements by reaching milestones like 5x streak, 100 questions, or a perfect score.",
  },
  {
    icon: <RotateCcw size={20} />,
    title: "Other Features",
    items: [
      { label: "Keyboard shortcuts", desc: "1-4 to answer, M to toggle mute, Escape to exit, Space to flip flashcards." },
      { label: "Sound Packs", desc: "Choose between Retro (square wave), Modern (sine), or Minimal (triangle) in the mode settings." },
      { label: "Wrong-answer retry", desc: "After the quiz, tap \"Retry Wrong\" to re-attempt only the questions you got wrong." },
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-full p-3 sm:p-5 flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full space-y-4 overflow-y-auto">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg btn-outline hover:scale-105 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-gradient">How to Play</h1>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 accent-bar space-y-3">
              <h2 className="font-semibold flex items-center gap-2" style={{ color: "var(--fg)" }}>
                <span className="text-accent">{section.icon}</span>
                {section.title}
              </h2>

              {section.items ? (
                <div className="space-y-2">
                  {section.items.map((item, j) => (
                    <div key={j} className="pl-7">
                      <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{item.label}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--fg)", opacity: 0.6 }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed pl-7" style={{ color: "var(--fg)", opacity: 0.6 }}>{section.desc}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
