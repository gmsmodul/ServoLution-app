import React, { useMemo, useState } from 'react';
import { X, Check, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getAvailableClassOptions } from '../../utils/scheduleSubjects';
import { ReportExportFormat, ReportMenuKey } from '../../types';
import {
  REPORT_MENU_CATALOG,
  getReportMenuMeta,
  suggestReportTitle,
} from '../../utils/reportBuilders';
import { CustomSelect } from '../ui/CustomSelect';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SECONDARY } from '../../constants/buttonStyles';

const EXPORT_FORMAT_OPTIONS: { id: ReportExportFormat; label: string; ext: string }[] = [
  { id: 'excel', label: 'Excel', ext: '.xlsx' },
  { id: 'pdf', label: 'PDF', ext: '.pdf' },
  { id: 'csv', label: 'CSV', ext: '.csv' },
  { id: 'json', label: 'JSON', ext: '.json' },
];

export const GenerateReportModal: React.FC = () => {
  const {
    schedules,
    attendanceByClass,
    assignments,
    isGenerateReportOpen,
    setIsGenerateReportOpen,
    handleGenerateReport,
  } = useApp();

  const classOptions = useMemo(
    () =>
      getAvailableClassOptions(
        Object.keys(attendanceByClass),
        schedules.map((s) => s.classCode),
        assignments.map((a) => a.classCode)
      ),
    [attendanceByClass, schedules, assignments]
  );

  const [menuKey, setMenuKey] = useState<ReportMenuKey>('all_menus');
  const [classCode, setClassCode] = useState<string>('All Classes');
  const [title, setTitle] = useState<string>(() =>
    suggestReportTitle('all_menus', 'All Classes')
  );
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [preferredExport, setPreferredExport] = useState<ReportExportFormat>('excel');
  const [notes, setNotes] = useState<string>('');
  const [downloadImmediately, setDownloadImmediately] = useState<boolean>(true);

  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } = useBottomSheetMotion({
    onClose: () => setIsGenerateReportOpen(false),
  });

  if (!isGenerateReportOpen) return null;

  const selectedMenuMeta = getReportMenuMeta(menuKey);

  const handleMenuChange = (nextKey: ReportMenuKey) => {
    setMenuKey(nextKey);
    if (!titleManuallyEdited) {
      setTitle(suggestReportTitle(nextKey, classCode));
    }
  };

  const handleClassChange = (nextClass: string) => {
    setClassCode(nextClass);
    if (!titleManuallyEdited) {
      setTitle(suggestReportTitle(menuKey, nextClass));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateReport({
      title: title.trim() || suggestReportTitle(menuKey, classCode),
      menuKey,
      classCode,
      preferredExport,
      notes: notes.trim() || undefined,
      downloadImmediately,
    });
  };

  return (
    <div
      ref={backdropRef}
      data-modal-sheet-backdrop="true"
      className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
    >
      <form
        ref={setSheetElement}
        {...sheetGestureProps}
        onSubmit={onSubmit}
        className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[26px] p-6 space-y-4 shadow-2xl animate-bottom-sheet max-h-[92vh] overflow-y-auto"
      >
        <div
          data-sheet-handle="true"
          className="sm:hidden flex justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 bg-black/15 rounded-full animate-sheet-handle" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[17px] font-semibold text-[#1C1D21]">Buat &amp; Ekspor Laporan</h3>
            <p className="text-[12px] text-[#6E717A] mt-0.5">
              Pilih menu sumber data dan format ekspor yang dibutuhkan
            </p>
          </div>
          <button
            type="button"
            onClick={animateClose}
            aria-label="Tutup modal"
            className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-[13px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
                Menu Sumber Laporan
              </label>
              <CustomSelect
                className="w-full"
                triggerClassName="px-3.5 py-2 rounded-xl border-black/[0.1] text-[13px]"
                value={menuKey}
                onChange={(val) => handleMenuChange(val as ReportMenuKey)}
                ariaLabel="Menu sumber laporan"
                options={REPORT_MENU_CATALOG.map((m) => ({
                  value: m.key,
                  label: m.label,
                }))}
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
                Cakupan Kelas
              </label>
              <CustomSelect
                className="w-full"
                triggerClassName="px-3.5 py-2 rounded-xl border-black/[0.1] text-[13px]"
                value={classCode}
                onChange={handleClassChange}
                ariaLabel="Cakupan kelas"
                options={[
                  { value: 'All Classes', label: 'All Classes (Semua)' },
                  ...classOptions.map((cls) => ({
                    value: cls,
                    label: cls,
                  })),
                ]}
              />
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-[#FAFBFD] border border-black/[0.06] text-[12px] text-[#5A5D67]">
            <span className="font-semibold text-[#1C1D21]">{selectedMenuMeta.label}:</span>{' '}
            {selectedMenuMeta.description}
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
              Judul Laporan
            </label>
            <input
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleManuallyEdited(true);
              }}
              placeholder="Contoh: Laporan Kehadiran & Kelulusan Batch 1"
              className="w-full px-3.5 py-2 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65]"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1.5">
              Format Export Utama
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F4F5F8] rounded-xl">
              {EXPORT_FORMAT_OPTIONS.map((fmt) => {
                const active = preferredExport === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setPreferredExport(fmt.id)}
                    className={`py-1.5 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#1C1D21] shadow-xs'
                        : 'text-[#6E717A] hover:text-[#1C1D21]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6E717A] mb-1">
              Catatan Laporan (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan evaluasi fakultas atau periode pelaporan..."
              className="w-full px-3.5 py-2 rounded-xl border border-black/[0.1] outline-none focus:border-[#ee2e65] resize-none"
            />
          </div>

          <div className="pt-0.5">
            <ToggleSwitch
              size="sm"
              color="primary"
              checked={downloadImmediately}
              onChange={setDownloadImmediately}
              label={`Langsung unduh file (${EXPORT_FORMAT_OPTIONS.find((f) => f.id === preferredExport)?.ext})`}
              description="Unduh laporan otomatis setelah disimpan ke arsip"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
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
            {downloadImmediately ? (
              <Download className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{downloadImmediately ? 'Simpan & Unduh' : 'Simpan Laporan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
