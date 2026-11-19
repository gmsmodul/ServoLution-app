import { PastelThemeKey } from '../types';

export type FileEntryKind =
  | 'folder'
  | 'video'
  | 'image'
  | 'audio'
  | 'document'
  | 'archive'
  | 'other';

export interface FileManagerEntry {
  id: string;
  parentId: string | null;
  name: string;
  kind: FileEntryKind;
  extension?: string;
  sizeBytes: number;
  owner: string;
  updatedAt: string;
  updatedTimestamp: number;
  starred: boolean;
  shared: boolean;
  trashed: boolean;
  theme: PastelThemeKey;
  tags: string[];
  notes?: string;
  dataUrl?: string;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const INITIAL_FILE_MANAGER_ENTRIES: FileManagerEntry[] = [
  // Root Folders
  {
    id: 'FLD-01',
    parentId: null,
    name: 'Ibadah Minggu 2026',
    kind: 'folder',
    sizeBytes: 0,
    owner: 'Divisi Produksi',
    updatedAt: '18 Nov 2026',
    updatedTimestamp: 1795000000000,
    starred: true,
    shared: true,
    trashed: false,
    theme: 'periwinkle',
    tags: ['Ibadah', '2026'],
    notes: 'Folder utama rekaman program, rundown, dan slide ibadah minggu.',
  },
  {
    id: 'FLD-02',
    parentId: null,
    name: 'Editing Projects',
    kind: 'folder',
    sizeBytes: 0,
    owner: 'Tim Editing',
    updatedAt: '17 Nov 2026',
    updatedTimestamp: 1794910000000,
    starred: true,
    shared: false,
    trashed: false,
    theme: 'coral',
    tags: ['Editing', 'Video'],
    notes: 'Project Premiere Pro, DaVinci Resolve, dan final render event.',
  },
  {
    id: 'FLD-03',
    parentId: null,
    name: 'Aset Grafis & Bumper',
    kind: 'folder',
    sizeBytes: 0,
    owner: 'Tim Desain',
    updatedAt: '16 Nov 2026',
    updatedTimestamp: 1794820000000,
    starred: false,
    shared: true,
    trashed: false,
    theme: 'mint',
    tags: ['Grafis', 'LED', 'Bumper'],
    notes: 'Lower third, bumper pengumuman, dan background motion LED wall.',
  },
  {
    id: 'FLD-04',
    parentId: null,
    name: 'Audio & Multitrack',
    kind: 'folder',
    sizeBytes: 0,
    owner: 'Tim Audio',
    updatedAt: '14 Nov 2026',
    updatedTimestamp: 1794650000000,
    starred: false,
    shared: false,
    trashed: false,
    theme: 'peach',
    tags: ['Audio', 'WAV'],
    notes: 'Ambient pad, voice over pengumuman, dan stem multitrack worship.',
  },
  {
    id: 'FLD-05',
    parentId: null,
    name: 'Dokumen & SOP',
    kind: 'folder',
    sizeBytes: 0,
    owner: 'Sekretariat Multimedia',
    updatedAt: '13 Nov 2026',
    updatedTimestamp: 1794560000000,
    starred: false,
    shared: true,
    trashed: false,
    theme: 'periwinkle',
    tags: ['SOP', 'Dokumen'],
    notes: 'Panduan control room, inventaris perangkat, dan dokumen administrasi.',
  },

  // Root-level quick files
  {
    id: 'FILE-01',
    parentId: null,
    name: 'Master_Rundown_November_2026.pdf',
    kind: 'document',
    extension: 'PDF',
    sizeBytes: Math.round(3.4 * MB),
    owner: 'Rachel Wijaya',
    updatedAt: '18 Nov 2026',
    updatedTimestamp: 1794995000000,
    starred: true,
    shared: true,
    trashed: false,
    theme: 'periwinkle',
    tags: ['Rundown', 'Ibadah'],
    notes: 'Jadwal dan cue sheet lengkap ibadah raya bulan November 2026.',
  },
  {
    id: 'FILE-02',
    parentId: null,
    name: 'Bumper_Christmas_2026_Preview.mp4',
    kind: 'video',
    extension: 'MP4',
    sizeBytes: Math.round(428 * MB),
    owner: 'Daniel Pratama',
    updatedAt: '18 Nov 2026',
    updatedTimestamp: 1794985000000,
    starred: true,
    shared: true,
    trashed: false,
    theme: 'coral',
    tags: ['Natal', 'Bumper', '1080p'],
    notes: 'Draft final bumper pengumuman Natal 2026 (H.264 1080p 60fps).',
  },

  // Inside FLD-01: Ibadah Minggu 2026
  {
    id: 'FLD-01-A',
    parentId: 'FLD-01',
    name: 'Footage Kamera',
    kind: 'folder',
    sizeBytes: 0,
    owner: 'Tim Kamera',
    updatedAt: '18 Nov 2026',
    updatedTimestamp: 1794970000000,
    starred: false,
    shared: false,
    trashed: false,
    theme: 'coral',
    tags: ['RAW', 'Camera'],
    notes: 'Rekaman ISO kamera 1-4 ibadah minggu.',
  },
  {
    id: 'FILE-03',
    parentId: 'FLD-01',
    name: 'Program_Mix_Ibadah_15Nov.mp4',
    kind: 'video',
    extension: 'MP4',
    sizeBytes: Math.round(2.45 * GB),
    owner: 'Divisi Produksi',
    updatedAt: '15 Nov 2026',
    updatedTimestamp: 1794740000000,
    starred: true,
    shared: true,
    trashed: false,
    theme: 'coral',
    tags: ['Program Mix', 'HyperDeck'],
    notes: 'Rekaman bersih program output ATEM untuk arsip YouTube.',
  },
  {
    id: 'FILE-04',
    parentId: 'FLD-01',
    name: 'CueSheet_Ibadah_15Nov.docx',
    kind: 'document',
    extension: 'DOCX',
    sizeBytes: Math.round(1.2 * MB),
    owner: 'Rachel Wijaya',
    updatedAt: '14 Nov 2026',
    updatedTimestamp: 1794690000000,
    starred: false,
    shared: true,
    trashed: false,
    theme: 'periwinkle',
    tags: ['Cue Sheet', 'Liturgi'],
    notes: 'Daftar lagu, pembacaan ayat, dan cue lighting ibadah 15 November.',
  },
  {
    id: 'FILE-05',
    parentId: 'FLD-01-A',
    name: 'CAM1_SonyFX30_WorshipSet.mp4',
    kind: 'video',
    extension: 'MP4',
    sizeBytes: Math.round(1.82 * GB),
    owner: 'Daniel Pratama',
    updatedAt: '15 Nov 2026',
    updatedTimestamp: 1794730000000,
    starred: false,
    shared: false,
    trashed: false,
    theme: 'coral',
    tags: ['CAM 1', 'FX30'],
    notes: 'ISO recording kamera utama wide panggung.',
  },

  // Inside FLD-02: Editing Projects
  {
    id: 'FILE-06',
    parentId: 'FLD-02',
    name: 'Worship_Night_Highlight_Master.mp4',
    kind: 'video',
    extension: 'MP4',
    sizeBytes: Math.round(860 * MB),
    owner: 'Tim Editing',
    updatedAt: '17 Nov 2026',
    updatedTimestamp: 1794900000000,
    starred: true,
    shared: true,
    trashed: false,
    theme: 'coral',
    tags: ['Highlight', '4K'],
    notes: 'Video recap Worship Night siap upload ke media sosial.',
  },
  {
    id: 'FILE-07',
    parentId: 'FLD-02',
    name: 'LUT_Pack_SonyFX30_Blackmagic.zip',
    kind: 'archive',
    extension: 'ZIP',
    sizeBytes: Math.round(64 * MB),
    owner: 'Tim Editing',
    updatedAt: '12 Nov 2026',
    updatedTimestamp: 1794470000000,
    starred: false,
    shared: true,
    trashed: false,
    theme: 'peach',
    tags: ['LUT', 'Color Grading'],
    notes: 'Arsip 12 LUT kalibrasi warna standar gereja.',
  },

  // Inside FLD-03: Aset Grafis & Bumper
  {
    id: 'FILE-08',
    parentId: 'FLD-03',
    name: 'LowerThird_Speaker_Template_2026.png',
    kind: 'image',
    extension: 'PNG',
    sizeBytes: Math.round(4.6 * MB),
    owner: 'Tim Desain',
    updatedAt: '16 Nov 2026',
    updatedTimestamp: 1794810000000,
    starred: true,
    shared: true,
    trashed: false,
    theme: 'mint',
    tags: ['Lower Third', 'PNG'],
    notes: 'Overlay transparan nama pembicara resolusi 1920x1080.',
  },
  {
    id: 'FILE-09',
    parentId: 'FLD-03',
    name: 'LED_Wall_Loop_Wide_3840x1080.mp4',
    kind: 'video',
    extension: 'MP4',
    sizeBytes: Math.round(312 * MB),
    owner: 'Tim Desain',
    updatedAt: '11 Nov 2026',
    updatedTimestamp: 1794390000000,
    starred: false,
    shared: true,
    trashed: false,
    theme: 'coral',
    tags: ['LED', 'Motion Loop'],
    notes: 'Background animasi seamless untuk layar LED wide panggung.',
  },

  // Inside FLD-04: Audio & Multitrack
  {
    id: 'FILE-10',
    parentId: 'FLD-04',
    name: 'Ambient_Pad_Warm_G_Major.wav',
    kind: 'audio',
    extension: 'WAV',
    sizeBytes: Math.round(118 * MB),
    owner: 'Tim Audio',
    updatedAt: '14 Nov 2026',
    updatedTimestamp: 1794640000000,
    starred: false,
    shared: false,
    trashed: false,
    theme: 'peach',
    tags: ['Pad', 'Worship'],
    notes: 'Loop ambient pad 24-bit 48kHz untuk transisi doa.',
  },

  // Inside FLD-05: Dokumen & SOP
  {
    id: 'FILE-11',
    parentId: 'FLD-05',
    name: 'SOP_Control_Room_Multimedia_v2.pdf',
    kind: 'document',
    extension: 'PDF',
    sizeBytes: Math.round(5.1 * MB),
    owner: 'Divisi Teknis',
    updatedAt: '13 Nov 2026',
    updatedTimestamp: 1794550000000,
    starred: true,
    shared: true,
    trashed: false,
    theme: 'periwinkle',
    tags: ['SOP', 'Control Room'],
    notes: 'Panduan lengkap penyalaan perangkat, routing SDI/NDI, dan troubleshooting.',
  },
  {
    id: 'FILE-12',
    parentId: 'FLD-05',
    name: 'Inventaris_HDD_Arsip_Q4_2026.pdf',
    kind: 'document',
    extension: 'PDF',
    sizeBytes: Math.round(1.9 * MB),
    owner: 'Sekretariat Multimedia',
    updatedAt: '10 Nov 2026',
    updatedTimestamp: 1794300000000,
    starred: false,
    shared: true,
    trashed: false,
    theme: 'periwinkle',
    tags: ['HDD', 'Inventaris'],
    notes: 'Rekap penomoran harddisk eksternal dan daftar arsip per kuartal.',
  },

  // 1 sample item in Trash so Trash view is immediately demonstrable
  {
    id: 'FILE-13',
    parentId: 'FLD-02',
    name: 'Draft_Bumper_Old_Render_v1.mp4',
    kind: 'video',
    extension: 'MP4',
    sizeBytes: Math.round(215 * MB),
    owner: 'Tim Editing',
    updatedAt: '06 Nov 2026',
    updatedTimestamp: 1793960000000,
    starred: false,
    shared: false,
    trashed: true,
    theme: 'coral',
    tags: ['Draft', 'Old'],
    notes: 'Versi render lama yang sudah digantikan final bumper.',
  },
];

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, idx);
  return `${val >= 100 || idx === 0 ? Math.round(val) : val.toFixed(1)} ${units[idx]}`;
}

export function inferFileKindFromName(fileName: string): {
  kind: FileEntryKind;
  extension: string;
  theme: PastelThemeKey;
} {
  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  if (['MP4', 'MOV', 'MKV', 'AVI', 'WEBM', 'PRPROJ'].includes(ext)) {
    return { kind: 'video', extension: ext, theme: 'coral' };
  }
  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'GIF', 'PSD', 'AI'].includes(ext)) {
    return { kind: 'image', extension: ext, theme: 'mint' };
  }
  if (['WAV', 'MP3', 'AAC', 'FLAC', 'M4A', 'OGG'].includes(ext)) {
    return { kind: 'audio', extension: ext, theme: 'peach' };
  }
  if (['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'CSV', 'MD'].includes(ext)) {
    return { kind: 'document', extension: ext, theme: 'periwinkle' };
  }
  if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(ext)) {
    return { kind: 'archive', extension: ext, theme: 'peach' };
  }
  return { kind: 'other', extension: ext, theme: 'periwinkle' };
}
