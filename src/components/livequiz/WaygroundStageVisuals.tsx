import React from 'react';
import type { WaygroundArenaTheme } from '../../constants/waygroundTheme';

export type MascotId = 'explorer' | 'astronaut' | 'coder' | 'scholar';

export const MASCOT_OPTIONS: Array<{ id: MascotId; label: string; accent: string; capColor: string }> = [
  { id: 'explorer', label: 'Explorer', accent: '#0EA5E9', capColor: '#F59E0B' },
  { id: 'astronaut', label: 'Astro', accent: '#8B5CF6', capColor: '#EC4899' },
  { id: 'coder', label: 'Coder', accent: '#10B981', capColor: '#38BDF8' },
  { id: 'scholar', label: 'Scholar', accent: '#F43F5E', capColor: '#FACC15' },
];

export const WaygroundLobbyBackdrop: React.FC<{ theme: WaygroundArenaTheme }> = ({ theme }) => {
  const [p1, p2, p3, p4] = theme.portalColors;
  const [auroraA, auroraB] = theme.auroraColors;
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none animate-wayground-gradient"
      style={{ backgroundImage: theme.animatedBgGradient }}
      aria-hidden="true"
    >
      {/* Smooth Drifting Ambient Gradient Auras */}
      <div
        className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl animate-wayground-aurora"
        style={{ background: `radial-gradient(circle, ${auroraA} 0%, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-[560px] h-[560px] rounded-full blur-3xl animate-wayground-aurora"
        style={{
          background: `radial-gradient(circle, ${auroraB} 0%, transparent 70%)`,
          animationDelay: '-9s',
        }}
      />

      {/* Perspective Corridor & Glowing Portals SVG */}
      <svg
        viewBox="0 0 1440 860"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-95"
      >
        <defs>
          <linearGradient id="wg-floor-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
            <stop offset="45%" stopColor="rgba(0,0,0,0.12)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </linearGradient>
          <linearGradient id="wg-p1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={p1} stopOpacity="0.92" />
            <stop offset="100%" stopColor={p1} stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="wg-p2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={p2} stopOpacity="0.88" />
            <stop offset="100%" stopColor={p2} stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="wg-p3" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor={p3} stopOpacity="0.88" />
            <stop offset="100%" stopColor={p3} stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="wg-p4" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor={p4} stopOpacity="0.92" />
            <stop offset="100%" stopColor={p4} stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* Back horizon wall */}
        <rect x="460" y="130" width="520" height="390" rx="18" fill="rgba(0,0,0,0.18)" stroke={theme.gridStroke} strokeWidth="1.5" />

        {/* Perspective ceiling & wall lines */}
        <line x1="0" y1="0" x2="460" y2="130" stroke={theme.gridStroke} strokeWidth="1.5" />
        <line x1="1440" y1="0" x2="980" y2="130" stroke={theme.gridStroke} strokeWidth="1.5" />
        <line x1="0" y1="730" x2="460" y2="520" stroke={theme.gridStroke} strokeWidth="1.5" />
        <line x1="1440" y1="730" x2="980" y2="520" stroke={theme.gridStroke} strokeWidth="1.5" />

        {/* Side wall horizontal seams */}
        <line x1="0" y1="220" x2="460" y2="250" stroke={theme.gridStroke} strokeWidth="1" />
        <line x1="0" y1="390" x2="460" y2="380" stroke={theme.gridStroke} strokeWidth="1" />
        <line x1="1440" y1="220" x2="980" y2="250" stroke={theme.gridStroke} strokeWidth="1" />
        <line x1="1440" y1="390" x2="980" y2="380" stroke={theme.gridStroke} strokeWidth="1" />

        {/* Perspective floor plane */}
        <polygon points="460,520 980,520 1440,730 1440,860 0,860 0,730" fill="url(#wg-floor-fade)" />

        {/* Floor perspective rays */}
        <line x1="540" y1="520" x2="210" y2="860" stroke={theme.gridStroke} strokeWidth="1.2" />
        <line x1="630" y1="520" x2="460" y2="860" stroke={theme.gridStroke} strokeWidth="1.2" />
        <line x1="720" y1="520" x2="720" y2="860" stroke={theme.gridStroke} strokeWidth="1.2" />
        <line x1="810" y1="520" x2="980" y2="860" stroke={theme.gridStroke} strokeWidth="1.2" />
        <line x1="900" y1="520" x2="1230" y2="860" stroke={theme.gridStroke} strokeWidth="1.2" />

        {/* Floor horizontal depth lines */}
        <line x1="360" y1="566" x2="1080" y2="566" stroke={theme.gridStroke} strokeWidth="1.1" />
        <line x1="230" y1="626" x2="1210" y2="626" stroke={theme.gridStroke} strokeWidth="1.2" />
        <line x1="60" y1="704" x2="1380" y2="704" stroke={theme.gridStroke} strokeWidth="1.3" />
        <line x1="0" y1="802" x2="1440" y2="802" stroke={theme.gridStroke} strokeWidth="1.4" />

        {/* Left outer portal (lime/yellow) */}
        <polygon points="0,120 132,165 132,670 0,735" fill="url(#wg-p1)" />
        <polygon points="105,158 132,165 132,670 105,682" fill="rgba(0,0,0,0.28)" />

        {/* Left inner portal (violet/indigo) */}
        <polygon points="212,190 310,220 310,590 212,635" fill="url(#wg-p2)" />
        <polygon points="288,213 310,220 310,590 288,600" fill="rgba(0,0,0,0.28)" />

        {/* Right inner portal (amber/orange) */}
        <polygon points="1228,190 1130,220 1130,590 1228,635" fill="url(#wg-p3)" />
        <polygon points="1152,213 1130,220 1130,590 1152,600" fill="rgba(0,0,0,0.28)" />

        {/* Right outer portal (teal/cyan) */}
        <polygon points="1440,120 1308,165 1308,670 1440,735" fill="url(#wg-p4)" />
        <polygon points="1335,158 1308,165 1308,670 1335,682" fill="rgba(0,0,0,0.28)" />
      </svg>
    </div>
  );
};

export const WaygroundParticipantBackdrop: React.FC<{
  theme: WaygroundArenaTheme;
  spotlight?: boolean;
}> = ({ theme, spotlight = false }) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ background: theme.bgGradient }}
      aria-hidden="true"
    >
      {/* Subtle large geometric background linework */}
      <svg
        viewBox="0 0 1440 860"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-25"
      >
        <polygon points="30,150 320,150 240,480 30,480" fill="none" stroke={theme.gridStroke} strokeWidth="2" />
        <circle cx="1050" cy="360" r="145" fill="none" stroke={theme.gridStroke} strokeWidth="2" />
        <rect x="850" y="70" width="460" height="440" rx="28" fill="none" stroke={theme.gridStroke} strokeWidth="2" />
        <polygon points="140,680 460,520 580,820 140,820" fill="none" stroke={theme.gridStroke} strokeWidth="1.5" />
      </svg>

      {spotlight && (
        <>
          {/* Perspective floor grid */}
          <svg
            viewBox="0 0 1440 500"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 w-full h-[54%] opacity-75"
          >
            <line x1="720" y1="0" x2="720" y2="500" stroke={theme.gridStroke} strokeWidth="1.3" />
            <line x1="560" y1="0" x2="120" y2="500" stroke={theme.gridStroke} strokeWidth="1.2" />
            <line x1="880" y1="0" x2="1320" y2="500" stroke={theme.gridStroke} strokeWidth="1.2" />
            <line x1="640" y1="0" x2="430" y2="500" stroke={theme.gridStroke} strokeWidth="1.2" />
            <line x1="800" y1="0" x2="1010" y2="500" stroke={theme.gridStroke} strokeWidth="1.2" />
            <ellipse cx="720" cy="255" rx="455" ry="138" fill="none" stroke={theme.gridStroke} strokeWidth="1.2" />
          </svg>

          {/* Overhead vertical spotlight cone */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[360px] sm:w-[460px] h-[64%]"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0) 100%)',
              clipPath: 'polygon(34% 0%, 66% 0%, 95% 100%, 5% 100%)',
            }}
          />

          {/* Glowing radial floor spotlight */}
          <div
            className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[560px] sm:w-[760px] h-[230px] rounded-full blur-2xl"
            style={{ background: theme.spotlightGlow }}
          />
        </>
      )}
    </div>
  );
};

export const WaygroundMascotFigure: React.FC<{
  mascotId: MascotId;
  className?: string;
}> = ({ mascotId, className = 'w-28 h-32 sm:w-32 sm:h-36 drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)]' }) => {
  const mascot = MASCOT_OPTIONS.find((m) => m.id === mascotId) || MASCOT_OPTIONS[0];
  return (
    <svg viewBox="0 0 140 155" className={className}>
      {/* Backpack */}
      <rect x="78" y="64" width="22" height="36" rx="8" fill="#FACC15" stroke="#1C1D21" strokeWidth="2.5" />
      {/* Legs */}
      <rect x="48" y="114" width="14" height="22" rx="6" fill={mascot.accent} stroke="#1C1D21" strokeWidth="2.5" />
      <rect x="68" y="114" width="14" height="22" rx="6" fill={mascot.accent} stroke="#1C1D21" strokeWidth="2.5" />
      {/* Shoes */}
      <rect x="44" y="130" width="20" height="10" rx="5" fill="#F8FAFC" stroke="#1C1D21" strokeWidth="2.5" />
      <rect x="66" y="130" width="20" height="10" rx="5" fill="#F8FAFC" stroke="#1C1D21" strokeWidth="2.5" />
      {/* Body Jacket */}
      <rect x="42" y="66" width="46" height="50" rx="14" fill="#1F6F5B" stroke="#1C1D21" strokeWidth="2.5" />
      <rect x="54" y="66" width="22" height="50" fill={mascot.accent} stroke="#1C1D21" strokeWidth="2" />
      {/* Head */}
      <circle cx="65" cy="44" r="24" fill="#FFFFFF" stroke="#1C1D21" strokeWidth="2.5" />
      {/* Happy Eyes & Smile */}
      <circle cx="57" cy="44" r="2.8" fill="#1C1D21" />
      <circle cx="73" cy="44" r="2.8" fill="#1C1D21" />
      <path d="M59 52 Q65 57 71 52" fill="none" stroke="#1C1D21" strokeWidth="2.5" strokeLinecap="round" />
      {/* Cap */}
      <path d="M40 34 C40 16, 90 16, 90 34 Z" fill={mascot.capColor} stroke="#1C1D21" strokeWidth="2.5" />
      <rect x="34" y="31" width="52" height="8" rx="4" fill="#38BDF8" stroke="#1C1D21" strokeWidth="2.5" />
      <circle cx="65" cy="24" r="5" fill="#FACC15" stroke="#1C1D21" strokeWidth="2" />
      {/* Coin Bag beside feet */}
      <g transform="translate(96, 108)">
        <path d="M8 10 C2 14, 0 28, 12 30 C24 30, 26 14, 18 10 L21 4 L7 4 Z" fill="#F59E0B" stroke="#1C1D21" strokeWidth="2.2" />
        <circle cx="13" cy="20" r="4.5" fill="#FDE68A" />
      </g>
    </svg>
  );
};

export const WaygroundPodiumCharacter: React.FC<{
  name: string;
  mascotId: MascotId;
  theme: WaygroundArenaTheme;
}> = ({ name, mascotId, theme }) => {
  const displayLabel = (name || 'Peserta').toUpperCase().slice(0, 18);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Mascot SVG Character */}
      <div className="relative z-10 -mb-6 transition-transform duration-300 hover:-translate-y-1">
        <WaygroundMascotFigure mascotId={mascotId} />
      </div>

      {/* 3D Circular Podium with Participant Name on the Rim */}
      <div className="relative w-52 sm:w-60 h-20 flex items-center justify-center">
        <svg viewBox="0 0 240 86" className="w-full h-full drop-shadow-[0_14px_24px_rgba(0,0,0,0.55)]">
          {/* Bottom base shadow ring */}
          <ellipse cx="120" cy="62" rx="108" ry="20" fill={theme.podiumBase} />
          <rect x="12" y="42" width="216" height="20" fill={theme.podiumBase} />
          {/* Middle bright name band */}
          <ellipse cx="120" cy="46" rx="96" ry="18" fill={theme.podiumRim} />
          <rect x="24" y="28" width="192" height="18" fill={theme.podiumRim} />
          {/* Top platform */}
          <ellipse cx="120" cy="28" rx="96" ry="18" fill={theme.podiumTop} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          <ellipse cx="120" cy="28" rx="76" ry="12" fill="rgba(255,255,255,0.16)" />
        </svg>
        <div
          className="absolute bottom-[25px] left-1/2 -translate-x-1/2 max-w-[165px] truncate text-[11.5px] font-extrabold tracking-[0.14em] text-white/95 drop-shadow-xs text-center"
          title={name}
        >
          {displayLabel}
        </div>
      </div>
    </div>
  );
};

export const WaygroundCountdownOverlay: React.FC<{
  step: 3 | 2 | 1;
  quizTitle: string;
  role: 'host' | 'participant';
  mode: 'classic' | 'test';
  totalQuestions: number;
}> = ({ step, quizTitle, role, mode, totalQuestions }) => {
  const accent =
    step === 3
      ? { ring: 'border-[#EC4899]', glow: 'rgba(236, 72, 153, 0.45)', badge: 'from-[#EC4899] to-[#A855F7]' }
      : step === 2
      ? { ring: 'border-[#F59E0B]', glow: 'rgba(245, 158, 11, 0.45)', badge: 'from-[#F59E0B] to-[#EA580C]' }
      : { ring: 'border-[#00C985]', glow: 'rgba(0, 201, 133, 0.48)', badge: 'from-[#00C985] to-[#0D9488]' };

  return (
    <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-10 text-center select-none">
      <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#140515]/80 border border-white/15 text-[12px] font-semibold text-white/85">
        <span>{quizTitle}</span>
        <span className="text-white/40">·</span>
        <span className="tabular-nums">{totalQuestions} Soal</span>
        <span className="text-white/40">·</span>
        <span className="text-[#FCD34D]">{mode === 'classic' ? 'Classic' : 'Test Mode'}</span>
      </div>

      <div className="relative flex items-center justify-center">
        <div
          className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 ${accent.ring} opacity-35 animate-ping`}
          style={{ animationDuration: '1s' }}
        />
        <div
          key={step}
          className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br ${accent.badge} border-4 border-white/30 flex items-center justify-center transition-transform duration-300 scale-100`}
          style={{ boxShadow: `0 0 60px ${accent.glow}, inset 0 2px 12px rgba(255,255,255,0.35)` }}
        >
          <span className="text-[76px] sm:text-[92px] font-black text-white leading-none tabular-nums drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
            {step}
          </span>
        </div>
      </div>

      <div className="mt-7 space-y-1.5">
        <div className="text-[20px] sm:text-[24px] font-extrabold tracking-tight text-white">
          {step === 3 ? 'Bersiap...' : step === 2 ? 'Fokus ke Layar...' : 'Mulai!'}
        </div>
        <p className="text-[13px] text-white/75">
          {role === 'host'
            ? 'Kuis segera berjalan untuk seluruh peserta di arena.'
            : 'Pertanyaan pertama akan muncul tepat setelah hitungan selesai.'}
        </p>
      </div>
    </div>
  );
};

