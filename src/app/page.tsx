"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, RotateCcw, Award, Clock, Zap, BarChart3, Check, X, Trophy, Sparkles, Star, Brain, Loader2, User, Calendar, Share2, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { questions as localQuestions, categories, type Category } from "@/lib/questions";
import {
  type Screen, type Difficulty, type GameMode, type QItem, type AnswerRecord,
  type LeaderboardEntry, type Achievement, type PlayerStats, type PlayerResult,
  CATEGORY_EMOJI, DIFFICULTY_COLORS, ACHIEVEMENTS_DEF, MODE_CONFIG,
} from "@/lib/quizkit-types";

const TIMER_SECONDS = 15;
const POINTS_PER_CORRECT = 10;
const SPEED_BONUS_THRESHOLD = 5;
const SPEED_BONUS = 5;
const WAGER_AMOUNTS = [5, 10, 15];

const API_CATEGORIES: Record<string, number> = {
  "General Knowledge": 9, "Science & Nature": 17, "History": 23, "Technology": 18,
  "Movies": 11, "Sports": 21, "Music": 12, "Geography": 22,
};

const BTN_GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #8b5cf6, #6366f1)",
  "linear-gradient(135deg, #7c3aed, #a21caf, #7c3aed)",
  "linear-gradient(135deg, #14b8a6, #06b6d4, #14b8a6)",
  "linear-gradient(135deg, #0ea5e9, #3b82f6, #0ea5e9)",
];

const BTN_LABELS = ["A", "B", "C", "D"];

const FUN_FACTS = [
  "Open Trivia DB has over 4,000 verified questions!",
  "The fastest recorded quiz completion is 0.8 seconds per question.",
  "Quik was originally called QuizKit before its rename.",
  "The purple theme is named after the Obsidian gemstone.",
  "Marathon mode ends after 3 wrong answers — choose carefully!",
  "Confidence mode lets you wager 5, 10, or 15 points per question.",
  "Speed bonus kicks in when you answer in under 5 seconds.",
  "A 10x streak multiplies your score by 3!",
  "Daily challenges use a seeded shuffle — same questions all day.",
  "Pass & Play mode supports up to 6 players on one device.",
  "Keyboard shortcuts: 1-4 to answer, M to mute, Esc to go back.",
  "You can review all your answers after each game.",
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function decodeHTML(str: string): string {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#039;/g, "'").replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&eacute;/g, "é").replace(/&agrave;/g, "à").replace(/&egrave;/g, "è").replace(/&ocirc;/g, "ô");
}

function getStreakMultiplier(streak: number): number {
  if (streak < 2) return 1;
  if (streak === 2) return 1.5;
  if (streak === 3) return 2;
  if (streak === 4) return 2.5;
  return 3;
}

function getStreakLabel(streak: number): string {
  if (streak < 2) return "";
  if (streak === 2) return "2x STREAK!";
  if (streak === 3) return "3x STREAK!";
  if (streak === 4) return "4x STREAK!";
  if (streak === 5) return "5x STREAK!";
  return `${streak}x STREAK!`;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash) + seed.charCodeAt(i); hash |= 0; }
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) | 0;
    const j = Math.abs(hash) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchFromAPI(category: string, difficulty: string, amount: number): Promise<QItem[]> {
  const params = new URLSearchParams({ amount: String(amount) });
  if (category !== "All" && API_CATEGORIES[category]) params.set("category", String(API_CATEGORIES[category]));
  if (difficulty !== "All") params.set("difficulty", difficulty.toLowerCase());

  const res = await fetch(`https://opentdb.com/api.php?${params}`);
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  if (data.response_code !== 0) throw new Error("API response code " + data.response_code);

  return data.results.map((r: any, i: number) => {
    const allOptions = shuffleArray([r.correct_answer, ...r.incorrect_answers]);
    const correctIndex = allOptions.indexOf(r.correct_answer);
    return {
      id: Date.now() + i,
      category: r.category,
      difficulty: r.difficulty,
      question: decodeHTML(r.question),
      options: allOptions.map((o: string) => decodeHTML(o)),
      answer: correctIndex,
    };
  });
}

