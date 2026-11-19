import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportExportFormat } from '../types';
import { CompiledMenuReport } from './reportBuilders';

function buildSafeFileBase(report: CompiledMenuReport): string {
  const cleanTitle = report.menuKey === 'all_menus' ? 'Semua_Menu' : report.menuKey;
  const cleanBatch = `${report.batchName}_${report.batchYear}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const cleanClass = report.classCode.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);
  return `Servolution_Report_${cleanTitle}_${cleanClass}_${cleanBatch}_${stamp}`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeSheetName(raw: string, used: Set<string>): string {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sheet';
  let candidate = cleaned.slice(0, 31);
  let idx = 2;
  while (used.has(candidate)) {
    const suffix = ` (${idx})`;
    candidate = `${cleaned.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    idx += 1;
  }
  used.add(candidate);
  return candidate;
}

function autoFitColumns(rows: Array<Array<string | number>>): XLSX.ColInfo[] {
  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const widths: XLSX.ColInfo[] = [];
  for (let c = 0; c < maxCols; c++) {
    let maxLen = 10;
    for (let r = 0; r < rows.length; r++) {
      const cell = rows[r]?.[c];
      if (cell !== undefined && cell !== null) {
        const len = String(cell).length;
        if (len > maxLen) maxLen = len;
      }
    }
    widths.push({ wch: Math.min(48, maxLen + 3) });
  }
  return widths;
}

