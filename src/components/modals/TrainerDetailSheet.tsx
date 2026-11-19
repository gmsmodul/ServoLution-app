import React, { useMemo } from 'react';
import { X, Mail, Phone, Award, Star, MessageSquareText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SOFT_PRIMARY } from '../../constants/buttonStyles';

export const TrainerDetailSheet: React.FC = () => {
  const {
    selectedTrainerDrawer,
    setSelectedTrainerDrawer,
    trainerFeedbacks,
    openTrainerFeedbackForm,
  } = useApp();

  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } = useBottomSheetMotion({
    onClose: () => setSelectedTrainerDrawer(null),
  });

  const trainer = selectedTrainerDrawer;

  const { trainerReviews, avgStars, paramAverages } = useMemo(() => {
    if (!trainer) {
      return { trainerReviews: [], avgStars: 0, paramAverages: [] };
    }
    const reviews = trainerFeedbacks.filter((f) => f.trainerId === trainer.id);
    const stars =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.overallStars, 0) / reviews.length).toFixed(1))
        : Number(((trainer.rating / 100) * 5).toFixed(1));

    const paramMap = new Map<string, { label: string; sum: number; count: number }>();
    reviews.forEach((rev) => {
      rev.parameterScores.forEach((ps) => {
        const entry = paramMap.get(ps.label) || { label: ps.label, sum: 0, count: 0 };
        entry.sum += ps.rating;
        entry.count += 1;
        paramMap.set(ps.label, entry);
      });
    });

    const averages = Array.from(paramMap.values()).map((p) => ({
      label: p.label,
      avgStars: Number((p.sum / p.count).toFixed(1)),
      pct: Math.round((p.sum / (p.count * 5)) * 100),
    }));

    return { trainerReviews: reviews, avgStars: stars, paramAverages: averages };
  }, [trainer, trainerFeedbacks]);

  if (!trainer) return null;

  return (
    <div
      ref={backdropRef}
      data-modal-sheet-backdrop="true"
      className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
    >
      <div
        ref={setSheetElement}
        {...sheetGestureProps}
        className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[26px] border border-black/[0.12] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-bottom-sheet"
      >
        <div
          data-sheet-handle="true"
          className="sm:hidden flex justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 bg-black/20 rounded-full animate-sheet-handle" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold ${trainer.color}`}
            >
              {trainer.initials}
            </span>
            <div>
              <h3 className="text-[16px] font-semibold text-[#1C1D21]">{trainer.name}</h3>
              <p className="text-[12px] text-[#8A8D98]">{trainer.email}</p>
            </div>
          </div>
          <button
            onClick={animateClose}
            className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-black/[0.12] grid grid-cols-2 divide-x divide-black/[0.08] text-[12.5px] overflow-hidden">
          <div className="p-3.5 bg-[#E6F9F0]">
            <div className="text-[#146C43] font-semibold text-[11px]">Trainer Rating</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="kpi-value text-[20px] font-bold text-[#1C1D21] tabular-nums">{trainer.rating}%</span>
              <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-amber-700 tabular-nums">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {avgStars.toFixed(1)} · {trainerReviews.length} ulasan
              </span>
            </div>
          </div>
          <div className="p-3.5 bg-[#F0EFFC]">
            <div className="text-[#3F3B99] font-semibold text-[11px]">Monthly Sessions</div>
            <div className="kpi-value text-[20px] font-bold text-[#1C1D21] mt-0.5 tabular-nums">{trainer.sessionsCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.12] divide-y divide-black/[0.08] text-[12px] overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-[#5A5D67]">
            <Award className="w-4 h-4 text-[#ee2e65] shrink-0" />
            <span>Specialization: <strong className="text-[#1C1D21]">{trainer.specialization}</strong></span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-[#5A5D67]">
            <Phone className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>Contact: <strong className="text-[#1C1D21] tabular-nums">{trainer.phone}</strong></span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-[#5A5D67]">
            <Mail className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span>Assigned: <strong className="text-[#1C1D21]">{trainer.assignedClass} ({trainer.department})</strong></span>
          </div>
        </div>

        {/* Parameter Breakdown from Crew Feedback */}
        {paramAverages.length > 0 && (
          <div className="rounded-2xl border border-black/[0.12] bg-[#FAFBFD] p-3.5 space-y-2.5">
            <div className="text-[12px] font-semibold text-[#1C1D21]">
              Rata-rata per Parameter Penilaian
            </div>
            <div className="space-y-2">
              {paramAverages.map((p) => (
                <div key={p.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="font-medium text-[#5A5D67]">{p.label}</span>
                    <span className="font-semibold text-[#1C1D21] tabular-nums">
                      {p.avgStars.toFixed(1)}★ ({p.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#10B981]"
                      style={{ width: `${Math.min(100, Math.max(0, p.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Crew Comments */}
        {trainerReviews.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1D21]">
              <MessageSquareText className="w-3.5 h-3.5 text-[#ee2e65]" />
              <span>Feedback Servolution Crew ({trainerReviews.length})</span>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
              {trainerReviews.slice(0, 4).map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-black/[0.12] bg-white p-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="font-semibold text-[#1C1D21]">{rev.crewName}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#146C43] bg-[#E6F9F0] px-2 py-0.5 rounded-full tabular-nums">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {rev.overallStars.toFixed(1)} ({rev.overallRatingPct}%)
                    </span>
                  </div>
                  <p className="text-[12px] text-[#5A5D67] leading-relaxed">{rev.comment}</p>
                  <div className="text-[10.5px] text-[#8A8D98]">{rev.trainingTopic} · {rev.submittedAt}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              const targetId = trainer.id;
              animateClose();
              openTrainerFeedbackForm(targetId);
            }}
            className={`${ACTION_BTN_PRIMARY} flex-1`}
          >
            <Star className="w-4 h-4 shrink-0 fill-current" />
            <span>Beri Feedback</span>
          </button>
          <button
            type="button"
            onClick={animateClose}
            className={`${ACTION_BTN_SOFT_PRIMARY} flex-1`}
          >
            <X className="w-4 h-4 sm:hidden shrink-0" />
            <span>Tutup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
