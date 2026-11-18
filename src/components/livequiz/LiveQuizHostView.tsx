import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  Info,
  Link2,
  Lock,
  Maximize2,
  Minimize2,
  Monitor,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  UserX,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import type {
  LiveQuizAnswerResult,
  LiveQuizMode,
  LiveQuizRoomState,
  LiveQuizSessionReport,
  LiveQuizSettings,
} from '../../types';
import type { LiveQuizEmoteEvent, WsConnectionStatus } from '../../hooks/useLiveQuizSocket';
import { useApp } from '../../context/AppContext';
import {
  WAYGROUND_ARENA_THEMES,
  WAYGROUND_OPTION_TILES,
  WAYGROUND_TF_TILES,
  type WaygroundArenaThemeId,
} from '../../constants/waygroundTheme';
import {
  WaygroundCountdownOverlay,
  WaygroundLobbyBackdrop,
  WaygroundMascotFigure,
  type MascotId,
} from './WaygroundStageVisuals';
import { playQuizSound } from '../../utils/quizAudio';
import { LiveQuizParticipantView } from './LiveQuizParticipantView';

interface LiveQuizHostViewProps {
  roomState: LiveQuizRoomState;
  connectionStatus: WsConnectionStatus;
  onUpdateSettings: (mode: LiveQuizMode, settings: LiveQuizSettings) => void;
  onKickParticipant: (participantId: string) => void;
  onStartGame: () => void;
  onTogglePause?: () => void;
  onEndGame: () => void;
  onLeave: () => void;
  fullWidth?: boolean;
  hostClientId?: string;
  recentEmotes?: LiveQuizEmoteEvent[];
  previewRoomState?: LiveQuizRoomState | null;
  previewConnectionStatus?: WsConnectionStatus;
  previewLastAnswerResult?: LiveQuizAnswerResult | null;
  onJoinPreview?: (name?: string) => void;
  onLeavePreview?: () => void;
  onPreviewSubmitAnswer?: (
    questionId: string,
    payload: { selectedOptionIndex?: number; textAnswer?: string; timeTakenMs: number }
  ) => void;
  onPreviewReportTabSwitch?: () => void;
  onPreviewClearAnswerResult?: () => void;
  onPreviewUpdateName?: (newName: string) => void;
  onPreviewSendEmote?: (emoji: string) => void;
}

