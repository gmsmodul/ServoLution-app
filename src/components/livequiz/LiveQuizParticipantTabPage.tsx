import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  Flag,
  Loader2,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuizSocket } from '../../hooks/useLiveQuizSocket';
import { LiveQuizParticipantView } from './LiveQuizParticipantView';
import { INITIAL_LIVE_QUIZZES } from '../../data/liveQuizSeed';
import type { LiveQuiz, LiveQuizMode } from '../../types';
import {
  ACTION_BTN_DARK,
  ACTION_BTN_PRIMARY,
  ACTION_BTN_SECONDARY,
} from '../../constants/buttonStyles';

const AVATAR_COLORS = [
  'bg-[#D6D4FF] text-[#3F3B99]',
  'bg-[#C4F0DC] text-[#146C43]',
  'bg-[#FDE6C4] text-[#8C5811]',
  'bg-[#FAD2CF] text-[#942922]',
];

function resolveAvailableQuizzes(contextQuizzes: LiveQuiz[]): LiveQuiz[] {
  if (typeof window !== 'undefined') {
    try {
      const savedList = window.localStorage.getItem('servolution_live_quizzes');
      if (savedList) {
        const parsed = JSON.parse(savedList) as LiveQuiz[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore localStorage parse failure
    }
  }
  return contextQuizzes.length > 0 ? contextQuizzes : INITIAL_LIVE_QUIZZES;
}

export const LiveQuizParticipantTabPage: React.FC = () => {
  const { liveQuizzes } = useApp();
  const availableQuizzes = useMemo(
    () => resolveAvailableQuizzes(liveQuizzes),
    [liveQuizzes]
  );

  const {
    connectionStatus,
    roomState,
    lastAnswerResult,
    errorMessage,
    recentEmotes,
    joinRoom,
    updateParticipantName,
    sendEmote,
    submitAnswer,
    reportTabSwitch,
    leaveRoom,
    clearAnswerResult,
    clearError,
  } = useLiveQuizSocket();

  const previewHostSocket = useLiveQuizSocket('_preview_host');

  const launchParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        isPreview: false,
        code: '',
        name: '',
        quizId: '',
        mode: 'classic' as LiveQuizMode,
      };
    }
    const params = new URLSearchParams(window.location.search);
    const modeParam: LiveQuizMode = params.get('mode') === 'test' ? 'test' : 'classic';
    return {
      isPreview: params.get('preview') === '1',
      code: (params.get('code') || '').replace(/\D/g, '').slice(0, 6),
      name: (params.get('name') || '').trim(),
      quizId: params.get('quizId') || '',
      mode: modeParam,
    };
  }, []);

  const [retryCode, setRetryCode] = useState(launchParams.code);
  const [retryName, setRetryName] = useState(launchParams.name);
  const [previewQuizId, setPreviewQuizId] = useState<string>(
    () => launchParams.quizId || availableQuizzes[0]?.id || ''
  );
  const [previewMode, setPreviewMode] = useState<LiveQuizMode>(launchParams.mode);

  const initializedRef = useRef(false);
  const pendingPreviewJoinRef = useRef<{ name: string; excludeCode: string } | null>(null);

  const startPreviewSession = useCallback(
    (customName?: string, targetQuizId?: string, targetMode?: LiveQuizMode) => {
      const targetQuiz =
        availableQuizzes.find((q) => q.id === (targetQuizId || previewQuizId)) ||
        availableQuizzes[0];
      if (!targetQuiz) return;

      const chosenMode = targetMode || previewMode;
      const participantName = (customName ?? retryName).trim() || 'Peserta Preview';
      const excludeCode = previewHostSocket.roomState?.code || '';

      clearError();
      setPreviewQuizId(targetQuiz.id);
      setPreviewMode(chosenMode);
      pendingPreviewJoinRef.current = { name: participantName, excludeCode };

      previewHostSocket.leaveRoom();
      previewHostSocket.createRoom(targetQuiz, chosenMode, {
        shuffleQuestions: false,
        shuffleOptions: chosenMode === 'classic',
        showExplanation: chosenMode === 'classic',
        streakBonus: chosenMode === 'classic',
      });
    },
    [availableQuizzes, previewQuizId, previewMode, retryName, previewHostSocket, clearError]
  );

  // Initial launch on new tab open
  useEffect(() => {
    if (initializedRef.current) return;

    if (launchParams.isPreview) {
      if (availableQuizzes.length === 0) return;
      initializedRef.current = true;
      const participantName = launchParams.name || 'Peserta Preview';
      setRetryName(participantName);
      startPreviewSession(participantName, launchParams.quizId, launchParams.mode);
      return;
    }

    if (launchParams.code.length === 6 && launchParams.name) {
      initializedRef.current = true;
      const avatarColor = AVATAR_COLORS[launchParams.name.length % AVATAR_COLORS.length];
      joinRoom(launchParams.code, launchParams.name, avatarColor);
    }
  }, [launchParams, availableQuizzes.length, joinRoom, startPreviewSession]);

  // Auto-join participant socket once preview host room is ready
  useEffect(() => {
    const pending = pendingPreviewJoinRef.current;
    if (!pending) return;
    if (
      previewHostSocket.roomState &&
      previewHostSocket.roomState.role === 'host' &&
      previewHostSocket.roomState.code !== pending.excludeCode
    ) {
      pendingPreviewJoinRef.current = null;
      const code = previewHostSocket.roomState.code;
      const name = pending.name;
      setRetryCode(code);
      setRetryName(name);
      const avatarColor = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
      joinRoom(code, name, avatarColor);
    }
  }, [previewHostSocket.roomState, joinRoom]);

  const handleExitToHub = () => {
    pendingPreviewJoinRef.current = null;
    previewHostSocket.leaveRoom();
    leaveRoom();
    if (typeof window !== 'undefined') {
      window.location.href = '/?page=livequiz';
    }
  };

  const handleRetryJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = retryCode.replace(/\D/g, '').slice(0, 6);
    const cleanName = retryName.trim();
    if (cleanCode.length !== 6 || !cleanName) return;
    clearError();
    const avatarColor = AVATAR_COLORS[cleanName.length % AVATAR_COLORS.length];
    joinRoom(cleanCode, cleanName, avatarColor);
  };

  if (roomState && roomState.role === 'participant') {
    const showPreviewHostBar = launchParams.isPreview;
    return (
      <div className="min-h-screen w-full bg-[#1A0722] text-white flex flex-col">
        {showPreviewHostBar && (
          <div className="bg-[#120416]/95 border-b border-white/12 px-4 sm:px-6 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 z-50">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF1F5] text-[#9D113C] font-semibold">
                <Eye className="w-3.5 h-3.5" />
                Test Preview Setelah Gabung
              </span>
              <span className="font-mono font-bold text-white tabular-nums">
                Room {roomState.code}
              </span>
              <span className="text-white/40">·</span>
              <span className="text-white/80 font-medium">
                {roomState.status === 'lobby'
                  ? 'Tahap 1: Arena Tunggu Podium Lobi'
                  : roomState.status === 'active'
                  ? 'Tahap 2: Menjawab Soal Live'
                  : 'Tahap 3: Ringkasan & Pembahasan'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {roomState.status === 'lobby' && (
                <>
                  {availableQuizzes.length > 1 && (
                    <select
                      aria-label="Pilih kuis untuk preview"
                      value={previewQuizId}
                      onChange={(e) =>
                        startPreviewSession(retryName, e.target.value, previewMode)
                      }
                      className="h-9 px-3 rounded-full border border-white/20 bg-[#2B1038] text-[12.5px] font-medium text-white outline-none focus:border-[#C084FC] max-w-[200px] truncate cursor-pointer"
                    >
                      {availableQuizzes.map((q) => (
                        <option key={q.id} value={q.id} className="text-[#1C1D21] bg-white">
                          {q.title}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="inline-flex items-center gap-1 bg-white/10 p-1 rounded-full">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMode('classic');
                        previewHostSocket.updateRoomSettings(roomState.code, 'classic', {
                          ...roomState.settings,
                          showExplanation: true,
                          streakBonus: true,
                        });
                      }}
                      className={`px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                        roomState.mode === 'classic'
                          ? 'bg-white text-[#1C1D21]'
                          : 'text-white/75 hover:text-white'
                      }`}
                    >
                      Classic
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMode('test');
                        previewHostSocket.updateRoomSettings(roomState.code, 'test', {
                          ...roomState.settings,
                          streakBonus: false,
                        });
                      }}
                      className={`px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                        roomState.mode === 'test'
                          ? 'bg-white text-[#1C1D21]'
                          : 'text-white/75 hover:text-white'
                      }`}
                    >
                      Test Mode
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => previewHostSocket.startGame(roomState.code)}
                    className={ACTION_BTN_PRIMARY}
                  >
                    <Play className="w-4 h-4 shrink-0" />
                    <span>Mulai Kuis (Simulasi Host)</span>
                  </button>
                </>
              )}

              {roomState.status === 'active' && (
                <button
                  type="button"
                  onClick={() => previewHostSocket.endGame(roomState.code)}
                  className={ACTION_BTN_DARK}
                >
                  <Flag className="w-4 h-4 shrink-0" />
                  <span>Akhiri &amp; Lihat Hasil</span>
                </button>
              )}

              {roomState.status === 'ended' && (
                <button
                  type="button"
                  onClick={() => startPreviewSession(retryName, previewQuizId, previewMode)}
                  className={ACTION_BTN_PRIMARY}
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Ulangi Preview</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExitToHub}
                className={ACTION_BTN_SECONDARY}
              >
                <X className="w-4 h-4 shrink-0" />
                <span>Tutup Preview</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <LiveQuizParticipantView
            key={roomState.code}
            fullScreen
            roomState={roomState}
            connectionStatus={connectionStatus}
            lastAnswerResult={lastAnswerResult}
            recentEmotes={recentEmotes}
            onUpdateName={(newName) => updateParticipantName(roomState.code, newName)}
            onSendEmote={(emoji) => sendEmote(roomState.code, emoji)}
            onSubmitAnswer={(questionId, payload) =>
              submitAnswer(roomState.code, questionId, payload)
            }
            onReportTabSwitch={() => reportTabSwitch(roomState.code)}
            onClearAnswerResult={clearAnswerResult}
            onLeave={handleExitToHub}
          />
        </div>
      </div>
    );
  }

  const needsManualInput =
    !launchParams.isPreview && (launchParams.code.length !== 6 || !launchParams.name);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#4A1C59_0%,_#2A0E35_55%,_#1A0722_100%)] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-[#16061E]/85 border border-white/15 p-7 text-center space-y-5 shadow-2xl">
        {errorMessage || needsManualInput ? (
          <>
            <AlertTriangle className="w-10 h-10 text-[#F59E0B] mx-auto" />
            <div className="space-y-1.5">
              <h1 className="text-[18px] font-bold text-white">
                {errorMessage ? 'Gagal Bergabung ke Ruangan' : 'Gabung Sesi LiveQuiz'}
              </h1>
              <p className="text-[13px] text-white/75 leading-relaxed">
                {errorMessage || 'Masukkan 6 digit kode ruangan dan nama panggilan Anda.'}
              </p>
            </div>

            <form onSubmit={handleRetryJoin} className="space-y-2.5 text-left">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={retryCode}
                onChange={(e) => {
                  clearError();
                  setRetryCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                placeholder="Kode 6 digit"
                className="w-full h-10 px-4 rounded-full border border-white/20 bg-[#2B1038] text-[14px] font-mono font-bold tracking-widest text-center text-white outline-none focus:border-[#C084FC] tabular-nums"
              />
              <input
                type="text"
                value={retryName}
                onChange={(e) => {
                  clearError();
                  setRetryName(e.target.value);
                }}
                placeholder="Nama peserta..."
                className="w-full h-10 px-4 rounded-full border border-white/20 bg-[#2B1038] text-[13.5px] text-white placeholder:text-white/45 outline-none focus:border-[#C084FC]"
              />
              <button
                type="submit"
                disabled={retryCode.replace(/\D/g, '').length !== 6 || !retryName.trim()}
                className="w-full h-10 rounded-full bg-[#00C985] hover:bg-[#00B377] disabled:opacity-45 text-[#05261A] text-[13.5px] font-bold cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                Gabung Ruangan
              </button>
            </form>

            <a
              href="/?page=livequiz"
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[13px] font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Kembali ke LiveQuiz Hub</span>
            </a>
          </>
        ) : (
          <>
            <Loader2 className="w-9 h-9 text-[#C084FC] animate-spin mx-auto" />
            <h1 className="text-[17px] font-bold text-white">
              {launchParams.isPreview
                ? 'Menyiapkan Jendela Test Preview...'
                : `Menghubungkan ke Room ${launchParams.code}...`}
            </h1>
            <p className="text-[13px] text-white/70">
              Menyiapkan layar peserta LiveQuiz secara real-time di jendela baru.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
