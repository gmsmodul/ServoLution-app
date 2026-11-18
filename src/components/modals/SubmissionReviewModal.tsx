import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  Award,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SECONDARY } from '../../constants/buttonStyles';

export const SubmissionReviewModal: React.FC = () => {
  const {
    assignments,
    activeAssignmentSubmissionTarget,
    setActiveAssignmentSubmissionTarget,
    handleGradeSubmission,
  } = useApp();

  const targetAssignment = useMemo(() => {
    if (!activeAssignmentSubmissionTarget) return null;
    return (
      assignments.find((a) => a.id === activeAssignmentSubmissionTarget.assignmentId) ||
      null
    );
  }, [assignments, activeAssignmentSubmissionTarget]);

  const targetSubmission = useMemo(() => {
    if (!targetAssignment || !activeAssignmentSubmissionTarget) return null;
    return (
      targetAssignment.submissions.find(
        (s) => s.id === activeAssignmentSubmissionTarget.submissionId
      ) || null
    );
  }, [targetAssignment, activeAssignmentSubmissionTarget]);

  const [scoreInput, setScoreInput] = useState<string>('90');
  const [feedback, setFeedback] = useState<string>('');

  const suggestedAutoScore = useMemo(() => {
    if (!targetAssignment || !targetSubmission) return null;
    const questions = targetAssignment.questions || [];
    const mcQuestions = questions.filter((q) => q.type === 'multiple_choice');
    if (mcQuestions.length === 0) return null;

    let earned = 0;
    let totalMc = 0;
    mcQuestions.forEach((q) => {
      const pts = q.points || 1;
      totalMc += pts;
      const ans = targetSubmission.answers?.find((a) => a.questionId === q.id);
      if (
        ans &&
        q.correctOptionIndex !== undefined &&
        ans.selectedOptionIndex === q.correctOptionIndex
      ) {
        earned += pts;
      }
    });
    return totalMc > 0 ? Math.round((earned / totalMc) * 100) : null;
  }, [targetAssignment, targetSubmission]);

  useEffect(() => {
    if (!targetSubmission) return;
    setScoreInput(
      targetSubmission.score !== null && targetSubmission.score !== undefined
        ? String(targetSubmission.score)
        : suggestedAutoScore !== null
        ? String(suggestedAutoScore)
        : '90'
    );
    setFeedback(targetSubmission.feedback || '');
  }, [targetSubmission, suggestedAutoScore]);

  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } =
    useBottomSheetMotion({
      onClose: () => setActiveAssignmentSubmissionTarget(null),
    });

  if (!targetAssignment || !targetSubmission) return null;

  const questions = targetAssignment.questions || [];

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(scoreInput);
    const clamped = Number.isFinite(numeric)
      ? Math.min(100, Math.max(0, Math.round(numeric)))
      : 0;
    handleGradeSubmission(
      targetAssignment.id,
      targetSubmission.id,
      clamped,
      feedback
    );
    setActiveAssignmentSubmissionTarget(null);
  };

  return (
    <div
      ref={backdropRef}
      data-modal-sheet-backdrop="true"
      className="animate-ui-fade fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
    >
      <form
        ref={setSheetElement}
        {...sheetGestureProps}
        onSubmit={handleSaveGrade}
        className="w-full sm:max-w-2xl bg-white rounded-t-[28px] sm:rounded-[26px] p-5 sm:p-6 space-y-4 shadow-2xl border border-black/[0.08] max-h-[92vh] overflow-y-auto animate-bottom-sheet"
      >
        <div
          data-sheet-handle="true"
          className="sm:hidden flex justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 bg-black/15 rounded-full animate-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${targetSubmission.color}`}
            >
              {targetSubmission.initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-bold text-[#1C1D21] truncate">
                  {targetSubmission.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                    targetSubmission.status === 'Graded'
                      ? 'bg-[#E6F9F0] text-[#146C43]'
                      : 'bg-[#FFF5E6] text-[#8C5811]'
                  }`}
                >
                  {targetSubmission.status === 'Graded'
                    ? `Sudah Dinilai · ${targetSubmission.score}/100`
                    : 'Menunggu Penilaian'}
                </span>
              </div>
              <p className="text-[11.5px] text-[#6E717A] truncate mt-0.5">
                {targetAssignment.title} · {targetSubmission.time}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={animateClose}
            className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center cursor-pointer text-[#6E717A] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Submitted Questions & Answers */}
        <div className="space-y-3">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#6E717A]">
            Hasil Jawaban Tugas ({questions.length} Pertanyaan)
          </div>

          {questions.length === 0 ? (
            <div className="rounded-xl border border-black/[0.07] bg-[#FAFBFD] p-4 text-[12.5px] text-[#6E717A]">
              Tidak ada rincian soal pada tugas ini. Admin dapat langsung memberikan nilai di bawah.
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const ans = targetSubmission.answers?.find(
                  (a) => a.questionId === q.id
                );
                const isMc = q.type === 'multiple_choice';
                const selectedIdx = ans?.selectedOptionIndex;
                const isMcCorrect =
                  isMc &&
                  q.correctOptionIndex !== undefined &&
                  selectedIdx === q.correctOptionIndex;

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-black/[0.08] bg-[#FAFBFD] p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white border border-black/[0.08] text-[10.5px] font-bold text-[#1C1D21]">
                        Soal #{idx + 1} · {isMc ? 'Pilihan Ganda' : 'Uraian'}
                      </span>
                      {isMc && selectedIdx !== undefined && q.correctOptionIndex !== undefined && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                            isMcCorrect
                              ? 'bg-[#E6F9F0] text-[#146C43]'
                              : 'bg-[#FFECEB] text-[#942922]'
                          }`}
                        >
                          {isMcCorrect ? (
                            <>
                              <Check className="w-3 h-3" />
                              Benar
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Kurang Tepat (Kunci:{' '}
                              {String.fromCharCode(65 + q.correctOptionIndex)})
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <p className="text-[13px] font-semibold text-[#1C1D21] leading-relaxed">
                      {q.prompt}
                    </p>

                    {q.imageUrl && (
                      <div className="rounded-xl border border-black/[0.07] bg-white p-2 overflow-hidden">
                        <img
                          src={q.imageUrl}
                          alt={`Ilustrasi soal ${idx + 1}`}
                          className="max-h-44 w-auto mx-auto rounded-lg object-contain"
                        />
                      </div>
                    )}

                    {/* Student Answer Box */}
                    <div className="rounded-xl border border-black/[0.07] bg-white p-3 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                        Jawaban {targetSubmission.name}:
                      </div>

                      {isMc ? (
                        selectedIdx !== undefined && q.options?.[selectedIdx] ? (
                          <div className="text-[13px] font-medium text-[#1C1D21]">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FEF1F5] text-[#9D113C] font-bold text-[11px] mr-2">
                              {String.fromCharCode(65 + selectedIdx)}
                            </span>
                            {q.options[selectedIdx]}
                          </div>
                        ) : (
                          <div className="text-[12.5px] italic text-[#8A8D98]">
                            Tidak memilih jawaban.
                          </div>
                        )
                      ) : ans?.answerText?.trim() ? (
                        <p className="text-[13px] text-[#1C1D21] whitespace-pre-wrap leading-relaxed">
                          {ans.answerText}
                        </p>
                      ) : (
                        <div className="text-[12.5px] italic text-[#8A8D98]">
                          Tidak ada jawaban teks.
                        </div>
                      )}

                      {ans?.answerImageUrl && (
                        <div className="pt-1">
                          <img
                            src={ans.answerImageUrl}
                            alt={`Lampiran jawaban ${idx + 1}`}
                            className="max-h-48 w-auto rounded-lg border border-black/[0.06] object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Grading Controls */}
        <div className="rounded-2xl border border-[#FBC2D4]/80 bg-[#FEF1F5]/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#9D113C]">
              <Award className="w-4 h-4" />
              <span>Penilaian Admin</span>
            </div>

            {suggestedAutoScore !== null && (
              <button
                type="button"
                onClick={() => setScoreInput(String(suggestedAutoScore))}
                className="px-2.5 py-1 rounded-full bg-white border border-[#FBC2D4] text-[11px] font-semibold text-[#9D113C] inline-flex items-center gap-1 hover:bg-[#FEF1F5] cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Skor PG Otomatis: {suggestedAutoScore}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-4 space-y-1.5">
              <label className="block text-[11.5px] font-semibold text-[#1C1D21]">
                Nilai (0 – 100) *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] bg-white text-[15px] font-bold text-[#1C1D21] tabular-nums outline-none focus:border-[#ee2e65]"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[75, 85, 90, 95, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setScoreInput(String(preset))}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                      Number(scoreInput) === preset
                        ? 'bg-[#ee2e65] text-white'
                        : 'bg-white border border-black/[0.08] text-[#6E717A] hover:text-[#1C1D21]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-8 space-y-1.5">
              <label className="block text-[11.5px] font-semibold text-[#1C1D21]">
                Catatan / Feedback Admin (Opsional)
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Berikan catatan evaluasi atau masukan untuk hasil tugas..."
                className="w-full px-3.5 py-2 rounded-xl border border-black/[0.12] bg-white text-[12.5px] outline-none focus:border-[#ee2e65] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 pt-2 border-t border-black/[0.06]">
          <button
            type="button"
            onClick={animateClose}
            className={`${ACTION_BTN_SECONDARY} flex-1 sm:flex-initial`}
          >
            <X className="w-4 h-4 sm:hidden shrink-0" />
            <span>Batal</span>
          </button>
          <button
            type="submit"
            className={`${ACTION_BTN_PRIMARY} flex-1`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Simpan Nilai</span>
          </button>
        </div>
      </form>
    </div>
  );
};
