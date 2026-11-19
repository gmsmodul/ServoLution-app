import React from 'react';
import {
  Home,
  PlayCircle,
  BookOpen,
  Clapperboard,
  Calendar,
  HardDrive,
  HeartHandshake,
  Camera,
  Code2,
  Wrench,
  Users,
  Database,
  Folder,
  LayoutGrid,
  Sparkles,
  FileText,
  Video,
  Share2,
  AppWindow,
  Clock,
  Star,
  Trash2,
} from 'lucide-react';
import { PastelThemeKey, WorkspaceId } from '../types';

export type WorkspaceIconComponent = React.ComponentType<{ className?: string }>;

export interface WorkspaceSidebarNavItem {
  id: string;
  label: string;
  icon: WorkspaceIconComponent;
}

export interface WorkspaceDefinition {
  id: WorkspaceId;
  brandName: string;
  label: string;
  groupLabel: string;
  icon: WorkspaceIconComponent;
  theme: PastelThemeKey;
  keywords: string;
  /** Dedicated sidebar navigation items for this workspace (excluding Servolution which has its own full menu) */
  sidebarItems: WorkspaceSidebarNavItem[];
}

export interface HomeSidebarGroup {
  id: 'main' | 'ministry' | 'office' | 'data';
  label: string;
  collapsible: boolean;
  items: Array<{
    workspaceId: WorkspaceId;
    label: string;
    icon: WorkspaceIconComponent;
  }>;
}

/**
 * Multimedia Home sidebar menu hierarchy:
 * MAIN MENU -> MINISTRY (Library, Workspace, Servolution, Live Camera, Development, Technical Support)
 * -> OFFICE (Editing Project, Calendar, HDD List) -> DATA (User Manager, Data Manager, File Manager)
 */
export const HOME_SIDEBAR_GROUPS: HomeSidebarGroup[] = [
  {
    id: 'main',
    label: 'MAIN MENU',
    collapsible: false,
    items: [
      { workspaceId: 'home', label: 'Home', icon: Home },
    ],
  },
  {
    id: 'ministry',
    label: 'MINISTRY',
    collapsible: true,
    items: [
      { workspaceId: 'library', label: 'Library', icon: PlayCircle },
      { workspaceId: 'workspace', label: 'Workspace', icon: BookOpen },
      { workspaceId: 'servolution', label: 'Servolution', icon: HeartHandshake },
      { workspaceId: 'live-camera', label: 'Live Camera', icon: Camera },
      { workspaceId: 'development', label: 'Development', icon: Code2 },
      { workspaceId: 'technical-support', label: 'Technical Support', icon: Wrench },
    ],
  },
  {
    id: 'office',
    label: 'OFFICE',
    collapsible: true,
    items: [
      { workspaceId: 'editing-project', label: 'Editing Project', icon: Clapperboard },
      { workspaceId: 'calendar', label: 'Calendar', icon: Calendar },
      { workspaceId: 'hdd-list', label: 'HDD List', icon: HardDrive },
    ],
  },
  {
    id: 'data',
    label: 'DATA',
    collapsible: true,
    items: [
      { workspaceId: 'user-manager', label: 'User Manager', icon: Users },
      { workspaceId: 'data-manager', label: 'Data Manager', icon: Database },
      { workspaceId: 'file-manager', label: 'File Manager', icon: Folder },
    ],
  },
];

/**
 * Registry of all workspaces. Each menu from the Multimedia Home sidebar
 * opens a separate workspace with its own dedicated sidebar configuration.
 */