export const LiveQuizHostView: React.FC<LiveQuizHostViewProps> = ({
  roomState,
  connectionStatus,
  onUpdateSettings,
  onKickParticipant,
  onStartGame,
  onTogglePause,
  onEndGame,
  onLeave,
  fullWidth = false,
  hostClientId,
  recentEmotes = [],
  previewRoomState,
  previewConnectionStatus = 'connected',
  previewLastAnswerResult = null,
  onJoinPreview,
  onLeavePreview,
  onPreviewSubmitAnswer,
  onPreviewReportTabSwitch,
  onPreviewClearAnswerResult,
  onPreviewUpdateName,
  onPreviewSendEmote,
}) => {
  const { triggerToast, handleExportLiveQuizReportCsv } = useApp();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'host' | 'split' | 'participant'>('host');
  const [activeHostTab, setActiveHostTab] = useState<'leaderboard' | 'questions' | 'anticheating'>('leaderboard');
  const [focusedQuestionIdx, setFocusedQuestionIdx] = useState<number>(0);
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(false);
  const [pendingStartWithPreview, setPendingStartWithPreview] = useState<boolean>(false);
  const [themeId, setThemeId] = useState<WaygroundArenaThemeId>('plum');
  const [themeMenuOpen, setThemeMenuOpen] = useState<boolean>(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState<boolean>(false);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [countdownStep, setCountdownStep] = useState<3 | 2 | 1>(3);
  const [endedViewMode, setEndedViewMode] = useState<'podium' | 'report'>('podium');
  const [endedReportTab, setEndedReportTab] = useState<'overview' | 'questions' | 'anticheating'>('overview');
  const [showTimeTaken, setShowTimeTaken] = useState<boolean>(false);
  const [podiumRevealCounter, setPodiumRevealCounter] = useState<number>(0);
  const hostStageRef = React.useRef<HTMLDivElement>(null);
  const reportTabsRef = React.useRef<HTMLDivElement>(null);
  const prevStatusRef = React.useRef(roomState.status);
  const lastCountdownBeepRef = React.useRef<number | null>(null);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?page=livequiz&code=${roomState.code}`
      : '';

  useEffect(() => {
    if (!shareUrl) return;
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#1C1D21', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [shareUrl]);

  // If user clicked "Mulai & Coba Kuis" in lobby, auto-start once tester participant connects
  useEffect(() => {
    if (
      pendingStartWithPreview &&
      previewRoomState &&
      previewRoomState.code === roomState.code &&
      roomState.status === 'lobby'
    ) {
      setPendingStartWithPreview(false);
      setViewLayout('split');
      onStartGame();
    }
  }, [pendingStartWithPreview, previewRoomState, roomState.code, roomState.status, onStartGame]);

  // Synchronized 3 -> 2 -> 1 countdown phase on Host
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

  // Always land on Live Leaderboard + play start sound when transitioning into active quiz
  useEffect(() => {
    if (roomState.status === 'active') {
      setActiveHostTab('leaderboard');
      if (prevStatusRef.current === 'countdown' || prevStatusRef.current === 'lobby') {
        playQuizSound('start', soundEffects);
      }
    } else if (roomState.status === 'ended' && prevStatusRef.current !== 'ended') {
      setEndedViewMode('podium');
      setEndedReportTab('overview');
      setPodiumRevealCounter(3);
      playQuizSound('join', soundEffects);
    }
    prevStatusRef.current = roomState.status;
  }, [roomState.status, soundEffects]);

  // Brief 3 -> 2 -> 1 -> 0 podium reveal countdown ring (matching Screenshot top-left ring)
  useEffect(() => {
    if (roomState.status !== 'ended' || podiumRevealCounter <= 0) return;
    const timer = window.setTimeout(() => {
      setPodiumRevealCounter((c) => Math.max(0, c - 1));
    }, 850);
    return () => window.clearTimeout(timer);
  }, [roomState.status, podiumRevealCounter]);

  const hostQuestions = roomState.hostQuestions || [];
  const safeQuestionIdx = Math.min(focusedQuestionIdx, Math.max(0, hostQuestions.length - 1));
  const currentHostQuestion = hostQuestions[safeQuestionIdx];
  const currentQuestionStat = currentHostQuestion
    ? (roomState.questionStats || []).find((qs) => qs.questionId === currentHostQuestion.id)
    : undefined;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomState.code);
      triggerToast('Kode Disalin', `Kode ruangan ${roomState.code} disalin ke clipboard.`, 'success');
    } catch {
      triggerToast('Salin Manual', `Gunakan kode: ${roomState.code}`, 'info');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      triggerToast('Tautan Disalin', 'Buka tautan di tab atau perangkat lain untuk bergabung.', 'success');
    } catch {
      triggerToast('Tautan Gabung', shareUrl, 'info');
    }
  };

  const handleEnablePreview = () => {
    if (!onJoinPreview) return;
    if (!previewRoomState || previewRoomState.code !== roomState.code) {
      onJoinPreview('Kamu (Tester)');
    }
    setViewLayout('split');
  };

  const handleStartAndTryQuiz = () => {
    if (previewRoomState && previewRoomState.code === roomState.code) {
      setViewLayout('split');
      onStartGame();
      return;
    }
    if (onJoinPreview) {
      setPendingStartWithPreview(true);
      onJoinPreview('Kamu (Tester)');
      return;
    }
    onStartGame();
  };

  const buildCurrentReport = (): LiveQuizSessionReport => {
    const totalAttempts = roomState.participants.reduce((acc, p) => acc + p.answeredCount, 0);
    const totalCorrect = roomState.participants.reduce((acc, p) => acc + p.correctCount, 0);
    const avgAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const sorted = [...roomState.participants].sort((a, b) => b.score - a.score);
    return {
      id: `LQR-${roomState.code}-${Date.now()}`,
      code: roomState.code,
      quizId: roomState.quizId,
      quizTitle: roomState.quizTitle,
      subject: roomState.subject,
      mode: roomState.mode,
      endedAt: roomState.endedAt || new Date().toLocaleString('id-ID'),
      totalQuestions: roomState.totalQuestions,
      participantCount: roomState.participants.length,
      avgAccuracy,
      topScorer: sorted[0]?.name,
      participants: sorted,
      questionStats: roomState.questionStats || [],
    };
  };

  const finishedCount = roomState.participants.filter((p) => p.finished).length;
  const totalTabAlerts = roomState.participants.reduce((acc, p) => acc + p.tabSwitches, 0);
  const totalAnsweredAll = roomState.participants.reduce((acc, p) => acc + p.answeredCount, 0);
  const totalCorrectAll = roomState.participants.reduce((acc, p) => acc + p.correctCount, 0);
  const overallAccuracy = totalAnsweredAll > 0 ? Math.round((totalCorrectAll / totalAnsweredAll) * 100) : 0;

  const sortedParticipants = [...roomState.participants].sort(
    (a, b) => b.score - a.score || b.correctCount - a.correctCount || b.answeredCount - a.answeredCount
  );
  const formattedCode = `${roomState.code.slice(0, 3)} ${roomState.code.slice(3)}`;
  const isPreviewActive = Boolean(previewRoomState && previewRoomState.code === roomState.code);

  const fullWidthHostUrl = `/?liveQuizHost=1&code=${encodeURIComponent(roomState.code)}${
    hostClientId ? `&hostKey=${encodeURIComponent(hostClientId)}` : ''
  }`;

  const arenaTheme = WAYGROUND_ARENA_THEMES[themeId];
  const joinHostLabel =
    typeof window !== 'undefined' ? `${window.location.host}/?page=livequiz` : 'servolution.app';

  const handleToggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await (hostStageRef.current || document.documentElement).requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore iframe fullscreen restriction
    }
  };

  const handleStartWithSound = () => {
    playQuizSound('click', soundEffects);
    onStartGame();
  };

  const arenaStageClass =
    fullWidth && !(isPreviewActive && viewLayout === 'split')
      ? 'relative min-h-screen w-full text-white flex flex-col overflow-hidden animate-wayground-gradient'
      : 'relative rounded-2xl overflow-hidden text-white border border-white/10 shadow-[0_24px_60px_-20px_rgba(26,7,34,0.55)] flex flex-col min-h-[680px] animate-wayground-gradient';

  const renderHostStage = () => (
    <div
      ref={hostStageRef}
      style={{ backgroundImage: arenaTheme.animatedBgGradient }}
      className={arenaStageClass}
    >
      {/* 3D Perspective Corridor + 4 Glowing Portals during Lobby, Geometric Linework during Active/Countdown */}
      {roomState.status === 'lobby' ? (
        <WaygroundLobbyBackdrop theme={arenaTheme} />
      ) : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
          <svg
            viewBox="0 0 1440 860"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full opacity-25"
          >
            <polygon points="30,150 320,150 240,480 30,480" fill="none" stroke={arenaTheme.gridStroke} strokeWidth="2" />
            <circle cx="1050" cy="360" r="145" fill="none" stroke={arenaTheme.gridStroke} strokeWidth="2" />
            <rect x="850" y="70" width="460" height="440" rx="28" fill="none" stroke={arenaTheme.gridStroke} strokeWidth="2" />
            <polygon points="140,680 460,520 580,820 140,820" fill="none" stroke={arenaTheme.gridStroke} strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Top Wayground Host Control Bar */}
      <div className="relative z-30 px-4 sm:px-6 lg:px-8 py-2.5 bg-black/55 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#8B5CF6] flex items-center justify-center text-white font-black text-[14px] shadow-md shrink-0">
            S
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
              <span className="inline-flex items-center gap-1.5 font-bold text-white uppercase tracking-wider">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-[#00C985]'
                      : connectionStatus === 'reconnecting'
                      ? 'bg-[#F59E0B] animate-pulse'
                      : 'bg-gray-400'
                  }`}
                />
                Servolution LiveQuiz
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{roomState.subject}</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline tabular-nums">{roomState.totalQuestions} Soal</span>
              <span className="hidden sm:inline">·</span>
              <span className="font-semibold text-[#FCD34D]">
                {roomState.mode === 'classic' ? 'Classic' : 'Test Mode'}
              </span>
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-bold text-white truncate">
              {roomState.quizTitle}
            </h2>
          </div>
        </div>

        {/* Center Prominent Room PIN Box during Active / Countdown (matches Screenshot) */}
        {(roomState.status === 'active' || roomState.status === 'countdown') && (
          <button
            type="button"
            onClick={handleCopyCode}
            title="Salin kode ruangan"
            className="order-last sm:order-none mx-auto sm:mx-0 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/18 border border-white/15 text-white cursor-pointer transition-colors"
          >
            <span className="text-[18px] sm:text-[21px] font-black font-mono tracking-[0.18em] tabular-nums leading-none">
              {formattedCode}
            </span>
            <span className="w-7 h-7 rounded-md bg-black/35 flex items-center justify-center text-white/85">
              <Copy className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Themes Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setThemeMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[12.5px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Themes</span>
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl bg-[#180720]/95 border border-white/15 p-2 shadow-2xl space-y-1">
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
                        active
                          ? 'bg-white/15 text-white'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
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

          {/* Sound Effects Toggle */}
          <button
            type="button"
            onClick={() => setSoundEffects((prev) => !prev)}
            title={soundEffects ? 'Matikan efek suara' : 'Aktifkan efek suara'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            {soundEffects ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-white/55" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="Layar penuh"
            className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 items-center justify-center text-white cursor-pointer transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {!fullWidth && (
            <a
              href={fullWidthHostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[12.5px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Tab Full-Width</span>
            </a>
          )}

          {!isPreviewActive && roomState.status !== 'ended' && onJoinPreview && (
            <button
              type="button"
              onClick={handleEnablePreview}
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 rounded-lg bg-[#8854C0] hover:bg-[#9B66D3] text-white text-[12.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Preview Peserta</span>
              <span className="sm:hidden">Preview</span>
            </button>
          )}

          {/* Pause / Resume Button during Active Quiz (matches Screenshot) */}
          {roomState.status === 'active' && onTogglePause && (
            <button
              type="button"
              onClick={() => {
                playQuizSound('click', soundEffects);
                onTogglePause();
              }}
              className={`inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-lg text-[12.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                roomState.paused
                  ? 'bg-[#00C985] hover:bg-[#00B377] text-[#05261A]'
                  : 'bg-white/15 hover:bg-white/25 border border-white/15 text-white'
              }`}
            >
              {roomState.paused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 shrink-0" />
                  <span>Pause</span>
                  <Zap className="w-3 h-3 text-[#FBBF24] fill-[#FBBF24] shrink-0" />
                </>
              )}
            </button>
          )}

          {roomState.status === 'active' && (
            <button
              type="button"
              onClick={onEndGame}
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-4 rounded-lg bg-[#E53E51] hover:bg-[#CF2D40] text-white text-[12.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <span>End</span>
            </button>
          )}

          {roomState.status === 'ended' && endedViewMode === 'report' && (
            <button
              type="button"
              onClick={() => setEndedViewMode('podium')}
              title="Tampilkan Podium"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-[#FCD34D] cursor-pointer transition-colors"
            >
              <Trophy className="w-4 h-4" />
            </button>
          )}

          {roomState.status === 'ended' && (
            <button
              type="button"
              onClick={() => handleExportLiveQuizReportCsv(buildCurrentReport())}
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[12.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          )}

          {roomState.status !== 'active' && (
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-lg bg-[#E53E51] hover:bg-[#CF2D40] text-white text-[12.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <span>{roomState.status === 'ended' ? 'Exit' : 'End'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Arena Content */}
      <div className={`relative z-10 p-4 sm:p-6 ${fullWidth ? 'lg:px-8 flex-1 flex flex-col' : 'flex-1 flex flex-col'} space-y-6`}>
        {/* PHASE 1: WAYGROUND 3D CORRIDOR HOST LOBBY (Screenshot 3) */}
        {roomState.status === 'lobby' && (
          <div className="flex-1 flex flex-col justify-between gap-6">
            {/* Top-Center Floating Join Card + Immediate Action Bar */}
            <div className="flex flex-col items-center gap-3 pt-1 sm:pt-2">
              {/* Floating Dark Join Panel */}
              <div className="w-full max-w-[660px] rounded-2xl bg-[#140515]/88 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Left: Step 1 URL & Step 2 Giant PIN */}
                <div className="sm:col-span-8 space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-white/10 border border-white/15 text-[11.5px] font-bold text-white/85 flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] text-white/60 leading-tight">
                          Buka di perangkat apa saja
                        </div>
                        <div className="text-[15px] sm:text-[17px] font-bold text-white truncate">
                          {joinHostLabel}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      title="Salin tautan gabung"
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white shrink-0 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-white/10 border border-white/15 text-[11.5px] font-bold text-white/85 flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] text-white/60 leading-tight">
                          Masukkan kode gabung
                        </div>
                        <div className="text-[32px] sm:text-[40px] font-black font-mono tabular-nums tracking-[0.2em] text-white leading-none mt-0.5">
                          {formattedCode}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      title="Salin kode ruangan"
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white shrink-0 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right: Scannable QR Code + Share Via */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center sm:border-l sm:border-white/10 sm:pl-4 gap-2">
                  <div className="p-2 rounded-xl bg-white shadow-xl">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code Room ${roomState.code}`}
                        className="w-24 h-24 sm:w-28 sm:h-28 block"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-gray-100 flex items-center justify-center text-[#1C1D21] text-[11px] font-bold">
                        {roomState.code}
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[11px] text-white/65 font-medium">Bagikan Tautan</div>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        title="Salin tautan"
                        className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/85 cursor-pointer transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        title="Salin PIN"
                        className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/85 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Strip directly under Join Card: Settings/Mode + Magenta START + Participant Counter */}
              <div className="relative flex flex-wrap items-center justify-center gap-2.5">
                {/* Mode & Settings Trigger */}
                <button
                  type="button"
                  onClick={() => setSettingsMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-[#140515]/88 hover:bg-[#1E0820] border border-white/15 text-white text-[13px] font-semibold cursor-pointer transition-colors shadow-xl"
                >
                  <Settings className="w-4 h-4 text-[#C4B5FD]" />
                  <span>{roomState.mode === 'classic' ? 'Classic Mode' : 'Test Mode'}</span>
                </button>

                {/* Primary Vibrant Magenta START Button */}
                <button
                  type="button"
                  onClick={handleStartWithSound}
                  className="inline-flex items-center justify-center gap-2 h-11 px-10 sm:px-14 rounded-xl bg-gradient-to-r from-[#D946EF] via-[#EC4899] to-[#A855F7] hover:brightness-110 border-b-4 border-[#86198F] text-white text-[15px] font-extrabold tracking-wide uppercase cursor-pointer transition-all active:translate-y-0.5 shadow-[0_12px_28px_-6px_rgba(236,72,153,0.6)]"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>START</span>
                </button>

                {/* Participant Count Badge */}
                <div className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-[#140515]/88 border border-white/15 text-white text-[14px] font-bold tabular-nums shadow-xl">
                  <Users className="w-4 h-4 text-[#00C985]" />
                  <span>{roomState.participants.length}</span>
                </div>

                {/* Quick Start & Test Preview button if enabled */}
                {onJoinPreview && (
                  <button
                    type="button"
                    onClick={handleStartAndTryQuiz}
                    className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#00C985] hover:bg-[#00B377] border-b-4 border-[#008C5C] text-[#05261A] text-[13px] font-bold whitespace-nowrap cursor-pointer transition-colors shadow-xl"
                  >
                    <Gamepad2 className="w-4 h-4 shrink-0" />
                    <span>Mulai &amp; Coba Kuis</span>
                  </button>
                )}

                {/* Settings Popover Panel */}
                {settingsMenuOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-40 w-[min(390px,calc(100vw-2rem))] rounded-2xl bg-[#140515]/95 backdrop-blur-md border border-white/15 p-4 space-y-3.5 shadow-2xl text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-white/75">
                        Pengaturan Sesi Wayground
                      </span>
                      <button
                        type="button"
                        onClick={() => setSettingsMenuOpen(false)}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings('classic', {
                            ...roomState.settings,
                            streakBonus: true,
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          roomState.mode === 'classic'
                            ? 'bg-[#8854C0]/35 border-[#C084FC] text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
                          <Sparkles className="w-3.5 h-3.5 text-[#FCD34D]" />
                          <span>Classic</span>
                        </div>
                        <p className="text-[11px] text-white/65 mt-0.5 leading-snug">
                          Skor cepat &amp; streak api.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings('test', {
                            ...roomState.settings,
                            streakBonus: false,
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          roomState.mode === 'test'
                            ? 'bg-[#2F6DAE]/40 border-[#60A5FA] text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#93C5FD]" />
                          <span>Test Mode</span>
                        </div>
                        <p className="text-[11px] text-white/65 mt-0.5 leading-snug">
                          Ujian fokus + monitor tab.
                        </p>
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/10">
                      {[
                        {
                          key: 'shuffleQuestions' as const,
                          label: 'Acak Urutan Soal',
                        },
                        {
                          key: 'shuffleOptions' as const,
                          label: 'Acak Opsi Pilihan Ganda',
                        },
                        {
                          key: 'showExplanation' as const,
                          label: 'Tampilkan Pembahasan',
                        },
                        ...(roomState.mode === 'classic'
                          ? [
                              {
                                key: 'streakBonus' as const,
                                label: 'Streak Bonus',
                              },
                            ]
                          : []),
                      ].map((opt) => {
                        const enabled = roomState.settings[opt.key];
                        return (
                          <label
                            key={opt.key}
                            className="flex items-center justify-between gap-3 py-1 cursor-pointer"
                          >
                            <span className="text-[12.5px] font-medium text-white">{opt.label}</span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={enabled}
                              onClick={() =>
                                onUpdateSettings(roomState.mode, {
                                  ...roomState.settings,
                                  [opt.key]: !enabled,
                                })
                              }
                              className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer ${
                                enabled ? 'bg-[#00C985]' : 'bg-white/20'
                              }`}
                            >
                              <span
                                className={`block w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                                  enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Emotes floating in Lobby + Participants on Perspective Arena Floor */}
            <div className="flex-1 flex flex-col items-center justify-end pb-4 sm:pb-6 gap-3">
              {recentEmotes.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-none">
                  {recentEmotes.slice(-5).map((em) => (
                    <div
                      key={em.id}
                      className="animate-bounce inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 border border-white/20 text-[14px] shadow-lg"
                    >
                      <span>{em.emoji}</span>
                      <span className="text-[11px] font-semibold text-white/85">{em.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {roomState.participants.length === 0 ? (
                <div className="px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 text-center max-w-md">
                  <div className="text-[13.5px] font-semibold text-white">
                    Menunggu peserta bergabung ke arena...
                  </div>
                  <p className="text-[11.5px] text-white/70 mt-0.5">
                    Peserta yang masuk dengan kode{' '}
                    <span className="font-mono font-bold text-white">{roomState.code}</span> akan
                    langsung tampil di arena ini.
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-5xl rounded-2xl bg-[#140515]/82 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2 text-[13.5px] font-bold text-white">
                      <span className="w-2 h-2 rounded-full bg-[#00C985] animate-pulse" />
                      <Users className="w-4 h-4 text-[#00C985]" />
                      <span className="tabular-nums">
                        Peserta yang Sudah Join ({roomState.participants.length})
                      </span>
                    </div>
                    <span className="text-[11.5px] text-white/65">
                      Klik START di atas kapan saja untuk memulai kuis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-0.5">
                    {roomState.participants.map((p, idx) => {
                      const initials = p.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() || '')
                        .join('');
                      const latestEmote = [...recentEmotes]
                        .reverse()
                        .find((em) => em.participantId === p.id);

                      return (
                        <div
                          key={p.id}
                          className="p-2.5 sm:p-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.11] border border-white/12 flex items-center justify-between gap-2.5 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <span
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ring-2 ring-white/20 ${p.avatarColor}`}
                              >
                                {initials || 'U'}
                              </span>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#140515] ${
                                  p.connected ? 'bg-[#00C985]' : 'bg-amber-400'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-white/45 tabular-nums">
                                  #{idx + 1}
                                </span>
                                <span className="text-[13.5px] font-semibold text-white truncate">
                                  {p.name}
                                </span>
                                {latestEmote && (
                                  <span className="text-[14px] shrink-0" title="Reaksi peserta">
                                    {latestEmote.emoji}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#6EE7B7]">
                                {p.connected ? 'Siap di Arena' : 'Menghubungkan ulang...'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onKickParticipant(p.id)}
                            title={`Keluarkan ${p.name}`}
                            className="w-8 h-8 rounded-lg hover:bg-[#E53E51]/30 text-white/55 hover:text-[#FDA4AF] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 1.5: SYNCHRONIZED 3 -> 2 -> 1 COUNTDOWN */}
        {roomState.status === 'countdown' && (
          <WaygroundCountdownOverlay
            step={countdownStep}
            quizTitle={roomState.quizTitle}
            role="host"
            mode={roomState.mode}
            totalQuestions={roomState.totalQuestions}
          />
        )}

        {/* PHASE 2: ACTIVE WAYGROUND HOST SCREEN (Class Accuracy Bar + Leaderboard/Questions/Anti-cheating Card) */}
        {roomState.status === 'active' && (
          <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col gap-6 pt-2">
            {/* Paused Banner if Host paused */}
            {roomState.paused && (
              <div className="rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/45 px-4 py-2.5 flex items-center justify-between gap-3 text-[13px] font-semibold text-[#FDE68A]">
                <span className="inline-flex items-center gap-2">
                  <Pause className="w-4 h-4 shrink-0" />
                  Sesi kuis sedang dijeda — timer peserta dihentikan sementara.
                </span>
                {onTogglePause && (
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="px-3 py-1 rounded-lg bg-[#00C985] text-[#05261A] text-[12px] font-bold cursor-pointer"
                  >
                    Lanjutkan
                  </button>
                )}
              </div>
            )}

            {/* Centered Class Accuracy Horizontal Bar with Circular Badge (matches Screenshot) */}
            {(() => {
              const wrongPct = totalAnsweredAll > 0 ? Math.max(0, 100 - overallAccuracy) : 0;
              return (
                <div className="relative w-full h-11 rounded-2xl bg-[#160516]/90 border border-white/10 px-3 flex items-center justify-between shadow-2xl">
                  {/* Left Green Correct Side */}
                  <div className="flex-1 flex items-center gap-2 pr-10 min-w-0">
                    <span className="w-1.5 h-6 rounded-full bg-[#00C985] shrink-0" />
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00C985] transition-all duration-300"
                        style={{ width: `${overallAccuracy}%` }}
                      />
                    </div>
                  </div>

                  {/* Center Floating White Circular Accuracy Badge */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full bg-white text-[#1C1D21] shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-4 ring-white/20 flex flex-col items-center justify-center">
                    <span className="text-[15px] font-black leading-none tabular-nums">
                      {overallAccuracy}%
                    </span>
                    <span className="text-[8.5px] font-semibold text-[#5E616C] leading-tight mt-0.5 text-center px-1">
                      Class accuracy
                    </span>
                  </div>

                  {/* Right Red Incorrect Side */}
                  <div className="flex-1 flex items-center gap-2 pl-10 min-w-0">
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden flex justify-end">
                      <div
                        className="h-full rounded-full bg-[#E53E51] transition-all duration-300"
                        style={{ width: `${wrongPct}%` }}
                      />
                    </div>
                    <span className="w-1.5 h-6 rounded-full bg-[#E53E51] shrink-0" />
                  </div>
                </div>
              );
            })()}

            {/* Folder-Style Tabs + Main Panel */}
            <div className="flex flex-col">
              {/* Centered Folder Tab Strip */}
              <div className="flex items-end justify-center gap-1 px-4">
                <button
                  type="button"
                  onClick={() => setActiveHostTab('leaderboard')}
                  className={`relative px-4 py-2 rounded-t-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    activeHostTab === 'leaderboard'
                      ? 'bg-[#180619] text-white border-t border-x border-white/10'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  <span>Leaderboard</span>
                  {activeHostTab === 'leaderboard' && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveHostTab('questions')}
                  className={`relative px-4 py-2 rounded-t-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    activeHostTab === 'questions'
                      ? 'bg-[#180619] text-white border-t border-x border-white/10'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  <span>Questions</span>
                  {activeHostTab === 'questions' && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveHostTab('anticheating')}
                  className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-[12.5px] font-semibold transition-colors cursor-pointer ${
                    activeHostTab === 'anticheating'
                      ? 'bg-[#180619] text-white border-t border-x border-white/10'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  <span>Anti-cheating</span>
                  <Lock className="w-3 h-3 opacity-80" />
                  {totalTabAlerts > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#E53E51] text-white text-[10px] font-bold tabular-nums">
                      {totalTabAlerts}
                    </span>
                  )}
                  {activeHostTab === 'anticheating' && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              </div>

              {/* TAB 1: LEADERBOARD TABLE (matches Screenshot) */}
              {activeHostTab === 'leaderboard' && (
                <div className="rounded-2xl bg-[#180619]/92 border border-white/10 shadow-2xl overflow-hidden">
                  {/* Card Top Bar: N participants */}
                  <div className="px-5 py-3.5 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 text-[13px] font-bold text-white tabular-nums">
                      <Users className="w-4 h-4 text-white/80" />
                      <span>{sortedParticipants.length} participants</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px] text-white/65 tabular-nums">
                      <span>{totalAnsweredAll} terjawab</span>
                      <span>·</span>
                      <span>{finishedCount} selesai</span>
                    </div>
                  </div>

                  {sortedParticipants.length === 0 ? (
                    <div className="p-10 text-center space-y-3">
                      <Users className="w-9 h-9 text-white/40 mx-auto" />
                      <div className="text-[14.5px] font-semibold text-white">
                        Menunggu peserta bergabung &amp; menjawab kuis
                      </div>
                      <p className="text-[12.5px] text-white/65 max-w-md mx-auto">
                        Bagikan PIN <span className="font-mono font-bold text-white">{roomState.code}</span> ke peserta. Peringkat dan skor akan bergerak otomatis secara real-time di sini.
                      </p>
                      {!isPreviewActive && onJoinPreview && (
                        <button
                          type="button"
                          onClick={handleEnablePreview}
                          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-[#8854C0] hover:bg-[#9B66D3] text-white text-[13px] font-medium cursor-pointer transition-colors"
                        >
                          <Gamepad2 className="w-4 h-4" />
                          <span>Preview Peserta</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pb-3">
                      {/* Table Header Row */}
                      <div className="px-6 pt-3 pb-2 grid grid-cols-12 items-center text-[11.5px] font-semibold text-white/60">
                        <div className="col-span-2 sm:col-span-1">Rank</div>
                        <div className="col-span-5 sm:col-span-5">Name</div>
                        <div className="col-span-2 sm:col-span-2">Score</div>
                        <div className="col-span-3 sm:col-span-4 text-right pr-7">Streak &amp; Progres</div>
                      </div>

                      {/* Participant Rows */}
                      <div className="space-y-2 px-3">
                        {sortedParticipants.map((p, idx) => {
                          const pct =
                            roomState.totalQuestions > 0
                              ? Math.round((p.answeredCount / roomState.totalQuestions) * 100)
                              : 0;
                          const initials = p.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() || '')
                            .join('');

                          return (
                            <div
                              key={p.id}
                              className="px-3.5 py-2.5 rounded-xl bg-black/50 hover:bg-black/65 border border-white/[0.07] grid grid-cols-12 items-center gap-2 transition-colors"
                            >
                              {/* Rank */}
                              <div className="col-span-2 sm:col-span-1 text-[13px] font-bold text-white/90 tabular-nums pl-1">
                                {idx + 1}
                              </div>

                              {/* Avatar + Name */}
                              <div className="col-span-5 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 ring-1 ring-white/20 ${p.avatarColor}`}
                                >
                                  {initials || 'U'}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-[12.5px] sm:text-[13px] font-bold text-white truncate">
                                    {p.name}
                                  </div>
                                  {(p.finished || !p.connected || p.tabSwitches > 0) && (
                                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                      {p.finished && (
                                        <span className="text-[#6EE7B7] font-semibold">Selesai</span>
                                      )}
                                      {!p.connected && (
                                        <span className="text-amber-300">Terputus</span>
                                      )}
                                      {p.tabSwitches > 0 && (
                                        <span className="text-[#FDA4AF] font-semibold tabular-nums">
                                          {p.tabSwitches}x pindah tab
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Score */}
                              <div className="col-span-2 sm:col-span-2 text-[13px] font-bold text-white tabular-nums">
                                {p.score.toLocaleString('id-ID')}
                              </div>

                              {/* Streak Pill Bar + Remove Button */}
                              <div className="col-span-3 sm:col-span-4 flex items-center gap-2">
                                <div className="flex-1 h-7 rounded-lg bg-[#09020B] border border-white/10 relative overflow-hidden flex items-center justify-between px-2.5">
                                  <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#8854C0]/55 to-[#00C985]/45 transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                  <span className="relative z-10 inline-flex items-center gap-1 text-[11.5px] font-bold text-white tabular-nums">
                                    <Flame
                                      className={`w-3.5 h-3.5 ${
                                        p.streak > 0 ? 'text-[#F59E0B]' : 'text-white/75'
                                      }`}
                                    />
                                    <span>{p.streak}</span>
                                  </span>
                                  <span className="relative z-10 hidden sm:inline text-[10.5px] text-white/60 tabular-nums">
                                    {p.answeredCount}/{roomState.totalQuestions}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onKickParticipant(p.id)}
                                  title={`Keluarkan ${p.name}`}
                                  className="w-6 h-6 rounded-md hover:bg-[#E53E51]/30 text-white/55 hover:text-[#FDA4AF] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: QUESTIONS PROJECTION & ACCURACY BREAKDOWN */}
              {activeHostTab === 'questions' && (
                <div className="rounded-2xl bg-[#180619]/92 border border-white/10 shadow-2xl p-5 space-y-5">
                  {currentHostQuestion && (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={safeQuestionIdx === 0}
                            onClick={() => setFocusedQuestionIdx((i) => Math.max(0, i - 1))}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center text-white cursor-pointer disabled:cursor-not-allowed transition-colors"
                            title="Soal Sebelumnya"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[13px] font-bold text-white tabular-nums">
                            Pertanyaan {safeQuestionIdx + 1} / {hostQuestions.length}
                          </span>
                          <button
                            type="button"
                            disabled={safeQuestionIdx >= hostQuestions.length - 1}
                            onClick={() =>
                              setFocusedQuestionIdx((i) => Math.min(hostQuestions.length - 1, i + 1))
                            }
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center text-white cursor-pointer disabled:cursor-not-allowed transition-colors"
                            title="Soal Berikutnya"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-white/70 tabular-nums">
                            <Clock className="w-3.5 h-3.5" />
                            {currentHostQuestion.timeLimitSec}s · {currentHostQuestion.points} pts
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAnswerKey((prev) => !prev)}
                            className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors ${
                              showAnswerKey
                                ? 'bg-[#00C985] text-[#05261A]'
                                : 'bg-white/10 hover:bg-white/20 border border-white/15 text-white'
                            }`}
                          >
                            {showAnswerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showAnswerKey ? 'Tutup Kunci' : 'Kunci Jawaban'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-black/40 border border-white/10 p-5 text-center space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C4B5FD]">
                          {currentHostQuestion.type === 'multiple_choice'
                            ? 'Pilihan Ganda'
                            : currentHostQuestion.type === 'true_false'
                            ? 'Benar / Salah'
                            : 'Isian Singkat'}
                          {' · '}
                          <span className="tabular-nums">
                            {currentQuestionStat?.totalAttempts || 0} jawaban ({currentQuestionStat?.accuracyPct || 0}% benar)
                          </span>
                        </div>
                        <h3 className="text-[17px] sm:text-[20px] font-semibold text-white leading-snug">
                          {currentHostQuestion.prompt}
                        </h3>
                      </div>

                      {currentHostQuestion.type !== 'short_answer' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {currentHostQuestion.options.map((opt, oIdx) => {
                            const tile =
                              currentHostQuestion.type === 'true_false'
                                ? WAYGROUND_TF_TILES[oIdx % WAYGROUND_TF_TILES.length]
                                : WAYGROUND_OPTION_TILES[oIdx % WAYGROUND_OPTION_TILES.length];
                            const votes = currentQuestionStat?.optionCounts?.[oIdx] || 0;
                            const totalVotes = Math.max(1, currentQuestionStat?.totalAttempts || 0);
                            const votePct =
                              (currentQuestionStat?.totalAttempts || 0) > 0
                                ? Math.round((votes / totalVotes) * 100)
                                : 0;
                            const isCorrect = currentHostQuestion.correctOptionIndex === oIdx;

                            return (
                              <div
                                key={oIdx}
                                className={`rounded-xl p-3.5 text-white relative overflow-hidden transition-all ${tile.bg} ${tile.borderBottom} ${
                                  showAnswerKey ? (isCorrect ? 'ring-2 ring-[#00C985]' : 'opacity-50') : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${tile.badgeBg}`}
                                    >
                                      {tile.letter}
                                    </span>
                                    <span className="text-[13.5px] font-semibold leading-snug break-words">
                                      {opt}
                                    </span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-black/25 text-[11.5px] font-bold tabular-nums shrink-0">
                                    {votes} ({votePct}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                          <div className="text-[12px] text-white/75 tabular-nums">
                            {currentQuestionStat?.correctAttempts || 0}/{currentQuestionStat?.totalAttempts || 0} peserta menjawab benar
                          </div>
                          {showAnswerKey && (
                            <div className="flex flex-wrap gap-1.5">
                              {(currentHostQuestion.acceptedAnswers || []).map((ans) => (
                                <span
                                  key={ans}
                                  className="px-2.5 py-0.5 rounded-full bg-[#00C985]/20 border border-[#00C985]/45 text-[#6EE7B7] text-[12px] font-bold"
                                >
                                  {ans}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick question pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                        {hostQuestions.map((hq, idx) => (
                          <button
                            key={hq.id}
                            type="button"
                            onClick={() => setFocusedQuestionIdx(idx)}
                            className={`w-8 h-8 rounded-lg text-[12px] font-bold tabular-nums cursor-pointer transition-colors ${
                              idx === safeQuestionIdx
                                ? 'bg-white text-[#1C1D21]'
                                : 'bg-white/10 text-white/75 hover:bg-white/20'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: ANTI-CHEATING / FOCUS MONITOR */}
              {activeHostTab === 'anticheating' && (
                <div className="rounded-2xl bg-[#180619]/92 border border-white/10 shadow-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4.5 h-4.5 text-[#00C985]" />
                      <div>
                        <div className="text-[13.5px] font-bold text-white">
                          Proteksi &amp; Monitor Fokus Sesi
                        </div>
                        <div className="text-[11.5px] text-white/65">
                          {roomState.mode === 'test'
                            ? 'Test Mode aktif — perpindahan tab peserta dilaporkan secara real-time.'
                            : 'Mode Classic aktif — gunakan Test Mode di Lobi untuk pelaporan pindah tab otomatis.'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${
                        totalTabAlerts > 0
                          ? 'bg-[#E53E51]/25 text-[#FDA4AF] border border-[#E53E51]/45'
                          : 'bg-[#00C985]/20 text-[#6EE7B7] border border-[#00C985]/40'
                      }`}
                    >
                      {totalTabAlerts} Peringatan Tab
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12px]">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                      <span className="text-white/75">Acak Urutan Soal</span>
                      <span className="font-bold text-white">
                        {roomState.settings.shuffleQuestions ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                      <span className="text-white/75">Acak Opsi Jawaban</span>
                      <span className="font-bold text-white">
                        {roomState.settings.shuffleOptions ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                      <span className="text-white/75">Deteksi Pindah Tab</span>
                      <span className="font-bold text-white">
                        {roomState.mode === 'test' ? 'Aktif' : 'Hanya Test Mode'}
                      </span>
                    </div>
                  </div>

                  {sortedParticipants.length > 0 && (
                    <div className="divide-y divide-white/10 rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                      {sortedParticipants.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 text-[12.5px]"
                        >
                          <span className="font-semibold text-white truncate">{p.name}</span>
                          <span
                            className={`font-bold tabular-nums shrink-0 ${
                              p.tabSwitches > 0 ? 'text-[#FDA4AF]' : 'text-[#6EE7B7]'
                            }`}
                          >
                            {p.tabSwitches > 0
                              ? `${p.tabSwitches}x pindah tab`
                              : p.connected
                              ? 'Fokus (Aman)'
                              : 'Terputus'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 3: ENDED PODIUM CELEBRATION (Stage 1: 3D Spotlight Cylinder Podium, Stage 2: Detailed Report) */}
        {roomState.status === 'ended' && endedViewMode === 'podium' && (() => {
          const podiumSlots: Array<{
            rankIdx: number;
            rankLabel: '1st' | '2nd' | '3rd';
            rankTextColor: string;
            cylinderHeight: string;
            mascotId: MascotId;
            revealAt: number;
          }> = [
            {
              rankIdx: 1,
              rankLabel: '2nd',
              rankTextColor: 'text-white/90',
              cylinderHeight: 'h-32 sm:h-44',
              mascotId: 'astronaut',
              revealAt: 2,
            },
            {
              rankIdx: 0,
              rankLabel: '1st',
              rankTextColor: 'text-[#F59E0B]',
              cylinderHeight: 'h-48 sm:h-64',
              mascotId: 'explorer',
              revealAt: 1,
            },
            {
              rankIdx: 2,
              rankLabel: '3rd',
              rankTextColor: 'text-[#D97706]',
              cylinderHeight: 'h-24 sm:h-32',
              mascotId: 'coder',
              revealAt: 2,
            },
          ];

          return (
            <div className="relative flex-1 flex flex-col justify-between min-h-[540px]">
              {/* Overhead Spotlight Cone centered above 1st-place cylinder */}
              <div
                className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[440px] h-[72%]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0) 100%)',
                  clipPath: 'polygon(30% 0%, 70% 0%, 96% 100%, 4% 100%)',
                }}
                aria-hidden="true"
              />

              {/* Podium Stage Header Bar (Left Reveal Ring, Center Title, Right Replay & Next) */}
              <div className="relative z-20 flex items-center justify-between gap-3 pt-1">
                <div className="w-20 flex items-center">
                  {podiumRevealCounter > 0 ? (
                    <div className="w-10 h-10 rounded-full border-2 border-white/80 border-t-transparent flex items-center justify-center text-[13px] font-extrabold text-white tabular-nums bg-black/35 shadow-lg">
                      {podiumRevealCounter}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-[#FCD34D]">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Podium</span>
                    </span>
                  )}
                </div>

                <div className="text-center min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-black tracking-wider uppercase text-white/95">
                    <span>SERVOLUTION LIVEQUIZ</span>
                  </div>
                  <div className="text-[12.5px] sm:text-[13.5px] font-bold text-white/85 truncate max-w-md mx-auto">
                    {roomState.quizTitle}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPodiumRevealCounter(3);
                      playQuizSound('join', soundEffects);
                    }}
                    title="Putar ulang animasi podium"
                    className="w-9 h-9 rounded-lg bg-white/12 hover:bg-white/22 border border-white/15 flex items-center justify-center text-white cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndedViewMode('report')}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white/15 hover:bg-white/25 border border-white/15 text-white text-[13px] font-bold cursor-pointer transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3-Tier 3D Dark Cylinder Pedestals (2nd Left - 1st Center - 3rd Right) */}
              <div className="relative z-10 flex-1 flex items-end justify-center pt-10 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6">
                <div className="w-full max-w-4xl grid grid-cols-3 gap-2 sm:gap-5 items-end px-3 sm:px-6">
                  {podiumSlots.map((slot) => {
                    const p = sortedParticipants[slot.rankIdx];
                    const isRevealed = podiumRevealCounter <= slot.revealAt || podiumRevealCounter === 0;

                    return (
                      <div
                        key={slot.rankLabel}
                        className="flex flex-col items-center justify-end"
                      >
                        {/* White Floating Nameplate + Mascot on Top of Pedestal */}
                        {p && (
                          <div
                            className={`flex flex-col items-center -mb-5 z-10 transition-all duration-500 ${
                              isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                            }`}
                          >
                            <div
                              className="mb-1.5 px-3 py-1 rounded-md bg-white text-[#1C1D21] shadow-xl max-w-[140px] sm:max-w-[210px] text-center"
                              title={`${p.name} · ${p.score.toLocaleString('id-ID')} pts`}
                            >
                              <div className="text-[11.5px] sm:text-[13.5px] font-extrabold uppercase tracking-wide truncate">
                                {p.name}
                              </div>
                              <div className="text-[10px] font-bold text-[#6E717A] tabular-nums">
                                {p.score.toLocaleString('id-ID')} pts · {p.correctCount}/{roomState.totalQuestions}
                              </div>
                            </div>

                            <WaygroundMascotFigure
                              mascotId={slot.mascotId}
                              className={
                                slot.rankLabel === '1st'
                                  ? 'w-24 h-28 sm:w-32 sm:h-36 drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]'
                                  : 'w-20 h-24 sm:w-24 sm:h-28 drop-shadow-[0_12px_16px_rgba(0,0,0,0.45)]'
                              }
                            />
                          </div>
                        )}

                        {/* Dark Glossy 3D Cylindrical Pedestal */}
                        <div className="relative w-full flex flex-col items-center">
                          {/* Top Elliptical Platform */}
                          <div
                            className="w-full h-7 sm:h-9 rounded-[50%] bg-gradient-to-b from-[#2A1025] to-[#120610] border border-white/15 shadow-[inset_0_2px_10px_rgba(255,255,255,0.12)] relative z-10"
                          >
                            <div className="mx-auto mt-1.5 w-[72%] h-[60%] rounded-[50%] bg-black/55 border border-white/[0.06]" />
                          </div>

                          {/* Cylinder Body */}
                          <div
                            className={`w-full ${slot.cylinderHeight} -mt-4 sm:-mt-5 bg-gradient-to-b from-[#11040F] via-[#070207] to-[#030103] border-x border-white/10 shadow-[0_-12px_36px_rgba(0,0,0,0.65)] flex items-center justify-center`}
                          >
                            <span
                              className={`text-[28px] sm:text-[42px] font-black italic tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] ${slot.rankTextColor}`}
                            >
                              {slot.rankLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* PHASE 3 STAGE 2: ENDED DETAILED REPORT & OVERVIEW MATRIX (Matches Host Continuation Screenshot) */}
        {roomState.status === 'ended' && endedViewMode === 'report' && (() => {
          const heroHeadline =
            overallAccuracy >= 75
              ? 'Luar biasa! Kelas menguasai materi dengan baik!'
              : overallAccuracy >= 45
              ? 'Perkembangan bagus! Sedikit lagi menguasai materi!'
              : 'Masih pemanasan? Latihan membuat sempurna!';

          const scaleTicks = ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'];

          return (
            <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-6 pt-1 pb-4">
              {/* UPPER HERO CLASS ACCURACY & ACTION CARD */}
              <div className="rounded-2xl bg-[#0D020D]/92 border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 text-center">
                {/* Class Accuracy Scale Bar */}
                <div className="max-w-lg mx-auto space-y-2">
                  <div
                    className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-white/85"
                    title={`${totalCorrectAll} jawaban benar dari ${totalAnsweredAll} percobaan`}
                  >
                    <span>Class Accuracy</span>
                    <Info className="w-3.5 h-3.5 text-white/55" />
                  </div>

                  <div className="relative h-8 rounded-lg bg-[#F43F5E] border border-white/25 flex items-center overflow-visible shadow-inner">
                    <div
                      className="h-full bg-[#00C985] transition-all duration-500 rounded-l-[7px]"
                      style={{
                        width: `${overallAccuracy}%`,
                        borderRadius: overallAccuracy >= 98 ? '7px' : undefined,
                      }}
                    />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-white text-[#1C1D21] text-[12.5px] font-black tabular-nums shadow-[0_6px_20px_rgba(0,0,0,0.5)] ring-4 ring-white/25 flex items-center justify-center"
                      style={{ left: `${Math.min(94, Math.max(6, overallAccuracy))}%` }}
                    >
                      {overallAccuracy}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/50 tabular-nums px-0.5 pt-0.5">
                    {scaleTicks.map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>
                </div>

                {/* Motivational Heading & Subtitle */}
                <div className="space-y-1">
                  <h3 className="text-[19px] sm:text-[22px] font-bold text-white leading-snug">
                    {heroHeadline}
                  </h3>
                  <p className="text-[13px] text-white/65">
                    Tinjau jawaban atau unduh laporan kelas untuk evaluasi pembelajaran sesi {roomState.quizTitle}.
                  </p>
                </div>

                {/* 3 Centered Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEndedViewMode('podium');
                      setPodiumRevealCounter(3);
                      playQuizSound('join', soundEffects);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-6 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[13px] font-bold cursor-pointer transition-colors min-w-[140px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportLiveQuizReportCsv(buildCurrentReport())}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-6 rounded-lg bg-white hover:bg-white/90 text-[#1C1D21] text-[13px] font-extrabold shadow-lg cursor-pointer transition-colors min-w-[155px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEndedReportTab('questions');
                      reportTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-6 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[13px] font-bold cursor-pointer transition-colors min-w-[155px]"
                  >
                    <span>Review Questions</span>
                  </button>
                </div>

                {/* Highlight Sub-Box (Podium & Session Highlight) */}
                <div className="max-w-lg mx-auto rounded-xl bg-white/[0.04] border border-[#EC4899]/35 px-4 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-left">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-white text-[#1C1D21] text-[9.5px] font-black uppercase tracking-wider">
                        PODIUM
                      </span>
                      <span className="text-[13.5px] font-bold text-white truncate">
                        Podium Juara &amp; Statistik Kelas
                      </span>
                    </div>
                    <div className="text-[11.5px] text-white/65 tabular-nums">
                      {roomState.participants.length} peserta · {finishedCount} selesai · Skor tertinggi{' '}
                      {(sortedParticipants[0]?.score || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEndedViewMode('podium')}
                    className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[12px] font-bold shrink-0 cursor-pointer transition-colors"
                  >
                    Lihat Podium
                  </button>
                </div>
              </div>

              {/* LOWER FOLDER-TABBED BREAKDOWN CARD (Overview | Questions | Anti-cheating) */}
              <div ref={reportTabsRef} className="flex flex-col">
                {/* Centered Folder Tab Strip */}
                <div className="flex items-end justify-center gap-1 px-4">
                  <button
                    type="button"
                    onClick={() => setEndedReportTab('overview')}
                    className={`relative px-5 py-2.5 rounded-t-xl text-[13px] font-semibold transition-colors cursor-pointer ${
                      endedReportTab === 'overview'
                        ? 'bg-[#0D020D] text-white border-t border-x border-white/10'
                        : 'text-white/60 hover:text-white/90'
                    }`}
                  >
                    <span>Overview</span>
                    {endedReportTab === 'overview' && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEndedReportTab('questions')}
                    className={`relative px-5 py-2.5 rounded-t-xl text-[13px] font-semibold transition-colors cursor-pointer ${
                      endedReportTab === 'questions'
                        ? 'bg-[#0D020D] text-white border-t border-x border-white/10'
                        : 'text-white/60 hover:text-white/90'
                    }`}
                  >
                    <span>Questions</span>
                    {endedReportTab === 'questions' && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEndedReportTab('anticheating')}
                    className={`relative inline-flex items-center gap-1.5 px-5 py-2.5 rounded-t-xl text-[13px] font-semibold transition-colors cursor-pointer ${
                      endedReportTab === 'anticheating'
                        ? 'bg-[#0D020D] text-white border-t border-x border-white/10'
                        : 'text-white/60 hover:text-white/90'
                    }`}
                  >
                    <span>Anti-cheating</span>
                    {totalTabAlerts > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#E53E51] text-white text-[10px] font-bold tabular-nums">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {totalTabAlerts}
                      </span>
                    )}
                    {endedReportTab === 'anticheating' && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-white rounded-full" />
                    )}
                  </button>
                </div>

                {/* REPORT TAB 1: OVERVIEW MATRIX (Names, Score, Accuracy, Q1..QN) */}
                {endedReportTab === 'overview' && (
                  <div className="rounded-2xl bg-[#0D020D]/92 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5">
                    {/* Legend & Time Toggle Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                      <div className="flex flex-wrap items-center gap-4 text-[11.5px] text-white/80">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-[3px] bg-[#00C985] shrink-0" />
                          <span>Correct</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-[3px] bg-[#F43F5E] shrink-0" />
                          <span>Incorrect</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-[3px] bg-white/30 shrink-0" />
                          <span>Unattempted</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-[12px] font-medium text-white/85 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showTimeTaken}
                            onChange={(e) => setShowTimeTaken(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-white/30 bg-transparent accent-[#00C985] cursor-pointer"
                          />
                          <span>Show time taken</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleExportLiveQuizReportCsv(buildCurrentReport())}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[12px] font-semibold cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Laporan</span>
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Scrollable Matrix Table */}
                    {sortedParticipants.length === 0 ? (
                      <div className="py-10 text-center text-[13px] text-white/60">
                        Belum ada data jawaban peserta pada sesi ini.
                      </div>
                    ) : (
                      <div className="overflow-x-auto pb-2">
                        <table className="w-full border-collapse text-left min-w-[640px]">
                          <thead>
                            <tr className="text-[12px] font-semibold text-white/65 border-b border-white/[0.08]">
                              <th className="py-2.5 pr-3 pl-2 w-10">#</th>
                              <th className="py-2.5 px-3 min-w-[170px]">Names</th>
                              <th className="py-2.5 px-3 w-24">Score</th>
                              <th className="py-2.5 px-3 min-w-[155px]">
                                <span className="inline-flex items-center gap-1">
                                  <span>Accuracy</span>
                                  <Info className="w-3 h-3 text-white/45" />
                                </span>
                              </th>
                              {hostQuestions.map((hq, qIdx) => {
                                const qStat = (roomState.questionStats || []).find(
                                  (qs) => qs.questionId === hq.id
                                );
                                return (
                                  <th
                                    key={hq.id}
                                    className="py-2 px-2.5 text-center min-w-[54px]"
                                    title={hq.prompt}
                                  >
                                    <div className="text-[12px] font-bold text-white">Q{qIdx + 1}</div>
                                    <div className="text-[10.5px] font-normal text-white/55 tabular-nums">
                                      {qStat?.accuracyPct || 0}%
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {sortedParticipants.map((p, idx) => {
                              const pAcc =
                                roomState.totalQuestions > 0
                                  ? Math.round((p.correctCount / roomState.totalQuestions) * 100)
                                  : 0;
                              const initials = p.name
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part) => part[0]?.toUpperCase() || '')
                                .join('');

                              return (
                                <tr
                                  key={p.id}
                                  className="hover:bg-white/[0.03] transition-colors text-[12.5px]"
                                >
                                  <td className="py-3 pr-3 pl-2 font-semibold text-white/60 tabular-nums">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 ring-1 ring-white/20 ${p.avatarColor}`}
                                      >
                                        {initials || 'U'}
                                      </span>
                                      <span className="font-bold text-white truncate max-w-[160px]">
                                        {p.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 font-bold text-white tabular-nums">
                                    {p.score.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-3 text-white/85 tabular-nums whitespace-nowrap">
                                    <span className="font-semibold text-white">{pAcc}%</span>{' '}
                                    <span className="text-white/55 text-[11.5px]">
                                      ({p.correctCount}/{roomState.totalQuestions})
                                    </span>
                                  </td>

                                  {hostQuestions.map((hq) => {
                                    const ans = p.answers.find((a) => a.questionId === hq.id);
                                    const secTaken = ans
                                      ? `${Math.max(1, Math.round((ans.timeTakenMs || 0) / 1000))}s`
                                      : '—';

                                    return (
                                      <td key={hq.id} className="py-2.5 px-2 text-center align-middle">
                                        <div className="inline-flex flex-col items-center gap-1">
                                          {ans ? (
                                            ans.isCorrect ? (
                                              <span
                                                title="Benar"
                                                className="w-7 h-7 rounded-full bg-[#00C985] text-[#05261A] flex items-center justify-center shadow-sm"
                                              >
                                                <Check className="w-4 h-4 stroke-[3]" />
                                              </span>
                                            ) : (
                                              <span
                                                title="Salah"
                                                className="w-7 h-7 rounded-full bg-[#F43F5E] text-white flex items-center justify-center shadow-sm"
                                              >
                                                <X className="w-4 h-4 stroke-[3]" />
                                              </span>
                                            )
                                          ) : (
                                            <span
                                              title="Belum dijawab"
                                              className="w-7 h-7 rounded-full bg-white/15 text-white/55 flex items-center justify-center text-[12px] font-bold"
                                            >
                                              –
                                            </span>
                                          )}
                                          {showTimeTaken && (
                                            <span className="text-[10px] text-white/60 tabular-nums">
                                              {secTaken}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* REPORT TAB 2: QUESTIONS BREAKDOWN & REVIEW */}
                {endedReportTab === 'questions' && (
                  <div className="rounded-2xl bg-[#0D020D]/92 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5">
                    {currentHostQuestion && (
                      <div className="space-y-4 pb-5 border-b border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={safeQuestionIdx === 0}
                              onClick={() => setFocusedQuestionIdx((i) => Math.max(0, i - 1))}
                              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center text-white cursor-pointer disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[13px] font-bold text-white tabular-nums">
                              Pertanyaan {safeQuestionIdx + 1} / {hostQuestions.length}
                            </span>
                            <button
                              type="button"
                              disabled={safeQuestionIdx >= hostQuestions.length - 1}
                              onClick={() =>
                                setFocusedQuestionIdx((i) => Math.min(hostQuestions.length - 1, i + 1))
                              }
                              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center text-white cursor-pointer disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowAnswerKey((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors ${
                              showAnswerKey
                                ? 'bg-[#00C985] text-[#05261A]'
                                : 'bg-white/10 hover:bg-white/20 border border-white/15 text-white'
                            }`}
                          >
                            {showAnswerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showAnswerKey ? 'Tutup Kunci' : 'Kunci Jawaban'}</span>
                          </button>
                        </div>

                        <div className="rounded-xl bg-black/45 border border-white/10 p-4 text-center space-y-1">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C4B5FD] tabular-nums">
                            {currentQuestionStat?.accuracyPct || 0}% Akurasi ({currentQuestionStat?.correctAttempts || 0}/
                            {currentQuestionStat?.totalAttempts || 0} benar)
                          </div>
                          <h4 className="text-[16px] sm:text-[18px] font-semibold text-white">
                            {currentHostQuestion.prompt}
                          </h4>
                        </div>

                        {currentHostQuestion.type !== 'short_answer' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {currentHostQuestion.options.map((opt, oIdx) => {
                              const tile =
                                currentHostQuestion.type === 'true_false'
                                  ? WAYGROUND_TF_TILES[oIdx % WAYGROUND_TF_TILES.length]
                                  : WAYGROUND_OPTION_TILES[oIdx % WAYGROUND_OPTION_TILES.length];
                              const votes = currentQuestionStat?.optionCounts?.[oIdx] || 0;
                              const totalVotes = Math.max(1, currentQuestionStat?.totalAttempts || 0);
                              const votePct =
                                (currentQuestionStat?.totalAttempts || 0) > 0
                                  ? Math.round((votes / totalVotes) * 100)
                                  : 0;
                              const isCorrect = currentHostQuestion.correctOptionIndex === oIdx;

                              return (
                                <div
                                  key={oIdx}
                                  className={`rounded-xl p-3 text-white ${tile.bg} ${tile.borderBottom} ${
                                    showAnswerKey ? (isCorrect ? 'ring-2 ring-[#00C985]' : 'opacity-50') : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-semibold leading-snug">{opt}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-black/25 text-[11px] font-bold tabular-nums shrink-0">
                                      {votes} ({votePct}%)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* All Questions Accuracy Bars */}
                    <div className="divide-y divide-white/10">
                      {(roomState.questionStats || []).map((qs, idx) => (
                        <button
                          key={qs.questionId}
                          type="button"
                          onClick={() => setFocusedQuestionIdx(idx)}
                          className="w-full text-left py-3 px-2 rounded-lg hover:bg-white/[0.04] transition-colors space-y-1.5 cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[13px] font-medium text-white">
                              <span className="font-bold text-white/55 mr-1.5 tabular-nums">Q{idx + 1}.</span>
                              {qs.prompt}
                            </span>
                            <span className="text-[13px] font-bold text-white tabular-nums shrink-0">
                              {qs.accuracyPct}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  qs.accuracyPct >= 70
                                    ? 'bg-[#00C985]'
                                    : qs.accuracyPct >= 40
                                    ? 'bg-[#F59E0B]'
                                    : 'bg-[#F43F5E]'
                                }`}
                                style={{ width: `${qs.accuracyPct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-white/60 tabular-nums shrink-0">
                              {qs.correctAttempts}/{qs.totalAttempts} benar
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* REPORT TAB 3: ANTI-CHEATING SUMMARY */}
                {endedReportTab === 'anticheating' && (
                  <div className="rounded-2xl bg-[#0D020D]/92 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4.5 h-4.5 text-[#00C985]" />
                        <div>
                          <div className="text-[13.5px] font-bold text-white">
                            Log Anti-Cheating &amp; Fokus Peserta
                          </div>
                          <div className="text-[11.5px] text-white/65">
                            {roomState.mode === 'test'
                              ? 'Total perpindahan tab selama ujian direkam otomatis.'
                              : 'Mode Classic aktif — gunakan Test Mode untuk penegakan penuh perpindahan tab.'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${
                          totalTabAlerts > 0
                            ? 'bg-[#E53E51]/25 text-[#FDA4AF] border border-[#E53E51]/45'
                            : 'bg-[#00C985]/20 text-[#6EE7B7] border border-[#00C985]/40'
                        }`}
                      >
                        {totalTabAlerts} Peringatan Tab
                      </span>
                    </div>

                    {sortedParticipants.length > 0 && (
                      <div className="divide-y divide-white/10 rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                        {sortedParticipants.map((p) => (
                          <div
                            key={p.id}
                            className="px-4 py-2.5 flex items-center justify-between gap-3 text-[12.5px]"
                          >
                            <span className="font-semibold text-white truncate">{p.name}</span>
                            <span
                              className={`font-bold tabular-nums shrink-0 ${
                                p.tabSwitches > 0 ? 'text-[#FDA4AF]' : 'text-[#6EE7B7]'
                              }`}
                            >
                              {p.tabSwitches > 0
                                ? `${p.tabSwitches}x pindah tab`
                                : 'Fokus Penuh (0 pelanggaran)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

  return (
    <div
      className={
        fullWidth
          ? isPreviewActive
            ? 'min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#4A1C59_0%,_#2A0E35_55%,_#1A0722_100%)] text-white p-4 sm:p-6 space-y-4'
            : 'min-h-screen w-full'
          : 'space-y-4'
      }
    >
      {/* Split / Single View Switcher Strip when Host Tester Preview is Active */}
      {isPreviewActive && (
        <div
          className={`rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
            fullWidth
              ? 'bg-[#16061E]/85 border border-white/15 text-white'
              : 'bg-white border border-black/[0.07] text-[#4B4E57]'
          }`}
        >
          <div className={`text-[13px] font-medium ${fullWidth ? 'text-white/80' : 'text-[#4B4E57]'}`}>
            Mode Uji Coba Aktif — Tampilan{' '}
            <strong className={fullWidth ? 'text-white' : 'text-[#1C1D21]'}>Host</strong> &amp;{' '}
            <strong className={fullWidth ? 'text-white' : 'text-[#1C1D21]'}>Peserta</strong> tersinkron langsung via WebSocket.
          </div>

          <div
            className={`inline-flex items-center gap-1 p-1 rounded-xl ${
              fullWidth ? 'bg-white/10' : 'bg-[#F4F5F8]'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewLayout('split')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors ${
                viewLayout === 'split'
                  ? 'bg-white text-[#1C1D21] shadow-xs'
                  : fullWidth
                  ? 'text-white/75 hover:text-white'
                  : 'text-[#6E717A] hover:text-[#1C1D21]'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split Host + Peserta</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('host')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors ${
                viewLayout === 'host'
                  ? 'bg-white text-[#1C1D21] shadow-xs'
                  : fullWidth
                  ? 'text-white/75 hover:text-white'
                  : 'text-[#6E717A] hover:text-[#1C1D21]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Layar Host</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('participant')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors ${
                viewLayout === 'participant'
                  ? 'bg-white text-[#1C1D21] shadow-xs'
                  : fullWidth
                  ? 'text-white/75 hover:text-white'
                  : 'text-[#6E717A] hover:text-[#1C1D21]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Layar Peserta</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Chosen Host / Split / Participant Layout */}
      {isPreviewActive && viewLayout === 'split' && previewRoomState ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-7">{renderHostStage()}</div>
          <div className="xl:col-span-5">
            <LiveQuizParticipantView
              embedded
              roomState={previewRoomState}
              connectionStatus={previewConnectionStatus}
              lastAnswerResult={previewLastAnswerResult}
              onSubmitAnswer={(qId, payload) => onPreviewSubmitAnswer?.(qId, payload)}
              onReportTabSwitch={() => onPreviewReportTabSwitch?.()}
              onClearAnswerResult={() => onPreviewClearAnswerResult?.()}
              onUpdateName={onPreviewUpdateName}
              onSendEmote={onPreviewSendEmote}
              recentEmotes={recentEmotes}
              onLeave={() => {
                onLeavePreview?.();
                setViewLayout('host');
              }}
            />
          </div>
        </div>
      ) : isPreviewActive && viewLayout === 'participant' && previewRoomState ? (
        <LiveQuizParticipantView
          embedded
          roomState={previewRoomState}
          connectionStatus={previewConnectionStatus}
          lastAnswerResult={previewLastAnswerResult}
          onSubmitAnswer={(qId, payload) => onPreviewSubmitAnswer?.(qId, payload)}
          onReportTabSwitch={() => onPreviewReportTabSwitch?.()}
          onClearAnswerResult={() => onPreviewClearAnswerResult?.()}
          onUpdateName={onPreviewUpdateName}
          onSendEmote={onPreviewSendEmote}
          recentEmotes={recentEmotes}
          onLeave={() => {
            onLeavePreview?.();
            setViewLayout('host');
          }}
        />
      ) : (
        renderHostStage()
      )}
    </div>
  );
};
