import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Send,
  Clock,
  ImagePlus,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { normalizeClassKey } from '../../utils/scheduleSubjects';
import {
  formatScheduleDateLabel,
  getRemainingScheduleLabel,
} from '../../utils/assignmentSchedule';
import { SubmissionAnswer } from '../../types';
import { CustomSelect } from '../ui/CustomSelect';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SECONDARY } from '../../constants/buttonStyles';

export const TakeAssignmentModal: React.FC = () => {
  const {
    activeTakeAssignment,
    setActiveTakeAssignment,
    studentsDirectory,
    activeCrewId,
    handleSubmitAssignmentAnswers,
    triggerToast,
  } = useApp();

  const eligibleStudents = useMemo(() => {
    if (!activeTakeAssignment) return studentsDirectory;
    const cls = normalizeClassKey(activeTakeAssignment.classCode);
    if (cls === 'All Classes') return studentsDirectory;
    const matched = studentsDirectory.filter(
      (s) => normalizeClassKey(s.classCode) === cls
    );
    return matched.length > 0 ? matched : studentsDirectory;
  }, [activeTakeAssignment, studentsDirectory]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [answersMap, setAnswersMap] = useState<Record<string, SubmissionAnswer>>({});

  useEffect(() => {
    if (!activeTakeAssignment) return;
    const defaultStudent =
      eligibleStudents.find((s) => s.id === activeCrewId) || eligibleStudents[0];
    setSelectedStudentId(defaultStudent?.id || '');

    // Prefill existing answers if this student already submitted
    const existingSub = activeTakeAssignment.submissions.find(
      (s) => s.studentId === defaultStudent?.id || s.name === defaultStudent?.name
    );
    const nextMap: Record<string, SubmissionAnswer> = {};
    (activeTakeAssignment.questions || []).forEach((q) => {
      const prevAns = existingSub?.answers?.find((a) => a.questionId === q.id);
      nextMap[q.id] = prevAns ? { ...prevAns } : { questionId: q.id };
    });
    setAnswersMap(nextMap);
  }, [activeTakeAssignment, eligibleStudents, activeCrewId]);

  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } =
    useBottomSheetMotion({
      onClose: () => setActiveTakeAssignment(null),
    });

  if (!activeTakeAssignment) return null;

  const questions = activeTakeAssignment.questions || [];

  const handleStudentSwitch = (nextId: string) => {
    setSelectedStudentId(nextId);
    const studentObj = eligibleStudents.find((s) => s.id === nextId);
    const existingSub = activeTakeAssignment.submissions.find(
      (s) => s.studentId === nextId || s.name === studentObj?.name
    );
    const nextMap: Record<string, SubmissionAnswer> = {};
    questions.forEach((q) => {
      const prevAns = existingSub?.answers?.find((a) => a.questionId === q.id);
      nextMap[q.id] = prevAns ? { ...prevAns } : { questionId: q.id };
    });
    setAnswersMap(nextMap);
  };

  const handleAnswerChange = (
    questionId: string,
    patch: Partial<SubmissionAnswer>
  ) => {
    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { questionId }),
        ...patch,
      },
    }));
  };

  const handleAnswerImageUpload = (questionId: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('Format Salah', 'Pilih file gambar yang valid.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleAnswerChange(questionId, { answerImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      triggerToast('Pilih Peserta', 'Pilih nama siswa/crew terlebih dahulu.', 'warning');
      return;
    }

    const answerList = questions.map(
      (q) => answersMap[q.id] || { questionId: q.id }
    );
    const hasAtLeastOneAnswer = answerList.some(
      (a) =>
        Boolean(a.answerText?.trim()) ||
        a.selectedOptionIndex !== undefined ||
        Boolean(a.answerImageUrl)
    );
    if (questions.length > 0 && !hasAtLeastOneAnswer) {
      triggerToast(
        'Jawaban Kosong',
        'Isi minimal satu jawaban sebelum mengumpulkan tugas.',
        'warning'
      );
      return;
    }

    handleSubmitAssignmentAnswers(
      activeTakeAssignment.id,
      selectedStudentId,
      answerList
    );
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
        onSubmit={handleSubmit}
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
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C] text-[11px] font-semibold">
                <Bookmark className="w-3 h-3" />
                {activeTakeAssignment.classCode}
              </span>
              <span className="text-[11.5px] font-medium text-[#6E717A]">
                {activeTakeAssignment.subject}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F9F0] text-[#146C43] text-[10.5px] font-semibold">
                <Clock className="w-3 h-3" />
                {getRemainingScheduleLabel(activeTakeAssignment)}
              </span>
            </div>
            <h3 className="text-[17px] font-bold text-[#1C1D21]">
              {activeTakeAssignment.title}
            </h3>
            {activeTakeAssignment.endDate && (
              <p className="text-[11.5px] text-[#8A8D98]">
                Batas pengumpulan: {formatScheduleDateLabel(activeTakeAssignment.endDate)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={animateClose}
            className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center cursor-pointer text-[#6E717A] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Student/Crew Selector */}
        <div className="rounded-xl border border-black/[0.08] bg-[#FAFBFD] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="text-[12px] font-semibold text-[#1C1D21]">
              Identitas Pengumpul Tugas
            </div>
            <div className="text-[11px] text-[#6E717A]">
              Hasil jawaban akan tercatat pada nama peserta yang dipilih.
            </div>
          </div>
          <CustomSelect
            value={selectedStudentId}
            onChange={handleStudentSwitch}
            pill
            align="right"
            ariaLabel="Pilih Siswa atau Crew"
            className="min-w-[210px]"
            triggerClassName="border-black/[0.1] bg-white"
            options={eligibleStudents.map((st) => ({
              value: st.id,
              label: `${st.name} (${st.classCode})`,
            }))}
          />
        </div>

        {activeTakeAssignment.description && (
          <div className="rounded-xl bg-[#FAFBFD] border border-black/[0.06] px-3.5 py-2.5 text-[12.5px] text-[#5A5D67] leading-relaxed">
            {activeTakeAssignment.description}
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="rounded-xl border border-black/[0.07] p-6 text-center text-[13px] text-[#8A8D98]">
            Tugas ini belum memiliki daftar pertanyaan.
          </div>
        ) : (
          <div className="space-y-3.5">
            {questions.map((q, idx) => {
              const currentAns = answersMap[q.id] || { questionId: q.id };
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#F4F5F8] text-[#1C1D21] text-[10.5px] font-bold">
                        Pertanyaan {idx + 1} ·{' '}
                        {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Uraian'}
                      </span>
                      <p className="text-[13.5px] font-medium text-[#1C1D21] leading-relaxed">
                        {q.prompt}
                      </p>
                    </div>
                  </div>

                  {q.imageUrl && (
                    <div className="rounded-xl border border-black/[0.07] bg-[#FAFBFD] p-2.5 overflow-hidden">
                      <img
                        src={q.imageUrl}
                        alt={`Gambar soal ${idx + 1}`}
                        className="max-h-56 w-auto mx-auto rounded-lg object-contain"
                      />
                    </div>
                  )}

                  {q.type === 'multiple_choice' && q.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const selected = currentAns.selectedOptionIndex === optIdx;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() =>
                              handleAnswerChange(q.id, { selectedOptionIndex: optIdx })
                            }
                            className={`px-3 py-2.5 rounded-xl border text-left text-[12.5px] flex items-center gap-2.5 transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#ee2e65] bg-[#FEF1F5] text-[#9D113C] font-semibold'
                                : 'border-black/[0.09] bg-white hover:bg-[#FAFBFD] text-[#1C1D21]'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                selected
                                  ? 'bg-[#ee2e65] text-white'
                                  : 'bg-[#F4F5F8] text-[#6E717A]'
                              }`}
                            >
                              {selected ? <CheckCircle2 className="w-3.5 h-3.5" /> : letter}
                            </span>
                            <span className="min-w-0 break-words">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={currentAns.answerText || ''}
                        onChange={(e) =>
                          handleAnswerChange(q.id, { answerText: e.target.value })
                        }
                        placeholder="Tuliskan jawaban Anda di sini..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.1] text-[13px] outline-none focus:border-[#ee2e65] resize-none"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="h-8 px-3 rounded-full border border-black/[0.09] bg-[#FAFBFD] hover:bg-[#FEF1F5] text-[11.5px] font-semibold text-[#1C1D21] inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                          <ImagePlus className="w-3.5 h-3.5 text-[#ee2e65]" />
                          <span>
                            {currentAns.answerImageUrl
                              ? 'Ganti Foto Jawaban'
                              : 'Lampirkan Gambar Jawaban (Opsional)'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              handleAnswerImageUpload(q.id, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {currentAns.answerImageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              handleAnswerChange(q.id, { answerImageUrl: undefined })
                            }
                            className="h-8 px-2.5 rounded-full bg-[#FFECEB] text-[#942922] text-[11px] font-semibold cursor-pointer"
                          >
                            Hapus Foto
                          </button>
                        )}
                      </div>

                      {currentAns.answerImageUrl && (
                        <div className="rounded-xl border border-black/[0.07] bg-[#FAFBFD] p-2">
                          <img
                            src={currentAns.answerImageUrl}
                            alt={`Lampiran jawaban ${idx + 1}`}
                            className="max-h-44 w-auto mx-auto rounded-lg object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2.5 pt-3 border-t border-black/[0.06]">
          <button
            type="button"
            onClick={animateClose}
            className={`${ACTION_BTN_SECONDARY} flex-1 sm:flex-initial`}
          >
            <X className="w-4 h-4 sm:hidden shrink-0" />
            <span>Tutup</span>
          </button>
          <button
            type="submit"
            className={`${ACTION_BTN_PRIMARY} flex-1`}
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>Kumpulkan Jawaban</span>
          </button>
        </div>
      </form>
    </div>
  );
};
