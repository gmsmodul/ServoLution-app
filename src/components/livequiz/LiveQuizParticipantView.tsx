import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Flame,
  Info,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Palette,
  Pause,
  RotateCcw,
  Send,
  Shirt,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  LiveQuizAnswerResult,
  LiveQuizRoomState,
} from '../../types';
import type { LiveQuizEmoteEvent, WsConnectionStatus } from '../../hooks/useLiveQuizSocket';
import {
  WAYGROUND_ARENA_THEMES,
  WAYGROUND_PARTICIPANT_TF_TILES,
  WAYGROUND_PARTICIPANT_TILES,
  type WaygroundArenaThemeId,
} from '../../constants/waygroundTheme';
import {
  MASCOT_OPTIONS,
  WaygroundCountdownOverlay,
  WaygroundMascotFigure,
  WaygroundParticipantBackdrop,
  WaygroundPodiumCharacter,
  type MascotId,
} from './WaygroundStageVisuals';
import { playQuizSound, speakQuizText } from '../../utils/quizAudio';

interface LiveQuizParticipantViewProps {
  roomState: LiveQuizRoomState;
  connectionStatus: WsConnectionStatus;
  lastAnswerResult: LiveQuizAnswerResult | null;
  onSubmitAnswer: (
    questionId: string,
    payload: { selectedOptionIndex?: number; textAnswer?: string; timeTakenMs: number }
  ) => void;
  onReportTabSwitch: () => void;
  onClearAnswerResult: () => void;
  onLeave: () => void;
  onUpdateName?: (newName: string) => void;
  onSendEmote?: (emoji: string) => void;
  recentEmotes?: LiveQuizEmoteEvent[];
  skipEntryConfirm?: boolean;
  embedded?: boolean;
  fullScreen?: boolean;
}

interface LocalFloatingEmote {
  id: string;
  emoji: string;
  sender: string;
  offsetX: number;
}

const LOBBY_EMOTES = [
  { emoji: '🔥', label: 'Semangat', bg: 'from-[#F97316] to-[#DC2626]' },
  { emoji: '⚡', label: 'Cepat', bg: 'from-[#8B5CF6] to-[#6D28D9]' },
  { emoji: '👏', label: 'Keren', bg: 'from-[#EC4899] to-[#BE185D]' },
  { emoji: '🤩', label: 'Siap!', bg: 'from-[#F59E0B] to-[#D97706]' },
  { emoji: '🚀', label: 'Gas!', bg: 'from-[#06B6D4] to-[#0284C7]' },
];