export default function Quik() {
  const [screen, setScreen] = useState<Screen>("register");
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic");
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("All");
  const [questionCount, setQuestionCount] = useState(10);
  const [quizQuestions, setQuizQuestions] = useState<QItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [timer, setTimer] = useState(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<"waiting" | "correct" | "wrong" | "timeout">("waiting");
  const [showConfetti, setShowConfetti] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [totalCorrect, setTotalCorrect] = useState(0);
  const [scorePopup, setScorePopup] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [nickname, setNickname] = useState("Player");
  const [nicknameInput, setNicknameInput] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [wagerAmount, setWagerAmount] = useState<number>(10);
  const [showWager, setShowWager] = useState(false);
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dailyData, setDailyData] = useState<{ played: boolean; score: number; correct: number; total: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ totalGames: 0, totalQuestions: 0, totalCorrect: 0, bestStreak: 0, bestScore: 0, perfectGames: 0, categoryStats: {} });

  const [marathonWrong, setMarathonWrong] = useState(0);
  const [timerDuration, setTimerDuration] = useState(15);
  const [contrastMode, setContrastMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [bgMusic, setBgMusic] = useState(false);
  const [hotSeatMode, setHotSeatMode] = useState(false);
  const [players, setPlayers] = useState<string[]>([nickname]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [usedLocalFallback, setUsedLocalFallback] = useState(false);
  const [showApiToast, setShowApiToast] = useState(false);
  const [amoledMode, setAmoledMode] = useState(
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [soundPack, setSoundPack] = useState<string>("retro");
  const [lifelines, setLifelines] = useState({ fiftyFifty: true, skip: true });
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<QItem[]>([]);
  const [ghostPB, setGhostPB] = useState<{ percentage: number; score: number; correct: number; total: number } | null>(null);
  const [beatPB, setBeatPB] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [dailyStreakLoading, setDailyStreakLoading] = useState(true);
  const factIdxRef = useRef(Math.floor(Math.random() * FUN_FACTS.length));
  useEffect(() => { if (screen === "loading") factIdxRef.current = Math.floor(Math.random() * FUN_FACTS.length); }, [screen]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgMusicRef = useRef<OscillatorNode | null>(null);

  function playTone(freq: number, duration: number, type: OscillatorType = "sine") {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      const packs: Record<string, { type: OscillatorType; mult: number }> = {
        retro: { type: "square", mult: 1 },
        modern: { type, mult: 1 },
        minimal: { type: "triangle", mult: 0.7 },
      };
      const p = packs[soundPack] || packs.retro;
      osc.type = p.type;
      osc.frequency.value = freq * p.mult;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + duration);
    } catch {}
  }

  function playCorrect() { playTone(523, 0.1, "sine"); setTimeout(() => playTone(659, 0.1, "sine"), 100); setTimeout(() => playTone(784, 0.15, "sine"), 200); }
  function playWrong() { playTone(200, 0.3, "sawtooth"); }
  function playTimeout() { playTone(150, 0.5, "sawtooth"); }
  function playAchievement() {
    playTone(523, 0.12, "sine"); setTimeout(() => playTone(659, 0.12, "sine"), 120);
    setTimeout(() => playTone(784, 0.12, "sine"), 240); setTimeout(() => playTone(1047, 0.3, "sine"), 360);
  }
  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  }

  const bgMusicNotes = [261.63, 329.63, 392.00, 261.63];
  useEffect(() => {
    if (!bgMusic) { return; }
    let idx = 0;
    function playNext() {
      if (!bgMusic) return;
      playTone(bgMusicNotes[idx % bgMusicNotes.length], 0.8, "sine");
      idx++;
    }
    const interval = setInterval(playNext, 2000);
    playNext();
    return () => clearInterval(interval);
  }, [bgMusic]);

  useEffect(() => {
    const saved = localStorage.getItem("quizkit_leaderboard");
    if (saved) { try { setLeaderboard(JSON.parse(saved)); } catch {} }
    const savedName = localStorage.getItem("quizkit_nickname");
    if (savedName) { setNickname(savedName); setNicknameInput(savedName); setScreen("start"); }
    else { setScreen("register"); }
    const savedAchievements = localStorage.getItem("quizkit_achievements");
    if (savedAchievements) { try { setAchievements(JSON.parse(savedAchievements)); } catch {} }
    const savedStats = localStorage.getItem("quizkit_stats");
    if (savedStats) { try { setPlayerStats(JSON.parse(savedStats)); } catch {} }
    const savedSound = localStorage.getItem("quizkit_sound");
    if (savedSound !== null) setSoundEnabled(savedSound === "true");
    const savedContrast = localStorage.getItem("quizkit_contrast");
    if (savedContrast !== null) setContrastMode(savedContrast === "true");
    const savedMotion = localStorage.getItem("quizkit_motion");
    if (savedMotion !== null) setReduceMotion(savedMotion === "true");
    const savedMusic = localStorage.getItem("quizkit_music");
    if (savedMusic !== null) setBgMusic(savedMusic === "true");
    const savedTimer = localStorage.getItem("quizkit_timer");
    if (savedTimer !== null) setTimerDuration(parseInt(savedTimer));

    const savedAmoled = localStorage.getItem("quizkit_amoled");
    if (savedAmoled !== null) setAmoledMode(savedAmoled === "true");
    const savedSoundPack = localStorage.getItem("quizkit_soundpack");
    if (savedSoundPack) setSoundPack(savedSoundPack);

    const savedPB = localStorage.getItem("quizkit_pb");
    if (savedPB) { try { setGhostPB(JSON.parse(savedPB)); } catch {} }

    const today = new Date().toISOString().slice(0, 10);
    const dailySaved = localStorage.getItem(`quizkit_daily_${today}`);
    if (dailySaved) { try { setDailyData(JSON.parse(dailySaved)); } catch {} }

    const lastLogin = localStorage.getItem("quizkit_last_login");
    const savedStreak = localStorage.getItem("quizkit_daily_streak");
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastLogin === yesterday) {
      const streak = savedStreak ? parseInt(savedStreak) + 1 : 1;
      setDailyStreak(streak);
      localStorage.setItem("quizkit_daily_streak", String(streak));
    } else if (lastLogin !== today) {
      setDailyStreak(0);
      localStorage.setItem("quizkit_daily_streak", "0");
    } else {
      if (savedStreak) setDailyStreak(parseInt(savedStreak));
    }
    localStorage.setItem("quizkit_last_login", today);
    setDailyStreakLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem("quizkit_sound", String(soundEnabled));
  }, [soundEnabled]);
  useEffect(() => { localStorage.setItem("quizkit_contrast", String(contrastMode)); }, [contrastMode]);
  useEffect(() => { localStorage.setItem("quizkit_motion", String(reduceMotion)); }, [reduceMotion]);
  useEffect(() => { localStorage.setItem("quizkit_music", String(bgMusic)); }, [bgMusic]);
  useEffect(() => { localStorage.setItem("quizkit_timer", String(timerDuration)); }, [timerDuration]);
  useEffect(() => { localStorage.setItem("quizkit_amoled", String(amoledMode)); }, [amoledMode]);
  useEffect(() => { localStorage.setItem("quizkit_soundpack", soundPack); }, [soundPack]);

  function saveAchievements(a: Achievement[]) {
    setAchievements(a);
    localStorage.setItem("quizkit_achievements", JSON.stringify(a));
  }

  function updateStats(stats: PlayerStats) {
    setPlayerStats(stats);
    localStorage.setItem("quizkit_stats", JSON.stringify(stats));
  }

  const handleOptRef = useRef<typeof handleOptionSelect>(() => {});
  useEffect(() => { handleOptRef.current = handleOptionSelect; });

  useEffect(() => {
    document.documentElement.dataset.contrast = contrastMode ? "high" : "normal";
  }, [contrastMode]);
  useEffect(() => {
    document.documentElement.dataset.amoled = amoledMode ? "true" : "false";
  }, [amoledMode]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reduceMotion ? "true" : "false";
  }, [reduceMotion]);

  useEffect(() => {
    if (screen !== "quiz" || answerState !== "waiting") return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "1") handleOptRef.current(0);
      else if (e.key === "2") handleOptRef.current(1);
      else if (e.key === "3") handleOptRef.current(2);
      else if (e.key === "4") handleOptRef.current(3);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, answerState]);

  useEffect(() => {
    function globalKeys(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        if (screen === "register" && nicknameInput.trim()) {
          setNickname(nicknameInput.trim()); localStorage.setItem("quizkit_nickname", nicknameInput.trim()); setScreen("start"); e.preventDefault();
        } else if (screen === "loading") { e.preventDefault(); }
        if (screen === "flashcards") { setFlipped((f) => !f); e.preventDefault(); }
      }
      if (e.key === "Escape") {
        if (screen === "quiz" && confirm("End this game?")) setScreen("start");
        else if (screen === "result" || screen === "review") setScreen("start");
        else if (screen === "flashcards") setScreen("result");
        else if (screen === "hotseat-interstitial") setScreen("start");
        else if (screen === "hotseat-results") setScreen("start");
      }
      if (e.key === "m" || e.key === "M") { setSoundEnabled((s) => !s); }
      if (screen === "flashcards") {
        if (e.key === "ArrowLeft" && flashcardIdx > 0) { setFlashcardIdx((i) => i - 1); setFlipped(false); }
        if (e.key === "ArrowRight" && flashcardIdx < wrongQuestions.length - 1) { setFlashcardIdx((i) => i + 1); setFlipped(false); }
      }
    }
    window.addEventListener("keydown", globalKeys);
    return () => window.removeEventListener("keydown", globalKeys);
  }, [screen, nicknameInput, flashcardIdx, wrongQuestions]);

  const saveToLeaderboard = useCallback((entry: LeaderboardEntry) => {
    const combined = [...leaderboard.filter((e) => e.name !== entry.name), entry]
      .sort((a, b) => b.percentage - a.percentage).slice(0, 20);
    setLeaderboard(combined);
    localStorage.setItem("quizkit_leaderboard", JSON.stringify(combined));
  }, [leaderboard]);

  async function startQuiz() {
    if (hotSeatMode) {
      setNickname(players[currentPlayerIdx]);
      setPlayerResults([]);
    } else if (nicknameInput.trim()) {
      setNickname(nicknameInput.trim());
      localStorage.setItem("quizkit_nickname", nicknameInput.trim());
    }
    setScreen("loading");
    setLoadingMsg("Fetching questions...");
    setWagerAmount(10);
    setUsedLocalFallback(false);
    setShowApiToast(false);

    try {
      const apiQuestions = await fetchFromAPI(selectedCategory, selectedDifficulty, questionCount);
      if (apiQuestions.length > 0) {
        setQuizQuestions(apiQuestions);
        beginQuiz();
        return;
      }
    } catch {}

    setLoadingMsg("Using local questions...");
    setUsedLocalFallback(true);
    setTimeout(() => setShowApiToast(true), 100);
    await new Promise((r) => setTimeout(r, 600));
    let filtered = localQuestions;
    if (selectedCategory !== "All") filtered = filtered.filter((q) => q.category === selectedCategory);
    if (selectedDifficulty !== "All") filtered = filtered.filter((q) => q.difficulty === selectedDifficulty);
    const shuffled = shuffleArray(filtered).slice(0, Math.min(questionCount, filtered.length));
    if (shuffled.length === 0) {
      setScreen("start");
      return;
    }
    setQuizQuestions(shuffled);
    beginQuiz();
  }

  async function startDailyChallenge() {
    setScreen("loading");
    setLoadingMsg("Preparing daily challenge...");
    await new Promise((r) => setTimeout(r, 400));

    const today = new Date().toISOString().slice(0, 10);
    let filtered = localQuestions;
    if (selectedCategory !== "All") filtered = filtered.filter((q) => q.category === selectedCategory);
    const seeded = seededShuffle(filtered, `daily-${today}`).slice(0, 10);
    if (seeded.length === 0) { setScreen("start"); return; }
    setQuizQuestions(seeded);
    setSelectedMode("accuracy");
    beginQuiz();
  }

  function beginQuiz() {
    setCurrentIndex(0);
    setScore(0);
    setAnswers([]);
    setTimer(timerDuration);
    setSelectedOption(null);
    setAnswerState("waiting");
    setShowConfetti(false);
    setTotalCorrect(0);
    setScorePopup(null);
    setStreak(0);
    setBestStreak(0);
    setMarathonWrong(0);
    setShowWager(selectedMode === "confidence");
    setLifelines({ fiftyFifty: true, skip: true });
    setEliminatedOptions([]);
    setWrongQuestions([]);
    setBeatPB(false);
    {
      const pbKey = `${selectedMode}|${selectedCategory}|${selectedDifficulty}`;
      const stored = localStorage.getItem("quizkit_pb");
      if (stored) { try { const pb = JSON.parse(stored); if (pb[pbKey]) setGhostPB(pb[pbKey]); else setGhostPB(null); } catch { setGhostPB(null); } }
    }
    setScreen("quiz");
  }

  function savePlayerResultAndAdvance(correct: number, finalScore: number) {
    const result: PlayerResult = {
      name: players[currentPlayerIdx],
      score: finalScore,
      correct,
      total: quizQuestions.length,
      percentage: Math.round((correct / quizQuestions.length) * 100),
      answers: [...answers],
      streak: bestStreak,
    };
    const updatedResults = [...playerResults, result];
    setPlayerResults(updatedResults);
    const nextIdx = currentPlayerIdx + 1;
    if (nextIdx < players.length) {
      setCurrentPlayerIdx(nextIdx);
      setNickname(players[nextIdx]);
      setScreen("hotseat-interstitial");
    } else {
      setScreen("hotseat-results");
    }
  }

  function saveDailyChallenge(correct: number, finalScore: number) {
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `quizkit_daily_${today}`;
    if (!localStorage.getItem(dailyKey)) {
      const d = { played: true, score: finalScore, correct, total: quizQuestions.length };
      localStorage.setItem(dailyKey, JSON.stringify(d)); setDailyData(d);
    }
  }

  function updatePlayerStats(correct: number, finalScore: number) {
    const catStats = { ...(playerStats.categoryStats || {}) };
    quizQuestions.forEach((q, i) => {
      const a = answers[i];
      if (!a) return;
      const cat = q.category || "Unknown";
      if (!catStats[cat]) catStats[cat] = { correct: 0, total: 0 };
      catStats[cat] = { correct: catStats[cat].correct + (a.correct ? 1 : 0), total: catStats[cat].total + 1 };
    });
    updateStats({
      totalGames: playerStats.totalGames + 1,
      totalQuestions: playerStats.totalQuestions + quizQuestions.length,
      totalCorrect: playerStats.totalCorrect + correct,
      bestStreak: Math.max(playerStats.bestStreak, bestStreak),
      bestScore: Math.max(playerStats.bestScore, finalScore),
      perfectGames: playerStats.perfectGames + (correct === quizQuestions.length ? 1 : 0),
      categoryStats: catStats,
    });
  }

  function checkAndUpdateAchievements(correct: number) {
    const newAchievements = [...achievements];
    if (!newAchievements.find((a) => a.id === "first")) newAchievements.push({ id: "first", label: "First Steps", icon: "🌟", unlocked: true });
    if (correct === quizQuestions.length && !newAchievements.find((a) => a.id === "perfect")) newAchievements.push({ id: "perfect", label: "Perfect Score", icon: "💯", unlocked: true });
    if (bestStreak >= 5 && !newAchievements.find((a) => a.id === "streak5")) newAchievements.push({ id: "streak5", label: "Streak Master (5x)", icon: "🔥", unlocked: true });
    if (bestStreak >= 10 && !newAchievements.find((a) => a.id === "streak10")) newAchievements.push({ id: "streak10", label: "Streak Legend (10x)", icon: "⚡", unlocked: true });
    if (selectedMode === "marathon" && !newAchievements.find((a) => a.id === "marathon")) newAchievements.push({ id: "marathon", label: "Marathon Runner", icon: "🏃", unlocked: true });
    if (playerStats.totalQuestions + quizQuestions.length >= 100 && !newAchievements.find((a) => a.id === "century")) newAchievements.push({ id: "century", label: "Century (100 Qs)", icon: "🏅", unlocked: true });
    if (newAchievements.length > achievements.length) { saveAchievements(newAchievements); playAchievement(); }
  }

  const finishQuiz = useCallback(() => {
    const correct = answers.filter((a) => a.correct).length;
    const finalScore = score;
    setTotalCorrect(correct);
    setScore(finalScore);

    if (hotSeatMode) {
      savePlayerResultAndAdvance(correct, finalScore);
      return;
    }

    const maxPossible = selectedMode === "confidence" ? quizQuestions.length * 15 : quizQuestions.length * POINTS_PER_CORRECT;
    saveToLeaderboard({
      name: nickname, score: finalScore, total: maxPossible,
      percentage: Math.round((correct / quizQuestions.length) * 100),
      streak: bestStreak, category: selectedCategory === "All" ? "Mixed" : selectedCategory,
      difficulty: selectedDifficulty === "All" ? "Mixed" : selectedDifficulty,
      mode: selectedMode, date: new Date().toISOString(),
    });
    saveDailyChallenge(correct, finalScore);
    if (correct / quizQuestions.length >= 0.8) setShowConfetti(true);
    updatePlayerStats(correct, finalScore);
    checkAndUpdateAchievements(correct);
    {
      const pct = Math.round((correct / quizQuestions.length) * 100);
      const pbKey = `${selectedMode}|${selectedCategory}|${selectedDifficulty}`;
      const stored = localStorage.getItem("quizkit_pb");
      const allPb = stored ? JSON.parse(stored) : {};
      const prevPb = allPb[pbKey];
      if (!prevPb || pct > prevPb.percentage || (pct === prevPb.percentage && finalScore > prevPb.score)) {
        allPb[pbKey] = { percentage: pct, score: finalScore, correct, total: quizQuestions.length };
        localStorage.setItem("quizkit_pb", JSON.stringify(allPb));
        setBeatPB(true);
        if (pct > (prevPb?.percentage || 0)) setShowConfetti(true);
      }
    }
    setScreen("result");
  }, [answers, score, selectedMode, quizQuestions, selectedCategory, selectedDifficulty, nickname, bestStreak, playerStats, achievements, saveToLeaderboard, hotSeatMode, players, currentPlayerIdx, playerResults]);

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 < quizQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setTimer(timerDuration);
      setSelectedOption(null);
      setAnswerState("waiting");
      setScorePopup(null);
      setShowWager(selectedMode === "confidence");
    } else {
      finishQuiz();
    }
  }, [currentIndex, quizQuestions, finishQuiz, timerDuration]);

  useEffect(() => {
    if (screen !== "quiz" || answerState !== "waiting" || selectedMode === "accuracy" || selectedMode === "confidence") return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          playTimeout(); vibrate([100, 50, 100]);
          setAnswerState("timeout");
          setStreak(0);
          setAnswers((prev) => [...prev, { questionId: quizQuestions[currentIndex]?.id ?? 0, selected: -1, correct: false, timeSpent: timerDuration }]);
          setTimeout(nextQuestion, 1500);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, answerState, currentIndex, quizQuestions, nextQuestion, selectedMode]);

  function handleWagerConfirm() {
    setShowWager(false);
  }

  function handleOptionSelect(index: number) {
    if (answerState !== "waiting") return;
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = quizQuestions[currentIndex].answer === index;
    const timeSpent = timerDuration - timer;
    if (!correct) setWrongQuestions((w) => [...w, quizQuestions[currentIndex]]);
    setSelectedOption(index);
    setAnswerState(correct ? "correct" : "wrong");
    if (correct) {
      playCorrect(); vibrate(30);
      let pts: number;
      if (selectedMode === "confidence") {
        pts = wagerAmount;
      } else if (selectedMode === "accuracy") {
        pts = POINTS_PER_CORRECT;
      } else {
        const newStreak = streak + 1;
        const multiplier = getStreakMultiplier(newStreak);
        const bonus = timeSpent <= SPEED_BONUS_THRESHOLD ? SPEED_BONUS : 0;
        pts = Math.round(POINTS_PER_CORRECT * multiplier) + bonus;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
      }
      setScore((s) => s + pts);
      setScorePopup(pts);
      setTimeout(() => setScorePopup(null), 800);
    } else {
      playWrong(); vibrate([50, 30, 50]);
      if (selectedMode === "confidence") {
        setScore((s) => s - wagerAmount);
        setScorePopup(-wagerAmount);
        setTimeout(() => setScorePopup(null), 800);
      } else if (selectedMode === "marathon") {
        const newWrong = marathonWrong + 1;
        setMarathonWrong(newWrong);
        if (newWrong >= 3) {
          setAnswers((prev) => [...prev, { questionId: quizQuestions[currentIndex].id, selected: index, correct, timeSpent }]);
          finishQuiz();
          return;
        }
      }
      setStreak(0);
    }
    setAnswers((prev) => [...prev, { questionId: quizQuestions[currentIndex].id, selected: index, correct, timeSpent }]);
    setTimeout(nextQuestion, correct ? 1000 : 1500);
  }

  function getGrade(percentage: number) {
    if (percentage >= 90) return { letter: "A+", color: "#10b981", label: "Outstanding!" };
    if (percentage >= 80) return { letter: "A", color: "#10b981", label: "Excellent!" };
    if (percentage >= 70) return { letter: "B", color: "#3b82f6", label: "Great Job!" };
    if (percentage >= 60) return { letter: "C", color: "#f59e0b", label: "Good Effort!" };
    if (percentage >= 50) return { letter: "D", color: "#f97316", label: "Keep Trying!" };
    return { letter: "F", color: "#ef4444", label: "Better Luck Next Time!" };
  }

  function handleShare() {
    const text = `🎯 I scored ${Math.round((totalCorrect / quizQuestions.length) * 100)}% on Quik! Can you beat me? 🏆`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById("shareBtn");
      if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Share"; }, 2000); }
    });
  }

  const q = quizQuestions[currentIndex];
  const progress = quizQuestions.length > 0 ? ((currentIndex + 1) / quizQuestions.length) * 100 : 0;
  const grade = screen === "result" ? getGrade(Math.round((totalCorrect / quizQuestions.length) * 100)) : null;

  function OptionBtn({ opt, i }: { opt: string; i: number }) {
    const isSelected = selectedOption === i;
    const isCorrectAnswer = q!.answer === i;
    const isEliminated = eliminatedOptions.includes(i);
    const disabled = answerState !== "waiting" || isEliminated;
    const gradient = BTN_GRADIENTS[i] || BTN_GRADIENTS[0];
    let labelIcon = BTN_LABELS[i] || "?";

    let btnStyle: React.CSSProperties = { background: gradient, backgroundSize: "200% 200%" };
    let extraClass = "shadow-lg";

    if (isEliminated) {
      btnStyle = { background: "var(--card-bg)", opacity: 0.2 };
      extraClass = "opacity-20";
      labelIcon = "—";
    } else if (answerState !== "waiting") {
      if (isCorrectAnswer) {
        btnStyle = { background: "#22c55e" };
        extraClass = "shadow-lg shadow-emerald-500/40 scale-[1.03]";
        labelIcon = "✓";
      } else if (isSelected) {
        btnStyle = { background: "#ef4444" };
        extraClass = "scale-[0.97]";
        labelIcon = "✗";
      } else {
        btnStyle = { background: "#9ca3af" };
        extraClass = "opacity-50";
      }
    }

    return (
      <button onClick={() => handleOptionSelect(i)} disabled={disabled}
        aria-label={`Option ${BTN_LABELS[i]}: ${opt}`}
        className={`relative flex items-center gap-3 w-full p-3 sm:p-4 rounded-2xl text-white font-semibold text-sm sm:text-base transition-all duration-200 ${extraClass} ${
          answerState === "waiting" ? "animate-gradient hover:scale-[1.03] hover:shadow-xl active:scale-[0.97] cursor-pointer" : "cursor-default"
        }`}
        style={btnStyle}>
        <span className="shrink-0 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-extrabold shadow-inner">
          {labelIcon}
        </span>
        <span className="flex-1 text-left leading-relaxed drop-shadow-sm">{opt}</span>
      </button>
    );
  }

  if (screen === "register") {
    return (
      <main className="h-full p-4 flex items-center justify-center animate-screen-in relative overflow-hidden">
        <div className="floating-hex" style={{top:"15%",left:"5%",width:48,height:48,color:"var(--accent-1)",animationDuration:"25s"} as React.CSSProperties}>
          <svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 2L35 11L35 29L20 38L5 29L5 11Z"/></svg>
        </div>
        <div className="floating-hex" style={{top:"65%",left:"8%",width:36,height:36,color:"var(--accent-2)",animationDuration:"22s"} as React.CSSProperties}>
          <svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 2L35 11L35 29L20 38L5 29L5 11Z"/></svg>
        </div>
        <div className="floating-hex" style={{top:"10%",right:"5%",width:56,height:56,color:"var(--accent-1)",animationDuration:"28s"} as React.CSSProperties}>
          <svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 2L35 11L35 29L20 38L5 29L5 11Z"/></svg>
        </div>
        <div className="floating-hex" style={{top:"70%",right:"8%",width:40,height:40,color:"var(--accent-2)",animationDuration:"20s"} as React.CSSProperties}>
          <svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 2L35 11L35 29L20 38L5 29L5 11Z"/></svg>
        </div>
        <div className="floating-hex" style={{top:"40%",left:"50%",width:32,height:32,color:"var(--accent-1)",animationDuration:"30s"} as React.CSSProperties}>
          <svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 2L35 11L35 29L20 38L5 29L5 11Z"/></svg>
        </div>
        <div className="flex flex-col items-center gap-8 w-full max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800/50 flex items-center justify-center shadow-xl border border-gray-200 dark:border-slate-700 animate-scale-in">
              <svg viewBox="0 0 40 40" className="w-10 h-10" aria-label="Quik">
                <defs><linearGradient id="qlg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--accent-1)" /><stop offset="100%" stopColor="var(--accent-2)" /></linearGradient></defs>
                <path d="M20 2L35 11L35 29L20 38L5 29L5 11Z" fill="url(#qlg)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                <path d="M20 10L13 21L18 21L15 32L26 18L20 18Z" fill="white" opacity="0.95" />
              </svg>
            </div>
            <h1 className="text-2xl text-gradient tracking-tight" style={{ fontFamily: "var(--font-brand)" }}>Quik</h1>
          </div>

          <div className="glass-card rounded-2xl p-6 w-full space-y-5 text-center accent-bar">
            <div>
              <h2 className="text-xl" style={{ color: "var(--fg)", fontFamily: "var(--font-brand)" }}>Welcome to Quik</h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg)", opacity: 0.6 }}>Enter your nickname to start</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-subtle border-accent">
              <User size={20} className="shrink-0 text-accent" />
                <input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} placeholder="Enter your nickname" maxLength={20}
                onKeyDown={(e) => { if (e.key === "Enter" && nicknameInput.trim()) { setNickname(nicknameInput.trim()); localStorage.setItem("quizkit_nickname", nicknameInput.trim()); setScreen("start"); } }}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800/50 border text-accent-fg rounded-lg text-sm transition-all placeholder:text-gray-400"
                style={{ borderColor: "color-mix(in srgb, var(--accent-1) 30%, transparent)", outline: "none" }} />
            </div>
            <button onClick={() => { if (nicknameInput.trim()) { setNickname(nicknameInput.trim()); localStorage.setItem("quizkit_nickname", nicknameInput.trim()); setScreen("start"); } }}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                nicknameInput.trim() ? "btn-accent" : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-60"
              }`}
              disabled={!nicknameInput.trim()}>
              <Play size={18} /> Let's Go
            </button>
          </div>
        </div>
        <style>{`
          @keyframes bounce {
            from { transform: translateY(0); opacity: 0.3; }
            to { transform: translateY(-10px); opacity: 1; }
          }
        `}</style>
      </main>
    );
  }

  if (screen === "start") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyCard = !dailyData ? (
      <div className="glass-card rounded-2xl p-4 flex items-center gap-3 accent-bar shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 btn-accent">
          <Calendar size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs" style={{ color: "var(--fg)" }}>Daily Challenge</p>
          <p className="text-[10px]" style={{ color: "var(--fg)", opacity: 0.5 }}>{todayStr}</p>
        </div>
        {!dailyStreakLoading && dailyStreak > 0 && (
          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
            🔥 {dailyStreak} day{dailyStreak > 1 ? "s" : ""}
          </span>
        )}
        <button onClick={startDailyChallenge} aria-label="Play daily challenge" className="px-3 py-1.5 btn-accent rounded-lg text-xs font-medium shrink-0">Play</button>
      </div>
    ) : (
      <div className="glass-card rounded-2xl p-4 flex items-center gap-3 accent-bar shrink-0">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <Check size={16} className="text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs" style={{ color: "var(--fg)" }}>Daily Done!</p>
          <p className="text-[10px]" style={{ color: "var(--fg)", opacity: 0.5 }}>{dailyData.correct}/{dailyData.total} correct</p>
        </div>
        {!dailyStreakLoading && dailyStreak > 0 && (
          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
            🔥 {dailyStreak} day{dailyStreak > 1 ? "s" : ""}
          </span>
        )}
      </div>
    );

    const navLinks = (
      <div className="flex flex-col gap-2">
        <Link href="/stats" className="px-4 py-3 rounded-xl btn-outline text-xs font-medium transition-all hover:border-accent flex items-center gap-2">
          <BarChart3 size={14} className="text-accent" /> Statistics
        </Link>
        <Link href="/achievements" className="px-4 py-3 rounded-xl btn-outline text-xs font-medium transition-all hover:border-accent flex items-center gap-2">
          <Award size={14} className="text-accent" /> Achievements
        </Link>
        <Link href="/leaderboard" className="px-4 py-3 rounded-xl btn-outline text-xs font-medium transition-all hover:border-accent flex items-center gap-2">
          <Trophy size={14} className="text-accent" /> Leaderboard
        </Link>
      </div>
    );

    const settingsRow = (
      <div className="flex flex-wrap gap-2">
        {[
          ["Sound", soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />, () => setSoundEnabled((s) => !s), soundEnabled],
          ["Contrast", <span style={{ fontSize: 12 }}>🔲</span>, () => setContrastMode((c) => !c), contrastMode],
          ["Reduced FX", <span style={{ fontSize: 12 }}>🎯</span>, () => setReduceMotion((m) => !m), reduceMotion],
          ["Music", <span style={{ fontSize: 12 }}>🎵</span>, () => setBgMusic((m) => !m), bgMusic],
          ["AMOLED", <span style={{ fontSize: 12 }}>⬛</span>, () => setAmoledMode((a) => !a), amoledMode],
        ].map(([label, icon, onClick, active]: any) => (
          <button key={label} onClick={onClick} aria-label={`Toggle ${label}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium btn-outline ${active ? "text-accent" : "opacity-50"}`}>
            {icon} {label}
          </button>
        ))}
      </div>
    );

    const modeButtons = (
      <div>
        <label className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Mode</label>
        <div className="flex gap-2 mt-1.5">
          {MODE_CONFIG.map((m) => (
            <button key={m.id} onClick={() => setSelectedMode(m.id)}
              className={`flex-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${selectedMode === m.id ? "btn-accent" : "btn-outline"}`}>
              <span className="block">{m.icon} {m.label}</span>
              <span className="text-[9px] opacity-60">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );

    const configRow = (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Category</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as Category | "All")}
            className="w-full mt-1 px-3 py-2 rounded-xl text-xs appearance-none cursor-pointer btn-outline focus:outline-hidden"
            style={{ color: "var(--fg)", background: "var(--card-bg)" }}>
            <option value="All">{CATEGORY_EMOJI["All"]} All</option>
            {categories.map((cat) => <option key={cat} value={cat}>{CATEGORY_EMOJI[cat] || "📚"} {cat}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Difficulty</label>
          <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value as Difficulty)}
            className="w-full mt-1 px-3 py-2 rounded-xl text-xs appearance-none cursor-pointer btn-outline focus:outline-hidden"
            style={{ color: "var(--fg)", background: "var(--card-bg)" }}>
            {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
              <option key={d} value={d} style={d !== "All" ? { color: DIFFICULTY_COLORS[d] } : {}}>
                {d === "Easy" ? "🟢" : d === "Medium" ? "🟡" : d === "Hard" ? "🔴" : "⚪"} {d}
              </option>
            ))}
          </select>
        </div>
      </div>
    );

    const extraOptions = (
      <>
        {selectedMode !== "accuracy" && selectedMode !== "marathon" && (
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Questions: <span className="font-bold text-accent">{questionCount}</span></label>
            <input type="range" min={5} max={50} step={5} value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full mt-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(90deg, var(--accent-1) ${((questionCount - 5) / 45) * 100}%, color-mix(in srgb, var(--accent-1) 15%, transparent) ${((questionCount - 5) / 45) * 100}%)`, accentColor: "var(--accent-1)", WebkitAppearance: "none", outline: "none" }} />
            <div className="flex justify-between text-[9px] mt-0.5" style={{ color: "var(--fg)", opacity: 0.3 }}>
              <span>5</span><span>15</span><span>25</span><span>35</span><span>50</span>
            </div>
          </div>
        )}
        {(selectedMode === "classic" || selectedMode === "marathon") && (
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Timer</label>
            <select value={timerDuration} onChange={(e) => setTimerDuration(parseInt(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded-xl text-xs appearance-none cursor-pointer btn-outline focus:outline-hidden"
              style={{ color: "var(--fg)", background: "var(--card-bg)" }}>
                <option value={5}>⚡ 5s</option><option value={10}>🔥 10s</option><option value={15}>⏱️ 15s</option><option value={30}>🧘 30s</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Sound Pack</label>
            <select value={soundPack} onChange={(e) => setSoundPack(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl text-xs appearance-none cursor-pointer btn-outline focus:outline-hidden"
              style={{ color: "var(--fg)", background: "var(--card-bg)" }}>
              <option value="retro">🕹️ Retro</option>
              <option value="modern">🎧 Modern</option>
              <option value="minimal">🌿 Minimal</option>
            </select>
          </div>
        </>
      );

    const HOT_SEAT_COLORS = ["#7c3aed", "#ec4899", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];
    const hotSeatSection = (
      <div className="space-y-2">
        <button onClick={() => { setHotSeatMode((h) => !h); if (!hotSeatMode) { setPlayers([nickname]); setCurrentPlayerIdx(0); } }}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${hotSeatMode ? "btn-accent" : "btn-outline"}`}>
          <span style={{ fontSize: 14 }}>👥</span> Pass & Play {hotSeatMode ? "ON" : "OFF"}
        </button>
        {hotSeatMode && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg btn-outline group">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ background: HOT_SEAT_COLORS[i % HOT_SEAT_COLORS.length] }}>
                    {p[0].toUpperCase()}
                  </span>
                  <span className="text-[11px] font-medium truncate max-w-[72px]" style={{ color: "var(--fg)" }}>{p}</span>
                  <button onClick={() => { const next = players.filter((_, j) => j !== i); setPlayers(next.length ? next : [nickname]); setCurrentPlayerIdx(0); }}
                    className="text-red-400/0 group-hover:text-red-400 transition-colors shrink-0">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Add player name" maxLength={16}
                onKeyDown={(e) => { if (e.key === "Enter" && newPlayerName.trim()) { setPlayers((p) => [...p, newPlayerName.trim()]); setNewPlayerName(""); } }}
                className="flex-1 px-3 py-2 rounded-xl text-xs btn-outline focus:outline-hidden"
                style={{ color: "var(--fg)", background: "var(--card-bg)" }} />
              <button onClick={() => { if (newPlayerName.trim()) { setPlayers((p) => [...p, newPlayerName.trim()]); setNewPlayerName(""); } }}
                className="px-3 py-2 rounded-xl btn-accent text-xs font-medium shrink-0">Add</button>
            </div>
            <p className="text-[9px] text-center" style={{ color: "var(--fg)", opacity: 0.3 }}>{players.length} player{players.length > 1 ? "s" : ""} · min 2 to play</p>
          </div>
        )}
      </div>
    );

    const canStart = !hotSeatMode || players.length >= 2;
    const startBtn = (
      <button onClick={startQuiz} disabled={!canStart}
        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          canStart ? "btn-accent" : "btn-outline opacity-40 cursor-not-allowed"
        }`}>
        <Play size={16} /> {hotSeatMode ? `Start for ${players[currentPlayerIdx]}` : "Start Quiz"}
      </button>
    );

    function genCalendar() {
      const days: string[] = [];
      const now = new Date();
      for (let i = 27; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const played = localStorage.getItem(`quizkit_daily_${key}`);
        days.push(played ? key : "");
      }
      return days;
    }

    return (
      <main className="h-full p-3 sm:p-5 flex flex-col overflow-hidden animate-screen-in">
        {showApiToast && (
          <div className="mb-2 px-3 py-2 rounded-xl text-[10px] font-medium animate-slide-up flex items-center gap-2 shrink-0"
            style={{ background: "color-mix(in srgb, #f59e0b 15%, transparent)", color: "#d97706", border: "1px solid color-mix(in srgb, #f59e0b 25%, transparent)" }}
            role="alert">
            <span>📡</span> Server offline — using local questions
            <button onClick={() => setShowApiToast(false)} className="ml-auto text-current opacity-50 hover:opacity-100" aria-label="Dismiss">✕</button>
          </div>
        )}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-medium">
            <Brain size={14} /> Test Your Knowledge
          </div>
          <h1 className="text-xl sm:text-2xl text-gradient" style={{ fontFamily: "var(--font-brand)" }}>Quik</h1>
        </div>

        <div className="flex items-center gap-2 mb-3 shrink-0 overflow-x-auto">
          {!dailyData ? (
            <button onClick={startDailyChallenge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-outline text-[10px] font-medium shrink-0 hover:border-amber-400">
              <Calendar size={12} className="text-amber-400" /> Daily
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium shrink-0">
              <Check size={12} /> Daily Done
            </span>
          )}
          {!dailyStreakLoading && dailyStreak > 0 && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-medium shrink-0">
              🔥 {dailyStreak}
            </span>
          )}
          <div className="flex items-center gap-1 overflow-x-auto">
            {genCalendar().map((d, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-sm shrink-0 ${d ? "bg-accent" : ""}`} style={d ? {} : { background: "color-mix(in srgb, var(--accent-1) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent-1) 15%, transparent)" }}
                title={d || ""} />
            ))}
          </div>
          <Link href="/stats" className="px-3 py-1.5 rounded-xl btn-outline text-[10px] font-medium shrink-0">📊 Stats</Link>
          <Link href="/achievements" className="px-3 py-1.5 rounded-xl btn-outline text-[10px] font-medium shrink-0">🏅 Achievements</Link>
          <Link href="/leaderboard" className="px-3 py-1.5 rounded-xl btn-outline text-[10px] font-medium shrink-0">🏆 Leaderboard</Link>
          <Link href="/guide" className="px-3 py-1.5 rounded-xl btn-outline text-[10px] font-medium shrink-0">❓ Guide</Link>
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto shrink-0 pb-1 lg:hidden -mx-3 px-3">
          {MODE_CONFIG.map((m) => (
            <button key={m.id} onClick={() => setSelectedMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all whitespace-nowrap ${
                m.id === selectedMode ? "btn-accent" : "btn-outline opacity-70"
              }`}>
              <span style={{fontSize:14}}>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 items-stretch">
          {(() => {
            const selected = MODE_CONFIG.find((m) => m.id === selectedMode)!;
            const others = MODE_CONFIG.filter((m) => m.id !== selectedMode);
            return (
              <>
                <div key={selected.id} onClick={() => {/* no-op */}}
                  className={`glass-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3 mode-card mode-card-accent mode-card-selected`}
                  style={{ borderColor: "transparent" }}>
                  <span className="text-4xl">{selected.icon}</span>
                  <span className="text-lg font-bold" style={{ color: "var(--fg)" }}>{selected.label}</span>
                  <span className="text-xs text-center" style={{ color: "var(--fg)", opacity: 0.5 }}>{selected.desc}</span>
                  <div className="w-full mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    {configRow}
                    {extraOptions}
                    {hotSeatSection}
                    {startBtn}
                  </div>
                </div>
                <div className="flex-col gap-4 hidden lg:flex">
                  {others.map((m) => (
                    <div key={m.id} onClick={() => { setSelectedMode(m.id); }}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedMode(m.id); } }}
                      aria-label={`Mode: ${m.label} — ${m.desc}`}
                      className={`glass-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3 mode-card mode-card-accent flex-1`}
                      style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                      <span className="text-4xl">{m.icon}</span>
                      <span className="text-lg font-bold" style={{ color: "var(--fg)" }}>{m.label}</span>
                      <span className="text-xs text-center" style={{ color: "var(--fg)", opacity: 0.5 }}>{m.desc}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </main>
    );
  }

  if (screen === "loading") {
    return (
      <main className="h-full p-4 flex items-center justify-center animate-screen-in">
        <div className="text-center animate-fade-in max-w-xs">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: "color-mix(in srgb, var(--accent-1) 20%, transparent)" }} />
            <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: "var(--accent-1)" }} />
            <Loader2 size={24} className="absolute inset-0 m-auto animate-pulse text-accent" />
          </div>
          <p className="font-medium" style={{ color: "var(--fg)" }}>{loadingMsg}</p>
          <p className="text-xs mt-3 px-4 py-2 rounded-lg" style={{ color: "var(--fg)", opacity: 0.4, background: "color-mix(in srgb, var(--accent-1) 6%, transparent)" }}>
            💡 {FUN_FACTS[factIdxRef.current]}
          </p>
        </div>
      </main>
    );
  }

  if (screen === "result") {
    const percentage = quizQuestions.length > 0 ? Math.round((totalCorrect / quizQuestions.length) * 100) : 0;
    const topThree = [...leaderboard].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
    const userEntry = leaderboard.find((e) => e.name === nickname && e.date === leaderboard.filter((l) => l.name === nickname)[0]?.date);
    const userRank = userEntry ? leaderboard.indexOf(userEntry) + 1 : -1;

    return (
      <main className="h-full p-3 sm:p-5 flex flex-col overflow-hidden animate-screen-in">
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
            <div className="lg:col-span-3 space-y-4">
              <div className="text-center">
                {showConfetti && (
                  <div className="flex justify-center gap-2 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Sparkles key={i} size={28} className="text-yellow-400 animate-bounce-in" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-sm font-medium mb-2">
                  <User size={14} /> {nickname}
                </div>
                <div className="text-7xl font-extrabold mb-1 transition-all duration-500 hover:scale-110" style={{ color: grade?.color }}>{grade?.letter}</div>
                <p className="text-lg font-medium text-gray-700 dark:text-slate-300">{grade?.label}</p>
                {beatPB && (
                  <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-600 dark:text-amber-400 text-xs font-bold animate-bounce-in">
                    <Sparkles size={14} /> New Personal Best!
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-6 accent-bar space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl" style={{ background: "color-mix(in srgb, var(--accent-1) 8%, transparent)" }}>
                    <Check size={24} className="mx-auto mb-1 text-emerald-500" />
                    <div className="text-2xl font-bold" style={{ color: "var(--fg)" }}>{totalCorrect}/{quizQuestions.length}</div>
                    <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Correct</div>
                  </div>
                  <div className="text-center p-4 rounded-xl" style={{ background: "color-mix(in srgb, var(--accent-1) 8%, transparent)" }}>
                    <Award size={24} className="mx-auto mb-1 text-accent" />
                    <div className="text-2xl font-bold" style={{ color: "var(--fg)" }}>{percentage}%</div>
                    <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl btn-outline">
                    <Zap size={18} className="mx-auto mb-0.5 text-accent" />
                    <div className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{score}</div>
                    <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Points</div>
                  </div>
                  <div className="text-center p-3 rounded-xl btn-outline">
                    <BarChart3 size={18} className="mx-auto mb-0.5 text-emerald-500" />
                    <div className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{quizQuestions.length - totalCorrect}</div>
                    <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Wrong</div>
                  </div>
                  <div className="text-center p-3 rounded-xl btn-outline">
                    <Clock size={18} className="mx-auto mb-0.5 text-violet-500" />
                    <div className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{selectedMode !== "confidence" ? answers.filter((a) => a.timeSpent <= SPEED_BONUS_THRESHOLD && a.correct).length : "—"}</div>
                    <div className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>{selectedMode !== "confidence" ? "Speed Bonus" : "Wager"}</div>
                  </div>
                </div>

                {bestStreak >= 2 && (
                  <div className="text-center p-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--accent-1) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent-1) 20%, transparent)" }}>
                    <Zap size={20} className="mx-auto mb-0.5 text-accent" />
                    <div className="text-lg font-semibold text-accent">Best Streak: {bestStreak}x</div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {topThree.length > 0 && (
                <div className="glass-card rounded-2xl p-5 text-center accent-bar h-full">
                  <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-4 flex items-center justify-center gap-2"><Trophy size={18} className="text-yellow-500" /> Leaderboard</h3>
                  <div className="flex items-end justify-center gap-3">
                    {topThree.length >= 2 && (
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs border-2 border-gray-300 dark:border-gray-600">2</div>
                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mt-1 truncate max-w-[72px]">{topThree[1].name}</p>
                        <div className="w-14 h-14 bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-t-lg mt-1 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{topThree[1].percentage}%</span>
                        </div>
                      </div>
                    )}
                    {topThree.length >= 1 && (
                      <div className="flex flex-col items-center -mt-4">
                        <Trophy size={20} className="text-yellow-500 mb-1" />
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg shadow-yellow-500/30 border-2 border-yellow-300">1</div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-1 truncate max-w-[72px]">{topThree[0].name}</p>
                        <div className="w-16 h-16 bg-gradient-to-t from-yellow-500 to-yellow-400 dark:from-yellow-600 dark:to-yellow-500 rounded-t-lg mt-1 shadow-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-white drop-shadow-sm">{topThree[0].percentage}%</span>
                        </div>
                      </div>
                    )}
                    {topThree.length >= 3 && (
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-xs border-2 border-orange-300 dark:border-orange-700">3</div>
                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mt-1 truncate max-w-[72px]">{topThree[2].name}</p>
                        <div className="w-14 h-12 bg-gradient-to-t from-orange-300 to-orange-200 dark:from-orange-800 dark:to-orange-700 rounded-t-lg mt-1 flex items-center justify-center">
                          <span className="text-xs font-bold text-orange-700 dark:text-orange-300">{topThree[2].percentage}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-1 max-h-32 overflow-y-auto">
                    {leaderboard.slice(3, 10).map((e, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg btn-outline text-xs">
                        <span className="font-medium text-gray-500 dark:text-gray-400 w-5">#{i + 4}</span>
                        <span className="flex-1 text-left truncate max-w-[100px]" style={{ color: "var(--fg)" }}>{e.name}</span>
                        <span style={{ color: "var(--accent-1)" }}>{e.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto mb-4">
            {quizQuestions.map((q, i) => {
              const a = answers[i];
              if (!a) return null;
              return (
                <div key={q.id} className={`flex items-start gap-2 p-2.5 rounded-xl text-sm transition-colors ${
                  a.correct ? "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" :
                  "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"}`}>
                  {a.correct ? <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <X size={16} className="text-red-500 mt-0.5 shrink-0" />}
                  <span className="text-gray-700 dark:text-slate-300 flex-1 text-xs leading-relaxed">{q.question}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={startQuiz} className="flex-1 py-3 btn-accent rounded-xl font-semibold flex items-center justify-center gap-2">
              <RotateCcw size={18} /> Play Again
            </button>
            <button onClick={() => { setScreen("start"); setShowConfetti(false); }} className="py-3 px-5 btn-outline rounded-xl font-medium">
              Home
            </button>
            <button id="shareBtn" onClick={handleShare} className="py-3 px-4 btn-outline rounded-xl font-medium flex items-center gap-1.5 shrink-0">
              <Share2 size={16} /> Share
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setScreen("review")} className="flex-1 py-2 btn-outline rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              <Brain size={16} /> Review Answers
            </button>
            {wrongQuestions.length > 0 && (
              <button onClick={() => { setQuizQuestions(wrongQuestions); setQuestionCount(wrongQuestions.length); beginQuiz(); }}
                className="flex-1 py-2 btn-outline rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:border-amber-400">
                <RotateCcw size={14} /> Retry {wrongQuestions.length} Wrong
              </button>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            {wrongQuestions.length > 0 && (
              <button onClick={() => { setFlashcardIdx(0); setFlipped(false); setScreen("flashcards"); }}
                className="flex-1 py-2 btn-outline rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:border-violet-400">
                <Brain size={14} /> Study {wrongQuestions.length} Wrong
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (screen === "review") {
    return (
      <main className="h-full p-3 sm:p-5 flex flex-col overflow-hidden animate-screen-in">
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gradient">Review</h2>
            <button onClick={() => setScreen("result")} className="px-4 py-2 btn-outline rounded-xl text-sm font-medium">Back</button>
          </div>
          <div className="space-y-3">
            {quizQuestions.map((q, i) => {
              const a = answers[i];
              if (!a) return null;
              const isCorrect = a.correct;
              return (
                <div key={q.id} className="glass-card rounded-2xl p-5 space-y-3"
                  style={{ borderColor: isCorrect ? "color-mix(in srgb, #22c55e 30%, transparent)" : "color-mix(in srgb, #ef4444 30%, transparent)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>{q.question}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${isCorrect ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
                      {isCorrect ? "Correct" : "Wrong"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt, j) => {
                      const isSelected = a.selected === j;
                      const isAnswer = q.answer === j;
                      let bg = "bg-gray-50 dark:bg-slate-800/50";
                      if (isAnswer) bg = "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400";
                      else if (isSelected && !isCorrect) bg = "bg-red-100 dark:bg-red-900/30";
                      return (
                        <span key={j} className={`px-3 py-1.5 rounded-lg text-xs border ${bg}`}
                          style={{ borderColor: isAnswer ? "#22c55e" : isSelected && !isCorrect ? "#ef4444" : "transparent" }}>
                          {opt}
                          {isSelected && !isCorrect && <X size={12} className="inline ml-1 text-red-500" />}
                          {isAnswer && <Check size={12} className="inline ml-1 text-emerald-500" />}
                        </span>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="text-xs mt-1 px-3 py-2 rounded-lg" style={{ color: "var(--fg)", opacity: 0.6, background: "color-mix(in srgb, var(--accent-1) 6%, transparent)" }}>
                      💡 {q.explanation}
                    </p>
                  )}
                  {!q.explanation && !isCorrect && (
                    <p className="text-xs mt-1" style={{ color: "var(--fg)", opacity: 0.4 }}>
                      Correct answer: <span className="font-medium text-emerald-500">{q.options[q.answer]}</span>
                    </p>
                  )}
                  <p className="text-xs" style={{ color: "var(--fg)", opacity: 0.5 }}>Answered in {a.timeSpent}s</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  if (screen === "flashcards") {
    const fc = wrongQuestions[flashcardIdx];
    return (
      <main className="h-full p-3 sm:p-5 flex flex-col overflow-hidden animate-screen-in">
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gradient">Flashcard Study</h2>
            <button onClick={() => setScreen("result")} className="px-4 py-2 btn-outline rounded-xl text-sm font-medium">Back</button>
          </div>
          {wrongQuestions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-sm" style={{ color: "var(--fg)", opacity: 0.5 }}>No wrong answers to study!</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-4" key={flashcardIdx}>
              <div onClick={() => setFlipped(!flipped)} className="glass-card rounded-2xl p-6 sm:p-8 min-h-[260px] flex flex-col items-center justify-center text-center cursor-pointer select-none"
                style={{ borderColor: "color-mix(in srgb, var(--accent-1) 25%, transparent)", transition: "transform 0.4s" }}>
                <span className="text-xs font-medium mb-3" style={{ color: "var(--fg)", opacity: 0.4 }}>Card {flashcardIdx + 1} of {wrongQuestions.length} — tap to {flipped ? "hide" : "reveal"}</span>
                {!flipped ? (
                  <p className="text-base sm:text-lg font-medium leading-relaxed" style={{ color: "var(--fg)" }}>{fc?.question}</p>
                ) : (
                  <div className="space-y-4 animate-scale-in">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                      <Check size={16} /> {fc!.options[fc!.answer]}
                    </div>
                    {fc!.explanation && (
                      <p className="text-sm leading-relaxed px-4 py-3 rounded-xl" style={{ color: "var(--fg)", opacity: 0.7, background: "color-mix(in srgb, var(--accent-1) 6%, transparent)" }}>
                        💡 {fc!.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => { if (flashcardIdx > 0) { setFlashcardIdx((i) => i - 1); setFlipped(false); } }}
                  disabled={flashcardIdx === 0}
                  className="px-4 py-2 btn-outline rounded-xl text-sm font-medium disabled:opacity-30">Previous</button>
                <span className="text-xs" style={{ color: "var(--fg)", opacity: 0.4 }}>
                  {wrongQuestions.length - flashcardIdx - 1} remaining
                </span>
                <button onClick={() => { if (flashcardIdx < wrongQuestions.length - 1) { setFlashcardIdx((i) => i + 1); setFlipped(false); } }}
                  disabled={flashcardIdx === wrongQuestions.length - 1}
                  className="px-4 py-2 btn-outline rounded-xl text-sm font-medium disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
      </main>
    );
  }

  if (screen === "hotseat-interstitial") {
    const nextPlayer = players[currentPlayerIdx];
    return (
      <main className="h-full p-4 flex items-center justify-center animate-screen-in">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center btn-accent">
            <User size={28} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Great job, {players[currentPlayerIdx - 1]}!</p>
            <h2 className="text-xl font-bold mt-2" style={{ color: "var(--fg)" }}>Now it's <span className="text-accent">{nextPlayer}</span>'s turn</h2>
            <p className="text-sm mt-2" style={{ color: "var(--fg)", opacity: 0.5 }}>Hand the device over and tap start when ready</p>
          </div>
          <button onClick={async () => {
            setCurrentIndex(0);
            setScore(0);
            setAnswers([]);
            setTimer(timerDuration);
            setSelectedOption(null);
            setAnswerState("waiting");
            setTotalCorrect(0);
            setScorePopup(null);
            setStreak(0);
            setBestStreak(0);
            setMarathonWrong(0);
            setWrongQuestions([]);
            setLifelines({ fiftyFifty: true, skip: true });
            setEliminatedOptions([]);
            setShowWager(selectedMode === "confidence");
            setScreen("loading");
            setLoadingMsg("Ready for " + nextPlayer + "...");
            await new Promise((r) => setTimeout(r, 400));
            setScreen("quiz");
          }} className="px-8 py-3 btn-accent rounded-xl font-semibold flex items-center gap-2">
            <Play size={18} /> Start {nextPlayer}'s Turn
          </button>
        </div>
      </main>
    );
  }

  if (screen === "hotseat-results") {
    const sorted = [...playerResults].sort((a, b) => b.percentage - a.percentage || b.score - a.score);
    const winner = sorted[0];
    const hasPerfect = playerResults.some((p) => p.percentage === 100);
    return (
      <main className="h-full p-3 sm:p-5 flex flex-col overflow-hidden animate-screen-in">
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full space-y-4 overflow-y-auto">
          <div className="text-center">
            {hasPerfect && (
              <div className="flex justify-center gap-2 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Sparkles key={i} size={24} className="text-yellow-400 animate-bounce-in" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
            <Trophy size={40} className="mx-auto text-yellow-500 mb-2" />
            <h2 className="text-xl font-bold text-gradient">Pass & Play Results</h2>
            <p className="text-sm mt-1" style={{ color: "var(--fg)", opacity: 0.5 }}>{sorted.length} players</p>
          </div>
          {winner && (
            <div className="glass-card rounded-2xl p-5 text-center accent-bar">
              <Star size={24} className="mx-auto text-yellow-500 mb-1" />
              <p className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.5 }}>Winner</p>
              <p className="text-2xl font-extrabold text-gradient">{winner.name}</p>
              <p className="text-sm mt-1" style={{ color: "var(--fg)", opacity: 0.6 }}>{winner.correct}/{winner.total} correct ({winner.percentage}%)</p>
            </div>
          )}
          <div className="glass-card rounded-2xl p-5 accent-bar space-y-3">
            {sorted.map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? "bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-400/30" : "btn-outline"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200" : i === 2 ? "bg-orange-300 dark:bg-orange-800 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--fg)" }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--fg)", opacity: 0.4 }}>{p.correct}/{p.total} correct · {p.score} pts · Streak {p.streak}x</p>
                </div>
                <span className="text-lg font-extrabold" style={{ color: i === 0 ? "var(--accent-1)" : "var(--fg)", opacity: i === 0 ? 1 : 0.6 }}>{p.percentage}%</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setScreen("start"); }} className="flex-1 py-3 btn-accent rounded-xl font-semibold">Home</button>
            <button onClick={() => { setCurrentPlayerIdx(0); setPlayerResults([]); startQuiz(); }} className="flex-1 py-3 btn-outline rounded-xl font-semibold flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Rematch
            </button>
          </div>
        </div>
      </main>
    );
  }

  const hasTimer = selectedMode === "classic" || selectedMode === "marathon";
  const isConfidence = selectedMode === "confidence";

  return (
    <main className="h-full p-3 sm:p-5 flex flex-col overflow-hidden animate-screen-in">
      <div className="flex items-center justify-between text-xs shrink-0" style={{ color: "var(--fg)", opacity: 0.6 }}>
        <div className="flex items-center gap-2">
          <span className="font-medium">{currentIndex + 1}/{quizQuestions.length}</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-accent-subtle text-accent">{nickname}</span>
          <span className="px-2 py-0.5 rounded text-[10px] capitalize btn-outline" style={{ color: "var(--fg)" }}>{selectedMode}</span>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 1 && hasTimer && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold animate-streak-glow"
              style={{ background: "color-mix(in srgb, var(--accent-1) 15%, transparent)", color: "var(--accent-1)" }}>
              <Zap size={10} /> {streak}x
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[10px] bg-accent-subtle text-accent">{score} pts</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-accent-subtle text-accent">{q?.category}</span>
          <button onClick={() => { if (confirm("End this game?")) { setScreen("start"); } }}
            aria-label="Exit quiz"
            className="px-2 py-1 rounded-lg text-[10px] btn-outline hover:text-red-400 transition-colors ml-1">
            Exit
          </button>
        </div>
      </div>

      <div className="mt-2 relative w-full rounded-full h-1.5 overflow-hidden shrink-0" style={{ background: "color-mix(in srgb, var(--accent-1) 15%, transparent)" }}>
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }} />
        {ghostPB && progress < ghostPB.percentage && (
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/40 border border-white/60 z-10" style={{ left: `min(${ghostPB.percentage}%, calc(100% - 0.75rem))`, boxShadow: "0 0 6px rgba(255,255,255,0.3)" }} title={`PB: ${ghostPB.percentage}%`} />
        )}
      </div>

      <div className="flex justify-center gap-1 mt-1.5 shrink-0">
        {quizQuestions.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            i === currentIndex ? "bg-accent scale-125" : i < currentIndex ? "bg-gray-400 dark:bg-gray-600" : "bg-gray-300 dark:bg-gray-700"
          }`} />
        ))}
      </div>

      {hasTimer && (
        <div className="shrink-0 relative h-1 mx-0.5 -mt-0.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--accent-1) 10%, transparent)" }}>
          <div className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timer / timerDuration) * 100}%`, background: timer <= 5 ? "#ef4444" : timer <= 10 ? "#eab308" : "var(--accent-1)" }} />
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center gap-4 min-h-0 py-3 max-w-3xl mx-auto w-full">
        <div key={currentIndex} className="animate-slide-in-right">
        <div className={`glass-card rounded-2xl p-5 transition-all duration-300 ${
          answerState === "correct" ? "correct-flash" :
          answerState === "wrong" || answerState === "timeout" ? "wrong-flash" : timer <= 5 && hasTimer ? "timer-danger" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold leading-relaxed" style={{ color: "var(--fg)" }}>{q?.question}</h2>
            {hasTimer && (
              <div className="relative shrink-0">
                <svg width="48" height="48" className={`transition-all duration-300 ${timer <= 5 ? "animate-timer-pulse" : ""}`}>
                  <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="3.5"
                    className="text-gray-200 dark:text-slate-700" />
                  <circle cx="24" cy="24" r="19" fill="none" strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 19}`}
                    strokeDashoffset={`${2 * Math.PI * 19 * (1 - timer / timerDuration)}`}
                    transform="rotate(-90, 24, 24)"
                    className={`transition-all duration-1000 ease-linear ${
                      timer <= 5 ? "stroke-red-500" : timer <= 10 ? "stroke-yellow-500" : "stroke-emerald-500"
                    }`} />
                  <text x="24" y="27" textAnchor="middle" className={`text-[10px] font-bold fill-current ${
                    timer <= 5 ? "text-red-500" : "text-yellow-600 dark:text-yellow-400"}`}>{timer}</text>
                </svg>
              </div>
            )}
            {!hasTimer && (
              <span className="shrink-0 px-2 py-1 rounded text-[10px] btn-outline" style={{ color: "var(--fg)" }}>
                {isConfidence ? "Wager" : "Untimed"}
              </span>
            )}
          </div>
        </div>

        {answerState === "waiting" && hasTimer && (lifelines.fiftyFifty || lifelines.skip) && (
          <div className="flex justify-center gap-2">
            {lifelines.fiftyFifty && (
              <button onClick={() => {
                const wrongIndices = q!.options.map((_, i) => i).filter((i) => i !== q!.answer);
                const toEliminate = shuffleArray(wrongIndices).slice(0, 2);
                setEliminatedOptions(toEliminate);
                setLifelines((l) => ({ ...l, fiftyFifty: false }));
              }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium btn-outline hover:border-amber-400"
                aria-label="50/50 - remove two wrong answers">
                <span>🔮</span> 50/50
              </button>
            )}
            {lifelines.skip && (
              <button onClick={() => {
                setLifelines((l) => ({ ...l, skip: false }));
                setAnswers((prev) => [...prev, { questionId: q!.id, selected: -2, correct: false, timeSpent: 0 }]);
                setSelectedOption(-2);
                setAnswerState("wrong");
                setTimeout(() => nextQuestion(), 800);
              }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium btn-outline hover:border-amber-400"
                aria-label="Skip this question">
                <span>⏭️</span> Skip
              </button>
            )}
          </div>
        )}

        {isConfidence && showWager && answerState === "waiting" && (
          <div className="glass-card rounded-2xl p-4 text-center space-y-2 animate-scale-in accent-bar">
            <p className="text-xs font-medium" style={{ color: "var(--fg)", opacity: 0.6 }}>Wager your points</p>
            <div className="flex justify-center gap-2">
              {WAGER_AMOUNTS.map((amt) => (
                <button key={amt} onClick={() => { setWagerAmount(amt); handleWagerConfirm(); }}
                  className={`px-5 py-2.5 rounded-xl text-base font-bold transition-all ${
                    wagerAmount === amt ? "btn-accent scale-110 shadow-lg" : "btn-outline hover:scale-105"
                  }`}>
                  +{amt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          {scorePopup && (
            <div className={`absolute -top-2 right-0 z-10 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-bounce-in shadow-lg ${
              scorePopup > 0 ? "bg-emerald-500 shadow-emerald-500/30" : "bg-red-500 shadow-red-500/30"
            }`}>
              {scorePopup > 0 ? "+" : ""}{scorePopup}
            </div>
          )}
          <div className={`grid gap-2 ${q?.options.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
            {q?.options.map((opt, i) => <OptionBtn key={i} opt={opt} i={i} />)}
          </div>
        </div>

        </div>
        <div className="flex items-center justify-center gap-3 shrink-0">
          {!hasTimer && answerState === "waiting" && (
            <span className="text-[10px]" style={{ color: "var(--fg)", opacity: 0.4 }}>No timer — take your time</span>
          )}
          {answerState === "waiting" && (
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--fg)", opacity: 0.3 }}>
              {["1", "2", "3", "4"].map((k) => (
                <kbd key={k} className="kbd-hint" aria-label={`Press ${k}`}>{k}</kbd>
              ))}
            </span>
          )}
          {answerState !== "waiting" && answerState !== "timeout" && (
            <span className="text-[10px] font-medium" style={{ color: answerState === "correct" ? "#22c55e" : "#ef4444" }} role="alert">
              {answerState === "correct" ? "✓ Correct!" : answerState === "wrong" ? "✗ Wrong" : ""}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
