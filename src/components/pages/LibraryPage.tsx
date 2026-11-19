import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Eye,
  BookOpen,
  FileText,
  Video,
  Share2,
  AppWindow,
  Play,
  RotateCcw,
  Trash2,
  Edit3,
  X,
  Layers,
  Tag,
  ExternalLink,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PASTEL_THEMES } from '../../constants/theme';
import {
  ACTION_BTN_PRIMARY,
  ACTION_BTN_SECONDARY,
  ACTION_BTN_SOFT_PRIMARY,
} from '../../constants/buttonStyles';
import { PastelThemeKey } from '../../types';
import {
  INITIAL_LIBRARY_ITEMS,
  LibraryItem,
  LibraryItemType,
} from '../../data/librarySeed';
import { CustomSelect } from '../ui/CustomSelect';
import { SplitFilterButton } from '../ui/SplitFilterButton';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';

const STORAGE_KEY = 'multimedia_library_items_v1';

const TYPE_META: Record<
  LibraryItemType,
  {
    label: string;
    badgeLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    iconStyle: string;
    defaultTheme: PastelThemeKey;
    actionLabel: string;
  }
> = {
  article: {
    label: 'Artikel',
    badgeLabel: 'ARTIKEL',
    icon: BookOpen,
    iconStyle: 'bg-[#FFECEB] text-[#942922]',
    defaultTheme: 'coral',
    actionLabel: 'Baca',
  },
  document: {
    label: 'Document',
    badgeLabel: 'DOCUMENT',
    icon: FileText,
    iconStyle: 'bg-[#F0EFFC] text-[#3F3B99]',
    defaultTheme: 'periwinkle',
    actionLabel: 'Baca',
  },
  video: {
    label: 'Video',
    badgeLabel: 'VIDEO',
    icon: Video,
    iconStyle: 'bg-[#FEF1F5] text-[#ee2e65]',
    defaultTheme: 'coral',
    actionLabel: 'Putar',
  },
  share: {
    label: 'Share',
    badgeLabel: 'SHARE',
    icon: Share2,
    iconStyle: 'bg-[#E6F9F0] text-[#146C43]',
    defaultTheme: 'mint',
    actionLabel: 'Buka',
  },
  app: {
    label: 'App',
    badgeLabel: 'APP',
    icon: AppWindow,
    iconStyle: 'bg-[#FFF5E6] text-[#8C5811]',
    defaultTheme: 'peach',
    actionLabel: 'Buka',
  },
};

const VALID_TYPE_SET = new Set<string>(['article', 'document', 'video', 'share', 'app']);

interface LibraryFormState {
  title: string;
  category: string;
  type: LibraryItemType;
  formatLabel: string;
  sourceInfo: string;
  author: string;
  url: string;
  summary: string;
  content: string;
  tagsText: string;
}

const createEmptyForm = (defaultType: LibraryItemType = 'article'): LibraryFormState => ({
  title: '',
  category: 'Church Life',
  type: defaultType,
  formatLabel:
    defaultType === 'article'
      ? 'Artikel'
      : defaultType === 'document'
      ? 'PDF'
      : defaultType === 'video'
      ? 'MP4'
      : defaultType === 'share'
      ? 'Shared Link'
      : 'Web App',
  sourceInfo: '',
  author: 'Rasengan',
  url: '',
  summary: '',
  content: '',
  tagsText: '',
});

