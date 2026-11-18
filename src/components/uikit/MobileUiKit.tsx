import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  MessageSquare,
  Search,
  Library,
  Calendar,
  BookOpen,
  Users,
  Award,
  Layers,
  Plus,
  Download,
  CheckCheck,
  ArrowLeft,
  BarChart2,
  Save,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UiDocPage, UiDocSection } from './UiDocBlock';
import { MobileNavUiKitDemo } from './MobileNavUiKitDemo';
import { SplitFilterButton } from '../ui/SplitFilterButton';
import { HorizontalSlideTrack } from '../ui/HorizontalSlideTrack';
import { ElasticPullToRefresh } from '../ui/ElasticPullToRefresh';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { PASTEL_THEMES } from '../../constants/theme';

interface MobileUiKitProps {
  activeSubJump: string;
}

export const MobileUiKit: React.FC<MobileUiKitProps> = ({ activeSubJump }) => {
  const { triggerToast } = useApp();

  // 1. Mobile Header Demo State
  const [headerMode, setHeaderMode] = useState<'overview' | 'materials' | 'students' | 'messages'>('overview');

  // 3. Mobile Split Filter Demo State
  const [demoClass, setDemoClass] = useState('All');
  const [demoStatus, setDemoStatus] = useState('All');
  const [demoType, setDemoType] = useState('All');

  // 5. Mobile Bottom Sheet Demo State
  const [sheetOpen, setSheetOpen] = useState(false);
  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } = useBottomSheetMotion({
    onClose: () => setSheetOpen(false),
  });

  // 6. Mobile Gestures & Slide Demo State
  const [ptrDemoSeq, setPtrDemoSeq] = useState(0);
  const [slideMonth, setSlideMonth] = useState('Feb');

  // 7. Mobile Notification Popover Demo State
  const [notifTab, setNotifTab] = useState<'All' | 'Unread'>('All');
  const [demoNotifs, setDemoNotifs] = useState([
    {
      id: 'mn-1',
      title: 'Quiz 3 Grade Published',
      desc: 'Class 302 Calculus results are now available for review.',
      time: '5m ago',
      unread: true,
      theme: 'periwinkle' as const,
    },
    {
      id: 'mn-2',
      title: 'Parent Message Received',
      desc: 'Mrs. Anderson sent an excuse note for tomorrow.',
      time: '24m ago',
      unread: true,
      theme: 'peach' as const,
    },
    {
      id: 'mn-3',
      title: 'Lesson Slides Approved',
      desc: 'Unit 4: Derivatives slides marked Ready to Teach.',
      time: '2h ago',
      unread: false,
      theme: 'mint' as const,
    },
  ]);

  const headerPageMeta = {
    overview: { title: 'Overview', icon: BookOpen },
    materials: { title: 'Class Materials', icon: Library },
    students: { title: 'Students', icon: Users },
    messages: { title: 'Messages', icon: MessageSquare },
  };
  const ActiveHeaderIcon = headerPageMeta[headerMode].icon;

  const filteredDemoNotifs = demoNotifs.filter((n) => notifTab === 'All' || n.unread);
  const unreadDemoCount = demoNotifs.filter((n) => n.unread).length;

  return (
    <div className="space-y-8">
      {/* 1. Mobile Header */}
      {activeSubJump === 'Mobile Header' && (
        <UiDocPage
          title="Mobile Header"
          description="Header responsif khusus mobile tanpa breadcrumb: menampilkan foto profil + nama pada Overview dan judul halaman pada halaman lainnya."
          subLinks={[
            { id: 'mhd-overview', label: 'Overview Profile Header' },
            { id: 'mhd-inner', label: 'Inner Page Title Header' },
            { id: 'mhd-subbar', label: 'Right-Aligned Sub-Header Bar' },
          ]}
        >
          <UiDocSection
            id="mhd-overview"
            title="Overview Profile Header vs Inner Page Header"
            classesHint="h-16 px-4 border-b bg-white/80 / flex md:hidden items-center gap-2.5"
            codeSnippet={`{activePage === 'overview' ? (\n  <div className="flex md:hidden items-center gap-2.5">\n    <img src={avatar} className="w-9 h-9 rounded-full" />\n    <div>\n      <span className="block text-[11px] text-gray-600">Welcome</span>\n      <span className="block text-[15px] font-semibold">Rasengan</span>\n    </div>\n  </div>\n) : (\n  <div className="flex md:hidden items-center gap-2">\n    <PageIcon className="w-[18px] h-[18px]" />\n    <h1 className="text-[17px] font-semibold truncate">{title}</h1>\n  </div>\n)}`}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {(['overview', 'materials', 'students', 'messages'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setHeaderMode(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                      headerMode === m
                        ? 'bg-[#1C1D21] text-white shadow-xs'
                        : 'bg-[#F4F5F8] text-[#6E717A] hover:text-[#1C1D21]'
                    }`}
                  >
                    {m === 'overview' ? 'Overview (Profile)' : headerPageMeta[m].title}
                  </button>
                ))}
              </div>

              <div className="bg-[#E8EAEE] rounded-2xl p-4 sm:p-6 flex justify-center">
                <div className="w-full max-w-[375px] bg-white rounded-[24px] shadow-md border border-black/[0.06] overflow-hidden">
                  {/* Simulated Mobile Top Header */}
                  <div className="h-16 px-4 border-b border-black/[0.06] flex items-center justify-between gap-3 bg-white">
                    {headerMode === 'overview' ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                          alt="Rasengan"
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/80x80/1C1D21/FFFFFF?text=RS';
                          }}
                          className="w-9 h-9 rounded-full object-cover border border-black/[0.08] shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="block text-[11px] font-medium text-gray-600 leading-tight">
                            Welcome
                          </span>
                          <span className="block text-[15px] font-semibold tracking-tight text-[#1C1D21] truncate leading-tight">
                            Rasengan
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <ActiveHeaderIcon className="w-[18px] h-[18px] text-[#1C1D21] shrink-0" />
                        <span className="text-[17px] font-semibold tracking-tight text-[#1C1D21] truncate">
                          {headerPageMeta[headerMode].title}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => triggerToast('Notifikasi', 'Membuka panel notifikasi mobile.', 'info')}
                        className="w-9 h-9 rounded-full border border-black/[0.07] flex items-center justify-center text-[#1C1D21] relative cursor-pointer"
                      >
                        <Bell className="w-4 h-4" />
                        <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#EF4444] text-white text-[9.5px] font-bold flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white">
                          5
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeaderMode('messages')}
                        className="w-9 h-9 rounded-full border border-black/[0.07] flex items-center justify-center text-[#1C1D21] relative cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B] absolute top-1.5 right-2 ring-2 ring-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerToast('UI Kit', 'Menuju UI Design System.', 'info')}
                        className="w-9 h-9 rounded-full border border-black/[0.07] flex items-center justify-center text-[#1C1D21] cursor-pointer"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Simulated Body Below Mobile Header (No Duplicate In-Page Title) */}
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-end gap-2">
                      {headerMode === 'students' && (
                        <span className="mr-auto px-2.5 py-1 rounded-full bg-[#FFF5E6] text-[#8C5811] text-[11px] font-bold">
                          Avg 93%
                        </span>
                      )}
                      {headerMode === 'messages' && (
                        <span className="mr-auto px-2.5 py-1 rounded-full bg-[#FFECEB] text-[#942922] text-[11px] font-bold">
                          4 Unread
                        </span>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-black/[0.08] text-xs font-medium text-[#1C1D21]"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-gray-500" />
                        <span>Statistics</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1C1D21] text-white text-xs font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create</span>
                      </button>
                    </div>
                    <div className="h-14 rounded-2xl bg-[#F4F5F8] border border-black/[0.04] flex items-center justify-center text-[11.5px] text-[#8A8D98]">
                      Konten halaman dimulai tanpa duplikasi judul
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UiDocSection>

          <UiDocSection
            id="mhd-inner"
            title="Breadcrumb Removal Rule (Mobile vs Tablet/PC)"
            classesHint="flex md:hidden (Title / Profile) | hidden md:flex (Breadcrumb)"
            codeSnippet={`{/* Mobile: Page Title */}\n<div className="flex md:hidden items-center gap-2 min-w-0">\n  <Icon className="w-[18px] h-[18px]" />\n  <h1 className="text-[17px] font-semibold truncate">{title}</h1>\n</div>\n\n{/* Tablet & PC: Breadcrumb */}\n<nav className="hidden md:flex items-center gap-2 text-[13px]">\n  <span>Servolution</span> <ChevronRight /> <span>{title}</span>\n</nav>`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-[#FAFBFD] border border-black/[0.05] space-y-1.5">
                <div className="font-semibold text-[#1C1D21]">Mobile (&lt; 768px)</div>
                <p className="text-[#6E717A] leading-relaxed">
                  Sidebar &amp; breadcrumb disembunyikan. Header menampilkan judul halaman (atau profil + nama pada Overview), dan judul di dalam halaman otomatis disembunyikan.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAFBFD] border border-black/[0.05] space-y-1.5">
                <div className="font-semibold text-[#1C1D21]">Tablet &amp; PC (&ge; 768px)</div>
                <p className="text-[#6E717A] leading-relaxed">
                  Sidebar kiri aktif, header menampilkan breadcrumb <code className="px-1 py-0.5 rounded bg-gray-100">Servolution &gt; Halaman</code>, dan judul lengkap + subjudul tampil di dalam halaman.
                </p>
              </div>
            </div>
          </UiDocSection>

          <UiDocSection
            id="mhd-subbar"
            title="Right-Aligned Sub-Header Action Bar"
            classesHint="flex items-center justify-end gap-2.5 w-full md:w-auto"
            codeSnippet={`<div className="flex items-center justify-end gap-2.5 w-full md:w-auto">\n  <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border">...</button>\n  <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1C1D21] text-white">...</button>\n</div>`}
          >
            <div className="max-w-[375px] bg-[#FAFBFD] p-3.5 rounded-2xl border border-black/[0.05]">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => triggerToast('CSV Export', 'Mengunduh ringkasan CSV.', 'success')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-black/[0.08] bg-white text-xs font-medium text-[#1C1D21] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerToast('Generate', 'Membuat laporan baru.', 'info')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1C1D21] text-white text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </button>
              </div>
            </div>
          </UiDocSection>
        </UiDocPage>
      )}

      {/* 2. Mobile Bottom Dock */}
      {activeSubJump === 'Mobile Bottom Dock' && <MobileNavUiKitDemo />}

      {/* 3. Mobile Split Filters */}
      {activeSubJump === 'Mobile Split Filters' && (
        <UiDocPage
          title="Mobile Split Filters"
          description="Split Button filter pengganti deretan pill panjang: klik sisi kiri untuk berpindah cepat ke opsi berikutnya, klik panah kanan untuk membuka dropdown lengkap."
          subLinks={[
            { id: 'msf-variants', label: 'Variant Styles (Dark / Primary / Surface)' },
            { id: 'msf-badges', label: 'Status Split with Count Badges' },
          ]}
        >
          <UiDocSection
            id="msf-variants"
            title="Split Filter Button Variants"
            classesHint="SplitFilterButton variant='dark' | 'primary' | 'surface' (1 kata di mobile, prefix di desktop)"
            codeSnippet={`<SplitFilterButton\n  value={selectedClass}\n  onChange={setSelectedClass}\n  prefix="Kelas"\n  icon={Users}\n  variant="dark"\n  options={[\n    { value: 'All', label: 'Semua', mobileLabel: 'Semua' },\n    { value: '302', label: 'Class 302', mobileLabel: '302' },\n  ]}\n/>`}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <SplitFilterButton
                  value={demoClass}
                  onChange={setDemoClass}
                  prefix="Kelas"
                  icon={Users}
                  variant="dark"
                  options={[
                    { value: 'All', label: 'Semua', mobileLabel: 'Semua' },
                    { value: '302', label: 'Class 302', mobileLabel: '302' },
                    { value: '303', label: 'Class 303', mobileLabel: '303' },
                    { value: '304', label: 'Class 304', mobileLabel: '304' },
                    { value: '305', label: 'Class 305', mobileLabel: '305' },
                  ]}
                />

                <SplitFilterButton
                  value={demoType}
                  onChange={setDemoType}
                  prefix="Tipe"
                  icon={Layers}
                  variant="surface"
                  options={[
                    { value: 'All', label: 'Semua Tipe', mobileLabel: 'Semua' },
                    { value: 'video', label: 'Video', mobileLabel: 'Video' },
                    { value: 'document', label: 'Dokumen', mobileLabel: 'Dokumen' },
                    { value: 'slides', label: 'Slides', mobileLabel: 'Slides' },
                    { value: 'lab', label: 'Lab', mobileLabel: 'Lab' },
                  ]}
                />
              </div>

              <div className="text-xs text-[#6E717A] bg-[#FAFBFD] px-3.5 py-2.5 rounded-xl border border-black/[0.04]">
                Kelas aktif: <strong className="text-[#1C1D21]">{demoClass}</strong> · Tipe aktif:{' '}
                <strong className="text-[#1C1D21]">{demoType}</strong> — klik sisi kiri untuk beralih cepat, atau tekan panah untuk memilih dari daftar.
              </div>
            </div>
          </UiDocSection>

          <UiDocSection
            id="msf-badges"
            title="Status Split Filter with KPI Count Badges"
            classesHint="variant='primary' + options[].badge + options[].badgeClassName"
            codeSnippet={`<SplitFilterButton\n  value={status}\n  onChange={setStatus}\n  prefix="Status"\n  icon={Award}\n  variant="primary"\n  options={[\n    { value: 'All', label: 'All', mobileLabel: 'All', badge: 10, badgeClassName: 'bg-[#FEF1F5] text-[#9D113C]' },\n    { value: 'Honor Roll', label: 'Honor Roll', mobileLabel: 'Honor', badge: 4, badgeClassName: 'bg-[#E6F9F0] text-[#146C43]' },\n  ]}\n/>`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SplitFilterButton
                value={demoStatus}
                onChange={setDemoStatus}
                prefix="Status"
                icon={Award}
                variant="primary"
                options={[
                  {
                    value: 'All',
                    label: 'All',
                    mobileLabel: 'All',
                    badge: 10,
                    badgeClassName: 'bg-[#FEF1F5] text-[#9D113C]',
                  },
                  {
                    value: 'Honor Roll',
                    label: 'Honor Roll',
                    mobileLabel: 'Honor',
                    badge: 4,
                    badgeClassName: 'bg-[#E6F9F0] text-[#146C43]',
                  },
                  {
                    value: 'Active',
                    label: 'Active',
                    mobileLabel: 'Active',
                    badge: 5,
                    badgeClassName: 'bg-[#F4F5F8] text-[#1C1D21]',
                  },
                  {
                    value: 'Needs Support',
                    label: 'Needs Support',
                    mobileLabel: 'Support',
                    badge: 1,
                    badgeClassName: 'bg-[#FFECEB] text-[#942922]',
                  },
                ]}
              />

              <span className="text-xs text-[#6E717A]">
                Status terpilih: <strong className="text-[#9D113C]">{demoStatus}</strong>
              </span>
            </div>
          </UiDocSection>
        </UiDocPage>
      )}

      {/* 4. Mobile Compact Buttons */}
      {activeSubJump === 'Mobile Compact Buttons' && (
        <UiDocPage
          title="Mobile Compact Buttons"
          description="Standar tombol pada mode mobile: setiap tombol selalu berpasangan Ikon + 1 Kata singkat agar nyaman disentuh satu tangan tanpa membungkus baris."
          subLinks={[
            { id: 'mbtn-oneword', label: 'Icon + 1-Word Action Set' },
            { id: 'mbtn-badges', label: 'Compact Status & Metric Pills' },
          ]}
        >
          <UiDocSection
            id="mbtn-oneword"
            title="Icon + 1-Word Action Set"
            classesHint="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap shrink-0"
            codeSnippet={`<button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1C1D21] text-white text-[13px] font-medium whitespace-nowrap">\n  <Plus className="w-4 h-4 shrink-0" />\n  <span className="sm:hidden">Create</span>\n  <span className="hidden sm:inline">Create assignment</span>\n</button>`}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { label: 'Create', icon: Plus, style: 'bg-[#1C1D21] text-white hover:bg-[#2E3036]' },
                { label: 'Add', icon: Plus, style: 'bg-[#1C1D21] text-white hover:bg-[#2E3036]' },
                { label: 'New', icon: Plus, style: 'bg-[#ee2e65] text-white hover:brightness-105' },
                { label: 'Save', icon: Save, style: 'bg-[#1C1D21] text-white hover:bg-[#2E3036]' },
                { label: 'Export', icon: Download, style: 'bg-white text-[#1C1D21] border border-black/[0.08] hover:bg-[#F4F5F8]' },
                { label: 'CSV', icon: FileText, style: 'bg-white text-[#1C1D21] border border-black/[0.08] hover:bg-[#F4F5F8]' },
                { label: 'Statistics', icon: BarChart2, style: 'bg-white text-[#1C1D21] border border-black/[0.08] hover:bg-[#F4F5F8]' },
                { label: 'Read', icon: CheckCheck, style: 'bg-[#FEF1F5] text-[#9D113C] border border-[#FBC2D4]' },
                { label: 'Back', icon: ArrowLeft, style: 'bg-[#F4F5F8] text-[#1C1D21] hover:bg-gray-200/70' },
              ].map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => triggerToast(btn.label, `Tombol mobile "${btn.label}" ditekan.`, 'info')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${btn.style}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </UiDocSection>

          <UiDocSection
            id="mbtn-badges"
            title="Compact Mobile Inline Badges"
            classesHint="px-2.5 py-1 rounded-full text-[11.5px] font-bold"
            codeSnippet={`<span className="px-2.5 py-1 rounded-full bg-[#FFF5E6] text-[#8C5811] text-[11.5px] font-bold">Avg 93%</span>`}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full bg-[#FFF5E6] text-[#8C5811] text-[11.5px] font-bold">
                Avg 93%
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FFECEB] text-[#942922] text-[11.5px] font-bold">
                4 Unread
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#E6F9F0] text-[#146C43] text-[11.5px] font-bold">
                4 Honor
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#FEF1F5] text-[#9D113C] text-[11.5px] font-bold">
                10 Total
              </span>
            </div>
          </UiDocSection>
        </UiDocPage>
      )}

      {/* 5. Mobile Bottom Sheet */}
      {activeSubJump === 'Mobile Bottom Sheet' && (
        <UiDocPage
          title="Mobile Bottom Sheet"
          description="Panel lembaran bawah khusus mobile dengan handle seret (swipe-down to dismiss), animasi spring lembut, dan tombol tutup X."
          subLinks={[{ id: 'mbs-interactive', label: 'Interactive Swipeable Bottom Sheet' }]}
        >
          <UiDocSection
            id="mbs-interactive"
            title="Interactive Swipeable Bottom Sheet"
            classesHint="rounded-t-[28px] shadow-2xl animate-bottom-sheet / useBottomSheetMotion"
            codeSnippet={`const { setSheetElement, backdropRef, animateClose, sheetGestureProps } = useBottomSheetMotion({ onClose });\n\n<div ref={backdropRef} data-modal-sheet-backdrop="true" className="fixed inset-0 z-50 flex items-end">\n  <div ref={setSheetElement} {...sheetGestureProps} className="w-full bg-white rounded-t-[28px] p-5 animate-bottom-sheet">\n    <div data-sheet-handle="true" className="w-10 h-1 bg-black/15 rounded-full mx-auto" />\n    ...\n  </div>\n</div>`}
          >
            <div className="bg-[#E8EAEE] rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-4">
              <div className="w-full max-w-[340px] bg-white rounded-[26px] p-4 space-y-3 shadow-lg border border-black/[0.06]">
                <div className="flex justify-center">
                  <div className="w-10 h-1 bg-black/15 rounded-full animate-sheet-handle" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#FEF1F5] text-[#9D113C] flex items-center justify-center font-bold text-xs">
                      RS
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-[#1C1D21]">Student Profile Sheet</div>
                      <div className="text-[11px] text-[#8A8D98]">Tarik handle ke bawah untuk menutup</div>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-[#F4F5F8] flex items-center justify-center text-[#6E717A]">
                    <X className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-[#E6F9F0] text-[#146C43] font-semibold">
                    Attendance · 96%
                  </div>
                  <div className="p-2.5 rounded-2xl bg-[#FEF1F5] text-[#9D113C] font-semibold">
                    Mean · 92.4%
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1C1D21] hover:bg-[#2E3036] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buka Live Bottom Sheet</span>
              </button>
            </div>

            {sheetOpen &&
              createPortal(
                <div
                  ref={backdropRef}
                  data-modal-sheet-backdrop="true"
                  className="animate-ui-fade fixed inset-0 z-[9999] bg-black/35 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
                >
                  <div
                    ref={setSheetElement}
                    {...sheetGestureProps}
                    className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 animate-bottom-sheet"
                  >
                    <div
                      data-sheet-handle="true"
                      className="flex justify-center py-2 -mt-2 cursor-grab active:cursor-grabbing touch-none sm:hidden"
                    >
                      <div className="w-10 h-1 bg-black/15 rounded-full animate-sheet-handle" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[16px] font-semibold text-[#1C1D21]">Live Mobile Bottom Sheet</h3>
                        <p className="text-[12px] text-[#8A8D98]">
                          Tarik handle ke bawah di layar sentuh atau tekan Tutup.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={animateClose}
                        aria-label="Close sheet"
                        className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center text-[#6E717A] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAFBFD] border border-black/[0.05] text-xs text-[#5A5D67] leading-relaxed">
                      Sheet ini memakai hook <code className="px-1 py-0.5 rounded bg-gray-100">useBottomSheetMotion</code> untuk mendukung gestur seret ke bawah secara halus dengan akselerasi spring.
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={animateClose}
                        className="px-4 py-2 rounded-full bg-[#1C1D21] text-white text-xs font-semibold cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </UiDocSection>
        </UiDocPage>
      )}

      {/* 6. Mobile Gestures & Slide */}
      {activeSubJump === 'Mobile Gestures & Slide' && (
        <UiDocPage
          title="Mobile Gestures & Slide"
          description="Interaksi sentuh khusus mobile: Elastic Header Pull-to-Refresh bergaya pegas dan Horizontal Slide Indicator tanpa scrollbar."
          subLinks={[
            { id: 'mgs-ptr', label: 'Elastic Header Pull to Refresh' },
            { id: 'mgs-slide', label: 'Horizontal Slide Indicator' },
          ]}
        >
          <UiDocSection
            id="mgs-ptr"
            title="Elastic Header Pull to Refresh"
            classesHint="ElasticPullToRefresh onRefresh={...} allowDesktopMousePull"
            codeSnippet={`<ElasticPullToRefresh onRefresh={handleWorkspaceRefresh}>\n  <PageContent />\n</ElasticPullToRefresh>`}
            actions={
              <button
                type="button"
                onClick={() => setPtrDemoSeq((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF1F5] text-[#9D113C] text-xs font-semibold hover:bg-[#FDE0E9] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulasi Pull</span>
              </button>
            }
          >
            <div className="bg-[#E8EAEE] rounded-2xl p-4 sm:p-6 flex justify-center">
              <div className="w-full max-w-[340px] h-[250px] bg-white rounded-[24px] border border-black/[0.06] shadow-md overflow-hidden flex flex-col">
                <ElasticPullToRefresh
                  allowDesktopMousePull
                  demoTriggerSeq={ptrDemoSeq}
                  onRefresh={() => triggerToast('Segarkan', 'Data mobile berhasil diperbarui.', 'success')}
                >
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    <div className="text-xs font-semibold text-[#1C1D21]">Tarik ke bawah area ini</div>
                    <div className="p-3 rounded-2xl bg-[#EEF8F3] text-xs text-[#146C43] font-medium">
                      Daily Attendance · 95.8%
                    </div>
                    <div className="p-3 rounded-2xl bg-[#FEF1F5] text-xs text-[#9D113C] font-medium">
                      Upcoming Exams · 6 Scheduled
                    </div>
                  </div>
                </ElasticPullToRefresh>
              </div>
            </div>
          </UiDocSection>

          <UiDocSection
            id="mgs-slide"
            title="Horizontal Slide Indicator (Pengganti Scrollbar)"
            classesHint="HorizontalSlideTrack activeKey={active} accent='dark'"
            codeSnippet={`<HorizontalSlideTrack activeKey={month} accent="dark">\n  {months.map(m => <button data-slide-active={month === m}>{m}</button>)}\n</HorizontalSlideTrack>`}
          >
            <div className="max-w-sm bg-[#FAFBFD] p-4 rounded-2xl border border-black/[0.05] space-y-3">
              <HorizontalSlideTrack
                activeKey={slideMonth}
                trackClassName="inline-flex items-center gap-1.5 bg-white p-1 rounded-full border border-black/[0.06] max-w-full select-none"
                accent="dark"
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-slide-active={slideMonth === m ? 'true' : undefined}
                    onClick={() => setSlideMonth(m)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      slideMonth === m ? 'bg-[#1C1D21] text-white' : 'text-[#6E717A] hover:text-[#1C1D21]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </HorizontalSlideTrack>
              <div className="text-[11.5px] text-[#8A8D98]">
                Bulan terpilih: <strong className="text-[#1C1D21]">{slideMonth}</strong>
              </div>
            </div>
          </UiDocSection>
        </UiDocPage>
      )}

      {/* 7. Mobile Notifications */}
      {activeSubJump === 'Mobile Notifications' && (
        <UiDocPage
          title="Mobile Notifications"
          description="Pusat notifikasi portal edge-to-edge di mobile dan notifikasi toast yang ditempatkan di atas bottom nav bar agar tidak tertumpuk."
          subLinks={[
            { id: 'mnf-popover', label: 'Mobile Notification Center Popover' },
            { id: 'mnf-toast', label: 'Mobile Elevated Toast Position' },
          ]}
        >
          <UiDocSection
            id="mnf-popover"
            title="Mobile Notification Center Popover"
            classesHint="createPortal(..., document.body) / fixed inset-x-3 z-[9999] rounded-[24px]"
            codeSnippet={`createPortal(\n  <div style={{ top, left: 12, right: 12 }} className="fixed bg-white rounded-[24px] shadow-2xl p-4 z-[9999]">\n    <NotificationsHeader />\n    <SegmentedFilter />\n    <NotificationCards />\n  </div>,\n  document.body\n)`}
          >
            <div className="bg-[#E8EAEE] rounded-2xl p-4 sm:p-6 flex justify-center">
              <div className="w-full max-w-[352px] bg-white rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-black/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#1C1D21]">Notifications</span>
                    {unreadDemoCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FFECEB] text-[#942922] text-[10.5px] font-bold">
                        {unreadDemoCount} New
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDemoNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
                    }
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#9D113C] hover:underline cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Read</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
                  {(['All', 'Unread'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setNotifTab(tab)}
                      className={`flex-1 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        notifTab === tab
                          ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {filteredDemoNotifs.map((n) => {
                    const theme = PASTEL_THEMES[n.theme] || PASTEL_THEMES.periwinkle;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() =>
                          setDemoNotifs((prev) =>
                            prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                          )
                        }
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          n.unread ? `${theme.bg} border-black/[0.05]` : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            n.unread ? theme.dot : 'bg-gray-300'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-900 truncate">{n.title}</span>
                            <span className="text-[10.5px] text-gray-400 shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{n.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                  {filteredDemoNotifs.length === 0 && (
                    <div className="py-5 text-center text-xs text-gray-500">
                      Semua notifikasi sudah dibaca.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </UiDocSection>

          <UiDocSection
            id="mnf-toast"
            title="Mobile Elevated Toast Position"
            classesHint="fixed bottom-20 md:bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[9999]"
            codeSnippet={`<div className="fixed bottom-20 md:bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[9999]">\n  <ToastCard />\n</div>`}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => triggerToast('Berhasil Disimpan', 'Perubahan jadwal kelas tersimpan.', 'success')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Success</span>
              </button>
              <button
                type="button"
                onClick={() => triggerToast('Info Terbaru', 'Materi baru siap ditinjau.', 'info')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1C1D21] text-white text-xs font-semibold cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Info</span>
              </button>
              <button
                type="button"
                onClick={() => triggerToast('Perhatian', 'Ada 1 siswa perlu bimbingan.', 'warning')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Warning</span>
              </button>
            </div>
          </UiDocSection>
        </UiDocPage>
      )}
    </div>
  );
};