// ============================================================================
// 1. EXPORT EXCEL (.xlsx)
// ============================================================================
export function exportReportToExcel(
  report: CompiledMenuReport,
  extraBundleReports?: CompiledMenuReport[]
): string {
  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  // Sheet 1: Executive Summary & KPI
  const summaryRows: Array<Array<string | number>> = [
    ['SERVOLUTION ACADEMIC & OPERATIONS REPORT'],
    ['Judul Laporan', report.title],
    ['Menu / Modul', report.menuLabel],
    ['Batch & Tahun', `${report.batchName} (${report.batchYear})`],
    ['GMS Asal / Program', `${report.gmsAsal || '—'} · ${report.programEvent || '—'}`],
    ['Filter Kelas', report.classCode],
    ['Tanggal Dibuat', report.generatedAt],
    ['Disusun Oleh', report.preparedBy],
    ...(report.notes ? [['Catatan', report.notes]] : []),
    [],
    ['RINGKASAN KPI UTAMA'],
    ['Indikator', 'Nilai', 'Keterangan'],
    ...report.kpis.map((k) => [k.label, k.value, k.subtext]),
    [],
    ['ANALISA & TEMUAN UTAMA'],
    ...report.insights.map((line, i) => [`${i + 1}.`, line]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = autoFitColumns(summaryRows);
  XLSX.utils.book_append_sheet(
    wb,
    summarySheet,
    sanitizeSheetName('Ringkasan KPI', usedSheetNames)
  );

  // Subsequent sheets: one worksheet per report section
  const appendReportSections = (target: CompiledMenuReport, prefix?: string) => {
    target.sections.forEach((sec) => {
      const headers = sec.columns.map((c) => c.label);
      const dataRows = sec.rows.map((row) =>
        sec.columns.map((c) => row[c.key] ?? '')
      );
      const sheetMatrix: Array<Array<string | number>> = [
        [sec.title],
        ...(sec.subtitle ? [[sec.subtitle]] : []),
        [],
        headers,
        ...(dataRows.length > 0
          ? dataRows
          : [[sec.emptyMessage || 'Tidak ada data tersedia.']]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetMatrix);
      ws['!cols'] = autoFitColumns(sheetMatrix);
      const rawName = prefix ? `${prefix} - ${sec.title}` : sec.title;
      XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(rawName, usedSheetNames));
    });
  };

  appendReportSections(report);

  if (extraBundleReports && extraBundleReports.length > 0) {
    extraBundleReports.forEach((subRep) => {
      appendReportSections(subRep, subRep.menuKey.toUpperCase());
    });
  }

  const filename = `${buildSafeFileBase(report)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

// ============================================================================
// 2. EXPORT JSON (.json)
// ============================================================================
export function exportReportToJson(
  report: CompiledMenuReport,
  extraBundleReports?: CompiledMenuReport[]
): string {
  const payload = {
    application: 'Servolution School & Teaching OS',
    exportedAt: new Date().toISOString(),
    report: {
      id: report.id,
      title: report.title,
      menuKey: report.menuKey,
      menuLabel: report.menuLabel,
      category: report.category,
      batch: {
        name: report.batchName,
        year: report.batchYear,
        gmsAsal: report.gmsAsal || null,
        programEvent: report.programEvent || null,
      },
      classFilter: report.classCode,
      generatedAt: report.generatedAt,
      preparedBy: report.preparedBy,
      notes: report.notes || null,
      kpis: report.kpis.map((k) => ({
        label: k.label,
        value: k.value,
        subtext: k.subtext,
      })),
      insights: report.insights,
      sections: report.sections.map((s) => ({
        id: s.id,
        title: s.title,
        columns: s.columns.map((c) => ({ key: c.key, label: c.label })),
        rowCount: s.rows.length,
        rows: s.rows,
      })),
    },
    ...(extraBundleReports && extraBundleReports.length > 0
      ? {
          includedMenuReports: extraBundleReports.map((sub) => ({
            menuKey: sub.menuKey,
            menuLabel: sub.menuLabel,
            kpis: sub.kpis.map((k) => ({ label: k.label, value: k.value, subtext: k.subtext })),
            insights: sub.insights,
            sections: sub.sections.map((s) => ({
              id: s.id,
              title: s.title,
              rows: s.rows,
            })),
          })),
        }
      : {}),
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const filename = `${buildSafeFileBase(report)}.json`;
  triggerBlobDownload(blob, filename);
  return filename;
}

// ============================================================================
// 3. EXPORT CSV (.csv)
// ============================================================================
export function exportReportToCsv(
  report: CompiledMenuReport,
  extraBundleReports?: CompiledMenuReport[]
): string {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;

  const lines: string[] = [];
  lines.push([esc('SERVOLUTION REPORT'), esc(report.title)].join(','));
  lines.push([esc('Menu / Modul'), esc(report.menuLabel)].join(','));
  lines.push([esc('Batch'), esc(`${report.batchName} (${report.batchYear})`)].join(','));
  lines.push([esc('Filter Kelas'), esc(report.classCode)].join(','));
  lines.push([esc('Tanggal'), esc(report.generatedAt)].join(','));
  lines.push([esc('Disusun Oleh'), esc(report.preparedBy)].join(','));
  if (report.notes) {
    lines.push([esc('Catatan'), esc(report.notes)].join(','));
  }
  lines.push('');

  lines.push('RINGKASAN KPI');
  lines.push('Indikator,Nilai,Keterangan');
  report.kpis.forEach((k) => {
    lines.push([esc(k.label), esc(k.value), esc(k.subtext)].join(','));
  });
  lines.push('');

  lines.push('ANALISA & TEMUAN UTAMA');
  report.insights.forEach((ins, idx) => {
    lines.push([idx + 1, esc(ins)].join(','));
  });
  lines.push('');

  const pushSections = (rep: CompiledMenuReport) => {
    rep.sections.forEach((sec) => {
      lines.push(esc(sec.title));
      lines.push(sec.columns.map((c) => esc(c.label)).join(','));
      if (sec.rows.length === 0) {
        lines.push(esc(sec.emptyMessage || 'Tidak ada data tersedia.'));
      } else {
        sec.rows.forEach((row) => {
          lines.push(sec.columns.map((c) => esc(row[c.key] ?? '')).join(','));
        });
      }
      lines.push('');
    });
  };

  pushSections(report);
  if (extraBundleReports && extraBundleReports.length > 0) {
    extraBundleReports.forEach((sub) => {
      lines.push(esc(`=== MODUL: ${sub.menuLabel} ===`));
      pushSections(sub);
    });
  }

  // UTF-8 BOM ensures Excel opens Indonesian UTF-8 text cleanly
  const csvContent = `\uFEFF${lines.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${buildSafeFileBase(report)}.csv`;
  triggerBlobDownload(blob, filename);
  return filename;
}

// ============================================================================
// 4. EXPORT PDF (.pdf)
// ============================================================================
export function exportReportToPdf(
  report: CompiledMenuReport,
  extraBundleReports?: CompiledMenuReport[]
): string {
  const allReports = [report, ...(extraBundleReports || [])];
  const maxColumns = allReports.reduce(
    (m, rep) =>
      Math.max(
        m,
        rep.sections.reduce((sm, s) => Math.max(sm, s.columns.length), 0)
      ),
    0
  );
  const orientation: 'portrait' | 'landscape' = maxColumns >= 7 ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const renderReportPages = (rep: CompiledMenuReport, isFirst: boolean) => {
    if (!isFirst) {
      doc.addPage();
    }

    // Header accent bar
    doc.setFillColor(238, 46, 101); // #ee2e65
    doc.rect(0, 0, pageWidth, 4, 'F');

    let y = 14;

    // Kicker label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(238, 46, 101);
    doc.text(`SERVOLUTION · ${rep.menuLabel.toUpperCase()}`, margin, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(28, 29, 33);
    const titleLines = doc.splitTextToSize(rep.title, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 6.5;

    // Metadata subtitle line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 113, 122);
    const metaLine = `${rep.batchName} (${rep.batchYear})  ·  Kelas: ${rep.classCode}  ·  Dibuat: ${rep.generatedAt}`;
    doc.text(metaLine, margin, y);
    y += 4.5;

    if (rep.notes) {
      doc.setFontSize(8.5);
      doc.text(`Catatan: ${rep.notes}`, margin, y);
      y += 4.5;
    }

    // Hairline divider
    doc.setDrawColor(225, 227, 234);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // 4-Column KPI Summary Strip
    const kpiCount = Math.min(4, rep.kpis.length);
    if (kpiCount > 0) {
      const gap = 3;
      const boxW = (contentWidth - gap * (kpiCount - 1)) / kpiCount;
      const boxH = 21;

      rep.kpis.slice(0, kpiCount).forEach((kpi, idx) => {
        const x = margin + idx * (boxW + gap);
        const fills: Record<string, [number, number, number]> = {
          periwinkle: [240, 239, 252],
          mint: [230, 249, 240],
          coral: [254, 241, 245],
          peach: [255, 245, 230],
          slate: [244, 245, 248],
        };
        const rgb = fills[kpi.tone] || fills.slate;
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.setDrawColor(230, 232, 238);
        doc.roundedRect(x, y, boxW, boxH, 2.5, 2.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(90, 93, 103);
        doc.text(kpi.label, x + 3, y + 5.5, { maxWidth: boxW - 6 });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(28, 29, 33);
        doc.text(kpi.value, x + 3, y + 12.5, { maxWidth: boxW - 6 });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(110, 113, 122);
        doc.text(kpi.subtext, x + 3, y + 17.8, { maxWidth: boxW - 6 });
      });
      y += boxH + 7;
    }

    // Insights Block
    if (rep.insights.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(28, 29, 33);
      doc.text('Analisa & Temuan Utama', margin, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(65, 68, 76);

      rep.insights.forEach((ins) => {
        const wrapped = doc.splitTextToSize(`•  ${ins}`, contentWidth);
        if (y + wrapped.length * 4.2 > pageHeight - 20) {
          doc.addPage();
          y = 16;
        }
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.2 + 1.2;
      });
      y += 3;
    }

    // Data Tables
    rep.sections.forEach((sec) => {
      if (y > pageHeight - 36) {
        doc.addPage();
        y = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(28, 29, 33);
      doc.text(sec.title, margin, y);
      y += 4.5;

      if (sec.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110, 113, 122);
        doc.text(sec.subtitle, margin, y);
        y += 4;
      }

      const head = [sec.columns.map((c) => c.label)];
      const body =
        sec.rows.length > 0
          ? sec.rows.map((r) => sec.columns.map((c) => String(r[c.key] ?? '—')))
          : [[sec.emptyMessage || 'Belum ada data tersedia untuk bagian ini.']];

      const columnStyles: Record<number, { halign?: 'left' | 'right' }> = {};
      if (sec.rows.length > 0) {
        sec.columns.forEach((col, cIdx) => {
          if (col.align === 'right') {
            columnStyles[cIdx] = { halign: 'right' };
          }
        });
      }

      autoTable(doc, {
        startY: y,
        head: sec.rows.length > 0 ? head : undefined,
        body,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.6,
          textColor: [28, 29, 33],
          lineColor: [232, 234, 240],
          lineWidth: 0.2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [244, 245, 248],
          textColor: [60, 64, 73],
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [251, 252, 254],
        },
        columnStyles,
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
      y = (finalY || y + 14) + 7;
    });
  };

  allReports.forEach((rep, index) => {
    renderReportPages(rep, index === 0);
  });

  // Footer pagination across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(138, 141, 152);
    doc.text(
      `Servolution Report · ${report.batchName} (${report.batchYear}) · ${report.preparedBy}`,
      margin,
      pageHeight - 7
    );
    doc.text(`Halaman ${p} / ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: 'right',
    });
  }

  const filename = `${buildSafeFileBase(report)}.pdf`;
  doc.save(filename);
  return filename;
}

// ============================================================================
// UNIFIED DISPATCHER
// ============================================================================
export function exportCompiledReport(
  format: ReportExportFormat,
  report: CompiledMenuReport,
  extraBundleReports?: CompiledMenuReport[]
): string {
  switch (format) {
    case 'excel':
      return exportReportToExcel(report, extraBundleReports);
    case 'json':
      return exportReportToJson(report, extraBundleReports);
    case 'csv':
      return exportReportToCsv(report, extraBundleReports);
    case 'pdf':
      return exportReportToPdf(report, extraBundleReports);
  }
}