export const LiveQuizParticipantView: React.FC<LiveQuizParticipantViewProps> = ({
  roomState,
  connectionStatus,
  lastAnswerResult,
  onSubmitAnswer,
  onReportTabSwitch,
  onClearAnswerResult,
  onLeave,
  onUpdateName,
  onSendEmote,
  recentEmotes = [],
  skipEntryConfirm = false,
  embedded = false,
  fullScreen = false,
}) => {
  const questions = roomState.questionsForParticipant || [];
  const reviewQuestions = roomState.reviewQuestions || [];
  const me = roomState.participants.find((p) => p.id === roomState.participantId);
  const answeredCount = me?.answeredCount || 0;

  const [hasConfirmedEntry, setHasConfirmedEntry] = useState<boolean>(true);
  const [editableName, setEditableName] = useState<string>(() => me?.name || '');
  const [readAloud, setReadAloud] = useState<boolean>(false);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [themeId, setThemeId] = useState<WaygroundArenaThemeId>('plum');
  const [themeMenuOpen, setThemeMenuOpen] = useState<boolean>(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState<boolean>(false);
  const [mascotId, setMascotId] = useState<MascotId>('explorer');
  const [mascotMenuOpen, setMascotMenuOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [floatingEmotes, setFloatingEmotes] = useState<LocalFloatingEmote[]>([]);

  const [currentIndex, setCurrentIndex] = useState<number>(answeredCount);
  const [textInput, setTextInput] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [tabWarningBanner, setTabWarningBanner] = useState(false);
  const [countdownStep, setCountdownStep] = useState<3 | 2 | 1>(3);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const arenaRef = useRef<HTMLDivElement>(null);
  const questionStartRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const submittedForQuestionRef = useRef<string | null>(null);
  const submitAnswerRef = useRef(onSubmitAnswer);
  submitAnswerRef.current = onSubmitAnswer;
  const clearResultRef = useRef(onClearAnswerResult);
  clearResultRef.current = onClearAnswerResult;
  const prevStatusRef = useRef(roomState.status);
  const lastCountdownBeepRef = useRef<number | null>(null);
  const seenRemoteEmotesRef = useRef<Set<string>>(new Set());

  const arenaTheme = WAYGROUND_ARENA_THEMES[themeId];
  const activeQuestion = questions[currentIndex];
  const formattedCode = `${roomState.code.slice(0, 3)} ${roomState.code.slice(3)}`;

  // Sync pre-filled name once participant record arrives from server
  useEffect(() => {
    if (me?.name && !editableName) {
      setEditableName(me.name);
    }
  }, [me?.name, editableName]);

  // Synchronized 3 -> 2 -> 1 countdown phase when quiz is started
  useEffect(() => {
    if (roomState.status !== 'countdown') {
      lastCountdownBeepRef.current = null;
      return;
    }

    const fallbackEndsAt = Date.now() + 3000;
    const targetEnd = roomState.countdownEndsAt || fallbackEndsAt;

    const updateStep = () => {
      const remainingMs = Math.max(0, targetEnd - Date.now());
      const rawStep = Math.ceil(remainingMs / 1000);
      const clampedStep = (rawStep >= 3 ? 3 : rawStep === 2 ? 2 : 1) as 3 | 2 | 1;
      setCountdownStep(clampedStep);
      if (lastCountdownBeepRef.current !== clampedStep) {
        lastCountdownBeepRef.current = clampedStep;
        playQuizSound('countdown', soundEffects);
      }
    };

    updateStep();
    const intervalId = window.setInterval(updateStep, 80);
    return () => window.clearInterval(intervalId);
  }, [roomState.status, roomState.countdownEndsAt, soundEffects]);

  // Play start sound when transitioning into active quiz
  useEffect(() => {
    if (
      (prevStatusRef.current === 'lobby' || prevStatusRef.current === 'countdown') &&
      roomState.status === 'active'
    ) {
      setHasConfirmedEntry(true);
      playQuizSound('start', soundEffects);
    }
    prevStatusRef.current = roomState.status;
  }, [roomState.status, soundEffects]);

  // Mirror incoming WebSocket room emotes into floating stage animations
  useEffect(() => {
    for (const remote of recentEmotes) {
      if (seenRemoteEmotesRef.current.has(remote.id)) continue;
      seenRemoteEmotesRef.current.add(remote.id);
      if (remote.participantId === roomState.participantId) continue;
      const offsetX = Math.floor(Math.random() * 140) - 70;
      setFloatingEmotes((prev) => [
        ...prev.slice(-8),
        { id: remote.id, emoji: remote.emoji, sender: remote.name, offsetX },
      ]);
      window.setTimeout(() => {
        setFloatingEmotes((prev) => prev.filter((item) => item.id !== remote.id));
      }, 2200);
    }
  }, [recentEmotes, roomState.participantId]);

  // Keep index synced if reconnecting mid-quiz
  useEffect(() => {
    if (roomState.status === 'active' && currentIndex < answeredCount) {
      setCurrentIndex(answeredCount);
    }
  }, [roomState.status, answeredCount, currentIndex]);

  // Auto-dismiss compact answer feedback toast after 2.5s without blocking gameplay
  useEffect(() => {
    if (!lastAnswerResult) return;
    if (roomState.mode === 'classic') {
      playQuizSound(lastAnswerResult.isCorrect ? 'correct' : 'wrong', soundEffects);
    }
    const timeoutId = window.setTimeout(() => {
      clearResultRef.current();
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [lastAnswerResult?.questionId, lastAnswerResult?.isCorrect, roomState.mode, soundEffects]);

  // Read active question aloud if enabled
  useEffect(() => {
    if (roomState.status === 'active' && !roomState.paused && activeQuestion && readAloud) {
      speakQuizText(activeQuestion.prompt, true);
    }
    return () => {
      if (readAloud) speakQuizText('', false);
    };
  }, [roomState.status, roomState.paused, activeQuestion?.id, readAloud]);

  // Reset per-question timer when moving to a new question
  useEffect(() => {
    if (roomState.status !== 'active' || !activeQuestion) return;
    elapsedBeforePauseRef.current = 0;
    questionStartRef.current = Date.now();
    submittedForQuestionRef.current = null;
    setTextInput('');
    setTimeLeft(activeQuestion.timeLimitSec);
  }, [roomState.status, activeQuestion?.id]);

  // Run per-question countdown while active and not paused by Host
  useEffect(() => {
    if (roomState.status !== 'active' || !activeQuestion || me?.finished) return;
    if (roomState.paused) {
      elapsedBeforePauseRef.current += Date.now() - questionStartRef.current;
      return;
    }

    questionStartRef.current = Date.now();
    const timer = window.setInterval(() => {
      const elapsedMs =
        elapsedBeforePauseRef.current + (Date.now() - questionStartRef.current);
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, activeQuestion.timeLimitSec - elapsedSec);
      setTimeLeft(remaining);
      if (remaining === 0 && submittedForQuestionRef.current !== activeQuestion.id) {
        submittedForQuestionRef.current = activeQuestion.id;
        window.clearInterval(timer);
        clearResultRef.current();
        submitAnswerRef.current(activeQuestion.id, {
          selectedOptionIndex: -1,
          textAnswer: '',
          timeTakenMs: activeQuestion.timeLimitSec * 1000,
        });
        setCurrentIndex((prev) => prev + 1);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [roomState.status, roomState.paused, activeQuestion?.id, me?.finished]);

  // Test Mode tab-switch detection
  useEffect(() => {
    if (embedded || roomState.mode !== 'test' || roomState.status !== 'active' || roomState.paused || me?.finished) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabWarningBanner(true);
        onReportTabSwitch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [embedded, roomState.mode, roomState.status, roomState.paused, me?.finished, onReportTabSwitch]);

  // Desktop/Tablet keyboard shortcuts (1–4) during active multiple-choice / true-false questions
  useEffect(() => {
    if (
      embedded ||
      roomState.status !== 'active' ||
      roomState.paused ||
      me?.finished ||
      !activeQuestion ||
      activeQuestion.type === 'short_answer'
    ) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const num = Number(e.key);
      if (Number.isInteger(num) && num >= 1 && num <= activeQuestion.options.length) {
        if (submittedForQuestionRef.current === activeQuestion.id) return;
        submittedForQuestionRef.current = activeQuestion.id;
        const elapsedMs =
          elapsedBeforePauseRef.current + (Date.now() - questionStartRef.current);
        clearResultRef.current();
        playQuizSound('click', soundEffects);
        submitAnswerRef.current(activeQuestion.id, {
          selectedOptionIndex: num - 1,
          timeTakenMs: elapsedMs,
        });
        setCurrentIndex((prev) => prev + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [embedded, roomState.status, roomState.paused, me?.finished, activeQuestion, soundEffects]);

  const handleToggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await (arenaRef.current || document.documentElement).requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore fullscreen restrictions inside iframe
    }
  };

  const handleApplyNameChange = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editableName.trim();
    if (!trimmed) return;
    if (trimmed !== me?.name) {
      onUpdateName?.(trimmed);
    }
    playQuizSound('click', soundEffects);
    setSettingsMenuOpen(false);
  };

  const handleTriggerEmote = (emoji: string) => {
    playQuizSound('emote', soundEffects);
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const offsetX = Math.floor(Math.random() * 110) - 55;
    setFloatingEmotes((prev) => [
      ...prev.slice(-8),
      { id: localId, emoji, sender: me?.name || editableName || 'Kamu', offsetX },
    ]);
    window.setTimeout(() => {
      setFloatingEmotes((prev) => prev.filter((item) => item.id !== localId));
    }, 2200);
    onSendEmote?.(emoji);
  };

  const handleSelectOption = (oIdx: number) => {
    if (
      roomState.paused ||
      !activeQuestion ||
      submittedForQuestionRef.current === activeQuestion.id
    ) {
      return;
    }
    submittedForQuestionRef.current = activeQuestion.id;
    const elapsedMs =
      elapsedBeforePauseRef.current + (Date.now() - questionStartRef.current);
    clearResultRef.current();
    playQuizSound('click', soundEffects);
    submitAnswerRef.current(activeQuestion.id, {
      selectedOptionIndex: oIdx,
      timeTakenMs: elapsedMs,
    });
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSubmitShortAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      roomState.paused ||
      !activeQuestion ||
      !textInput.trim() ||
      submittedForQuestionRef.current === activeQuestion.id
    ) {
      return;
    }
    submittedForQuestionRef.current = activeQuestion.id;
    const elapsedMs =
      elapsedBeforePauseRef.current + (Date.now() - questionStartRef.current);
    clearResultRef.current();
    playQuizSound('click', soundEffects);
    submitAnswerRef.current(activeQuestion.id, {
      textAnswer: textInput.trim(),
      timeTakenMs: elapsedMs,
    });
    setTextInput('');
    setCurrentIndex((prev) => prev + 1);
  };

  const sortedParticipants = [...roomState.participants].sort(
    (a, b) => b.score - a.score || b.correctCount - a.correctCount
  );
  const myRank = Math.max(1, sortedParticipants.findIndex((p) => p.id === roomState.participantId) + 1);
  const myInitials = (me?.name || editableName || 'P')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const timePct =
    activeQuestion && activeQuestion.timeLimitSec > 0
      ? Math.max(0, Math.min(100, (timeLeft / activeQuestion.timeLimitSec) * 100))
      : 100;

  const renderThemeSelector = (align: 'left' | 'right' = 'right') => (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setThemeMenuOpen((prev) => !prev);
          setMascotMenuOpen(false);
          setSettingsMenuOpen(false);
        }}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/12 text-white text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
      >
        <Palette className="w-3.5 h-3.5 shrink-0" />
        <span>Theme</span>
      </button>

      {themeMenuOpen && (
        <div
          className={`absolute top-full mt-2 z-40 w-48 rounded-xl bg-[#180720]/95 border border-white/15 p-2 shadow-2xl space-y-1 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {(Object.keys(WAYGROUND_ARENA_THEMES) as WaygroundArenaThemeId[]).map((id) => {
            const item = WAYGROUND_ARENA_THEMES[id];
            const active = id === themeId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setThemeId(id);
                  setThemeMenuOpen(false);
                  playQuizSound('click', soundEffects);
                }}
                className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-[12.5px] font-medium cursor-pointer transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: item.swatch }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                {active && <Check className="w-3.5 h-3.5 text-[#00C985] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  void skipEntryConfirm;
  void hasConfirmedEntry;

  // =========================================================================
  // LOBBY STAGE: DIRECT SPOTLIGHT PODIUM WAITING ARENA (Screenshot)
  // =========================================================================
  if (roomState.status === 'lobby') {
    return (
      <div
        ref={arenaRef}
        className={`relative overflow-hidden text-white flex flex-col justify-between ${
          fullScreen
            ? 'flex-1 w-full min-h-[620px]'
            : embedded
            ? 'min-h-[540px] rounded-2xl border border-white/10 shadow-[0_24px_60px_-20px_rgba(26,7,34,0.55)]'
            : 'min-h-[660px] sm:min-h-[78vh] rounded-2xl border border-white/10 shadow-[0_24px_60px_-20px_rgba(26,7,34,0.55)]'
        }`}
      >
        <WaygroundParticipantBackdrop theme={arenaTheme} spotlight />

        {/* Top HUD Bar */}
        <div className="relative z-20 px-4 sm:px-6 pt-3.5 pb-2 flex flex-wrap items-start justify-between gap-3">
          {/* Top-Left: Character Customizer Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMascotMenuOpen((prev) => !prev);
                setThemeMenuOpen(false);
                setSettingsMenuOpen(false);
              }}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#19081B]/85 hover:bg-[#240D27] border border-white/15 text-left cursor-pointer transition-colors shadow-lg"
            >
              <span className="w-8 h-8 rounded-lg bg-[#0EA5E9]/25 border border-[#38BDF8]/40 flex items-center justify-center text-[#7DD3FC]">
                <Shirt className="w-4 h-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-[12px] font-bold text-white">Karakter →</span>
                <span className="block text-[10.5px] text-amber-300 font-semibold">
                  {MASCOT_OPTIONS.find((m) => m.id === mascotId)?.label || 'Explorer'}
                </span>
              </span>
            </button>

            {mascotMenuOpen && (
              <div className="absolute left-0 top-full mt-2 z-40 w-48 rounded-xl bg-[#180720]/95 border border-white/15 p-2 shadow-2xl space-y-1">
                {MASCOT_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMascotId(m.id);
                      setMascotMenuOpen(false);
                      playQuizSound('click', soundEffects);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-[12.5px] font-medium cursor-pointer transition-colors ${
                      mascotId === m.id
                        ? 'bg-white/15 text-white'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/30"
                        style={{ backgroundColor: m.capColor }}
                      />
                      <span>{m.label}</span>
                    </span>
                    {mascotId === m.id && <Check className="w-3.5 h-3.5 text-[#00C985]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Top-Center: Waiting for Host Header */}
          <div className="flex flex-col items-center text-center py-1 mx-auto sm:mx-0">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white/95">
              <span>Menunggu host memulai kuis...</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/12 border border-white/15 text-[11.5px] tabular-nums">
                <Users className="w-3 h-3 text-[#C4B5FD]" />
                {roomState.participants.length}
              </span>
            </div>
            <div className="text-[11px] text-white/60 mt-0.5 hidden sm:block">
              {roomState.quizTitle} · {roomState.totalQuestions} Soal ·{' '}
              {roomState.mode === 'classic' ? 'Classic Mode' : 'Test Mode'}
            </div>
          </div>

          {/* Top-Right: Curved Dock (Code, Theme, Menu/Settings, Fullscreen, Exit) + Pro Tip */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#19081B]/85 border border-white/15 shadow-lg">
              <span className="px-2.5 h-8 rounded-lg bg-white/10 inline-flex items-center text-[12px] font-mono font-bold tracking-wider tabular-nums">
                {formattedCode}
              </span>
              {renderThemeSelector('right')}

              {/* Compact Menu / Settings Drawer Button (Audio, Read-Aloud, Rename, Leave) */}
              <button
                type="button"
                onClick={() => {
                  setSettingsMenuOpen((prev) => !prev);
                  setThemeMenuOpen(false);
                  setMascotMenuOpen(false);
                }}
                title="Pengaturan audio & nama"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/12 flex items-center justify-center text-white cursor-pointer transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                title="Layar penuh"
                className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/12 items-center justify-center text-white cursor-pointer transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onLeave}
                title={embedded ? 'Tutup Uji Coba' : 'Keluar'}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#E53E51]/45 border border-white/12 flex items-center justify-center text-white cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              {/* Settings Popover */}
              {settingsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl bg-[#180720]/95 backdrop-blur-md border border-white/15 p-3.5 shadow-2xl space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-white/75">
                      Pengaturan Peserta
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettingsMenuOpen(false)}
                      className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handleApplyNameChange} className="space-y-1.5">
                    <label
                      htmlFor="wayground-rename-input"
                      className="block text-[11px] text-white/65 font-medium"
                    >
                      Ubah Nama di Podium
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="wayground-rename-input"
                        type="text"
                        maxLength={32}
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        className="flex-1 h-8 px-2.5 rounded-lg bg-white text-[#1C1D21] text-[12.5px] font-semibold outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!editableName.trim()}
                        className="h-8 px-2.5 rounded-lg bg-[#00C985] hover:bg-[#00B377] disabled:opacity-45 text-[#05261A] text-[12px] font-bold cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white">
                        <Volume2 className="w-3.5 h-3.5 text-white/75" />
                        <span>Bacakan teks soal</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={readAloud}
                        onClick={() => setReadAloud((prev) => !prev)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          readAloud ? 'bg-[#00C985]' : 'bg-white/25'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            readAloud ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white">
                        {soundEffects ? (
                          <Volume2 className="w-3.5 h-3.5 text-white/75" />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5 text-white/50" />
                        )}
                        <span>Efek suara</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={soundEffects}
                        onClick={() => setSoundEffects((prev) => !prev)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          soundEffects ? 'bg-[#00C985]' : 'bg-white/25'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            soundEffects ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block px-3 py-1 rounded-lg bg-[#3B2613]/85 border border-amber-400/25 text-[11px] font-medium text-amber-200 shadow-sm">
              Tips: Jawaban cepat &amp; tepat memberi poin lebih tinggi
            </div>
          </div>
        </div>

        {/* Center Spotlight Arena + Podium */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
          {/* Floating Live Emotes */}
          <div className="pointer-events-none relative h-12 w-full max-w-xs flex items-center justify-center">
            {floatingEmotes.map((em) => (
              <div
                key={em.id}
                style={{ transform: `translateX(${em.offsetX}px)` }}
                className="absolute bottom-0 animate-bounce flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 border border-white/20 text-[15px] shadow-lg"
              >
                <span>{em.emoji}</span>
                <span className="text-[11px] font-semibold text-white/85">{em.sender}</span>
              </div>
            ))}
          </div>

          <WaygroundPodiumCharacter
            name={me?.name || editableName || 'Peserta'}
            mascotId={mascotId}
            theme={arenaTheme}
          />
        </div>

        {/* Bottom Emote Reaction Dock */}
        <div className="relative z-20 pb-4 px-4 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#19081B]/90 border border-white/15 shadow-2xl">
            {LOBBY_EMOTES.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleTriggerEmote(item.emoji)}
                title={item.label}
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.bg} border border-white/25 hover:scale-105 active:scale-95 flex items-center justify-center text-[20px] shadow-md cursor-pointer transition-transform`}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // COUNTDOWN STAGE: SYNCHRONIZED 3 -> 2 -> 1 BEFORE QUESTION 1
  // =========================================================================
  if (roomState.status === 'countdown') {
    return (
      <div
        ref={arenaRef}
        className={`relative overflow-hidden text-white flex flex-col justify-between ${
          fullScreen
            ? 'flex-1 w-full min-h-[620px]'
            : embedded
            ? 'min-h-[540px] rounded-2xl border border-white/10 shadow-[0_24px_60px_-20px_rgba(26,7,34,0.55)]'
            : 'min-h-[660px] sm:min-h-[78vh] rounded-2xl border border-white/10 shadow-[0_24px_60px_-20px_rgba(26,7,34,0.55)]'
        }`}
      >
        <WaygroundParticipantBackdrop theme={arenaTheme} spotlight />
        <WaygroundCountdownOverlay
          step={countdownStep}
          quizTitle={roomState.quizTitle}
          role="participant"
          mode={roomState.mode}
          totalQuestions={roomState.totalQuestions}
        />
      </div>
    );
  }

  // =========================================================================
  // ACTIVE GAMEPLAY & ENDED SUMMARY (Mobile Stacked / Tablet & PC 4-Column)
  // =========================================================================
  const mcOptionCount = activeQuestion?.options.length || 4;
  const mcGridColsClass =
    mcOptionCount <= 2
      ? 'grid-cols-1 md:grid-cols-2'
      : mcOptionCount === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-4';
  const activeMascot = MASCOT_OPTIONS.find((m) => m.id === mascotId) || MASCOT_OPTIONS[0];
  const isSummaryView =
    roomState.status === 'ended' ||
    (roomState.status === 'active' && (Boolean(me?.finished) || currentIndex >= questions.length));

  return (
    <div
      ref={arenaRef}
      className={`relative overflow-hidden text-white flex flex-col justify-between ${
        fullScreen
          ? 'flex-1 w-full min-h-[620px]'
          : embedded
          ? 'rounded-2xl border border-white/10 shadow-[0_24px_60px_-20px_rgba(26,7,34,0.55)]'
          : 'rounded-2xl max-w-6xl mx-auto border border-white/10 shadow-[0_24px_60px_-20px_rgba(26,7,34,0.55)] min-h-[660px]'
      }`}
    >
      <WaygroundParticipantBackdrop theme={arenaTheme} />

      {/* Paused by Host Overlay */}
      {roomState.status === 'active' && !isSummaryView && roomState.paused && (
        <div className="absolute inset-0 z-40 bg-[#120416]/80 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/20 border border-[#F59E0B]/50 text-[#FCD34D] flex items-center justify-center">
            <Pause className="w-8 h-8" />
          </div>
          <h3 className="text-[22px] font-bold text-white">Kuis Dijeda oleh Host</h3>
          <p className="text-[13.5px] text-white/75 max-w-sm">
            Timer dijeda sementara. Layar soal akan langsung terbuka kembali saat Host menekan Lanjutkan.
          </p>
        </div>
      )}

      {/* Top Countdown Timer Strip during active question */}
      {roomState.status === 'active' && !isSummaryView && activeQuestion && (
        <div className="relative z-20 h-1.5 w-full bg-white/10 overflow-hidden shrink-0">
          <div
            className={`h-full transition-all duration-300 ${
              timePct > 50 ? 'bg-[#00C985]' : timePct > 25 ? 'bg-[#F59E0B]' : 'bg-[#E53E51]'
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
      )}

      {/* Top HUD Bar: Compact Gameplay HUD vs Minimalist Corner HUD on Summary View (matches Screenshot) */}
      {isSummaryView ? (
        <div className="relative z-30 px-4 sm:px-6 pt-4 pb-1 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onLeave}
            title={embedded ? 'Tutup Uji Coba' : 'Keluar Sesi'}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            {renderThemeSelector('right')}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              title="Layar penuh"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-30 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2.5">
        {/* Top-Left: Brand Badge (Tablet/PC) + Score + Bonus/Streak + Timer */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden md:flex w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#8B5CF6] items-center justify-center text-white font-black text-[13px] shadow-md shrink-0">
            S
          </div>

          <div className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#19081B]/85 border border-white/15 text-[12.5px] font-bold text-white tabular-nums shadow-sm">
            <Coins className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
            <span>{(me?.score || 0).toLocaleString('id-ID')}</span>
          </div>

          <div className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white/15 border border-white/15 text-[12px] font-bold text-white shadow-sm">
            {roomState.mode === 'classic' ? (
              (me?.streak || 0) >= 2 ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                  <span className="tabular-nums">{me?.streak}x</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#FCD34D] shrink-0" />
                  <span>Bonus</span>
                </>
              )
            ) : (
              <span>Test Mode</span>
            )}
          </div>

          {roomState.status === 'active' && !me?.finished && activeQuestion && (
            <div
              className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-bold tabular-nums border ${
                timeLeft <= 5
                  ? 'bg-[#E53E51]/30 border-[#E53E51]/70 text-[#FDA4AF]'
                  : 'bg-[#19081B]/75 border-white/15 text-white/90'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{timeLeft}s</span>
            </div>
          )}
        </div>

        {/* Top-Right: Code (Tablet/PC) + Menu Drawer + Fullscreen (Tablet/PC) */}
        <div className="relative flex items-center gap-1.5 shrink-0">
          <span className="hidden md:inline-flex items-center h-8 px-2.5 rounded-lg bg-[#19081B]/85 border border-white/15 text-[12px] font-mono font-bold tracking-wider tabular-nums">
            {formattedCode}
          </span>

          <button
            type="button"
            onClick={() => setSettingsMenuOpen((prev) => !prev)}
            title="Menu & Pengaturan"
            className="w-8 h-8 rounded-lg bg-[#19081B]/85 hover:bg-[#280D2B] border border-white/15 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="Layar penuh"
            className="hidden md:flex w-8 h-8 rounded-lg bg-[#19081B]/85 hover:bg-[#280D2B] border border-white/15 items-center justify-center text-white cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {settingsMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl bg-[#180720]/95 backdrop-blur-md border border-white/15 p-3.5 shadow-2xl space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold uppercase tracking-wider text-white/75">
                  Opsi Sesi Kuis
                </span>
                <button
                  type="button"
                  onClick={() => setSettingsMenuOpen(false)}
                  className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white">
                    <Volume2 className="w-3.5 h-3.5 text-white/75" />
                    <span>Bacakan soal</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={readAloud}
                    onClick={() => setReadAloud((prev) => !prev)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      readAloud ? 'bg-[#00C985]' : 'bg-white/25'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        readAloud ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white">
                    {soundEffects ? (
                      <Volume2 className="w-3.5 h-3.5 text-white/75" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-white/50" />
                    )}
                    <span>Efek suara</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundEffects}
                    onClick={() => setSoundEffects((prev) => !prev)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      soundEffects ? 'bg-[#00C985]' : 'bg-white/25'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        soundEffects ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="text-[11px] font-semibold text-white/60">Tema Warna</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(WAYGROUND_ARENA_THEMES) as WaygroundArenaThemeId[]).map((id) => {
                    const item = WAYGROUND_ARENA_THEMES[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setThemeId(id)}
                        title={item.name}
                        className={`h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-transform ${
                          id === themeId
                            ? 'border-white scale-105 ring-2 ring-white/40'
                            : 'border-white/25 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: item.swatch }}
                      >
                        {id === themeId && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={onLeave}
                className="w-full h-9 rounded-xl bg-[#E53E51]/20 hover:bg-[#E53E51]/35 border border-[#E53E51]/45 text-[#FECDD3] text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{embedded ? 'Tutup Uji Coba' : 'Keluar Sesi'}</span>
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Main Arena Body */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-3 sm:px-5 pb-3 sm:pb-4 pt-2">
        {/* ACTIVE GAMEPLAY */}
        {roomState.status === 'active' && !me?.finished && activeQuestion && (
          <div className="flex-1 flex flex-col justify-between gap-4">
            {/* Upper Alerts & Prompt Area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-2">
              {tabWarningBanner && roomState.mode === 'test' && (
                <div className="w-full max-w-3xl p-3 rounded-xl bg-[#E53E51]/25 border border-[#E53E51]/60 text-[#FECDD3] text-[12px] font-medium flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Perpindahan tab terdeteksi dalam Test Mode dan dilaporkan ke Host.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTabWarningBanner(false)}
                    className="text-[12px] font-semibold underline shrink-0 cursor-pointer"
                  >
                    Mengerti
                  </button>
                </div>
              )}

              {/* Non-blocking Instant Feedback Toast */}
              {lastAnswerResult && roomState.mode === 'classic' && (
                <div
                  className={`w-full max-w-3xl rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold transition-all ${
                    lastAnswerResult.isCorrect
                      ? 'bg-[#00C985]/20 border border-[#00C985]/45 text-[#6EE7B7]'
                      : 'bg-[#E53E51]/20 border border-[#E53E51]/45 text-[#FDA4AF]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {lastAnswerResult.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {lastAnswerResult.isCorrect
                        ? `Benar! +${lastAnswerResult.pointsAwarded.toLocaleString('id-ID')} poin`
                        : `Kurang tepat${
                            lastAnswerResult.correctDisplay
                              ? ` · Jawaban benar: ${lastAnswerResult.correctDisplay}`
                              : ''
                          }`}
                    </span>
                  </div>
                  {lastAnswerResult.streak >= 2 && (
                    <span className="inline-flex items-center gap-1 text-[#FCD34D] tabular-nums shrink-0">
                      <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Streak {lastAnswerResult.streak}x
                    </span>
                  )}
                </div>
              )}

              {/* Centered Question Card with Overlapping Question Counter Pill (1 / N) */}
              <div className="relative w-full max-w-3xl mx-auto pt-3">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 px-3.5 py-0.5 rounded-full bg-[#1C071B] border border-white/15 text-[12px] font-bold text-[#FCD34D] tabular-nums shadow-md">
                  {Math.min(currentIndex + 1, questions.length)} / {questions.length}
                </div>
                <div className="rounded-xl sm:rounded-2xl bg-[#160516]/92 border border-white/10 px-5 sm:px-10 py-6 sm:py-8 min-h-[104px] sm:min-h-[120px] flex flex-col items-center justify-center text-center shadow-2xl">
                  <h3 className="text-[17px] sm:text-[21px] md:text-[22px] font-semibold text-white leading-snug max-w-2xl">
                    {activeQuestion.prompt}
                  </h3>
                </div>
              </div>
            </div>

            {/* Lower Answer Tiles Section */}
            <div className="space-y-3">
              {activeQuestion.type === 'multiple_choice' && (
                <div className={`grid ${mcGridColsClass} gap-3`}>
                  {activeQuestion.options.map((opt, idx) => {
                    const tile =
                      WAYGROUND_PARTICIPANT_TILES[idx % WAYGROUND_PARTICIPANT_TILES.length];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(idx)}
                        className={`relative rounded-xl sm:rounded-2xl px-5 py-4 md:p-6 min-h-[68px] md:min-h-[250px] lg:min-h-[320px] flex items-center justify-center text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-all active:translate-y-0.5 cursor-pointer ${tile.bg} ${tile.hoverBg} ${tile.borderBottom}`}
                      >
                        {/* Top-Right Keyboard Shortcut Number Badge on Tablet/PC */}
                        <span className="hidden md:flex absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/25 border border-white/15 items-center justify-center text-[12px] font-bold text-white/90 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-[15.5px] sm:text-[17px] lg:text-[18px] font-semibold leading-snug break-words px-1">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeQuestion.type === 'true_false' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {activeQuestion.options.map((opt, idx) => {
                    const tile =
                      WAYGROUND_PARTICIPANT_TF_TILES[idx % WAYGROUND_PARTICIPANT_TF_TILES.length];
                    const isTrue = idx === 0;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(idx)}
                        className={`relative rounded-xl sm:rounded-2xl p-5 md:p-7 min-h-[72px] md:min-h-[240px] lg:min-h-[300px] flex flex-row md:flex-col items-center justify-center gap-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-all active:translate-y-0.5 cursor-pointer ${tile.bg} ${tile.hoverBg} ${tile.borderBottom}`}
                      >
                        <span className="hidden md:flex absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/25 border border-white/15 items-center justify-center text-[12px] font-bold text-white/90 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/25 flex items-center justify-center">
                          {isTrue ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </span>
                        <span className="text-[17px] md:text-[20px] font-bold">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeQuestion.type === 'short_answer' && (
                <form onSubmit={handleSubmitShortAnswer} className="max-w-xl mx-auto space-y-3 py-6">
                  <input
                    type="text"
                    autoFocus
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Ketik jawaban singkat kamu di sini..."
                    className="w-full px-4 py-4 rounded-2xl border border-white/25 bg-[#160516]/90 text-white placeholder:text-white/45 text-[16px] font-medium text-center outline-none focus:border-[#00C985]"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="w-full h-12 rounded-xl bg-[#00C985] hover:bg-[#00B377] border-b-4 border-[#008C5C] disabled:opacity-45 text-[#082419] text-[15px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Kirim Jawaban</span>
                  </button>
                </form>
              )}

              {/* Bottom-Left Participant Identity Strip on Tablet/PC (Screenshot 2) */}
              <div className="hidden md:flex items-center justify-between pt-1">
                <div className="inline-flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-lg border border-white/25 flex items-center justify-center text-[11px] font-black text-white shadow-sm"
                    style={{ backgroundColor: activeMascot.accent }}
                  >
                    {myInitials || 'P'}
                  </span>
                  <div className="leading-tight">
                    <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-white">
                      {me?.name || editableName || 'Peserta'}
                    </div>
                    <div className="text-[10px] text-white/55 tabular-nums">
                      Peringkat #{myRank} · {roomState.quizTitle}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FINISHED OR SESSION ENDED SUMMARY (Matches Uploaded Completion Screenshot) */}
        {isSummaryView && (() => {
          const canShowDetails = roomState.status === 'ended' || roomState.mode === 'classic';
          const totalQ = Math.max(1, roomState.totalQuestions);
          const correctCount = me?.correctCount || 0;
          const answeredTotal = me?.answers.length || 0;
          const incorrectCount = Math.max(0, totalQ - correctCount);
          const accuracyPct = canShowDetails ? Math.round((correctCount / totalQ) * 100) : 0;
          const avgTimeSec =
            answeredTotal > 0 && me
              ? Math.max(
                  1,
                  Math.round(
                    me.answers.reduce((acc, a) => acc + (a.timeTakenMs || 0), 0) /
                      answeredTotal /
                      1000
                  )
                )
              : 0;
          const playerName = me?.name || editableName || 'Peserta';
          const celebrationText =
            accuracyPct >= 80
              ? `Luar biasa, pertahankan prestasi, ${playerName}!`
              : accuracyPct >= 50
              ? `Kerja bagus, terus tingkatkan, ${playerName}!`
              : `Semangat terus belajar, ${playerName}!`;

          const cycleMascot = () => {
            const idx = MASCOT_OPTIONS.findIndex((m) => m.id === mascotId);
            const next = MASCOT_OPTIONS[(idx + 1) % MASCOT_OPTIONS.length];
            setMascotId(next.id);
            playQuizSound('click', soundEffects);
          };

          const flashcardList = reviewQuestions.length > 0 ? reviewQuestions : [];
          const currentCard = flashcardList[Math.min(flashcardIdx, Math.max(0, flashcardList.length - 1))];

          return (
            <div className="relative flex-1 w-full py-2 sm:py-4">
              {/* Floating Emotes overlay */}
              {floatingEmotes.length > 0 && (
                <div className="pointer-events-none fixed right-16 bottom-20 z-40 flex flex-col items-end gap-2">
                  {floatingEmotes.slice(-5).map((em) => (
                    <div
                      key={em.id}
                      className="animate-bounce inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 border border-white/20 text-[14px] shadow-lg"
                    >
                      <span>{em.emoji}</span>
                      <span className="text-[11px] font-semibold text-white/85">{em.sender}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Centered Summary Column + Optional Right Live Rank Companion */}
              <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-4 px-1">
                {/* Main Summary Stack (Left / Center Column) */}
                <div className="w-full max-w-[540px] mx-auto lg:mx-0 space-y-3.5">
                  {/* CARD 1: HERO RESULT + MASCOT CARD */}
                  <div className="rounded-2xl bg-[#3D0D31]/92 border border-white/10 p-5 sm:p-6 shadow-2xl flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <div>
                        <div className="text-[13px] font-bold uppercase tracking-wide text-white/85 truncate">
                          {roomState.quizTitle}
                        </div>
                        <p className="text-[13.5px] font-bold text-white leading-snug mt-1">
                          🎉 {canShowDetails ? celebrationText : `Semua soal dijawab, ${playerName}!`}
                        </p>
                      </div>

                      {canShowDetails ? (
                        <div>
                          <div className="text-[36px] sm:text-[42px] font-black text-white leading-none tabular-nums">
                            {(me?.score || 0).toLocaleString('id-ID')}
                          </div>
                          <div className="text-[11.5px] font-medium text-white/60 mt-1">
                            Score · Peringkat #{myRank}
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[12.5px] font-semibold text-[#FCD34D]">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>Test Mode — Menunggu Host Mengakhiri Kuis</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <WaygroundMascotFigure
                        mascotId={mascotId}
                        className="w-24 h-28 sm:w-28 sm:h-32 drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)]"
                      />
                      <button
                        type="button"
                        onClick={cycleMascot}
                        className="px-4 py-1.5 rounded-lg bg-white hover:bg-white/90 text-[#1C1D21] text-[12px] font-bold shadow-md cursor-pointer transition-colors"
                      >
                        Karakter
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: ACCURACY BAR CARD */}
                  {canShowDetails && (
                    <div className="rounded-2xl bg-[#3D0D31]/92 border border-white/10 p-4 sm:p-5 shadow-xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white"
                          title={`${correctCount} benar dari ${totalQ} pertanyaan`}
                        >
                          <span>Accuracy</span>
                          <Info className="w-3.5 h-3.5 text-white/60" />
                        </div>
                        <span className="text-[11.5px] text-white/65 tabular-nums">
                          {correctCount}/{totalQ} benar
                        </span>
                      </div>

                      <div className="relative h-3.5 rounded-full bg-[#E53E51] overflow-visible">
                        <div
                          className="h-full rounded-l-full bg-[#00C985] transition-all duration-500"
                          style={{
                            width: `${accuracyPct}%`,
                            borderRadius: accuracyPct >= 98 ? '9999px' : undefined,
                          }}
                        />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white text-[#1C1D21] text-[11px] font-extrabold tabular-nums shadow-md"
                          style={{ left: `${Math.min(92, Math.max(8, accuracyPct))}%` }}
                        >
                          {accuracyPct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CARD 3: PERFORMANCE STATS CARD */}
                  {canShowDetails && (
                    <div className="rounded-2xl bg-[#3D0D31]/92 border border-white/10 p-4 sm:p-5 shadow-xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13.5px] font-bold text-white">Performance Stats</span>
                        <span className="text-[11.5px] font-medium text-white/65 tabular-nums">
                          {roomState.totalQuestions} questions
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00C985]/20 border border-[#00C985]/40 text-[#6EE7B7] text-[12px] font-bold tabular-nums">
                          <Check className="w-3.5 h-3.5" />
                          {correctCount} Correct
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E53E51]/20 border border-[#E53E51]/40 text-[#FDA4AF] text-[12px] font-bold tabular-nums">
                          <X className="w-3.5 h-3.5" />
                          {incorrectCount} Incorrect
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6]/20 border border-[#60A5FA]/35 text-[#93C5FD] text-[12px] font-bold tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {avgTimeSec} s time/question
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#FCD34D] text-[12px] font-bold tabular-nums">
                          <Flame className="w-3.5 h-3.5" />
                          {me?.bestStreak || 0} Streak
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CARD 4: REVIEW QUESTIONS WITH WHITE ANSWER CARDS (Matches Screenshot) */}
                  {canShowDetails && questions.length > 0 && (
                    <div className="rounded-2xl bg-[#3D0D31]/92 border border-white/10 p-4 sm:p-5 shadow-xl space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[14px] font-bold text-white">Review Questions</div>
                          <div className="text-[11.5px] text-white/65">
                            Klik pertanyaan untuk melihat kunci jawaban &amp; pembahasan
                          </div>
                        </div>

                        {flashcardList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFlashcardIdx(0);
                              setFlashcardFlipped(false);
                              setFlashcardsOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-white/90 text-[#1C1D21] text-[12px] font-bold shadow-md cursor-pointer transition-colors shrink-0"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Study Flashcards</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {questions.map((q, idx) => {
                          const ans = me?.answers.find((a) => a.questionId === q.id);
                          const fullQ = reviewQuestions.find((rq) => rq.id === q.id);
                          const isExpanded = Boolean(expandedReviewIds[q.id]);
                          const isCorrectAns = Boolean(ans?.isCorrect);

                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() =>
                                setExpandedReviewIds((prev) => ({
                                  ...prev,
                                  [q.id]: !prev[q.id],
                                }))
                              }
                              className={`w-full text-left rounded-xl bg-white text-[#1C1D21] p-4 sm:p-5 shadow-lg border-l-[5px] transition-all cursor-pointer hover:brightness-[0.985] space-y-3 ${
                                isCorrectAns ? 'border-[#00C985]' : 'border-[#E53E51]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-[13.5px] sm:text-[14px] font-semibold text-[#1C1D21] leading-snug">
                                  <span className="mr-1.5 tabular-nums">{idx + 1}.</span>
                                  {q.prompt}
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 tabular-nums ${
                                    isCorrectAns
                                      ? 'bg-[#DCFCE7] text-[#15803D]'
                                      : 'bg-[#FEE2E2] text-[#B91C1C]'
                                  }`}
                                >
                                  {isCorrectAns ? `+${ans?.pointsAwarded || 0}` : 'Salah'}
                                </span>
                              </div>

                              {q.type !== 'short_answer' ? (
                                <div className="space-y-2 pl-1">
                                  {q.options.map((opt, oIdx) => {
                                    const pickedThis = ans?.selectedOptionIndex === oIdx;
                                    const isKeyOption = fullQ?.correctOptionIndex === oIdx;
                                    const revealKey = isExpanded || isCorrectAns;

                                    let dotClass = 'bg-[#D1D5DB]';
                                    let textClass = 'text-[#4B4E57]';
                                    if (revealKey && isKeyOption) {
                                      dotClass = 'bg-[#00C985] ring-2 ring-[#00C985]/30';
                                      textClass = 'text-[#146C43] font-bold';
                                    } else if (pickedThis && !isCorrectAns) {
                                      dotClass = 'bg-[#E53E51] ring-2 ring-[#E53E51]/25';
                                      textClass = 'text-[#B91C1C] font-semibold';
                                    }

                                    return (
                                      <div
                                        key={oIdx}
                                        className={`flex items-start gap-2.5 text-[12.5px] sm:text-[13px] leading-snug ${textClass}`}
                                      >
                                        <span
                                          className={`mt-1 w-3 h-3 rounded-full shrink-0 ${dotClass}`}
                                        />
                                        <span>{opt}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-[12.5px] space-y-1 pl-1">
                                  <div>
                                    Jawabanmu:{' '}
                                    <strong
                                      className={isCorrectAns ? 'text-[#146C43]' : 'text-[#B91C1C]'}
                                    >
                                      {ans?.submittedValue || '-'}
                                    </strong>
                                  </div>
                                  {isExpanded && fullQ?.acceptedAnswers?.[0] && (
                                    <div className="text-[#146C43]">
                                      Kunci: <strong>{fullQ.acceptedAnswers[0]}</strong>
                                    </div>
                                  )}
                                </div>
                              )}

                              {isExpanded && fullQ?.explanation && (
                                <div className="pt-2 border-t border-black/10 text-[12px] text-[#4B4E57] leading-relaxed">
                                  <strong className="text-[#1C1D21]">Pembahasan:</strong>{' '}
                                  {fullQ.explanation}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Companion Side Column on Desktop: Live Peringkat & Aksi Sesi */}
                <div className="w-full max-w-[540px] lg:w-[240px] mx-auto lg:mx-0 space-y-3.5 shrink-0">
                  <div className="rounded-2xl bg-[#190719]/92 border border-white/10 p-4 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white">
                        <Trophy className="w-4 h-4 text-[#FCD34D]" />
                        <span>Live Ranking</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-bold text-[#FCD34D] tabular-nums">
                        #{myRank}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {sortedParticipants.slice(0, 5).map((p, i) => {
                        const isMe = p.id === roomState.participantId;
                        return (
                          <div
                            key={p.id}
                            className={`px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-[12px] ${
                              isMe
                                ? 'bg-[#8854C0]/35 border border-[#C084FC]/50 font-bold text-white'
                                : 'bg-white/[0.05] text-white/80'
                            }`}
                          >
                            <span className="truncate">
                              <span className="text-white/50 mr-1.5 tabular-nums">#{i + 1}</span>
                              {p.name}
                            </span>
                            <span className="tabular-nums font-bold shrink-0">
                              {canShowDetails ? p.score.toLocaleString('id-ID') : p.finished ? 'Selesai' : `${p.answeredCount}/${totalQ}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#190719]/92 border border-white/10 p-4 space-y-2.5 shadow-xl">
                    <div className="text-[12.5px] font-bold text-white">
                      {roomState.status === 'ended' ? 'Sesi Telah Selesai' : 'Menunggu Sesi Selesai'}
                    </div>
                    <p className="text-[11.5px] text-white/65 leading-relaxed">
                      {roomState.status === 'ended'
                        ? 'Review semua soal atau pelajari ulang materi lewat Flashcards.'
                        : 'Skor & peringkat diperbarui otomatis saat peserta lain menyelesaikan soal.'}
                    </p>
                    <button
                      type="button"
                      onClick={onLeave}
                      className="w-full h-9 rounded-xl bg-white/12 hover:bg-white/20 border border-white/15 text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{embedded ? 'Tutup Preview' : 'Kembali ke Hub'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Far-Right Vertical Emote Bar on Desktop / Centered Bottom Dock on Mobile */}
              <div className="mt-4 lg:mt-0 lg:fixed lg:right-3 lg:top-1/2 lg:-translate-y-1/2 z-30 flex justify-center">
                <div className="inline-flex lg:flex-col items-center gap-2 p-2 rounded-2xl bg-[#19081B]/90 border border-white/15 shadow-2xl">
                  {LOBBY_EMOTES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleTriggerEmote(item.emoji)}
                      title={item.label}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.bg} border border-white/25 hover:scale-105 active:scale-95 flex items-center justify-center text-[18px] shadow-md cursor-pointer transition-transform`}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Study Flashcards Modal */}
              {flashcardsOpen && currentCard && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-lg rounded-2xl bg-[#250724] border border-white/15 p-5 sm:p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold uppercase tracking-wider text-[#C4B5FD] tabular-nums">
                        Study Flashcard {flashcardIdx + 1} / {flashcardList.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFlashcardsOpen(false)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFlashcardFlipped((prev) => !prev)}
                      className="w-full min-h-[220px] rounded-2xl bg-white text-[#1C1D21] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-xl cursor-pointer transition-transform active:scale-[0.99]"
                    >
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#6B21A8] text-[11px] font-bold uppercase tracking-wider">
                        {flashcardFlipped ? 'Jawaban Benar' : 'Pertanyaan'}
                      </span>
                      <div className="text-[17px] sm:text-[19px] font-bold leading-snug">
                        {flashcardFlipped
                          ? currentCard.type === 'short_answer'
                            ? (currentCard.acceptedAnswers || [])[0] || '-'
                            : currentCard.options[currentCard.correctOptionIndex ?? 0] || '-'
                          : currentCard.prompt}
                      </div>
                      {flashcardFlipped && currentCard.explanation && (
                        <p className="text-[12.5px] text-[#4B4E57] leading-relaxed max-w-md">
                          {currentCard.explanation}
                        </p>
                      )}
                      <span className="text-[11px] font-medium text-[#8A8D98] inline-flex items-center gap-1 pt-2">
                        <RotateCcw className="w-3 h-3" />
                        Klik kartu untuk membalik
                      </span>
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={flashcardIdx === 0}
                        onClick={() => {
                          setFlashcardIdx((i) => Math.max(0, i - 1));
                          setFlashcardFlipped(false);
                        }}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-35 text-white text-[12.5px] font-semibold cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Sebelumnya</span>
                      </button>

                      <button
                        type="button"
                        disabled={flashcardIdx >= flashcardList.length - 1}
                        onClick={() => {
                          setFlashcardIdx((i) => Math.min(flashcardList.length - 1, i + 1));
                          setFlashcardFlipped(false);
                        }}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#00C985] hover:bg-[#00B377] disabled:opacity-35 text-[#05261A] text-[12.5px] font-bold cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Berikutnya</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
