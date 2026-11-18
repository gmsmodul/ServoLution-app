let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type QuizSoundType = 'click' | 'join' | 'emote' | 'countdown' | 'start' | 'correct' | 'wrong';

export function playQuizSound(type: QuizSoundType, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playTone = (
    freq: number,
    startOffset: number,
    duration: number,
    oscType: OscillatorType = 'sine',
    gainLevel = 0.08
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, now + startOffset);
    gain.gain.setValueAtTime(0.0001, now + startOffset);
    gain.gain.exponentialRampToValueAtTime(gainLevel, now + startOffset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + duration + 0.02);
  };

  try {
    if (type === 'click') {
      playTone(540, 0, 0.07, 'triangle', 0.05);
    } else if (type === 'emote') {
      playTone(620, 0, 0.08, 'sine', 0.06);
      playTone(880, 0.05, 0.11, 'sine', 0.06);
    } else if (type === 'join') {
      playTone(523.25, 0, 0.12, 'triangle', 0.07);
      playTone(659.25, 0.08, 0.14, 'triangle', 0.07);
      playTone(783.99, 0.16, 0.2, 'triangle', 0.08);
    } else if (type === 'countdown') {
      playTone(660, 0, 0.11, 'sine', 0.08);
    } else if (type === 'start') {
      playTone(440, 0, 0.1, 'triangle', 0.07);
      playTone(554.37, 0.08, 0.1, 'triangle', 0.07);
      playTone(659.25, 0.16, 0.12, 'triangle', 0.08);
      playTone(880, 0.24, 0.24, 'triangle', 0.09);
    } else if (type === 'correct') {
      playTone(587.33, 0, 0.1, 'sine', 0.08);
      playTone(880, 0.08, 0.2, 'sine', 0.09);
    } else if (type === 'wrong') {
      playTone(280, 0, 0.14, 'sawtooth', 0.045);
      playTone(210, 0.11, 0.22, 'sawtooth', 0.045);
    }
  } catch {
    // ignore Web Audio playback errors in restricted contexts
  }
}

export function speakQuizText(text: string, enabled: boolean): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    if (!enabled || !text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore speech synthesis restrictions
  }
}
