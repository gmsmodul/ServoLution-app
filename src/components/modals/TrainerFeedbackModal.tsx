import React, { useEffect, useMemo, useState } from 'react';
import { X, Star, Check, MessageSquareText, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CustomSelect } from '../ui/CustomSelect';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SECONDARY } from '../../constants/buttonStyles';

const STAR_LABELS: Record<number, string> = {
  1: 'Perlu Perbaikan',
  2: 'Cukup',
  3: 'Baik',
  4: 'Sangat Baik',
  5: 'Luar Biasa',
};

export const TrainerFeedbackModal: React.FC = () => {
  const {
    trainersDirectory,
    studentsDirectory,
    schedules,
    trainerFeedbackParameters,
    isTrainerFeedbackOpen,
    setIsTrainerFeedbackOpen,
    feedbackTargetTrainerId,
    setFeedbackTargetTrainerId,
    handleSubmitTrainerFeedback,
    triggerToast,
  } = useApp();

  const activeParameters = useMemo(
    () => trainerFeedbackParameters.filter((p) => p.active),
    [trainerFeedbackParameters]
  );

  const [trainerId, setTrainerId] = useState<string>('');
  const [crewId, setCrewId] = useState<string>('');
  const [trainingTopic, setTrainingTopic] = useState<string>('');
  const [selectedParamIds, setSelectedParamIds] = useState<string[]>([]);
  const [activeParamTabId, setActiveParamTabId] = useState<string>('');
  const [paramRatings, setParamRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState<string>('');

  const closeModal = () => {
    setIsTrainerFeedbackOpen(false);
    setFeedbackTargetTrainerId(null);
  };

  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } = useBottomSheetMotion({
    onClose: closeModal,
  });

  useEffect(() => {
    if (!isTrainerFeedbackOpen) return;
    const defaultTrainer =
      (feedbackTargetTrainerId &&
        trainersDirectory.find((t) => t.id === feedbackTargetTrainerId)) ||
      trainersDirectory[0];
    const defaultCrew = studentsDirectory[0];
    const defaultIds = activeParameters.map((p) => p.id);

    setTrainerId(defaultTrainer?.id || '');
    setCrewId(defaultCrew?.id || '');
    setTrainingTopic(
      defaultTrainer
        ? `${defaultTrainer.department} Training · ${defaultTrainer.assignedClass}`
        : schedules[0]?.subject || 'Sesi Training Servolution'
    );
    setSelectedParamIds(defaultIds);
    setActiveParamTabId(defaultIds[0] || '');
    const initialScores: Record<string, number> = {};
    defaultIds.forEach((id) => {
      initialScores[id] = 5;
    });
    setParamRatings(initialScores);
    setComment('');
  }, [
    isTrainerFeedbackOpen,
    feedbackTargetTrainerId,
    trainersDirectory,
    studentsDirectory,
    schedules,
    activeParameters,
  ]);

  const selectedTrainer = useMemo(
    () => trainersDirectory.find((t) => t.id === trainerId) || trainersDirectory[0],
    [trainersDirectory, trainerId]
  );

  const selectedCrew = useMemo(
    () => studentsDirectory.find((s) => s.id === crewId) || studentsDirectory[0],
    [studentsDirectory, crewId]
  );

  const topicSuggestions = useMemo(() => {
    const list = new Set<string>();
    if (selectedTrainer) {
      list.add(`${selectedTrainer.department} Training · ${selectedTrainer.assignedClass}`);
      if (selectedTrainer.specialization) {
        list.add(selectedTrainer.specialization);
      }
    }
    schedules.forEach((s) => {
      list.add(`${s.subject} · Class ${s.classCode}`);
    });
    return Array.from(list).slice(0, 6);
  }, [selectedTrainer, schedules]);

  const selectedParamsList = useMemo(
    () => activeParameters.filter((p) => selectedParamIds.includes(p.id)),
    [activeParameters, selectedParamIds]
  );

  const { overallStars, overallRatingPct } = useMemo(() => {
    if (selectedParamsList.length === 0) {
      return { overallStars: 0, overallRatingPct: 0 };
    }
    const sumStars = selectedParamsList.reduce(
      (acc, p) => acc + (paramRatings[p.id] ?? 5),
      0
    );
    const avgStars = Number((sumStars / selectedParamsList.length).toFixed(1));
    const pct = Math.round((sumStars / (selectedParamsList.length * 5)) * 100);
    return { overallStars: avgStars, overallRatingPct: pct };
  }, [selectedParamsList, paramRatings]);

  if (!isTrainerFeedbackOpen) return null;

  const toggleParameterSelection = (paramId: string) => {
    setSelectedParamIds((prev) => {
      if (prev.includes(paramId)) {
        if (prev.length <= 1) {
          triggerToast('Minimal 1 Parameter', 'Pilih minimal 1 parameter penilaian untuk feedback.', 'warning');
          return prev;
        }
        const next = prev.filter((id) => id !== paramId);
        if (activeParamTabId === paramId) {
          setActiveParamTabId(next[0] || '');
        }
        return next;
      }
      setActiveParamTabId(paramId);
      setParamRatings((r) => (r[paramId] ? r : { ...r, [paramId]: 5 }));
      return [...prev, paramId];
    });
  };

  const selectAllParameters = () => {
    const allIds = activeParameters.map((p) => p.id);
    setSelectedParamIds(allIds);
    if (!allIds.includes(activeParamTabId)) {
      setActiveParamTabId(allIds[0] || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) {
      triggerToast('Trainer Belum Dipilih', 'Pilih trainer yang akan diberi feedback.', 'warning');
      return;
    }
    if (selectedParamsList.length === 0) {
      triggerToast('Parameter Belum Dipilih', 'Pilih minimal 1 parameter penilaian.', 'warning');
      return;
    }
    if (!comment.trim()) {
      triggerToast('Feedback Manual Kosong', 'Isi catatan feedback manual (long text) terlebih dahulu.', 'warning');
      return;
    }

    handleSubmitTrainerFeedback({
      trainerId: selectedTrainer.id,
      trainerName: selectedTrainer.name,
      crewId: selectedCrew?.id,
      crewName: selectedCrew?.name || 'Servolution Crew',
      trainingTopic: trainingTopic.trim() || `${selectedTrainer.department} Training`,
      classCode: selectedTrainer.assignedClass,
      parameterScores: selectedParamsList.map((p) => ({
        parameterId: p.id,
        label: p.label,
        rating: paramRatings[p.id] ?? 5,
      })),
      overallRatingPct,
      overallStars,
      comment: comment.trim(),
    });
  };

  const focusedParam =
    selectedParamsList.find((p) => p.id === activeParamTabId) || selectedParamsList[0] || null;

  return (
    <div
      ref={backdropRef}
      data-modal-sheet-backdrop="true"
      className="animate-ui-fade fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
    >
      <form
        ref={setSheetElement}
        {...sheetGestureProps}
        onSubmit={handleSubmit}
        className="w-full sm:max-w-2xl bg-white rounded-t-[28px] sm:rounded-[26px] border border-black/[0.12] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto animate-bottom-sheet"
      >
        <div
          data-sheet-handle="true"
          className="sm:hidden flex justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 bg-black/20 rounded-full animate-sheet-handle" />
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold text-[#1C1D21]">
              Feedback Trainer Setelah Training
            </h3>
            <p className="text-[12px] text-[#6E717A] mt-0.5">
              Form penilaian Servolution Crew untuk memberi rating trainer berdasarkan parameter penilaian &amp; masukan manual.
            </p>
          </div>
          <button
            type="button"
            onClick={animateClose}
            aria-label="Tutup modal feedback"
            className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crew, Trainer & Training Topic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
          <div>
            <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
              Servolution Crew (Pengisi)
            </label>
            <CustomSelect
              className="w-full"
              triggerClassName="px-3.5 py-2 rounded-xl border-black/[0.1] text-[13px]"
              value={crewId}
              onChange={setCrewId}
              ariaLabel="Pilih Servolution Crew"
              options={
                studentsDirectory.length > 0
                  ? studentsDirectory.map((st) => ({
                      value: st.id,
                      label: `${st.name} (${st.classCode})`,
                    }))
                  : [{ value: 'crew-default', label: 'Servolution Crew' }]
              }
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
              Trainer yang Dinilai
            </label>
            <CustomSelect
              className="w-full"
              triggerClassName="px-3.5 py-2 rounded-xl border-black/[0.1] text-[13px]"
              value={trainerId}
              onChange={(val) => {
                setTrainerId(val);
                const tr = trainersDirectory.find((t) => t.id === val);
                if (tr) {
                  setTrainingTopic(`${tr.department} Training · ${tr.assignedClass}`);
                }
              }}
              ariaLabel="Pilih Trainer"
              options={trainersDirectory.map((tr) => ({
                value: tr.id,
                label: `${tr.name} (${tr.department})`,
              }))}
            />
          </div>
        </div>

        <div className="text-[13px]">
          <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
            Sesi / Topik Training
          </label>
          <input
            required
            value={trainingTopic}
            onChange={(e) => setTrainingTopic(e.target.value)}
            placeholder="Contoh: Differential Calculus & Olympiad Prep"
            className="w-full px-3.5 py-2 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65]"
          />
          {topicSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {topicSuggestions.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setTrainingTopic(topic)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                    trainingTopic === topic
                      ? 'bg-[#FEF1F5] border-[#FBC2D4] text-[#9D113C]'
                      : 'bg-[#FAFBFD] border-black/[0.07] text-[#6E717A] hover:text-[#1C1D21]'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Parameter Penilaian yang Dipilih */}
        <div className="rounded-2xl border border-black/[0.12] bg-[#FAFBFD] p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[12.5px] font-semibold text-[#1C1D21]">
                Tab Parameter Penilaian
              </div>
              <div className="text-[11px] text-[#6E717A]">
                Pilih parameter penilaian yang ingin dinilai ({selectedParamsList.length}/{activeParameters.length} dipilih)
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedParamsList.length < activeParameters.length && (
                <button
                  type="button"
                  onClick={selectAllParameters}
                  className="text-[11.5px] font-semibold text-[#9D113C] hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F9F0] text-[#146C43] text-[11.5px] font-bold tabular-nums">
                <Sparkles className="w-3 h-3" />
                {overallRatingPct}% ({overallStars.toFixed(1)}★)
              </span>
            </div>
          </div>

          {/* Interactive Parameter Tabs */}
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Parameter Penilaian">
            {activeParameters.map((param) => {
              const isSelected = selectedParamIds.includes(param.id);
              const isFocused = focusedParam?.id === param.id;
              const score = paramRatings[param.id] ?? 5;
              return (
                <div
                  key={param.id}
                  className={`inline-flex items-center rounded-xl border text-[12px] transition-all overflow-hidden ${
                    isSelected
                      ? isFocused
                        ? 'bg-[#1C1D21] text-white border-[#1C1D21] shadow-xs'
                        : 'bg-white text-[#1C1D21] border-[#ee2e65]/40'
                      : 'bg-white/60 text-[#8A8D98] border-black/[0.07]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleParameterSelection(param.id)}
                    title={isSelected ? 'Nonaktifkan parameter ini' : 'Pilih parameter ini'}
                    className="pl-2.5 pr-1.5 py-1.5 flex items-center justify-center cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#ee2e65] border-[#ee2e65] text-white'
                          : 'border-black/[0.2] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isFocused}
                    onClick={() => {
                      if (!isSelected) {
                        toggleParameterSelection(param.id);
                      } else {
                        setActiveParamTabId(param.id);
                      }
                    }}
                    className="pr-2.5 py-1.5 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{param.label}</span>
                    {isSelected && (
                      <span
                        className={`text-[10.5px] font-bold tabular-nums px-1.5 py-0.2 rounded-full ${
                          isFocused
                            ? 'bg-white/20 text-white'
                            : 'bg-[#FEF1F5] text-[#9D113C]'
                        }`}
                      >
                        {score}★
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Rating Controls for Selected Parameters */}
          <div className="space-y-2">
            {selectedParamsList.map((param) => {
              const currentScore = paramRatings[param.id] ?? 5;
              const isFocused = focusedParam?.id === param.id;
              return (
                <div
                  key={param.id}
                  onClick={() => setActiveParamTabId(param.id)}
                  className={`bg-white rounded-xl border p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isFocused
                      ? 'border-[#ee2e65]/50 ring-1 ring-[#ee2e65]/15'
                      : 'border-black/[0.06]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#1C1D21]">
                      {param.label}
                    </div>
                    <p className="text-[11px] text-[#6E717A] leading-snug">
                      {param.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <div className="flex items-center gap-1" role="radiogroup" aria-label={`Rating ${param.label}`}>
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const filled = starVal <= currentScore;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setActiveParamTabId(param.id);
                              setParamRatings((prev) => ({
                                ...prev,
                                [param.id]: starVal,
                              }));
                            }}
                            aria-label={`${starVal} bintang untuk ${param.label}`}
                            className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                filled
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300 hover:text-amber-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="min-w-[82px] text-right text-[11px] font-semibold text-[#5A5D67] tabular-nums">
                      {currentScore}/5 · {STAR_LABELS[currentScore]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Long Text Manual Feedback */}
        <div className="text-[13px] space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="trainer-feedback-longtext"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1D21]"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-[#ee2e65]" />
              <span>Masukan &amp; Feedback Manual (Long Text)</span>
            </label>
            <span className="text-[11px] text-[#8A8D98] tabular-nums">
              {comment.length} karakter
            </span>
          </div>
          <textarea
            id="trainer-feedback-longtext"
            required
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tuliskan penilaian manual secara lengkap setelah training: kelebihan trainer, kejelasan materi, pengalaman praktik, serta saran perbaikan untuk sesi berikutnya..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65] resize-y text-[13px] leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={animateClose}
            className={`${ACTION_BTN_SECONDARY} flex-1`}
          >
            <X className="w-4 h-4 sm:hidden shrink-0" />
            <span>Batal</span>
          </button>
          <button
            type="submit"
            className={`${ACTION_BTN_PRIMARY} flex-1`}
          >
            <Star className="w-4 h-4 shrink-0 fill-current" />
            <span>Kirim Feedback ({overallRatingPct}%)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
