import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Folder,
  FolderPlus,
  Upload,
  Search,
  X,
  FileText,
  Video,
  Image as ImageIcon,
  Music,
  Archive,
  File,
  Star,
  Share2,
  Trash2,
  RotateCcw,
  Edit3,
  ChevronRight,
  ArrowUp,
  LayoutList,
  LayoutGrid,
  Layers,
  Eye,
  FolderInput,
  Download,
  Copy,
  Check,
  HardDrive,
  Clock,
  FolderOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PASTEL_THEMES } from '../../constants/theme';
import {
  ACTION_BTN_DANGER_SOFT,
  ACTION_BTN_PRIMARY,
  ACTION_BTN_SECONDARY,
  ACTION_BTN_SOFT_PRIMARY,
} from '../../constants/buttonStyles';
import {
  FileEntryKind,
  FileManagerEntry,
  INITIAL_FILE_MANAGER_ENTRIES,
  formatFileSize,
  inferFileKindFromName,
} from '../../data/fileManagerSeed';
import { CustomSelect } from '../ui/CustomSelect';
import { SplitFilterButton } from '../ui/SplitFilterButton';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';

const STORAGE_KEY = 'multimedia_file_manager_v1';

const KIND_META: Record<
  FileEntryKind,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconStyle: string;
  }
> = {
  folder: {
    label: 'Folder',
    icon: Folder,
    iconStyle: 'bg-[#FFF5E6] text-[#8C5811]',
  },
  video: {
    label: 'Video',
    icon: Video,
    iconStyle: 'bg-[#FEF1F5] text-[#ee2e65]',
  },
  document: {
    label: 'Dokumen',
    icon: FileText,
    iconStyle: 'bg-[#F0EFFC] text-[#3F3B99]',
  },
  image: {
    label: 'Gambar',
    icon: ImageIcon,
    iconStyle: 'bg-[#E6F9F0] text-[#146C43]',
  },
  audio: {
    label: 'Audio',
    icon: Music,
    iconStyle: 'bg-[#FFF5E6] text-[#8C5811]',
  },
  archive: {
    label: 'Arsip',
    icon: Archive,
    iconStyle: 'bg-[#FFECEB] text-[#942922]',
  },
  other: {
    label: 'File',
    icon: File,
    iconStyle: 'bg-[#F4F5F8] text-[#5A5D67]',
  },
};

