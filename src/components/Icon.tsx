// @group Utilities : SVG-based icon wrapper — maps Ionicons name strings to Lucide components.
// Lucide React Native uses react-native-svg (already installed) so no font loading is needed.

import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  AlignLeft,
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  ArrowRightCircle,
  BarChart2,
  Box,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Clock,
  Code,
  Code2,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Gauge,
  GitBranch,
  Globe,
  Grid3X3,
  HelpCircle,
  Home,
  Hourglass,
  Info,
  Key,
  Link,
  List,
  Lock,
  LogOut,
  Maximize2,
  Menu,
  Minus,
  MoreHorizontal,
  Network,
  Pencil,
  Play,
  Plus,
  Rocket,
  RefreshCcw,
  RefreshCw,
  Search,
  Server,
  Settings,
  Square,
  Terminal,
  Trash2,
  TrendingUp,
  Type,
  Unlink,
  Wifi,
  X,
  XCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// @group Constants : Ionicons name → Lucide component map
const ICON_MAP: Record<string, LucideIcon> = {
  // Navigation / tabs
  'home':                         Home,
  'home-outline':                 Home,
  'stats-chart':                  BarChart2,
  'stats-chart-outline':          BarChart2,
  'terminal':                     Terminal,
  'terminal-outline':             Terminal,
  'time':                         Clock,
  'time-outline':                 Clock,
  'menu':                         Menu,
  'menu-outline':                 Menu,
  'ellipsis-horizontal':          MoreHorizontal,
  'ellipsis-horizontal-outline':  MoreHorizontal,

  // Search / input
  'search-outline':               Search,
  'close-circle':                 XCircle,
  'close-circle-outline':         XCircle,
  'close-outline':                X,

  // Process / cluster
  'cube-outline':                 Box,
  'git-branch-outline':           GitBranch,
  'git-network-outline':          Network,
  'code-slash-outline':           Code2,
  'code-outline':                 Code,
  'resize-outline':               Maximize2,
  'refresh-circle-outline':       RefreshCcw,
  'swap-horizontal-outline':      ArrowLeftRight,

  // Metrics
  'speedometer-outline':          Gauge,
  'hardware-chip-outline':        Cpu,
  'analytics-outline':            TrendingUp,
  'hourglass-outline':            Hourglass,

  // Actions
  'play-outline':                 Play,
  'stop-outline':                 Square,
  'refresh-outline':              RefreshCw,
  'trash-outline':                Trash2,
  'copy-outline':                 Copy,
  'add':                          Plus,
  'add-outline':                  Plus,
  'remove':                       Minus,
  'download-outline':             Download,
  'pencil-outline':               Pencil,

  // Sorting / lists
  'list-outline':                 List,
  'radio-button-on-outline':      CircleDot,
  'radio-button-on':              CircleDot,
  'radio-button-off':             Circle,
  'text-outline':                 Type,

  // Navigation / chevrons
  'chevron-forward':              ChevronRight,
  'chevron-down':                 ChevronDown,
  'arrow-forward-circle-outline': ArrowRightCircle,

  // Files / logs
  'folder-open-outline':          FolderOpen,
  'document-outline':             FileText,
  'document-text-outline':        FileText,
  'archive-outline':              Archive,

  // Status / alerts
  'alert-circle-outline':         AlertCircle,
  'warning-outline':              AlertTriangle,
  'information-circle-outline':   Info,
  'checkmark':                    Check,
  'checkmark-outline':            Check,
  'checkmark-circle':             CheckCircle,
  'checkmark-circle-outline':     CheckCircle2,

  // Auth / settings
  'lock-closed-outline':          Lock,
  'lock-closed':                  Lock,
  'key-outline':                  Key,
  'keypad-outline':               Grid3X3,
  'eye-outline':                  Eye,
  'eye-off-outline':              EyeOff,
  'settings-outline':             Settings,
  'log-out-outline':              LogOut,

  // Connectivity
  'server-outline':               Server,
  'link-outline':                 Link,
  'unlink-outline':               Unlink,
  'wifi-outline':                 Wifi,
  'globe-outline':                Globe,
  'rocket-outline':               Rocket,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// @group Exports : Icon component
export function Icon({ name, size = 24, color = '#ffffff', style }: IconProps): React.JSX.Element {
  const LucideComponent: LucideIcon = ICON_MAP[name] ?? HelpCircle;
  return <LucideComponent size={size} color={color} style={style as any} />;
}
