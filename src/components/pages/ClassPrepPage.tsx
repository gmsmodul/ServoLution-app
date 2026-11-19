import React, { useMemo, useState } from 'react';
import { Plus, CheckSquare, Square, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatClassMobileLabel,
  getAvailableClassOptions,
  normalizeClassKey,
} from '../../utils/scheduleSubjects';
import { PASTEL_THEMES } from '../../constants/theme';
import { ACTION_BTN_PRIMARY } from '../../constants/buttonStyles';
import { SplitFilterButton } from '../ui/SplitFilterButton';

export const ClassPrepPage: React.FC = () => {
  const {
    schedules,
    lessonPlans,
    toggleChecklistItem,
    handleAddChecklistTask,
    setIsNewPlanModalOpen,
  } = useApp();

  const [selectedPlanId, setSelectedPlanId] = useState<string>(lessonPlans[0]?.id || 'LP-01');
  const [prepFilterClass, setPrepFilterClass] = useState('All');
  const [newTaskText, setNewTaskText] = useState('');

  const classOptions = useMemo(() => {
    const classes = getAvailableClassOptions(
      lessonPlans.map((p) => p.classCode),
      schedules.map((s) => s.classCode)
    );
    return [
      { value: 'All', label: 'All Classes', mobileLabel: 'All' },
      ...classes.map((cls) => ({
        value: cls,
        label: cls,
        mobileLabel: formatClassMobileLabel(cls),
      })),
    ];
  }, [lessonPlans, schedules]);

  const filteredPlans = useMemo(() => {
    if (prepFilterClass === 'All') {
      return lessonPlans;
    }
    return lessonPlans.filter((p) => normalizeClassKey(p.classCode) === prepFilterClass);
  }, [lessonPlans, prepFilterClass]);

  const activePlan =
    filteredPlans.find((p) => p.id === selectedPlanId) ||
    filteredPlans[0] ||
    null;

  const prepKpis = useMemo(() => {
    const totalPlans = filteredPlans.length;
    const readyPlans = filteredPlans.filter((p) => p.status === 'Ready' || p.progress >= 100).length;
    const inProgressPlans = filteredPlans.filter(
      (p) => p.status !== 'Ready' && p.progress < 100 && p.status === 'In Progress'
    ).length;
    const draftPlans = filteredPlans.filter(
      (p) => p.status !== 'Ready' && p.progress < 100 && p.status === 'Draft'
    ).length;
    const pendingPlans = Math.max(0, totalPlans - readyPlans);

    const avgProgress =
      totalPlans > 0
        ? Math.round(filteredPlans.reduce((acc, p) => acc + p.progress, 0) / totalPlans)
        : 0;

    let totalChecklist = 0;
    let doneChecklist = 0;
    let totalMaterials = 0;
    let plansWithMaterials = 0;
    const typeCounts: Record<string, number> = {};

    filteredPlans.forEach((plan) => {
      totalChecklist += plan.checklist.length;
      doneChecklist += plan.checklist.filter((c) => c.done).length;
      if (plan.materials.length > 0) {
        plansWithMaterials += 1;
      }
      totalMaterials += plan.materials.length;
      plan.materials.forEach((mat) => {
        const key = String(mat.type || 'FILE').toUpperCase();
        typeCounts[key] = (typeCounts[key] || 0) + 1;
      });
    });

    const remainingChecklist = Math.max(0, totalChecklist - doneChecklist);
    const typeBreakdown = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${count} ${type}`)
      .join(' · ');

    return {
      totalPlans,
      readyPlans,
      inProgressPlans,
      draftPlans,
      pendingPlans,
      avgProgress,
      totalChecklist,
      doneChecklist,
      remainingChecklist,
      totalMaterials,
      plansWithMaterials,
      typeBreakdown,
    };
  }, [filteredPlans]);

  const onAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !activePlan) return;
    handleAddChecklistTask(activePlan.id, newTaskText.trim());
    setNewTaskText('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-black/[0.05]">
        <div className="hidden md:block">
          <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1D21]">Class Preparation</h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto min-w-0">
          <SplitFilterButton
            value={prepFilterClass}
            onChange={setPrepFilterClass}
            prefix="Class"
            icon={BookOpen}
            variant="surface"
            align="right"
            ariaLabel="Filter class persiapan"
            options={classOptions}
          />

          <button
            onClick={() => setIsNewPlanModalOpen(true)}
            className={ACTION_BTN_PRIMARY}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Buat</span>
            <span className="hidden sm:inline">Buat Rencana Kelas</span>
          </button>
        </div>
      </div>

      {/* Unified Live Readiness Summary Strip */}
      <div className="rounded-2xl border border-black/[0.12] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] overflow-hidden">
        <div className="p-4 sm:p-5 bg-[#E6F9F0]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[12px] font-semibold text-[#146C43]">Siap Mengajar</span>
            </div>
            <span className="text-[11.5px] font-semibold text-[#146C43] tabular-nums">
              {prepKpis.totalPlans > 0 ? `${prepKpis.avgProgress}% rata-rata` : 'Belum ada data'}
            </span>
          </div>
          <div className="kpi-value text-[24px] font-bold text-[#1C1D21] mt-1.5 tabular-nums">
            {prepKpis.totalPlans > 0
              ? `${prepKpis.readyPlans}/${prepKpis.totalPlans} Modul`
              : '0 Modul'}
          </div>
          <p className="text-[11.5px] text-[#35684E] mt-0.5 tabular-nums">
            {prepKpis.totalPlans === 0
              ? 'Belum ada rencana kelas pada filter ini'
              : prepKpis.readyPlans === prepKpis.totalPlans
              ? `Seluruh ${prepKpis.totalChecklist} poin checklist telah tuntas`
              : `${prepKpis.doneChecklist}/${prepKpis.totalChecklist} poin checklist sudah selesai`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#FFF5E6]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span className="text-[12px] font-semibold text-[#8C5811]">Dalam Persiapan</span>
            </div>
            <span className="text-[11.5px] font-semibold text-[#8C5811] tabular-nums">
              {prepKpis.remainingChecklist > 0
                ? `${prepKpis.remainingChecklist} poin tersisa`
                : 'Semua tuntas'}
            </span>
          </div>
          <div className="kpi-value text-[24px] font-bold text-[#1C1D21] mt-1.5 tabular-nums">
            {prepKpis.pendingPlans} Modul
          </div>
          <p className="text-[11.5px] text-[#7A592A] mt-0.5 tabular-nums">
            {prepKpis.pendingPlans === 0
              ? 'Tidak ada checklist persiapan yang tertunda'
              : `${prepKpis.inProgressPlans} sedang dikerjakan · ${prepKpis.draftPlans} draf`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#F0EFFC]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6C5DD3]" />
              <span className="text-[12px] font-semibold text-[#3F3B99]">Bahan Ajar Terlampir</span>
            </div>
            <span className="text-[11.5px] font-semibold text-[#3F3B99] tabular-nums">
              {prepKpis.plansWithMaterials}/{prepKpis.totalPlans} modul
            </span>
          </div>
          <div className="kpi-value text-[24px] font-bold text-[#1C1D21] mt-1.5 tabular-nums">
            {prepKpis.totalMaterials} Berkas
          </div>
          <p className="text-[11.5px] text-[#5854A8] mt-0.5 tabular-nums truncate">
            {prepKpis.typeBreakdown || 'Belum ada bahan ajar terlampir'}
          </p>
        </div>
      </div>

      {/* 12-Col Layout: Lesson Modules List (7 Cols) | Active Module Inspector (5 Cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-7">
        <div className="md:col-span-7 bg-white rounded-2xl border border-black/[0.12] divide-y divide-black/[0.08] overflow-hidden self-start">
          {filteredPlans.length === 0 ? (
            <div className="p-10 text-center space-y-1.5">
              <div className="text-[14px] font-semibold text-[#1C1D21]">
                Belum ada modul persiapan untuk kelas ini
              </div>
              <p className="text-[12px] text-[#8A8D98]">
                Pilih kelas lain atau tambahkan rencana pembelajaran baru.
              </p>
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const theme = PASTEL_THEMES[plan.theme] || PASTEL_THEMES.periwinkle;
              const isSelected = activePlan?.id === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 sm:p-5 cursor-pointer transition-colors ${
                    isSelected
                      ? theme.bg
                      : 'bg-white hover:bg-[#FAFBFD]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                      <span className={`${isSelected ? theme.header : theme.bg} ${theme.text} text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full shrink-0`}>
                        {plan.classCode}
                      </span>
                      <span className="text-[12px] font-medium text-[#6E717A] truncate">{plan.subject}</span>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums ${
                        plan.status === 'Ready'
                          ? 'bg-[#E6F9F0] text-[#146C43]'
                          : 'bg-[#FFF5E6] text-[#8C5811]'
                      }`}
                    >
                      {plan.status === 'Ready' ? 'Siap' : plan.status === 'Draft' ? 'Draf' : 'Proses'} · {plan.progress}%
                    </span>
                  </div>

                  <h3 className="text-[15.5px] font-semibold text-[#1C1D21] mt-2.5">{plan.topic}</h3>

                  <div className="mt-3.5 space-y-1.5">
                    <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${theme.dot} rounded-full transition-all duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)]`}
                        style={{ width: `${plan.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11.5px] text-[#8A8D98] tabular-nums">
                      <span>Jadwal: {plan.date}</span>
                      <span>{plan.materials.length} lampiran</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Lesson checklist */}
        {activePlan && (
          <div className="md:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-black/[0.07] space-y-5 self-start">
            <div className="flex items-start justify-between gap-2 pb-4 border-b border-black/[0.06]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98]">
                  Checklist Pembelajaran
                </span>
                <h2 className="text-[16.5px] font-semibold text-[#1C1D21] mt-1">{activePlan.topic}</h2>
                <p className="text-[12px] text-[#6E717A] mt-0.5">
                  {activePlan.classCode} · {activePlan.date}
                </p>
              </div>
              <span className="text-[12.5px] font-bold bg-[#FEF1F5] text-[#9D113C] border border-[#FBC2D4]/70 px-3 py-1 rounded-full tabular-nums shrink-0">
                {activePlan.progress}%
              </span>
            </div>

            {/* Interactive Checklist */}
            <div className="space-y-2.5">
              <div className="text-[12.5px] font-semibold text-[#1C1D21]">Daftar Persiapan</div>
              <div className="rounded-xl border border-black/[0.06] divide-y divide-black/[0.05] overflow-hidden">
                {activePlan.checklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(activePlan.id, item.id)}
                    className="w-full flex items-center gap-3 bg-white px-3.5 py-2.5 text-left hover:bg-[#FAFBFD] transition-colors cursor-pointer"
                  >
                    {item.done ? (
                      <CheckSquare className="w-4 h-4 text-[#10B981] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#9496A1] shrink-0" />
                    )}
                    <span className={`text-[13px] ${item.done ? 'line-through text-[#9496A1]' : 'text-[#1C1D21] font-medium'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={onAddTaskSubmit} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Tambah langkah persiapan..."
                  className="flex-1 h-9 bg-white border border-black/[0.1] rounded-full px-3.5 text-[13px] outline-none focus:border-[#ee2e65]"
                />
                <button
                  type="submit"
                  className={ACTION_BTN_PRIMARY}
                >
                  <Plus className="w-4 h-4 sm:hidden shrink-0" />
                  <span>Tambah</span>
                </button>
              </form>
            </div>

            {/* Attached Materials */}
            <div className="space-y-2 pt-3 border-t border-black/[0.06]">
              <div className="text-[12.5px] font-semibold text-[#1C1D21]">Bahan Ajar Terlampir</div>
              <div className="rounded-xl border border-black/[0.06] divide-y divide-black/[0.05] overflow-hidden">
                {activePlan.materials.length === 0 ? (
                  <div className="bg-white px-3.5 py-3 text-[12px] text-[#8A8D98]">
                    Belum ada berkas terlampir pada modul ini.
                  </div>
                ) : (
                  activePlan.materials.map((mat, idx) => {
                    const matColor =
                      mat.type === 'VIDEO'
                        ? 'bg-[#FEF1F5] text-[#9D113C]'
                        : mat.type === 'IMG'
                        ? 'bg-[#FFF5E6] text-[#8C5811]'
                        : mat.type === 'DOC'
                        ? 'bg-[#E6F9F0] text-[#146C43]'
                        : 'bg-[#F0EFFC] text-[#3F3B99]';
                    return (
                      <div
                        key={idx}
                        className="bg-white px-3.5 py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${matColor}`}>
                            {mat.type}
                          </span>
                          <span className="text-[12.5px] font-medium text-[#1C1D21] truncate">{mat.name}</span>
                        </div>
                        <span className="text-[11px] text-[#8A8D98] shrink-0 tabular-nums">{mat.size}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