export const LibraryPage: React.FC = () => {
  const { activeModulePage, setActiveModulePage, triggerToast } = useApp();

  const [items, setItems] = useState<LibraryItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_LIBRARY_ITEMS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as LibraryItem[];
        }
      }
    } catch {
      // fallback to seed
    }
    return INITIAL_LIBRARY_ITEMS;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage quota errors
    }
  }, [items]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'type'>('latest');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Detail modal
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [formState, setFormState] = useState<LibraryFormState>(() => createEmptyForm('article'));

  const selectedTypeFilter: 'All' | LibraryItemType = VALID_TYPE_SET.has(activeModulePage)
    ? (activeModulePage as LibraryItemType)
    : 'All';

  const handleTypeFilterChange = (val: string) => {
    if (val === 'All') {
      setActiveModulePage('main');
    } else if (VALID_TYPE_SET.has(val)) {
      setActiveModulePage(val);
    }
  };

  const {
    setSheetElement: setDetailSheetEl,
    backdropRef: detailBackdropRef,
    animateClose: animateCloseDetail,
    sheetGestureProps: detailGestureProps,
  } = useBottomSheetMotion({
    onClose: () => setSelectedItem(null),
  });

  const {
    setSheetElement: setFormSheetEl,
    backdropRef: formBackdropRef,
    animateClose: animateCloseForm,
    sheetGestureProps: formGestureProps,
  } = useBottomSheetMotion({
    onClose: () => {
      setIsFormOpen(false);
      setEditingItem(null);
    },
  });

  const categoryOptions = useMemo(() => {
    const uniqueCats = Array.from(new Set(items.map((item) => item.category))).sort((a, b) =>
      a.localeCompare(b)
    );
    return [
      { value: 'All', label: 'Semua Kategori', mobileLabel: 'Semua' },
      ...uniqueCats.map((cat) => ({
        value: cat,
        label: cat,
        mobileLabel: cat.split(' ')[0],
      })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchesType = selectedTypeFilter === 'All' || item.type === selectedTypeFilter;
        const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.formatLabel.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q));
        return matchesType && matchesCat && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'type') return a.type.localeCompare(b.type);
        return 0;
      });
  }, [items, searchQuery, selectedCategory, selectedTypeFilter, sortBy]);

  const pageHeading =
    selectedTypeFilter === 'All'
      ? 'Daftar Library'
      : `Library · ${TYPE_META[selectedTypeFilter].label}`;

  const openAddModal = () => {
    setEditingItem(null);
    setFormState(
      createEmptyForm(selectedTypeFilter === 'All' ? 'article' : selectedTypeFilter)
    );
    setIsFormOpen(true);
  };

  const openEditModal = (item: LibraryItem) => {
    setConfirmDeleteId(null);
    setEditingItem(item);
    setFormState({
      title: item.title,
      category: item.category,
      type: item.type,
      formatLabel: item.formatLabel,
      sourceInfo: item.sourceInfo,
      author: item.author,
      url: item.url || '',
      summary: item.summary,
      content: item.content || '',
      tagsText: item.tags.join(', '),
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formState.title.trim();
    if (!cleanTitle) {
      triggerToast('Judul Wajib Diisi', 'Masukkan judul konten library terlebih dahulu.', 'warning');
      return;
    }

    const parsedTags = formState.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const todayLabel = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const theme = TYPE_META[formState.type].defaultTheme;

    if (editingItem) {
      const updatedItem: LibraryItem = {
        ...editingItem,
        title: cleanTitle,
        category: formState.category.trim() || 'Church Life',
        type: formState.type,
        formatLabel: formState.formatLabel.trim() || TYPE_META[formState.type].label,
        sourceInfo: formState.sourceInfo.trim() || 'Tersedia di App',
        author: formState.author.trim() || 'Rasengan',
        url: formState.url.trim() || undefined,
        summary: formState.summary.trim() || 'Konten library Multimedia.',
        content: formState.content.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : [TYPE_META[formState.type].label],
        theme,
        updatedAt: todayLabel,
      };
      setItems((prev) => prev.map((it) => (it.id === editingItem.id ? updatedItem : it)));
      if (selectedItem?.id === editingItem.id) {
        setSelectedItem(updatedItem);
      }
      triggerToast('Item Diperbarui', `"${updatedItem.title}" berhasil diperbarui.`, 'success');
    } else {
      const newItem: LibraryItem = {
        id: `LIB-${Date.now().toString().slice(-5)}`,
        title: cleanTitle,
        category: formState.category.trim() || 'Church Life',
        type: formState.type,
        formatLabel: formState.formatLabel.trim() || TYPE_META[formState.type].label,
        sourceInfo: formState.sourceInfo.trim() || 'Tersedia di App',
        author: formState.author.trim() || 'Rasengan',
        updatedAt: todayLabel,
        url: formState.url.trim() || undefined,
        summary: formState.summary.trim() || 'Konten library Multimedia.',
        content: formState.content.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : [TYPE_META[formState.type].label],
        theme,
      };
      setItems((prev) => [newItem, ...prev]);
      triggerToast('Item Ditambahkan', `"${newItem.title}" masuk ke Library.`, 'success');
    }

    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (item: LibraryItem) => {
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    setConfirmDeleteId(null);
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    }
    triggerToast('Item Dihapus', `"${item.title}" dihapus dari Library.`, 'info');
  };

  const handleCopyUrl = (item: LibraryItem) => {
    const valueToCopy = item.url || `${item.title} (${TYPE_META[item.type].label})`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(valueToCopy).catch(() => null);
    }
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((curr) => (curr === item.id ? null : curr)), 1800);
    triggerToast('Tersalin', 'Tautan / referensi konten berhasil disalin.', 'success');
  };

  const renderPrimaryAction = (item: LibraryItem, fullWidth = false) => {
    const meta = TYPE_META[item.type];
    const widthClass = fullWidth ? 'flex-1' : '';

    if (item.type === 'video') {
      return (
        <button
          type="button"
          onClick={() => setSelectedItem(item)}
          className={`${widthClass} ${ACTION_BTN_SOFT_PRIMARY}`}
        >
          <Play className="w-3.5 h-3.5 fill-[#9D113C] shrink-0" />
          <span>{meta.actionLabel}</span>
        </button>
      );
    }

    if (item.type === 'share' || item.type === 'app') {
      return (
        <button
          type="button"
          onClick={() => setSelectedItem(item)}
          className={`${widthClass} ${ACTION_BTN_SECONDARY}`}
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#6E717A] shrink-0" />
          <span>{meta.actionLabel}</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setSelectedItem(item)}
        className={`${widthClass} ${ACTION_BTN_SECONDARY}`}
      >
        <Eye className="w-4 h-4 text-[#6E717A] shrink-0" />
        <span>{meta.actionLabel}</span>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Header (Identik dengan Materials Servolution) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-black/[0.05]">
        <div className="hidden md:flex items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1D21]">
            {pageHeading}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C] text-[11.5px] font-bold tabular-nums">
            {filteredItems.length} Konten
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[180px]">
            <Search className="w-4 h-4 text-[#8A8D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari artikel, dokumen, video, app..."
              className="w-full sm:w-64 h-9 pl-9 pr-8 rounded-full border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] placeholder:text-[#8A8D98] outline-none focus:border-[#ee2e65]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8D98] hover:text-[#1C1D21] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button type="button" onClick={openAddModal} className={ACTION_BTN_PRIMARY}>
            <Plus className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Tambah</span>
            <span className="hidden sm:inline">Tambah Konten</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Identik dengan Materials Servolution) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SplitFilterButton
            value={selectedTypeFilter}
            onChange={handleTypeFilterChange}
            prefix="Tipe"
            icon={Layers}
            variant="primary"
            ariaLabel="Filter tipe konten library"
            options={[
              { value: 'All', label: 'Semua Tipe', mobileLabel: 'Semua' },
              { value: 'article', label: 'Artikel', mobileLabel: 'Artikel' },
              { value: 'document', label: 'Document', mobileLabel: 'Doc' },
              { value: 'video', label: 'Video', mobileLabel: 'Video' },
              { value: 'share', label: 'Share', mobileLabel: 'Share' },
              { value: 'app', label: 'App', mobileLabel: 'App' },
            ]}
          />

          <SplitFilterButton
            value={selectedCategory}
            onChange={setSelectedCategory}
            prefix="Kategori"
            icon={Tag}
            variant="surface"
            ariaLabel="Filter kategori library"
            options={categoryOptions}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as 'latest' | 'title' | 'type')}
            pill
            ariaLabel="Urutkan library"
            align="right"
            className="min-w-[152px]"
            triggerClassName="border-black/[0.08]"
            options={[
              { value: 'latest', label: 'Urut: Terbaru' },
              { value: 'title', label: 'Urut: Nama (A-Z)' },
              { value: 'type', label: 'Urut: Tipe Konten' },
            ]}
          />
        </div>
      </div>

      {/* Content Table / Mobile Hairline List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-black/[0.07] p-8">
          <Layers className="w-9 h-9 text-[#B4B6C1] mx-auto mb-3" />
          <h3 className="text-[15px] font-semibold text-[#1C1D21]">
            Tidak ada konten library yang sesuai
          </h3>
          <p className="text-[12.5px] text-[#8A8D98] max-w-sm mx-auto mt-1">
            Sesuaikan kata kunci pencarian atau ubah filter tipe dan kategori.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              handleTypeFilterChange('All');
            }}
            className={`mt-4 ${ACTION_BTN_PRIMARY}`}
          >
            <RotateCcw className="w-4 h-4 sm:hidden shrink-0" />
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">Reset Semua Filter</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table (Identik dengan Materials Servolution) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-black/[0.12] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD] border-b border-black/[0.08] text-[11px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                    <th className="py-3.5 px-5">Konten</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4">Tipe / Sumber</th>
                    <th className="py-3.5 px-4">Diperbarui</th>
                    <th className="py-3.5 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.08] text-[13px]">
                  {filteredItems.map((item) => {
                    const meta = TYPE_META[item.type];
                    const TypeIcon = meta.icon;
                    const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#FAFBFD] transition-colors group"
                      >
                        {/* Konten & Penulis */}
                        <td className="py-3.5 px-5 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${meta.iconStyle}`}
                              title={`${meta.actionLabel} ${meta.label}`}
                            >
                              <TypeIcon className="w-4 h-4" />
                            </button>

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setSelectedItem(item)}
                                className="font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors cursor-pointer text-left line-clamp-1"
                              >
                                {item.title}
                              </button>
                              <div className="text-[11.5px] text-[#8A8D98] truncate mt-0.5 max-w-[420px]">
                                {item.author} · {item.summary}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full ${theme.bg} ${theme.text} text-[11.5px] font-semibold`}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Tipe / Sumber */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2 text-[12px] text-[#6E717A] tabular-nums">
                            <span
                              className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10.5px] font-bold tracking-wide uppercase`}
                            >
                              {meta.badgeLabel}
                            </span>
                            <span className="truncate max-w-[165px]">
                              {item.formatLabel} · {item.sourceInfo}
                            </span>
                          </div>
                        </td>

                        {/* Diperbarui & Tag */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="space-y-0.5 tabular-nums">
                            <div className="text-[12.5px] font-semibold text-[#1C1D21]">
                              {item.updatedAt}
                            </div>
                            <div className="text-[11px] text-[#8A8D98] truncate max-w-[160px]">
                              {item.tags.slice(0, 2).join(' · ')}
                            </div>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {renderPrimaryAction(item)}

                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit Konten"
                              aria-label="Edit Konten"
                              className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] text-[#6E717A] hover:text-[#1C1D21] inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {confirmDeleteId === item.id ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="h-9 px-3 rounded-full bg-[#FFECEB] hover:bg-[#FAD2CF] text-[#942922] text-[12px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Hapus?</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                title="Hapus Konten"
                                aria-label="Hapus Konten"
                                className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FFECEB] text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View: Unified Clean Hairline List (Identik dengan Materials Servolution) */}
          <div className="md:hidden bg-white rounded-2xl border border-black/[0.12] divide-y divide-black/[0.08] overflow-hidden">
            {filteredItems.map((item) => {
              const meta = TYPE_META[item.type];
              const TypeIcon = meta.icon;
              const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;

              return (
                <div key={item.id} className="p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.iconStyle}`}
                      >
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[14px] text-[#1C1D21] line-clamp-2">
                          {item.title}
                        </h4>
                        <div className="text-[11.5px] text-[#8A8D98] mt-0.5 truncate">
                          {item.category} · {item.formatLabel} · {item.sourceInfo}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10px] font-bold uppercase shrink-0`}
                    >
                      {meta.badgeLabel}
                    </span>
                  </div>

                  <p className="text-[12px] text-[#5A5D67] line-clamp-2">{item.summary}</p>

                  <div className="flex items-center justify-between text-[11px] text-[#8A8D98] tabular-nums">
                    <span>{item.author}</span>
                    <span>{item.updatedAt}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    {renderPrimaryAction(item, true)}

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      title="Edit Konten"
                      aria-label="Edit Konten"
                      className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] text-[#6E717A] hover:text-[#1C1D21] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {confirmDeleteId === item.id ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="h-9 px-3 rounded-full bg-[#FFECEB] hover:bg-[#FAD2CF] text-[#942922] text-[12px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Hapus?</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        title="Hapus Konten"
                        aria-label="Hapus Konten"
                        className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FFECEB] text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail Preview Modal */}
      {selectedItem &&
        createPortal(
          <div
            ref={detailBackdropRef}
            data-modal-sheet-backdrop="true"
            className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end md:items-center justify-center md:p-4"
          >
            <div
              ref={setDetailSheetEl}
              {...detailGestureProps}
              className="w-full md:max-w-xl bg-white rounded-t-[28px] md:rounded-[28px] p-5 sm:p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 shadow-2xl border border-black/[0.10] max-h-[86vh] flex flex-col animate-bottom-sheet md:animate-ui-pop"
            >
              <div
                data-sheet-handle="true"
                className="flex md:hidden justify-center py-2 -mt-3 mb-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
              >
                <div className="w-10 h-1 bg-black/20 rounded-full" />
              </div>

              {(() => {
                const meta = TYPE_META[selectedItem.type];
                const TypeIcon = meta.icon;
                const theme = PASTEL_THEMES[selectedItem.theme] || PASTEL_THEMES.periwinkle;
                const isCopied = copiedId === selectedItem.id;

                return (
                  <>
                    <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/[0.08] shrink-0">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.iconStyle}`}
                        >
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10px] font-bold uppercase`}
                            >
                              {meta.badgeLabel}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full ${theme.bg} ${theme.text} text-[11px] font-semibold`}
                            >
                              {selectedItem.category}
                            </span>
                          </div>
                          <h2 className="text-[17px] font-semibold text-[#1C1D21] leading-snug">
                            {selectedItem.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[#8A8D98] mt-1 tabular-nums">
                            <span>{selectedItem.author}</span>
                            <span>·</span>
                            <span>
                              {selectedItem.formatLabel} ({selectedItem.sourceInfo})
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {selectedItem.updatedAt}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={animateCloseDetail}
                        aria-label="Tutup detail"
                        className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center text-[#6E717A] shrink-0 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="overflow-y-auto ui-scrollbar py-4 space-y-4 overscroll-contain">
                      <p className="text-[13.5px] font-medium text-[#1C1D21] leading-relaxed">
                        {selectedItem.summary}
                      </p>

                      {selectedItem.content && (
                        <div className="p-4 rounded-2xl bg-[#FAFBFD] border border-black/[0.06] text-[13px] text-[#4B4E57] leading-relaxed whitespace-pre-line">
                          {selectedItem.content}
                        </div>
                      )}

                      {selectedItem.url && (
                        <div className="p-3.5 rounded-2xl bg-[#F4F5F8] border border-black/[0.06] flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#646772]">
                              Tautan {meta.label}
                            </div>
                            <div className="text-[12.5px] font-medium text-[#1C1D21] truncate mt-0.5">
                              {selectedItem.url}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(selectedItem)}
                            className={ACTION_BTN_SECONDARY}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#146C43]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#6E717A]" />
                            )}
                            <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        </div>
                      )}

                      {selectedItem.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {selectedItem.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-full bg-[#F4F5F8] text-[#5A5D67] text-[11px] font-semibold"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-black/[0.08] flex items-center justify-between gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedItem;
                          setSelectedItem(null);
                          openEditModal(target);
                        }}
                        className={ACTION_BTN_SECONDARY}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#6E717A]" />
                        <span>Edit</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(selectedItem)}
                          className={ACTION_BTN_SECONDARY}
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#6E717A]" />
                          <span>Bagikan</span>
                        </button>
                        <button
                          type="button"
                          onClick={animateCloseDetail}
                          className={ACTION_BTN_PRIMARY}
                        >
                          <span>Selesai</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

      {/* Add / Edit Library Item Modal */}
      {isFormOpen &&
        createPortal(
          <div
            ref={formBackdropRef}
            data-modal-sheet-backdrop="true"
            className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end md:items-center justify-center md:p-4"
          >
            <form
              ref={setFormSheetEl as unknown as React.Ref<HTMLFormElement>}
              {...formGestureProps}
              onSubmit={handleSaveForm}
              className="w-full md:max-w-lg bg-white rounded-t-[28px] md:rounded-[28px] p-5 sm:p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 shadow-2xl border border-black/[0.10] max-h-[88vh] flex flex-col animate-bottom-sheet md:animate-ui-pop"
            >
              <div
                data-sheet-handle="true"
                className="flex md:hidden justify-center py-2 -mt-3 mb-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
              >
                <div className="w-10 h-1 bg-black/20 rounded-full" />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-black/[0.08] shrink-0">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#1C1D21]">
                    {editingItem ? 'Edit Konten Library' : 'Tambah Konten Library'}
                  </h2>
                  <p className="text-[12px] text-[#646772] mt-0.5">
                    Simpan artikel, document, video, tautan share, atau app ke tabel Library.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={animateCloseForm}
                  aria-label="Tutup form"
                  className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center text-[#6E717A] shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto ui-scrollbar py-4 space-y-3.5 overscroll-contain">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">
                    Judul Konten *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Contoh: Panduan Lighting Ibadah Minggu"
                    className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#1C1D21]">Tipe Konten</label>
                    <CustomSelect
                      value={formState.type}
                      onChange={(val) => {
                        const nextType = val as LibraryItemType;
                        setFormState((s) => ({
                          ...s,
                          type: nextType,
                          formatLabel:
                            nextType === 'article'
                              ? 'Artikel'
                              : nextType === 'document'
                              ? 'PDF'
                              : nextType === 'video'
                              ? 'MP4'
                              : nextType === 'share'
                              ? 'Shared Link'
                              : 'Web App',
                        }));
                      }}
                      ariaLabel="Pilih tipe konten"
                      className="w-full"
                      triggerClassName="w-full h-10 rounded-xl border-black/[0.12]"
                      options={[
                        { value: 'article', label: 'Artikel' },
                        { value: 'document', label: 'Document' },
                        { value: 'video', label: 'Video' },
                        { value: 'share', label: 'Share' },
                        { value: 'app', label: 'App' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#1C1D21]">Kategori</label>
                    <input
                      type="text"
                      value={formState.category}
                      onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
                      placeholder="Church Life / Produksi Multimedia"
                      className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#1C1D21]">Format</label>
                    <input
                      type="text"
                      value={formState.formatLabel}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, formatLabel: e.target.value }))
                      }
                      placeholder="PDF, MP4, Web App, Google Drive..."
                      className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#1C1D21]">
                      Info Ukuran / Durasi
                    </label>
                    <input
                      type="text"
                      value={formState.sourceInfo}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, sourceInfo: e.target.value }))
                      }
                      placeholder="5 mnt baca / 2.4 MB / 12:30"
                      className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#1C1D21]">
                      Penulis / Pemilik
                    </label>
                    <input
                      type="text"
                      value={formState.author}
                      onChange={(e) => setFormState((s) => ({ ...s, author: e.target.value }))}
                      placeholder="Nama penulis atau tim"
                      className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#1C1D21]">
                      URL / Link (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formState.url}
                      onChange={(e) => setFormState((s) => ({ ...s, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">Ringkasan</label>
                  <textarea
                    rows={2}
                    value={formState.summary}
                    onChange={(e) => setFormState((s) => ({ ...s, summary: e.target.value }))}
                    placeholder="Deskripsi singkat konten yang muncul di tabel..."
                    className="w-full p-3 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65] resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">
                    Isi / Catatan Lengkap (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={formState.content}
                    onChange={(e) => setFormState((s) => ({ ...s, content: e.target.value }))}
                    placeholder="Catatan detail, isi artikel, atau instruksi penggunaan..."
                    className="w-full p-3 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65] resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">
                    Tag (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={formState.tagsText}
                    onChange={(e) => setFormState((s) => ({ ...s, tagsText: e.target.value }))}
                    placeholder="Worship, SOP, Camera"
                    className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.08] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={animateCloseForm}
                  className={ACTION_BTN_SECONDARY}
                >
                  Batal
                </button>
                <button type="submit" className={ACTION_BTN_PRIMARY}>
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambah ke Library'}</span>
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
};