export const FileManagerPage: React.FC = () => {
  const { activeModulePage, setActiveModulePage, triggerToast } = useApp();

  const [entries, setEntries] = useState<FileManagerEntry[]>(() => {
    if (typeof window === 'undefined') return INITIAL_FILE_MANAGER_ENTRIES;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as FileManagerEntry[];
        }
      }
    } catch {
      // fallback to seed
    }
    return INITIAL_FILE_MANAGER_ENTRIES;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore storage quota errors
    }
  }, [entries]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'All' | FileEntryKind>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'name' | 'size' | 'kind'>('latest');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Inline delete confirmation
  const [confirmPermanentDeleteId, setConfirmPermanentDeleteId] = useState<string | null>(null);

  // Modals
  const [selectedEntry, setSelectedEntry] = useState<FileManagerEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNotes, setNewFolderNotes] = useState('');

  const [editingEntry, setEditingEntry] = useState<FileManagerEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string>('__root__');
  const [editNotes, setEditNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    setSheetElement: setDetailSheetEl,
    backdropRef: detailBackdropRef,
    animateClose: animateCloseDetail,
    sheetGestureProps: detailGestureProps,
  } = useBottomSheetMotion({
    onClose: () => setSelectedEntry(null),
  });

  const {
    setSheetElement: setFolderSheetEl,
    backdropRef: folderBackdropRef,
    animateClose: animateCloseFolder,
    sheetGestureProps: folderGestureProps,
  } = useBottomSheetMotion({
    onClose: () => setIsNewFolderOpen(false),
  });

  const {
    setSheetElement: setEditSheetEl,
    backdropRef: editBackdropRef,
    animateClose: animateCloseEdit,
    sheetGestureProps: editGestureProps,
  } = useBottomSheetMotion({
    onClose: () => setEditingEntry(null),
  });

  // Reset folder path if user switches away from All Files
  useEffect(() => {
    if (activeModulePage !== 'main') {
      setCurrentFolderId(null);
    }
  }, [activeModulePage]);

  // Compute live recursive folder stats (item count & total bytes)
  const folderStatsMap = useMemo(() => {
    const map = new Map<string, { directItems: number; totalBytes: number }>();
    const activeEntries = entries.filter((e) => !e.trashed);

    const childrenByParent = new Map<string | null, FileManagerEntry[]>();
    activeEntries.forEach((item) => {
      const list = childrenByParent.get(item.parentId) || [];
      list.push(item);
      childrenByParent.set(item.parentId, list);
    });

    const computeBytes = (folderId: string, visited = new Set<string>()): number => {
      if (visited.has(folderId)) return 0;
      visited.add(folderId);
      const children = childrenByParent.get(folderId) || [];
      return children.reduce((sum, child) => {
        if (child.kind === 'folder') {
          return sum + computeBytes(child.id, visited);
        }
        return sum + child.sizeBytes;
      }, 0);
    };

    activeEntries
      .filter((e) => e.kind === 'folder')
      .forEach((folder) => {
        const directChildren = childrenByParent.get(folder.id) || [];
        map.set(folder.id, {
          directItems: directChildren.length,
          totalBytes: computeBytes(folder.id),
        });
      });

    return map;
  }, [entries]);

  // Live KPI metrics derived directly from entries
  const storageStats = useMemo(() => {
    const active = entries.filter((e) => !e.trashed);
    const activeFiles = active.filter((e) => e.kind !== 'folder');
    const activeFolders = active.filter((e) => e.kind === 'folder');
    const totalBytes = activeFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
    const videoBytes = activeFiles
      .filter((f) => f.kind === 'video')
      .reduce((sum, f) => sum + f.sizeBytes, 0);
    const docBytes = activeFiles
      .filter((f) => f.kind === 'document')
      .reduce((sum, f) => sum + f.sizeBytes, 0);
    const mediaOtherBytes = Math.max(0, totalBytes - videoBytes - docBytes);

    return {
      totalFiles: activeFiles.length,
      totalFolders: activeFolders.length,
      totalBytes,
      sharedCount: active.filter((e) => e.shared).length,
      starredCount: active.filter((e) => e.starred).length,
      trashedCount: entries.filter((e) => e.trashed).length,
      videoPct: totalBytes > 0 ? Math.round((videoBytes / totalBytes) * 100) : 0,
      docPct: totalBytes > 0 ? Math.round((docBytes / totalBytes) * 100) : 0,
      otherPct: totalBytes > 0 ? Math.round((mediaOtherBytes / totalBytes) * 100) : 0,
    };
  }, [entries]);

  // Breadcrumb path for current folder
  const folderBreadcrumbs = useMemo(() => {
    const chain: FileManagerEntry[] = [];
    let cursorId = currentFolderId;
    const guard = new Set<string>();
    while (cursorId && !guard.has(cursorId)) {
      guard.add(cursorId);
      const found = entries.find((e) => e.id === cursorId && !e.trashed);
      if (!found) break;
      chain.unshift(found);
      cursorId = found.parentId;
    }
    return chain;
  }, [currentFolderId, entries]);

  const getFolderPathLabel = (parentId: string | null): string => {
    if (!parentId) return 'Root';
    const names: string[] = [];
    let cursorId: string | null = parentId;
    const guard = new Set<string>();
    while (cursorId && !guard.has(cursorId)) {
      guard.add(cursorId);
      const found = entries.find((e) => e.id === cursorId);
      if (!found) break;
      names.unshift(found.name);
      cursorId = found.parentId;
    }
    return names.length > 0 ? `Root / ${names.join(' / ')}` : 'Root';
  };

  // Filtered entries according to active sidebar view, folder, search & filter
  const visibleEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let base: FileManagerEntry[] = [];
    if (activeModulePage === 'trash') {
      base = entries.filter((e) => e.trashed);
    } else if (activeModulePage === 'starred') {
      base = entries.filter((e) => !e.trashed && e.starred);
    } else if (activeModulePage === 'shared') {
      base = entries.filter((e) => !e.trashed && e.shared);
    } else if (activeModulePage === 'recent') {
      base = entries.filter((e) => !e.trashed && e.kind !== 'folder');
    } else {
      // 'main' (All Files): if searching, search globally across all active entries; otherwise browse current folder
      base = q
        ? entries.filter((e) => !e.trashed)
        : entries.filter((e) => !e.trashed && e.parentId === currentFolderId);
    }

    return base
      .filter((item) => {
        const matchesKind = kindFilter === 'All' || item.kind === kindFilter;
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.owner.toLowerCase().includes(q) ||
          (item.extension || '').toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q));
        return matchesKind && matchesSearch;
      })
      .sort((a, b) => {
        // Keep folders grouped first in main folder browsing unless sorting by size
        if (activeModulePage === 'main' && sortBy !== 'size') {
          if (a.kind === 'folder' && b.kind !== 'folder') return -1;
          if (a.kind !== 'folder' && b.kind === 'folder') return 1;
        }
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'kind') return a.kind.localeCompare(b.kind);
        if (sortBy === 'size') {
          const aSize =
            a.kind === 'folder' ? folderStatsMap.get(a.id)?.totalBytes || 0 : a.sizeBytes;
          const bSize =
            b.kind === 'folder' ? folderStatsMap.get(b.id)?.totalBytes || 0 : b.sizeBytes;
          return bSize - aSize;
        }
        return b.updatedTimestamp - a.updatedTimestamp;
      });
  }, [activeModulePage, currentFolderId, entries, folderStatsMap, kindFilter, searchQuery, sortBy]);

  const viewTitleMap: Record<string, string> = {
    main: 'File Manager',
    recent: 'Recent Files',
    starred: 'Starred',
    shared: 'Shared Files',
    trash: 'Trash',
  };
  const pageTitle = viewTitleMap[activeModulePage] || 'File Manager';

  const handleOpenEntry = (entry: FileManagerEntry) => {
    if (entry.trashed) {
      setSelectedEntry(entry);
      return;
    }
    if (entry.kind === 'folder') {
      if (activeModulePage !== 'main') {
        setActiveModulePage('main');
      }
      setSearchQuery('');
      setCurrentFolderId(entry.id);
      return;
    }
    setSelectedEntry(entry);
  };

  const handleToggleStar = (entry: FileManagerEntry) => {
    const nextStar = !entry.starred;
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, starred: nextStar } : item))
    );
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry({ ...selectedEntry, starred: nextStar });
    }
  };

  const handleToggleShare = (entry: FileManagerEntry) => {
    const nextShared = !entry.shared;
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, shared: nextShared } : item))
    );
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry({ ...selectedEntry, shared: nextShared });
    }
    triggerToast(
      nextShared ? 'Akses Berbagi Aktif' : 'Akses Berbagi Dimatikan',
      nextShared
        ? `"${entry.name}" kini masuk daftar Shared.`
        : `"${entry.name}" diatur menjadi privat.`,
      'info'
    );
  };

  const handleCopyShareLink = (entry: FileManagerEntry) => {
    const url = `${window.location.origin}/files/${entry.id}/${encodeURIComponent(entry.name)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => null);
    }
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId((curr) => (curr === entry.id ? null : curr)), 1800);
    triggerToast('Tautan Disalin', `Link berbagi untuk "${entry.name}" siap dikirim.`, 'success');
  };

  const handleMoveToTrash = (entry: FileManagerEntry) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, trashed: true } : item))
    );
    if (selectedEntry?.id === entry.id) setSelectedEntry(null);
    triggerToast('Dipindahkan ke Trash', `"${entry.name}" dipindahkan ke Trash.`, 'info');
  };

  const handleRestore = (entry: FileManagerEntry) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, trashed: false } : item))
    );
    if (selectedEntry?.id === entry.id) setSelectedEntry(null);
    triggerToast('Berhasil Dipulihkan', `"${entry.name}" dikembalikan ke folder asal.`, 'success');
  };

  const handlePermanentDelete = (entry: FileManagerEntry) => {
    // Also delete children if it's a folder
    const idsToDelete = new Set<string>([entry.id]);
    let added = true;
    while (added) {
      added = false;
      entries.forEach((item) => {
        if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
          idsToDelete.add(item.id);
          added = true;
        }
      });
    }
    setEntries((prev) => prev.filter((item) => !idsToDelete.has(item.id)));
    setConfirmPermanentDeleteId(null);
    if (selectedEntry && idsToDelete.has(selectedEntry.id)) setSelectedEntry(null);
    triggerToast('Dihapus Permanen', `"${entry.name}" telah dihapus permanen.`, 'info');
  };

  const handleEmptyTrash = () => {
    setEntries((prev) => prev.filter((item) => !item.trashed));
    triggerToast('Trash Dikosongkan', 'Seluruh file di Trash telah dihapus permanen.', 'success');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;

    const now = Date.now();
    const todayLabel = new Date(now).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newFolder: FileManagerEntry = {
      id: `FLD-${now.toString().slice(-6)}`,
      parentId: activeModulePage === 'main' ? currentFolderId : null,
      name: cleanName,
      kind: 'folder',
      sizeBytes: 0,
      owner: 'Rasengan',
      updatedAt: todayLabel,
      updatedTimestamp: now,
      starred: false,
      shared: false,
      trashed: false,
      theme: 'peach',
      tags: ['Folder'],
      notes: newFolderNotes.trim() || undefined,
    };

    setEntries((prev) => [newFolder, ...prev]);
    setNewFolderName('');
    setNewFolderNotes('');
    setIsNewFolderOpen(false);
    if (activeModulePage !== 'main') {
      setActiveModulePage('main');
    }
    triggerToast('Folder Dibuat', `Folder "${cleanName}" berhasil dibuat.`, 'success');
  };

  const ingestUploadedFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const now = Date.now();
    const todayLabel = new Date(now).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const targetParent = activeModulePage === 'main' ? currentFolderId : null;

    Array.from(files).forEach((file, index) => {
      const inferred = inferFileKindFromName(file.name);
      const createEntry = (dataUrl?: string) => {
        const entry: FileManagerEntry = {
          id: `FILE-${(now + index).toString().slice(-6)}`,
          parentId: targetParent,
          name: file.name,
          kind: inferred.kind,
          extension: inferred.extension,
          sizeBytes: file.size,
          owner: 'Rasengan',
          updatedAt: todayLabel,
          updatedTimestamp: now + index,
          starred: false,
          shared: false,
          trashed: false,
          theme: inferred.theme,
          tags: [inferred.extension],
          notes: `Diunggah melalui File Manager (${formatFileSize(file.size)}).`,
          dataUrl,
        };
        setEntries((prev) => [entry, ...prev]);
      };

      // Save dataUrl for small images (< 1.5 MB) for live preview in detail modal
      if (inferred.kind === 'image' && file.size <= 1.5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          createEntry(typeof reader.result === 'string' ? reader.result : undefined);
        };
        reader.onerror = () => createEntry(undefined);
        reader.readAsDataURL(file);
      } else {
        createEntry(undefined);
      }
    });

    if (activeModulePage !== 'main') {
      setActiveModulePage('main');
    }
    triggerToast(
      'File Diunggah',
      `${files.length} file berhasil ditambahkan ke ${getFolderPathLabel(targetParent)}.`,
      'success'
    );
  };

  const openEditEntryModal = (entry: FileManagerEntry) => {
    setEditingEntry(entry);
    setEditName(entry.name);
    setEditParentId(entry.parentId ?? '__root__');
    setEditNotes(entry.notes || '');
  };

  // Compute valid destination folders (excluding self & descendants when moving a folder)
  const validDestinationFolders = useMemo(() => {
    const blocked = new Set<string>();
    if (editingEntry?.kind === 'folder') {
      blocked.add(editingEntry.id);
      let added = true;
      while (added) {
        added = false;
        entries.forEach((item) => {
          if (item.parentId && blocked.has(item.parentId) && !blocked.has(item.id)) {
            blocked.add(item.id);
            added = true;
          }
        });
      }
    }

    const folders = entries
      .filter((e) => !e.trashed && e.kind === 'folder' && !blocked.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
      { value: '__root__', label: 'Root (Utama)' },
      ...folders.map((f) => ({
        value: f.id,
        label: f.parentId ? `${getFolderPathLabel(f.parentId)} / ${f.name}` : `Root / ${f.name}`,
      })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEntry, entries]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const cleanName = editName.trim();
    if (!cleanName) return;

    const nextParentId = editParentId === '__root__' ? null : editParentId;
    const now = Date.now();
    const todayLabel = new Date(now).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    setEntries((prev) =>
      prev.map((item) =>
        item.id === editingEntry.id
          ? {
              ...item,
              name: cleanName,
              parentId: nextParentId,
              notes: editNotes.trim() || undefined,
              updatedAt: todayLabel,
              updatedTimestamp: now,
            }
          : item
      )
    );

    if (selectedEntry?.id === editingEntry.id) {
      setSelectedEntry((curr) =>
        curr
          ? {
              ...curr,
              name: cleanName,
              parentId: nextParentId,
              notes: editNotes.trim() || undefined,
              updatedAt: todayLabel,
              updatedTimestamp: now,
            }
          : null
      );
    }

    setEditingEntry(null);
    triggerToast('Perubahan Disimpan', `"${cleanName}" berhasil diperbarui.`, 'success');
  };

  const handleDownloadEntry = (entry: FileManagerEntry) => {
    if (entry.dataUrl) {
      const link = document.createElement('a');
      link.href = entry.dataUrl;
      link.download = entry.name;
      link.click();
      triggerToast('Mengunduh File', `Mengunduh "${entry.name}"...`, 'success');
      return;
    }
    const content = `File: ${entry.name}\nTipe: ${entry.extension || entry.kind}\nPemilik: ${entry.owner}\nLokasi: ${getFolderPathLabel(entry.parentId)}\nDiperbarui: ${entry.updatedAt}\nCatatan: ${entry.notes || '-'}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entry.name.replace(/\.[^.]+$/, '')}_info.txt`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast('Ringkasan File Diunduh', `Info berkas "${entry.name}" berhasil diunduh.`, 'success');
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 relative"
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDraggingFile) setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingFile(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        ingestUploadedFiles(e.dataTransfer.files);
      }}
    >
      {/* Hidden Real File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          ingestUploadedFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Drag & Drop Upload Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-4 z-50 rounded-[24px] border-2 border-dashed border-[#ee2e65] bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[#FEF1F5] text-[#ee2e65] flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-[16px] font-semibold text-[#1C1D21]">
            Lepas file di sini untuk mengunggah
          </div>
          <div className="text-[12.5px] text-[#646772]">
            Akan disimpan ke {getFolderPathLabel(activeModulePage === 'main' ? currentFolderId : null)}
          </div>
        </div>
      )}

      {/* Header (Identik dengan pola Materials Servolution) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-black/[0.05]">
        <div className="hidden md:flex items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1D21]">{pageTitle}</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C] text-[11.5px] font-bold tabular-nums">
            {visibleEntries.length} Item
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
              placeholder="Cari folder, file, ekstensi..."
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

          {activeModulePage === 'trash' ? (
            storageStats.trashedCount > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                className={ACTION_BTN_DANGER_SOFT}
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Kosongkan Trash</span>
              </button>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(true)}
                className={ACTION_BTN_SECONDARY}
              >
                <FolderPlus className="w-4 h-4 text-[#6E717A] shrink-0" />
                <span className="sm:hidden">Folder</span>
                <span className="hidden sm:inline">Folder Baru</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={ACTION_BTN_PRIMARY}
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Upload</span>
                <span className="hidden sm:inline">Upload File</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Storage & File Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-black/[0.10] bg-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#646772]">Total Storage</span>
            <span className="w-7 h-7 rounded-full bg-[#FEF1F5] text-[#ee2e65] flex items-center justify-center">
              <HardDrive className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="kpi-value text-[20px] font-bold text-[#1C1D21] tabular-nums">
            {formatFileSize(storageStats.totalBytes)}
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#F4F5F8] overflow-hidden flex">
            <div
              className="h-full bg-[#ee2e65]"
              style={{ width: `${storageStats.videoPct}%` }}
              title={`Video ${storageStats.videoPct}%`}
            />
            <div
              className="h-full bg-[#6C5DD3]"
              style={{ width: `${storageStats.docPct}%` }}
              title={`Dokumen ${storageStats.docPct}%`}
            />
            <div
              className="h-full bg-[#10B981]"
              style={{ width: `${storageStats.otherPct}%` }}
              title={`Media lain ${storageStats.otherPct}%`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.10] bg-white p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#646772]">Folder & File</span>
            <span className="w-7 h-7 rounded-full bg-[#F0EFFC] text-[#3F3B99] flex items-center justify-center">
              <Folder className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="kpi-value text-[20px] font-bold text-[#1C1D21] tabular-nums">
            {storageStats.totalFiles} File
          </div>
          <div className="text-[11.5px] text-[#8A8D98] tabular-nums">
            {storageStats.totalFolders} folder aktif
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.10] bg-white p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#646772]">Dibagikan</span>
            <span className="w-7 h-7 rounded-full bg-[#E6F9F0] text-[#146C43] flex items-center justify-center">
              <Share2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="kpi-value text-[20px] font-bold text-[#1C1D21] tabular-nums">
            {storageStats.sharedCount} Item
          </div>
          <div className="text-[11.5px] text-[#8A8D98] tabular-nums">
            {storageStats.starredCount} ditandai bintang
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.10] bg-white p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#646772]">Trash</span>
            <span className="w-7 h-7 rounded-full bg-[#FFF5E6] text-[#8C5811] flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="kpi-value text-[20px] font-bold text-[#1C1D21] tabular-nums">
            {storageStats.trashedCount} Item
          </div>
          <div className="text-[11.5px] text-[#8A8D98]">Siap dipulihkan / hapus</div>
        </div>
      </div>

      {/* Folder Path Breadcrumbs (when in All Files) */}
      {activeModulePage === 'main' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAFBFD] px-3.5 py-2.5 rounded-xl border border-black/[0.08]">
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] min-w-0">
            {currentFolderId && (
              <button
                type="button"
                onClick={() => {
                  const curr = entries.find((e) => e.id === currentFolderId);
                  setCurrentFolderId(curr?.parentId ?? null);
                }}
                title="Naik satu folder"
                className="w-7 h-7 rounded-lg bg-white border border-black/[0.08] hover:border-[#ee2e65] text-[#646772] hover:text-[#ee2e65] inline-flex items-center justify-center mr-1 transition-colors cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                currentFolderId === null
                  ? 'font-semibold text-[#1C1D21] bg-white shadow-2xs'
                  : 'text-[#646772] hover:text-[#1C1D21] hover:bg-white/70 font-medium'
              }`}
            >
              Root
            </button>

            {folderBreadcrumbs.map((crumb, idx) => {
              const isLast = idx === folderBreadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id}>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8A8D98] shrink-0" />
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`px-2 py-1 rounded-lg transition-colors truncate max-w-[180px] cursor-pointer ${
                      isLast
                        ? 'font-semibold text-[#1C1D21] bg-white shadow-2xs'
                        : 'text-[#646772] hover:text-[#1C1D21] hover:bg-white/70 font-medium'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <span className="text-[11.5px] text-[#8A8D98] hidden sm:inline">
            Seret & lepas file dari komputer untuk upload cepat
          </span>
        </div>
      )}

      {/* Filter Bar & Table/Grid Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SplitFilterButton
            value={kindFilter}
            onChange={(val) => setKindFilter(val as 'All' | FileEntryKind)}
            prefix="Tipe"
            icon={Layers}
            variant="primary"
            ariaLabel="Filter tipe file"
            options={[
              { value: 'All', label: 'Semua Tipe', mobileLabel: 'Semua' },
              { value: 'folder', label: 'Folder', mobileLabel: 'Folder' },
              { value: 'video', label: 'Video', mobileLabel: 'Video' },
              { value: 'document', label: 'Dokumen', mobileLabel: 'Doc' },
              { value: 'image', label: 'Gambar', mobileLabel: 'Gambar' },
              { value: 'audio', label: 'Audio', mobileLabel: 'Audio' },
              { value: 'archive', label: 'Arsip', mobileLabel: 'Arsip' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as 'latest' | 'name' | 'size' | 'kind')}
            pill
            ariaLabel="Urutkan file"
            align="right"
            className="min-w-[156px]"
            triggerClassName="border-black/[0.08]"
            options={[
              { value: 'latest', label: 'Urut: Terbaru' },
              { value: 'name', label: 'Urut: Nama (A-Z)' },
              { value: 'size', label: 'Urut: Terbesar' },
              { value: 'kind', label: 'Urut: Tipe' },
            ]}
          />

          <div className="hidden sm:inline-flex items-center bg-gray-100 p-0.5 rounded-full border border-black/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Tampilan Tabel"
              aria-label="Tampilan Tabel"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#1C1D21] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Tampilan Grid"
              aria-label="Tampilan Grid"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#1C1D21] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {visibleEntries.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-black/[0.07] p-8">
          <FolderOpen className="w-9 h-9 text-[#B4B6C1] mx-auto mb-3" />
          <h3 className="text-[15px] font-semibold text-[#1C1D21]">
            {activeModulePage === 'trash'
              ? 'Trash kosong'
              : 'Belum ada file atau folder di tampilan ini'}
          </h3>
          <p className="text-[12.5px] text-[#8A8D98] max-w-sm mx-auto mt-1">
            {activeModulePage === 'trash'
              ? 'Item yang dihapus akan muncul di sini sebelum dihapus permanen.'
              : 'Unggah file baru, buat folder, atau ubah filter pencarian Anda.'}
          </p>
          {(searchQuery || kindFilter !== 'All') ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setKindFilter('All');
              }}
              className={`mt-4 ${ACTION_BTN_PRIMARY}`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Reset Filter</span>
            </button>
          ) : (
            activeModulePage !== 'trash' && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(true)}
                  className={ACTION_BTN_SECONDARY}
                >
                  <FolderPlus className="w-4 h-4 text-[#6E717A]" />
                  <span>Folder Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={ACTION_BTN_PRIMARY}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <>
          {/* Desktop / Tablet Grid Mode */}
          {viewMode === 'grid' && (
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {visibleEntries.map((item) => {
                const meta = KIND_META[item.kind];
                const Icon = meta.icon;
                const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;
                const folderStat = item.kind === 'folder' ? folderStatsMap.get(item.id) : null;
                const sizeText =
                  item.kind === 'folder'
                    ? `${folderStat?.directItems ?? 0} item · ${formatFileSize(folderStat?.totalBytes ?? 0)}`
                    : formatFileSize(item.sizeBytes);

                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-black/[0.12] bg-white p-4 hover:border-[#ee2e65]/40 hover:shadow-[0_10px_28px_-14px_rgba(238,46,101,0.24)] transition-all flex flex-col justify-between gap-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEntry(item)}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-transform group-hover:scale-105 ${meta.iconStyle}`}
                      >
                        <Icon className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {!item.trashed && (
                          <button
                            type="button"
                            onClick={() => handleToggleStar(item)}
                            title={item.starred ? 'Hapus Bintang' : 'Tandai Bintang'}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              item.starred
                                ? 'bg-[#FFF5E6] text-[#D97706]'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${item.starred ? 'fill-current' : ''}`} />
                          </button>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10px] font-bold uppercase`}
                        >
                          {item.kind === 'folder' ? 'FOLDER' : item.extension || meta.label}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEntry(item)}
                      className="text-left space-y-1 cursor-pointer min-w-0"
                    >
                      <div className="font-semibold text-[13.5px] text-[#1C1D21] group-hover:text-[#9D113C] line-clamp-1">
                        {item.name}
                      </div>
                      <div className="text-[11.5px] text-[#8A8D98] truncate tabular-nums">
                        {sizeText} · {item.updatedAt}
                      </div>
                    </button>

                    <div className="pt-2.5 border-t border-black/[0.06] flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#646772] truncate">
                        {item.owner}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.trashed ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            className="h-7 px-2.5 rounded-full bg-[#E6F9F0] text-[#146C43] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Pulihkan</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditEntryModal(item)}
                              title="Ubah Nama / Pindah"
                              className="w-7 h-7 rounded-full hover:bg-[#F4F5F8] text-[#6E717A] hover:text-[#1C1D21] inline-flex items-center justify-center cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveToTrash(item)}
                              title="Pindah ke Trash"
                              className="w-7 h-7 rounded-full hover:bg-[#FFECEB] text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desktop & Tablet Table View (Identik dengan Materials Servolution) */}
          {viewMode === 'table' && (
            <div className="hidden md:block overflow-hidden rounded-2xl border border-black/[0.12] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBFD] border-b border-black/[0.08] text-[11px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                      <th className="py-3.5 px-5">Nama Berkas / Folder</th>
                      <th className="py-3.5 px-4">Tipe / Lokasi</th>
                      <th className="py-3.5 px-4">Ukuran</th>
                      <th className="py-3.5 px-4">Diperbarui</th>
                      <th className="py-3.5 px-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.08] text-[13px]">
                    {visibleEntries.map((item) => {
                      const meta = KIND_META[item.kind];
                      const Icon = meta.icon;
                      const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;
                      const folderStat =
                        item.kind === 'folder' ? folderStatsMap.get(item.id) : null;

                      return (
                        <tr key={item.id} className="hover:bg-[#FAFBFD] transition-colors group">
                          {/* Nama */}
                          <td className="py-3.5 px-5 align-middle">
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEntry(item)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${meta.iconStyle}`}
                                title={item.kind === 'folder' ? 'Buka Folder' : 'Lihat Detail'}
                              >
                                <Icon className="w-4 h-4" />
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEntry(item)}
                                    className="font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors cursor-pointer text-left truncate max-w-[320px]"
                                  >
                                    {item.name}
                                  </button>
                                  {item.shared && !item.trashed && (
                                    <span
                                      title="Dibagikan"
                                      className="px-1.5 py-0.5 rounded-md bg-[#E6F9F0] text-[#146C43] text-[10px] font-bold shrink-0"
                                    >
                                      Shared
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11.5px] text-[#8A8D98] truncate mt-0.5 max-w-[360px]">
                                  {item.owner}
                                  {item.notes ? ` · ${item.notes}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Tipe / Lokasi */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-2 text-[12px] text-[#6E717A]">
                              <span
                                className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10.5px] font-bold tracking-wide uppercase`}
                              >
                                {item.kind === 'folder' ? 'FOLDER' : item.extension || meta.label}
                              </span>
                              <span className="truncate max-w-[165px]">
                                {getFolderPathLabel(item.parentId)}
                              </span>
                            </div>
                          </td>

                          {/* Ukuran */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap tabular-nums">
                            {item.kind === 'folder' ? (
                              <div className="space-y-0.5">
                                <div className="text-[12.5px] font-semibold text-[#1C1D21]">
                                  {folderStat?.directItems ?? 0} item
                                </div>
                                <div className="text-[11px] text-[#8A8D98]">
                                  {formatFileSize(folderStat?.totalBytes ?? 0)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[12.5px] font-semibold text-[#1C1D21]">
                                {formatFileSize(item.sizeBytes)}
                              </span>
                            )}
                          </td>

                          {/* Diperbarui */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap tabular-nums">
                            <div className="text-[12.5px] font-medium text-[#1C1D21]">
                              {item.updatedAt}
                            </div>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {item.trashed ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRestore(item)}
                                    className={ACTION_BTN_SOFT_PRIMARY}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                    <span>Pulihkan</span>
                                  </button>

                                  {confirmPermanentDeleteId === item.id ? (
                                    <button
                                      type="button"
                                      onClick={() => handlePermanentDelete(item)}
                                      className="h-9 px-3 rounded-full bg-[#FFECEB] hover:bg-[#FAD2CF] text-[#942922] text-[12px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>Hapus Permanen?</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmPermanentDeleteId(item.id)}
                                      title="Hapus Permanen"
                                      className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FFECEB] text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEntry(item)}
                                    className={
                                      item.kind === 'folder'
                                        ? ACTION_BTN_SOFT_PRIMARY
                                        : ACTION_BTN_SECONDARY
                                    }
                                  >
                                    {item.kind === 'folder' ? (
                                      <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                                    ) : (
                                      <Eye className="w-4 h-4 text-[#6E717A] shrink-0" />
                                    )}
                                    <span>{item.kind === 'folder' ? 'Buka' : 'Detail'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleStar(item)}
                                    title={item.starred ? 'Hapus Bintang' : 'Tandai Bintang'}
                                    aria-label="Toggle bintang"
                                    className={`w-9 h-9 rounded-full border border-black/[0.08] inline-flex items-center justify-center transition-colors cursor-pointer ${
                                      item.starred
                                        ? 'bg-[#FFF5E6] text-[#D97706] border-[#FAD7A0]'
                                        : 'bg-white hover:bg-[#FAFBFD] text-[#6E717A] hover:text-[#1C1D21]'
                                    }`}
                                  >
                                    <Star
                                      className={`w-4 h-4 ${item.starred ? 'fill-current' : ''}`}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditEntryModal(item)}
                                    title="Ubah Nama / Pindahkan Folder"
                                    aria-label="Edit file"
                                    className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] text-[#6E717A] hover:text-[#1C1D21] inline-flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleMoveToTrash(item)}
                                    title="Pindahkan ke Trash"
                                    aria-label="Pindahkan ke Trash"
                                    className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FFECEB] text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
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
          )}

          {/* Mobile View: Unified Hairline List */}
          <div className="md:hidden bg-white rounded-2xl border border-black/[0.12] divide-y divide-black/[0.08] overflow-hidden">
            {visibleEntries.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;
              const folderStat = item.kind === 'folder' ? folderStatsMap.get(item.id) : null;
              const sizeText =
                item.kind === 'folder'
                  ? `${folderStat?.directItems ?? 0} item · ${formatFileSize(folderStat?.totalBytes ?? 0)}`
                  : formatFileSize(item.sizeBytes);

              return (
                <div key={item.id} className="p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.iconStyle}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[14px] text-[#1C1D21] break-words line-clamp-2">
                          {item.name}
                        </h4>
                        <div className="text-[11.5px] text-[#8A8D98] mt-0.5 truncate tabular-nums">
                          {sizeText} · {item.updatedAt}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10px] font-bold uppercase shrink-0`}
                    >
                      {item.kind === 'folder' ? 'FOLDER' : item.extension || meta.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8A8D98]">
                    <span className="truncate">{getFolderPathLabel(item.parentId)}</span>
                    <span className="shrink-0 ml-2">{item.owner}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    {item.trashed ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestore(item)}
                          className={`flex-1 ${ACTION_BTN_SOFT_PRIMARY}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Pulihkan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(item)}
                          className="w-9 h-9 rounded-full border border-black/[0.08] bg-[#FFECEB] text-[#942922] inline-flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEntry(item)}
                          className={`flex-1 ${
                            item.kind === 'folder' ? ACTION_BTN_SOFT_PRIMARY : ACTION_BTN_SECONDARY
                          }`}
                        >
                          {item.kind === 'folder' ? (
                            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Eye className="w-4 h-4 text-[#6E717A] shrink-0" />
                          )}
                          <span>{item.kind === 'folder' ? 'Buka Folder' : 'Lihat Detail'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStar(item)}
                          className={`w-9 h-9 rounded-full border border-black/[0.08] inline-flex items-center justify-center shrink-0 cursor-pointer ${
                            item.starred
                              ? 'bg-[#FFF5E6] text-[#D97706] border-[#FAD7A0]'
                              : 'bg-white text-[#6E717A]'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${item.starred ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditEntryModal(item)}
                          className="w-9 h-9 rounded-full border border-black/[0.08] bg-white text-[#6E717A] inline-flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveToTrash(item)}
                          className="w-9 h-9 rounded-full border border-black/[0.08] bg-white text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* File Detail & Preview Modal */}
      {selectedEntry &&
        createPortal(
          <div
            ref={detailBackdropRef}
            data-modal-sheet-backdrop="true"
            className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end md:items-center justify-center md:p-4"
          >
            <div
              ref={setDetailSheetEl}
              {...detailGestureProps}
              className="w-full md:max-w-lg bg-white rounded-t-[28px] md:rounded-[28px] p-5 sm:p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 shadow-2xl border border-black/[0.10] max-h-[86vh] flex flex-col animate-bottom-sheet md:animate-ui-pop"
            >
              <div
                data-sheet-handle="true"
                className="flex md:hidden justify-center py-2 -mt-3 mb-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
              >
                <div className="w-10 h-1 bg-black/20 rounded-full" />
              </div>

              {(() => {
                const meta = KIND_META[selectedEntry.kind];
                const Icon = meta.icon;
                const theme = PASTEL_THEMES[selectedEntry.theme] || PASTEL_THEMES.periwinkle;
                const isCopied = copiedId === selectedEntry.id;
                const folderStat =
                  selectedEntry.kind === 'folder' ? folderStatsMap.get(selectedEntry.id) : null;

                return (
                  <>
                    <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/[0.08] shrink-0">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.iconStyle}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10px] font-bold uppercase`}
                            >
                              {selectedEntry.kind === 'folder'
                                ? 'FOLDER'
                                : selectedEntry.extension || meta.label}
                            </span>
                            {selectedEntry.shared && (
                              <span className="px-2 py-0.5 rounded-full bg-[#E6F9F0] text-[#146C43] text-[10.5px] font-semibold">
                                Shared
                              </span>
                            )}
                          </div>
                          <h2 className="text-[16px] font-semibold text-[#1C1D21] break-words">
                            {selectedEntry.name}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[#8A8D98] mt-1 tabular-nums">
                            <span>{selectedEntry.owner}</span>
                            <span>·</span>
                            <span>
                              {selectedEntry.kind === 'folder'
                                ? `${folderStat?.directItems ?? 0} item (${formatFileSize(folderStat?.totalBytes ?? 0)})`
                                : formatFileSize(selectedEntry.sizeBytes)}
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {selectedEntry.updatedAt}
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
                      {selectedEntry.dataUrl && selectedEntry.kind === 'image' && (
                        <div className="rounded-2xl overflow-hidden border border-black/[0.08] bg-[#FAFBFD]">
                          <img
                            src={selectedEntry.dataUrl}
                            alt={selectedEntry.name}
                            className="w-full max-h-60 object-contain"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                        <div className="p-3 rounded-xl bg-[#FAFBFD] border border-black/[0.06]">
                          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                            Lokasi Folder
                          </div>
                          <div className="font-semibold text-[#1C1D21] mt-0.5 truncate">
                            {getFolderPathLabel(selectedEntry.parentId)}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAFBFD] border border-black/[0.06]">
                          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                            Status Akses
                          </div>
                          <div className="font-semibold text-[#1C1D21] mt-0.5">
                            {selectedEntry.shared ? 'Dibagikan ke Tim' : 'Privat'}
                          </div>
                        </div>
                      </div>

                      {selectedEntry.notes && (
                        <div className="p-3.5 rounded-2xl bg-[#FAFBFD] border border-black/[0.06] text-[12.5px] text-[#4B4E57] leading-relaxed">
                          {selectedEntry.notes}
                        </div>
                      )}

                      {!selectedEntry.trashed && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleShare(selectedEntry)}
                            className={ACTION_BTN_SECONDARY}
                          >
                            <Share2 className="w-3.5 h-3.5 text-[#6E717A]" />
                            <span>
                              {selectedEntry.shared ? 'Matikan Share' : 'Aktifkan Share'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(selectedEntry)}
                            className={ACTION_BTN_SECONDARY}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#146C43]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#6E717A]" />
                            )}
                            <span>{isCopied ? 'Tersalin' : 'Salin Link'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-black/[0.08] flex items-center justify-between gap-2 shrink-0">
                      {selectedEntry.trashed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(selectedEntry)}
                            className={ACTION_BTN_DANGER_SOFT}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Permanen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestore(selectedEntry)}
                            className={ACTION_BTN_PRIMARY}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Pulihkan</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const target = selectedEntry;
                              setSelectedEntry(null);
                              openEditEntryModal(target);
                            }}
                            className={ACTION_BTN_SECONDARY}
                          >
                            <FolderInput className="w-3.5 h-3.5 text-[#6E717A]" />
                            <span>Ubah / Pindah</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadEntry(selectedEntry)}
                            className={ACTION_BTN_PRIMARY}
                          >
                            <Download className="w-4 h-4" />
                            <span>Unduh</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

      {/* New Folder Modal */}
      {isNewFolderOpen &&
        createPortal(
          <div
            ref={folderBackdropRef}
            data-modal-sheet-backdrop="true"
            className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end md:items-center justify-center md:p-4"
          >
            <form
              ref={setFolderSheetEl as unknown as React.Ref<HTMLFormElement>}
              {...folderGestureProps}
              onSubmit={handleCreateFolder}
              className="w-full md:max-w-md bg-white rounded-t-[28px] md:rounded-[28px] p-5 sm:p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 shadow-2xl border border-black/[0.10] space-y-4 animate-bottom-sheet md:animate-ui-pop"
            >
              <div
                data-sheet-handle="true"
                className="flex md:hidden justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="w-10 h-1 bg-black/20 rounded-full" />
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#1C1D21]">Buat Folder Baru</h2>
                  <p className="text-[12px] text-[#646772] mt-0.5">
                    Lokasi: {getFolderPathLabel(activeModulePage === 'main' ? currentFolderId : null)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={animateCloseFolder}
                  aria-label="Tutup modal folder"
                  className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center text-[#6E717A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">Nama Folder *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Contoh: Natal 2026 - Footage"
                    className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newFolderNotes}
                    onChange={(e) => setNewFolderNotes(e.target.value)}
                    placeholder="Keterangan singkat isi folder..."
                    className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={animateCloseFolder}
                  className={ACTION_BTN_SECONDARY}
                >
                  Batal
                </button>
                <button type="submit" className={ACTION_BTN_PRIMARY}>
                  <FolderPlus className="w-4 h-4" />
                  <span>Buat Folder</span>
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Rename & Move Modal */}
      {editingEntry &&
        createPortal(
          <div
            ref={editBackdropRef}
            data-modal-sheet-backdrop="true"
            className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end md:items-center justify-center md:p-4"
          >
            <form
              ref={setEditSheetEl as unknown as React.Ref<HTMLFormElement>}
              {...editGestureProps}
              onSubmit={handleSaveEdit}
              className="w-full md:max-w-md bg-white rounded-t-[28px] md:rounded-[28px] p-5 sm:p-6 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 shadow-2xl border border-black/[0.10] space-y-4 animate-bottom-sheet md:animate-ui-pop"
            >
              <div
                data-sheet-handle="true"
                className="flex md:hidden justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="w-10 h-1 bg-black/20 rounded-full" />
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#1C1D21]">
                    Ubah Nama & Lokasi
                  </h2>
                  <p className="text-[12px] text-[#646772] mt-0.5">
                    Perbarui nama, folder tujuan, atau catatan item.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={animateCloseEdit}
                  aria-label="Tutup modal edit"
                  className="w-8 h-8 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center text-[#6E717A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">Nama *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">Folder Tujuan</label>
                  <CustomSelect
                    value={editParentId}
                    onChange={setEditParentId}
                    ariaLabel="Pilih folder tujuan"
                    className="w-full"
                    triggerClassName="w-full h-10 rounded-xl border-black/[0.12]"
                    options={validDestinationFolders}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#1C1D21]">Catatan</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65] resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={animateCloseEdit}
                  className={ACTION_BTN_SECONDARY}
                >
                  Batal
                </button>
                <button type="submit" className={ACTION_BTN_PRIMARY}>
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
};
