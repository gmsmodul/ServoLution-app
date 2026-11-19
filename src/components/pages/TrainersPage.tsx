import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  ChevronRight,
  Users,
  Award,
  Star,
  MessageSquareText,
  SlidersHorizontal,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatClassMobileLabel,
  getAvailableClassOptions,
  normalizeClassKey,
} from '../../utils/scheduleSubjects';
import { SplitFilterButton } from '../ui/SplitFilterButton';
import { CustomSelect } from '../ui/CustomSelect';
import { InfoPopover } from '../ui/InfoPopover';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SOFT_PRIMARY } from '../../constants/buttonStyles';

type TrainerPageTab = 'roster' | 'feedbacks' | 'parameters';

export const TrainersPage: React.FC = () => {
  const {
    schedules,
    trainersDirectory,
    setIsAddTrainerOpen,
    setSelectedTrainerDrawer,
    trainerFeedbackParameters,
    trainerFeedbacks,
    openTrainerFeedbackForm,
    handleAddFeedbackParameter,
    handleToggleFeedbackParameter,
    handleDeleteFeedbackParameter,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TrainerPageTab>('roster');
  const [trainerSearchQuery, setTrainerSearchQuery] = useState('');
  const [trainerClassFilter, setTrainerClassFilter] = useState('All');
  const [trainerStatusFilter, setTrainerStatusFilter] = useState('All');
  const [feedbackTrainerFilter, setFeedbackTrainerFilter] = useState('All');

  // New parameter inline form state
  const [newParamLabel, setNewParamLabel] = useState('');
  const [newParamDesc, setNewParamDesc] = useState('');

  const classOptions = useMemo(() => {
    const classes = getAvailableClassOptions(
      trainersDirectory.map((t) => t.assignedClass),
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
  }, [trainersDirectory, schedules]);

  const classScopedTrainers = trainersDirectory.filter(
    (tr) =>
      trainerClassFilter === 'All' ||
      normalizeClassKey(tr.assignedClass) === trainerClassFilter
  );

  const filteredTrainers = classScopedTrainers.filter((tr) => {
    const matchesStatus = trainerStatusFilter === 'All' || tr.status === trainerStatusFilter;
    const matchesSearch =
      tr.name.toLowerCase().includes(trainerSearchQuery.toLowerCase()) ||
      tr.email.toLowerCase().includes(trainerSearchQuery.toLowerCase()) ||
      tr.department.toLowerCase().includes(trainerSearchQuery.toLowerCase()) ||
      tr.assignedClass.toLowerCase().includes(trainerSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredFeedbacks = useMemo(() => {
    return trainerFeedbacks.filter(
      (f) => feedbackTrainerFilter === 'All' || f.trainerId === feedbackTrainerFilter
    );
  }, [trainerFeedbacks, feedbackTrainerFilter]);

  const feedbackMetaByTrainer = useMemo(() => {
    const map = new Map<string, { count: number; avgStars: number }>();
    trainersDirectory.forEach((tr) => {
      const list = trainerFeedbacks.filter((f) => f.trainerId === tr.id);
      const avgStars =
        list.length > 0
          ? Number((list.reduce((s, f) => s + f.overallStars, 0) / list.length).toFixed(1))
          : Number(((tr.rating / 100) * 5).toFixed(1));
      map.set(tr.id, { count: list.length, avgStars });
    });
    return map;
  }, [trainersDirectory, trainerFeedbacks]);

  const avgRating =
    classScopedTrainers.length > 0
      ? Math.round(
          classScopedTrainers.reduce((acc, t) => acc + t.rating, 0) /
            classScopedTrainers.length
        )
      : null;

  const statusTabs = [
    {
      value: 'All',
      mobileLabel: 'All',
      count: classScopedTrainers.length,
      badgeClass: 'bg-[#FEF1F5] text-[#9D113C]',
    },
    {
      value: 'Lead Trainer',
      mobileLabel: 'Lead',
      count: classScopedTrainers.filter((t) => t.status === 'Lead Trainer').length,
      badgeClass: 'bg-[#E6F9F0] text-[#146C43]',
    },
    {
      value: 'Active',
      mobileLabel: 'Active',
      count: classScopedTrainers.filter((t) => t.status === 'Active').length,
      badgeClass: 'bg-[#F0EFFC] text-[#3F3B99]',
    },
    {
      value: 'Part-Time',
      mobileLabel: 'Part',
      count: classScopedTrainers.filter((t) => t.status === 'Part-Time').length,
      badgeClass: 'bg-[#FFF5E6] text-[#8C5811]',
    },
  ];

  const getClassBadgeColor = (cls: string) => {
    if (cls.includes('302')) return 'bg-[#F0EFFC] text-[#3F3B99]';
    if (cls.includes('303')) return 'bg-[#FFF5E6] text-[#8C5811]';
    if (cls.includes('304')) return 'bg-[#FFECEB] text-[#942922]';
    return 'bg-[#E6F9F0] text-[#146C43]';
  };

  const handleCreateParameter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParamLabel.trim()) return;
    handleAddFeedbackParameter({
      label: newParamLabel.trim(),
      description: newParamDesc.trim(),
      active: true,
    });
    setNewParamLabel('');
    setNewParamDesc('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-black/[0.05]">
        <div className="hidden md:block">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1D21]">Trainer</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6F9F0] text-[#146C43] text-[11.5px] font-bold tabular-nums">
              {avgRating !== null ? `Rata-rata Rating ${avgRating}%` : 'Belum ada data'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          {activeTab === 'roster' && (
            <div className="relative flex-1 sm:flex-initial min-w-[170px]">
              <Search className="w-4 h-4 text-[#8A8D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                enterKeyHint="search"
                value={trainerSearchQuery}
                onChange={(e) => setTrainerSearchQuery(e.target.value)}
                placeholder="Search trainer or email..."
                className="w-full sm:w-auto h-9 pl-9 pr-4 rounded-full border border-black/[0.12] text-[13px] bg-white outline-none focus:border-[#ee2e65]"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => openTrainerFeedbackForm()}
            className={ACTION_BTN_SOFT_PRIMARY}
          >
            <Star className="w-4 h-4 shrink-0 fill-current" />
            <span className="sm:hidden">Feedback</span>
            <span className="hidden sm:inline">Beri Feedback</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddTrainerOpen(true)}
            className={ACTION_BTN_PRIMARY}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Trainer</span>
          </button>
        </div>
      </div>

      {/* Main Page Tabs: Daftar Trainer | Riwayat Feedback | Parameter Penilaian */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] pb-3">
        {[
          {
            id: 'roster' as const,
            label: 'Daftar Trainer',
            count: trainersDirectory.length,
            icon: Users,
          },
          {
            id: 'feedbacks' as const,
            label: 'Riwayat Feedback',
            count: trainerFeedbacks.length,
            icon: MessageSquareText,
          },
          {
            id: 'parameters' as const,
            label: 'Parameter Penilaian',
            count: trainerFeedbackParameters.filter((p) => p.active).length,
            icon: SlidersHorizontal,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#1C1D21] text-white'
                  : 'bg-[#FAFBFD] border border-black/[0.07] text-[#5A5D67] hover:text-[#1C1D21]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10.5px] tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-white text-[#6E717A] border border-black/[0.06]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Daftar Trainer */}
      {activeTab === 'roster' && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="md:hidden px-2.5 py-1 rounded-full bg-[#E6F9F0] text-[#146C43] text-[11.5px] font-bold mr-auto tabular-nums">
              {avgRating !== null ? `Rata-rata Rating ${avgRating}%` : 'Belum ada data'}
            </span>
            <div className="flex flex-wrap items-center justify-end md:justify-between gap-2.5 w-auto md:w-full">
              <SplitFilterButton
                value={trainerClassFilter}
                onChange={setTrainerClassFilter}
                prefix="Class"
                icon={Users}
                variant="surface"
                ariaLabel="Filter class trainer"
                options={classOptions}
              />

              <SplitFilterButton
                value={trainerStatusFilter}
                onChange={setTrainerStatusFilter}
                prefix="Status"
                icon={Award}
                variant="primary"
                align="right"
                ariaLabel="Filter status trainer"
                options={statusTabs.map((tab) => ({
                  value: tab.value,
                  label: tab.value,
                  mobileLabel: tab.mobileLabel,
                  badge: tab.count,
                  badgeClassName: tab.badgeClass,
                }))}
              />
            </div>
          </div>

          {filteredTrainers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.12] py-12 px-6 text-center space-y-2">
              <div className="text-[15px] font-semibold text-[#1C1D21]">No trainers found</div>
              <p className="text-[12.5px] text-[#8A8D98]">
                Try adjusting your search query, class selection, or status filter.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Unified Hairline List */}
              <div className="md:hidden bg-white rounded-2xl border border-black/[0.12] divide-y divide-black/[0.08] overflow-hidden">
                {filteredTrainers.map((tr) => {
                  const fbMeta = feedbackMetaByTrainer.get(tr.id);
                  const statusBadge =
                    tr.status === 'Lead Trainer'
                      ? 'bg-[#E6F9F0] text-[#146C43]'
                      : tr.status === 'Part-Time'
                      ? 'bg-[#FFF5E6] text-[#8C5811]'
                      : 'bg-[#F0EFFC] text-[#3F3B99]';
                  return (
                    <div
                      key={tr.id}
                      onClick={() => setSelectedTrainerDrawer(tr)}
                      className="p-4 hover:bg-[#FAFBFD] transition-colors cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[12.5px] font-bold shrink-0 ${tr.color}`}>
                            {tr.initials}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-[14.5px] font-semibold text-[#1C1D21] truncate">{tr.name}</h3>
                            <p className="text-[11.5px] text-[#8A8D98] truncate">{tr.email}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0 ${statusBadge}`}>
                          {tr.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[12px] pt-1 tabular-nums">
                        <div className="flex items-center gap-3 text-[#6E717A]">
                          <span>
                            <strong className="text-[#1C1D21] font-semibold">{tr.assignedClass}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <strong className="text-[#146C43] font-bold">{tr.rating}%</strong>
                            {fbMeta && fbMeta.count > 0 && (
                              <span className="text-[11px] text-[#8A8D98]">({fbMeta.count})</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTrainerFeedbackForm(tr.id);
                            }}
                            className="px-2.5 py-1 rounded-full bg-[#FEF1F5] text-[#9D113C] text-[11px] font-semibold cursor-pointer"
                          >
                            Nilai
                          </button>
                          <span className="text-[#9D113C] font-semibold flex items-center gap-0.5">
                            Profile <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tablet & PC Table List */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-black/[0.12] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FAFBFD] border-b border-black/[0.08] text-[11px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                        <th className="py-3.5 px-5">Trainer</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Rating</th>
                        <th className="py-3.5 px-4 hidden lg:table-cell">Sessions / Mo</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.08] text-[13px]">
                      {filteredTrainers.map((tr) => {
                        const fbMeta = feedbackMetaByTrainer.get(tr.id);
                        const statusBadge =
                          tr.status === 'Lead Trainer'
                            ? 'bg-[#E6F9F0] text-[#146C43]'
                            : tr.status === 'Part-Time'
                            ? 'bg-[#FFF5E6] text-[#8C5811]'
                            : 'bg-[#F0EFFC] text-[#3F3B99]';
                        return (
                          <tr
                            key={tr.id}
                            onClick={() => setSelectedTrainerDrawer(tr)}
                            className="hover:bg-[#FAFBFD] transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${tr.color}`}
                                >
                                  {tr.initials}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors truncate">
                                    {tr.name}
                                  </div>
                                  <div className="text-[11.5px] text-[#8A8D98] truncate">{tr.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${getClassBadgeColor(tr.assignedClass)}`}>
                                {tr.assignedClass}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap text-[#5A5D67] font-medium">
                              {tr.department}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 font-semibold text-[#146C43] tabular-nums">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  {tr.rating}%
                                </span>
                                {fbMeta && fbMeta.count > 0 && (
                                  <span className="text-[11px] text-[#8A8D98] tabular-nums">
                                    ({fbMeta.avgStars.toFixed(1)}★ · {fbMeta.count})
                                  </span>
                                )}
                                <div className="hidden xl:block w-14 h-1.5 rounded-full bg-[#F4F5F8] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#10B981]"
                                    style={{ width: `${Math.min(100, Math.max(0, tr.rating))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 hidden lg:table-cell font-bold text-[#1C1D21] tabular-nums whitespace-nowrap">
                              {tr.sessionsCount} sessions
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge}`}>
                                {tr.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTrainerFeedbackForm(tr.id);
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-[#FEF1F5] hover:bg-[#FDE0E9] text-[#9D113C] text-[11.5px] font-semibold transition-colors cursor-pointer"
                                >
                                  Beri Feedback
                                </button>
                                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#9D113C] group-hover:translate-x-0.5 transition-transform">
                                  <span>Profile</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* TAB 2: Riwayat Feedback Crew */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[15.5px] font-semibold text-[#1C1D21]">
                Feedback &amp; Rating dari Servolution Crew
              </h2>
              <InfoPopover
                label="Informasi Feedback Trainer"
                content="Setiap feedback yang masuk otomatis memperbarui nilai rating trainer secara real-time."
              />
            </div>
            <div className="flex items-center gap-2.5">
              <CustomSelect
                value={feedbackTrainerFilter}
                onChange={setFeedbackTrainerFilter}
                pill
                ariaLabel="Filter trainer pada riwayat feedback"
                className="min-w-[180px]"
                triggerClassName="border-black/[0.08]"
                options={[
                  { value: 'All', label: 'Semua Trainer' },
                  ...trainersDirectory.map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
              />
              <button
                type="button"
                onClick={() => openTrainerFeedbackForm(feedbackTrainerFilter !== 'All' ? feedbackTrainerFilter : undefined)}
                className={ACTION_BTN_PRIMARY}
              >
                <Star className="w-4 h-4 shrink-0 fill-current" />
                <span>Isi Feedback</span>
              </button>
            </div>
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.12] py-12 px-6 text-center space-y-3">
              <div className="text-[15px] font-semibold text-[#1C1D21]">
                Belum ada feedback untuk filter ini
              </div>
              <p className="text-[12.5px] text-[#8A8D98]">
                Klik tombol &quot;Beri Feedback&quot; untuk mulai menilai trainer setelah sesi training.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFeedbacks.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-black/[0.12] p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-semibold text-[#1C1D21]">
                          {rev.trainerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#F0EFFC] text-[#3F3B99] text-[10.5px] font-semibold">
                          {rev.classCode}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#6E717A] mt-0.5">
                        Oleh <strong className="text-[#1C1D21]">{rev.crewName}</strong> · {rev.trainingTopic}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F9F0] text-[#146C43] text-[12px] font-bold shrink-0 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {rev.overallRatingPct}% ({rev.overallStars.toFixed(1)}★)
                    </span>
                  </div>

                  {/* Selected Parameter Scores */}
                  <div className="flex flex-wrap gap-1.5">
                    {rev.parameterScores.map((ps) => (
                      <span
                        key={ps.parameterId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAFBFD] border border-black/[0.06] text-[11px] font-medium text-[#5A5D67] tabular-nums"
                      >
                        <span>{ps.label}:</span>
                        <strong className="text-[#1C1D21]">{ps.rating}★</strong>
                      </span>
                    ))}
                  </div>

                  {/* Manual Long Text Comment */}
                  <div className="rounded-xl bg-[#FAFBFD] border border-black/[0.05] p-3 text-[12.5px] text-[#1C1D21] leading-relaxed">
                    {rev.comment}
                  </div>

                  <div className="text-[11px] text-[#8A8D98] tabular-nums">
                    Dikirim pada {rev.submittedAt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Parameter Penilaian */}
      {activeTab === 'parameters' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.08] bg-[#FAFBFD] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#1C1D21]">
                  Daftar Parameter Penilaian Trainer
                </h2>
                <InfoPopover
                  label="Informasi Daftar Parameter Penilaian"
                  content="Parameter yang aktif akan tampil sebagai tab pilihan saat Servolution Crew mengisi form feedback."
                />
              </div>
            </div>

            <div className="divide-y divide-black/[0.08]">
              {trainerFeedbackParameters.map((param) => (
                <div
                  key={param.id}
                  className="p-4 sm:px-5 flex items-start justify-between gap-3 hover:bg-[#FAFBFD] transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#1C1D21]">
                        {param.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                          param.active
                            ? 'bg-[#E6F9F0] text-[#146C43]'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {param.active ? 'Aktif di Form' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6E717A] leading-snug">
                      {param.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFeedbackParameter(param.id)}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        param.active
                          ? 'bg-white border-black/[0.1] text-[#1C1D21] hover:bg-gray-50'
                          : 'bg-[#E6F9F0] border-emerald-200 text-[#146C43]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{param.active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFeedbackParameter(param.id)}
                      aria-label={`Hapus parameter ${param.label}`}
                      className="w-8 h-8 rounded-full border border-black/[0.08] text-[#8A8D98] hover:text-[#942922] hover:bg-[#FFECEB] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleCreateParameter}
            className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.12] p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                Tambah Parameter Penilaian Baru
              </h3>
              <InfoPopover
                label="Informasi Tambah Parameter"
                content="Tambahkan aspek evaluasi baru agar dapat dipilih pada tab parameter saat mengisi feedback."
              />
            </div>

            <div className="space-y-3 text-[13px]">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
                  Nama Parameter
                </label>
                <input
                  required
                  value={newParamLabel}
                  onChange={(e) => setNewParamLabel(e.target.value)}
                  placeholder="Contoh: Penggunaan Media & Alat Peraga"
                  className="w-full px-3.5 py-2 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
                  Deskripsi / Kriteria Penilaian
                </label>
                <textarea
                  rows={3}
                  value={newParamDesc}
                  onChange={(e) => setNewParamDesc(e.target.value)}
                  placeholder="Jelaskan indikator yang dinilai pada parameter ini..."
                  className="w-full px-3.5 py-2 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65] resize-none"
                />
              </div>
            </div>

            <button type="submit" className={`${ACTION_BTN_PRIMARY} w-full`}>
              <Plus className="w-4 h-4 shrink-0" />
              <span>Simpan Parameter Penilaian</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
