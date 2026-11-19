import { PastelThemeKey } from '../types';

export type LibraryItemType = 'article' | 'document' | 'video' | 'share' | 'app';

export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  type: LibraryItemType;
  formatLabel: string;
  sourceInfo: string;
  author: string;
  updatedAt: string;
  url?: string;
  summary: string;
  content?: string;
  tags: string[];
  theme: PastelThemeKey;
}

export const INITIAL_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'LIB-01',
    title: 'Panduan Etika Pelayanan & Komunikasi Tim Multimedia',
    category: 'Church Life',
    type: 'article',
    formatLabel: 'Artikel',
    sourceInfo: '6 mnt baca',
    author: 'Tim Pastoral',
    updatedAt: '18 Nov 2026',
    summary:
      'Prinsip pelayanan hati hamba, koordinasi lintas divisi saat ibadah, serta standar komunikasi sebelum dan sesudah pelayanan.',
    content:
      'Pelayanan multimedia bukan sekadar mengoperasikan kamera atau switcher, melainkan membantu jemaat mengalami hadirat Tuhan tanpa distraksi teknis. Setiap crew diharapkan hadir 45 menit sebelum briefing, menjaga komunikasi intercom tetap singkat dan sopan, serta saling mendukung saat terjadi kendala di lapangan.',
    tags: ['Budaya Tim', 'Pelayanan', 'Briefing'],
    theme: 'coral',
  },
  {
    id: 'LIB-02',
    title: 'Menyiapkan Transisi Ibadah yang Mengalir & Konsisten',
    category: 'Ibadah & Liturgi',
    type: 'article',
    formatLabel: 'Artikel',
    sourceInfo: '4 mnt baca',
    author: 'Rachel Wijaya',
    updatedAt: '15 Nov 2026',
    summary:
      'Ringkasan praktik terbaik menyelaraskan cue lighting, lirik layar, dan perpindahan kamera pada momen praise & worship.',
    content:
      'Kunci transisi yang halus terletak pada kesiapan rundown sebelum soundcheck dimulai. Pastikan operator ProPresenter, camera director, dan audio engineer memakai penanda waktu cue yang seragam agar setiap perpindahan lagu maupun firman berjalan natural.',
    tags: ['Worship', 'Cue Sheet', 'Liturgi'],
    theme: 'coral',
  },
  {
    id: 'LIB-03',
    title: 'SOP Operasional Ruang Kontrol & Checklist Ibadah Minggu',
    category: 'Produksi Multimedia',
    type: 'document',
    formatLabel: 'PDF',
    sourceInfo: '2.8 MB · 14 Hal',
    author: 'Divisi Teknis',
    updatedAt: '17 Nov 2026',
    summary:
      'Dokumen prosedur lengkap mulai dari power-up rack video, pengecekan sinyal SDI/NDI, hingga shutdown aman pasca ibadah.',
    content:
      'Mencakup daftar periksa pra-ibadah (H-90 menit), urutan penyalaan perangkat switcher ATEM, router video, perekaman HyperDeck, serta protokol backup streaming bila koneksi utama mengalami gangguan.',
    tags: ['SOP', 'Control Room', 'Checklist'],
    theme: 'periwinkle',
  },
  {
    id: 'LIB-04',
    title: 'Template Rundown Ibadah Raya & Event Khusus',
    category: 'Ibadah & Liturgi',
    type: 'document',
    formatLabel: 'DOCX',
    sourceInfo: '840 KB · Template',
    author: 'Sekretariat Multimedia',
    updatedAt: '12 Nov 2026',
    summary:
      'Format baku cue sheet dan rundown acara gereja lengkap dengan kolom audio, visual LED, kamera, dan stage manager.',
    content:
      'Gunakan template ini untuk setiap ibadah minggu, ibadah pemuda, maupun konferensi gereja. Kolom durasi, penanggung jawab, dan catatan teknis sudah disusun agar mudah dibaca cepat oleh seluruh operator.',
    tags: ['Rundown', 'Template', 'Event'],
    theme: 'periwinkle',
  },
  {
    id: 'LIB-05',
    title: 'Teknik Framing & Pergerakan Kamera untuk Ibadah Live',
    category: 'Produksi Multimedia',
    type: 'video',
    formatLabel: 'MP4',
    sourceInfo: '14:25 · 1080p',
    author: 'Daniel Pratama',
    updatedAt: '16 Nov 2026',
    summary:
      'Video tutorial praktis komposisi rule-of-thirds, headroom pembicara, dan transisi pan/tilt yang halus saat live camera.',
    content:
      'Membahas pengaturan tripod drag, titik fokus pada worship leader dan pengkhotbah, serta cara menghindari gerakan mendadak saat kamera sedang on-air (tally merah aktif).',
    tags: ['Camera', 'Framing', 'Tutorial'],
    theme: 'coral',
  },
  {
    id: 'LIB-06',
    title: 'Recap Worship Night & Bedah Setup Lighting Panggung',
    category: 'Church Life',
    type: 'video',
    formatLabel: 'MP4',
    sourceInfo: '09:40 · 4K',
    author: 'Tim Kreatif',
    updatedAt: '10 Nov 2026',
    summary:
      'Dokumentasi di balik layar pengaturan warna lighting, sinkronisasi visual LED wall, dan evaluasi hasil siaran langsung.',
    content:
      'Cocok ditonton bersama saat evaluasi mingguan tim untuk mempelajari keseimbangan exposure kamera terhadap kecerahan layar LED panggung.',
    tags: ['Behind The Scene', 'Lighting', 'LED'],
    theme: 'coral',
  },
  {
    id: 'LIB-07',
    title: 'Folder Aset Bumper, Lower Third & Motion Background 2026',
    category: 'Aset & Media',
    type: 'share',
    formatLabel: 'Shared Drive',
    sourceInfo: 'Google Drive · 18 File',
    author: 'Tim Desain',
    updatedAt: '18 Nov 2026',
    url: 'https://drive.google.com',
    summary:
      'Kumpulan aset grafis siap pakai untuk bumper pengumuman, lower third pembicara, serta loop background ibadah terbaru.',
    content:
      'Berisi versi resolusi 1920x1080 dan 3840x1080 (wide LED) lengkap dengan panduan penggunaan font dan batas safe-area teks.',
    tags: ['Motion', 'Lower Third', 'Shared'],
    theme: 'mint',
  },
  {
    id: 'LIB-08',
    title: 'Kumpulan LUT Warna Kamera Sony FX30 & Blackmagic',
    category: 'Aset & Media',
    type: 'share',
    formatLabel: 'Link Share',
    sourceInfo: 'Cloud Package · 12 LUT',
    author: 'Tim Editing',
    updatedAt: '11 Nov 2026',
    url: 'https://cloud.multimedia.local/luts',
    summary:
      'Paket LUT kalibrasi warna standar gereja agar tone kulit dan pencahayaan panggung seragam di seluruh kamera dan hasil edit.',
    content:
      'Tersedia preset untuk S-Log3 dan Blackmagic Film Gen 5 beserta panduan singkat pemasangan di DaVinci Resolve maupun Premiere Pro.',
    tags: ['Color Grading', 'LUT', 'Editing'],
    theme: 'mint',
  },
  {
    id: 'LIB-09',
    title: 'Companion Stream Deck & Preset Switcher ATEM',
    category: 'Tools & App',
    type: 'app',
    formatLabel: 'Desktop App',
    sourceInfo: 'v3.4 · macOS / Win',
    author: 'Tim Development',
    updatedAt: '14 Nov 2026',
    url: 'https://bitfocus.io/companion',
    summary:
      'Aplikasi kontrol makro Stream Deck lengkap dengan konfigurasi tombol preset kamera, macro bumper, dan routing audio.',
    content:
      'Dilengkapi file konfigurasi .companionconfig terbaru untuk meja switcher utama. Pastikan IP ATEM sesuai daftar jaringan control room sebelum import.',
    tags: ['ATEM', 'Stream Deck', 'Control'],
    theme: 'peach',
  },
  {
    id: 'LIB-10',
    title: 'Stage Timer & Countdown Monitor Ibadah',
    category: 'Tools & App',
    type: 'app',
    formatLabel: 'Web App',
    sourceInfo: 'Browser · Live Sync',
    author: 'Tim Development',
    updatedAt: '09 Nov 2026',
    url: 'https://stagetimer.io',
    summary:
      'Aplikasi penunjuk waktu khotbah dan pesan cue panggung secara real-time untuk monitor confidence di depan mimbar.',
    content:
      'Memudahkan produser mengirim pesan singkat ke pembicara atau worship leader serta mengatur hitung mundur sesi ibadah secara tersinkronisasi.',
    tags: ['Timer', 'Stage Monitor', 'Web App'],
    theme: 'peach',
  },
];