export const WORKSPACES_REGISTRY: Record<WorkspaceId, WorkspaceDefinition> = {
  home: {
    id: 'home',
    brandName: 'Multimedia',
    label: 'Home',
    groupLabel: 'Main Menu',
    icon: Sparkles,
    theme: 'periwinkle',
    keywords: 'multimedia home beranda utama',
    sidebarItems: [
      { id: 'main', label: 'Home', icon: Home },
    ],
  },
  library: {
    id: 'library',
    brandName: 'Library',
    label: 'Library',
    groupLabel: 'Ministry',
    icon: PlayCircle,
    theme: 'periwinkle',
    keywords: 'library ministry artikel document video share app',
    sidebarItems: [
      { id: 'main', label: 'All Library', icon: LayoutGrid },
      { id: 'article', label: 'Artikel', icon: BookOpen },
      { id: 'document', label: 'Document', icon: FileText },
      { id: 'video', label: 'Video', icon: Video },
      { id: 'share', label: 'Share', icon: Share2 },
      { id: 'app', label: 'App', icon: AppWindow },
    ],
  },
  workspace: {
    id: 'workspace',
    brandName: 'Workspace',
    label: 'Workspace',
    groupLabel: 'Ministry',
    icon: BookOpen,
    theme: 'mint',
    keywords: 'workspace ministry dokumen catatan',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  'editing-project': {
    id: 'editing-project',
    brandName: 'Editing Project',
    label: 'Editing Project',
    groupLabel: 'Office',
    icon: Clapperboard,
    theme: 'coral',
    keywords: 'editing project office video produksi',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  calendar: {
    id: 'calendar',
    brandName: 'Calendar',
    label: 'Calendar',
    groupLabel: 'Office',
    icon: Calendar,
    theme: 'mint',
    keywords: 'calendar kalender jadwal office',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  'hdd-list': {
    id: 'hdd-list',
    brandName: 'HDD List',
    label: 'HDD List',
    groupLabel: 'Office',
    icon: HardDrive,
    theme: 'peach',
    keywords: 'hdd list harddisk storage arsip office',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  servolution: {
    id: 'servolution',
    brandName: 'Servolution',
    label: 'Servolution',
    groupLabel: 'Ministry',
    icon: Camera,
    theme: 'coral',
    keywords: 'servolution ministry training kelas absensi ujian',
    sidebarItems: [],
  },
  'live-camera': {
    id: 'live-camera',
    brandName: 'Live Camera',
    label: 'Live Camera',
    groupLabel: 'Ministry',
    icon: Camera,
    theme: 'periwinkle',
    keywords: 'live camera broadcast kamera ministry',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  development: {
    id: 'development',
    brandName: 'Development',
    label: 'Development',
    groupLabel: 'Ministry',
    icon: Code2,
    theme: 'periwinkle',
    keywords: 'development dev software code ministry',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  'technical-support': {
    id: 'technical-support',
    brandName: 'Technical Support',
    label: 'Technical Support',
    groupLabel: 'Ministry',
    icon: Wrench,
    theme: 'peach',
    keywords: 'technical support it bantuan teknis ministry',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  'user-manager': {
    id: 'user-manager',
    brandName: 'User Manager',
    label: 'User Manager',
    groupLabel: 'Data',
    icon: Users,
    theme: 'mint',
    keywords: 'user manager pengguna akun akses data',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  'data-manager': {
    id: 'data-manager',
    brandName: 'Data Manager',
    label: 'Data Manager',
    groupLabel: 'Data',
    icon: Database,
    theme: 'periwinkle',
    keywords: 'data manager database master data',
    sidebarItems: [
      { id: 'main', label: 'Overview', icon: LayoutGrid },
    ],
  },
  'file-manager': {
    id: 'file-manager',
    brandName: 'File Manager',
    label: 'File Manager',
    groupLabel: 'Data',
    icon: Folder,
    theme: 'peach',
    keywords: 'file manager folder berkas dokumen upload storage data',
    sidebarItems: [
      { id: 'main', label: 'All Files', icon: Folder },
      { id: 'recent', label: 'Recent', icon: Clock },
      { id: 'starred', label: 'Starred', icon: Star },
      { id: 'shared', label: 'Shared', icon: Share2 },
      { id: 'trash', label: 'Trash', icon: Trash2 },
    ],
  },
};

export const WORKSPACE_ORDER: WorkspaceId[] = [
  'home',
  'library',
  'workspace',
  'servolution',
  'live-camera',
  'development',
  'technical-support',
  'editing-project',
  'calendar',
  'hdd-list',
  'user-manager',
  'data-manager',
  'file-manager',
];
