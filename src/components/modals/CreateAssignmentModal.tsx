import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Check,
  Plus,
  Trash2,
  ImagePlus,
  CalendarClock,
  FileQuestion,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getAvailableClassOptions,
  getScheduleSubjectOptions,
  normalizeClassKey,
  resolveSubjectForClassKey,
} from '../../utils/scheduleSubjects';
import {
  formatScheduleDateLabel,
  getAssignmentSchedulePhase,
  relativeLocalDateTimeInput,
} from '../../utils/assignmentSchedule';
import {
  AssignmentQuestion,
  AssignmentQuestionType,
  PastelThemeKey,
} from '../../types';
import { CustomSelect } from '../ui/CustomSelect';
import { UiKitDateTimePicker } from '../ui/UiKitDateTimePicker';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SECONDARY } from '../../constants/buttonStyles';

function createEmptyQuestion(index: number): AssignmentQuestion {
  return {
    id: `Q-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'essay',
    prompt: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    points: 50,
  };
}

export const CreateAssignmentModal: React.FC = () => {
  const {
    schedules,
    materialsList,
    lessonPlans,
    assignments,
    studentsDirectory,
    isNewAssignmentOpen,
    setIsNewAssignmentOpen,
    editingAssignment,
    setEditingAssignment,
    handleCreateAssignment,
    handleUpdateAssignment,
    triggerToast,
  } = useApp();

  const classOptions = useMemo(
    () => [
      ...getAvailableClassOptions(
        schedules.map((s) => s.classCode),
        studentsDirectory.map((s) => s.classCode)
      ),
      'All Classes',
    ],
    [schedules, studentsDirectory]
  );

  const [title, setTitle] = useState('');
  const [classCode, setClassCode] = useState('Class 302');
  const [subject, setSubject] = useState('Mathematics');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => relativeLocalDateTimeInput(0));
  const [endDate, setEndDate] = useState(() => relativeLocalDateTimeInput(48));
  const [activeScheduleTab, setActiveScheduleTab] = useState<'start' | 'end'>('start');
  const [theme, setTheme] = useState<PastelThemeKey>('periwinkle');
  const [questions, setQuestions] = useState<AssignmentQuestion[]>([createEmptyQuestion(1)]);

  const subjectOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { value: string; label: string }[] = [];

    const addSubject = (raw?: string | null) => {
      const cleaned = String(raw || '').trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ value: cleaned, label: cleaned });
    };

    getScheduleSubjectOptions(schedules).forEach((s) => addSubject(s.subject));
    materialsList.forEach((m) => addSubject(m.subject));
    lessonPlans.forEach((lp) => addSubject(lp.subject));
    assignments.forEach((a) => addSubject(a.subject));
    addSubject(subject);

    return list;
  }, [schedules, materialsList, lessonPlans, assignments, subject]);

  useEffect(() => {
    if (!isNewAssignmentOpen) return;

    if (editingAssignment) {
      setTitle(editingAssignment.title);
      setClassCode(normalizeClassKey(editingAssignment.classCode));
      setSubject(editingAssignment.subject);
      setDescription(editingAssignment.description || '');
      setStartDate(editingAssignment.startDate || relativeLocalDateTimeInput(0));
      setEndDate(editingAssignment.endDate || relativeLocalDateTimeInput(48));
      setTheme(editingAssignment.theme || 'periwinkle');
      setQuestions(
        editingAssignment.questions && editingAssignment.questions.length > 0
          ? editingAssignment.questions.map((q) => ({
              ...q,
              options: q.options && q.options.length >= 2 ? [...q.options] : ['', '', '', ''],
            }))
          : [createEmptyQuestion(1)]
      );
    } else {
      const defaultCls = classOptions[0] || 'Class 302';
      setTitle('');
      setClassCode(defaultCls);
      setSubject(resolveSubjectForClassKey(defaultCls, schedules));
      setDescription('');
      setStartDate(relativeLocalDateTimeInput(0));
      setEndDate(relativeLocalDateTimeInput(48));
      setTheme('periwinkle');
      setQuestions([createEmptyQuestion(1)]);
    }
    setActiveScheduleTab('start');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewAssignmentOpen, editingAssignment]);

  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } = useBottomSheetMotion({
    onClose: () => {
      setIsNewAssignmentOpen(false);
      setEditingAssignment(null);
    },
  });

  if (!isNewAssignmentOpen) return null;

  const schedulePhasePreview = getAssignmentSchedulePhase({ startDate, endDate });
  const isDateRangeInvalid =
    Boolean(startDate && endDate) && new Date(endDate).getTime() <= new Date(startDate).getTime();

  const handleClassChange = (nextClass: string) => {
    setClassCode(nextClass);
    const matched = schedules.find((s) => normalizeClassKey(s.classCode) === nextClass);
    if (matched) {
      setSubject(matched.subject);
      setTheme(matched.theme);
    } else if (nextClass === 'All Classes') {
      setSubject(subjectOptions[0]?.value || 'Mathematics');
    } else {
      setSubject(resolveSubjectForClassKey(nextClass, schedules));
    }
  };

  const handleUpdateQuestion = (
    questionId: string,
    patch: Partial<AssignmentQuestion>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...patch } : q))
    );
  };

  const handleQuestionImageUpload = (questionId: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('Format Tidak Didukung', 'Pilih file gambar (PNG, JPG, WebP, atau SVG).', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleUpdateQuestion(questionId, { imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOptionChange = (questionId: string, optIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const nextOpts = [...(q.options || ['', '', '', ''])];
        nextOpts[optIndex] = text;
        return { ...q, options: nextOpts };
      })
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      triggerToast('Judul Wajib Diisi', 'Masukkan judul tugas terlebih dahulu.', 'warning');
      return;
    }
    if (isDateRangeInvalid) {
      triggerToast(
        'Jadwal Tidak Valid',
        'Tanggal selesai (End) harus lebih akhir dari tanggal mulai (Start).',
        'warning'
      );
      return;
    }

    const cleanedQuestions: AssignmentQuestion[] = questions
      .filter((q) => q.prompt.trim() || q.imageUrl)
      .map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt.trim() || 'Perhatikan gambar berikut dan tuliskan jawaban Anda.',
        imageUrl: q.imageUrl?.trim() || undefined,
        options:
          q.type === 'multiple_choice'
            ? (q.options || []).map((o, i) => o.trim() || `Pilihan ${String.fromCharCode(65 + i)}`)
            : undefined,
        correctOptionIndex:
          q.type === 'multiple_choice' ? q.correctOptionIndex ?? 0 : undefined,
        points: q.points || 50,
      }));

    if (cleanedQuestions.length === 0) {
      triggerToast(
        'Minimal 1 Pertanyaan',
        'Tambahkan minimal satu pertanyaan (atau gambar soal) untuk tugas ini.',
        'warning'
      );
      return;
    }

    const matchedStudentsCount =
      classCode === 'All Classes'
        ? studentsDirectory.length
        : studentsDirectory.filter((s) => normalizeClassKey(s.classCode) === classCode).length;

    const payload = {
      classCode,
      subject: subject.trim() || 'General',
      title: title.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate,
      dueDate: endDate ? formatScheduleDateLabel(endDate) : 'Tanpa batas waktu',
      status:
        schedulePhasePreview === 'ended'
          ? ('Completed' as const)
          : ('Active' as const),
      total: Math.max(1, matchedStudentsCount),
      theme,
      questions: cleanedQuestions,
    };

    if (editingAssignment) {
      handleUpdateAssignment(editingAssignment.id, payload);
    } else {
      handleCreateAssignment(payload);
    }
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
        onSubmit={onSubmit}
        className="w-full sm:max-w-2xl bg-white rounded-t-[28px] sm:rounded-[26px] p-5 sm:p-6 space-y-4 shadow-2xl border border-black/[0.08] max-h-[92vh] overflow-y-auto animate-bottom-sheet"
      >
        <div
          data-sheet-handle="true"
          className="sm:hidden flex justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 bg-black/15 rounded-full animate-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#FEF1F5] text-[#9D113C] flex items-center justify-center shrink-0">
              {editingAssignment ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <FileQuestion className="w-4 h-4" />
              )}
            </span>
            <div>
              <h3 className="text-[16.5px] font-semibold text-[#1C1D21]">
                {editingAssignment ? 'Edit Tugas & Soal' : 'Buat Tugas Baru'}
              </h3>
              <p className="text-[11.5px] text-[#6E717A]">
                Atur jadwal autostart/stop serta pertanyaan dan gambar untuk dikerjakan crew.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={animateClose}
            className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center cursor-pointer text-[#6E717A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Basic Info */}
        <div className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
              Judul Tugas *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Latihan Pemahaman Materi & Analisis Kasus"
              className="w-full px-3.5 py-2 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
                Kelas Target *
              </label>
              <CustomSelect
                className="w-full"
                triggerClassName="px-3.5 py-2 rounded-xl border-black/[0.1] text-[13px]"
                value={classOptions.includes(classCode) ? classCode : 'Class 302'}
                onChange={handleClassChange}
                ariaLabel="Kelas Target"
                options={classOptions.map((cls) => ({
                  value: cls,
                  label: cls,
                }))}
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
                Mata Pelajaran (Subject) *
              </label>
              <CustomSelect
                className="w-full"
                triggerClassName="px-3.5 py-2 rounded-xl border-black/[0.1] text-[13px]"
                value={subject}
                onChange={setSubject}
                ariaLabel="Mata Pelajaran"
                options={subjectOptions}
              />
            </div>
          </div>

          {/* Schedule Start & End (UI Kit Calendar Grid + Time Picker) */}
          <div className="rounded-2xl border border-black/[0.08] bg-[#FAFBFD] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1D21]">
                <CalendarClock className="w-4 h-4 text-[#ee2e65]" />
                <span>Jadwal Otomatis (Tampil &amp; Hilang di Overview)</span>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  isDateRangeInvalid
                    ? 'bg-[#FFECEB] text-[#942922]'
                    : schedulePhasePreview === 'running'
                    ? 'bg-[#E6F9F0] text-[#146C43]'
                    : schedulePhasePreview === 'scheduled'
                    ? 'bg-[#F0EFFC] text-[#3F3B99]'
                    : 'bg-[#F4F5F8] text-[#6E717A]'
                }`}
              >
                {isDateRangeInvalid
                  ? 'Rentang tanggal tidak valid'
                  : schedulePhasePreview === 'running'
                  ? 'Aktif sekarang · Tampil di Overview'
                  : schedulePhasePreview === 'scheduled'
                  ? 'Terjadwal · Autostart saat Start'
                  : 'Sudah berakhir · Hilang dari Overview'}
              </span>
            </div>

            {/* Start / End Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setActiveScheduleTab('start')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeScheduleTab === 'start'
                    ? 'border-[#ee2e65] bg-[#FEF1F5]/70 shadow-xs'
                    : 'border-black/[0.09] bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#6E717A]">
                  <span>Tanggal Mulai (Autostart)</span>
                  {activeScheduleTab === 'start' && (
                    <span className="px-1.5 py-0.5 rounded bg-[#ee2e65] text-white text-[9.5px] font-bold">
                      Diatur
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] font-bold text-[#1C1D21] mt-1 tabular-nums">
                  {formatScheduleDateLabel(startDate)} WIB
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScheduleTab('end')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeScheduleTab === 'end'
                    ? 'border-[#ee2e65] bg-[#FEF1F5]/70 shadow-xs'
                    : 'border-black/[0.09] bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#6E717A]">
                  <span>Tanggal Berakhir (Auto-stop)</span>
                  {activeScheduleTab === 'end' && (
                    <span className="px-1.5 py-0.5 rounded bg-[#ee2e65] text-white text-[9.5px] font-bold">
                      Diatur
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] font-bold text-[#1C1D21] mt-1 tabular-nums">
                  {formatScheduleDateLabel(endDate)} WIB
                </div>
              </button>
            </div>

            {/* UI Kit Interactive Calendar Grid & Time Selector */}
            <UiKitDateTimePicker
              value={activeScheduleTab === 'start' ? startDate : endDate}
              onChange={(val) => {
                if (activeScheduleTab === 'start') {
                  setStartDate(val);
                } else {
                  setEndDate(val);
                }
              }}
              rangeStart={startDate}
              rangeEnd={endDate}
              activeLabel={
                activeScheduleTab === 'start'
                  ? 'Atur Tanggal & Jam Mulai'
                  : 'Atur Tanggal & Jam Berakhir'
              }
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
              Instruksi / Catatan Tugas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tuliskan petunjuk pengerjaan untuk siswa atau crew..."
              className="w-full px-3.5 py-2 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65] resize-none"
            />
          </div>
        </div>

        {/* Questions Builder with Image Attachment */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-[13.5px] font-semibold text-[#1C1D21]">
                Daftar Pertanyaan ({questions.length})
              </h4>
              <p className="text-[11.5px] text-[#6E717A]">
                Setiap soal dapat berupa uraian atau pilihan ganda dan dapat dilengkapi gambar.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setQuestions((prev) => [...prev, createEmptyQuestion(prev.length + 1)])
              }
              className="h-8 px-3 rounded-full bg-[#FEF1F5] hover:bg-[#FDE0E9] text-[#9D113C] text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Soal</span>
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="rounded-2xl border border-black/[0.08] bg-[#FAFBFD] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-black/[0.08] text-[11.5px] font-bold text-[#1C1D21]">
                      Soal #{qIdx + 1}
                    </span>

                    <div className="inline-flex rounded-full bg-black/[0.05] p-0.5">
                      {(
                        [
                          { id: 'essay', label: 'Uraian / Essay' },
                          { id: 'multiple_choice', label: 'Pilihan Ganda' },
                        ] as { id: AssignmentQuestionType; label: string }[]
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            handleUpdateQuestion(q.id, {
                              type: mode.id,
                              options:
                                mode.id === 'multiple_choice' &&
                                (!q.options || q.options.length < 2)
                                  ? ['', '', '', '']
                                  : q.options,
                            })
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                            q.type === mode.id
                              ? 'bg-white text-[#9D113C] shadow-xs'
                              : 'text-[#6E717A] hover:text-[#1C1D21]'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((prev) => prev.filter((item) => item.id !== q.id))
                      }
                      aria-label={`Hapus soal ${qIdx + 1}`}
                      className="w-7 h-7 rounded-full hover:bg-[#FFECEB] text-[#8A8D98] hover:text-[#942922] inline-flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={q.prompt}
                    onChange={(e) =>
                      handleUpdateQuestion(q.id, { prompt: e.target.value })
                    }
                    placeholder={`Tuliskan pertanyaan untuk soal #${qIdx + 1}...`}
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.1] bg-white text-[13px] outline-none focus:border-[#ee2e65] resize-none"
                  />
                </div>

                {/* Question Image Upload or URL */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="h-8 px-3 rounded-full border border-black/[0.1] bg-white hover:bg-[#FEF1F5] hover:border-[#ee2e65]/40 text-[11.5px] font-semibold text-[#1C1D21] inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                      <ImagePlus className="w-3.5 h-3.5 text-[#ee2e65]" />
                      <span>{q.imageUrl ? 'Ganti Gambar' : 'Upload Gambar Soal'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleQuestionImageUpload(q.id, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      value={q.imageUrl?.startsWith('data:') ? '' : q.imageUrl || ''}
                      onChange={(e) =>
                        handleUpdateQuestion(q.id, { imageUrl: e.target.value })
                      }
                      placeholder="Atau tempel URL gambar (opsional)..."
                      className="flex-1 min-w-[180px] h-8 px-3 rounded-full border border-black/[0.09] bg-white text-[11.5px] outline-none focus:border-[#ee2e65]"
                    />

                    {q.imageUrl && (
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(q.id, { imageUrl: undefined })}
                        className="h-8 px-2.5 rounded-full bg-[#FFECEB] text-[#942922] text-[11px] font-semibold cursor-pointer"
                      >
                        Hapus Gambar
                      </button>
                    )}
                  </div>

                  {q.imageUrl && (
                    <div className="rounded-xl border border-black/[0.08] bg-white p-2 overflow-hidden">
                      <img
                        src={q.imageUrl}
                        alt={`Ilustrasi soal ${qIdx + 1}`}
                        className="max-h-48 w-auto mx-auto rounded-lg object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Multiple choice options */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-[#6E717A]">
                      Pilihan Jawaban (klik huruf untuk menandai kunci jawaban)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || ['', '', '', '']).map((opt, optIdx) => {
                        const isCorrect = (q.correctOptionIndex ?? 0) === optIdx;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 bg-white ${
                              isCorrect ? 'border-[#10B981]' : 'border-black/[0.09]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuestion(q.id, { correctOptionIndex: optIdx })
                              }
                              title="Tandai sebagai kunci jawaban"
                              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                isCorrect
                                  ? 'bg-[#10B981] text-white'
                                  : 'bg-[#F4F5F8] text-[#6E717A] hover:text-[#1C1D21]'
                              }`}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) =>
                                handleOptionChange(q.id, optIdx, e.target.value)
                              }
                              placeholder={`Pilihan ${letter}`}
                              className="flex-1 min-w-0 text-[12px] outline-none bg-transparent"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2.5 pt-3 border-t border-black/[0.06]">
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
            <Check className="w-4 h-4 shrink-0" />
            <span>
              {editingAssignment ? 'Simpan Perubahan' : 'Terbitkan Tugas'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
