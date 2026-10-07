import React from 'react';
import { Text, View } from 'react-native';
// Per-icon imports keep the bundle small (the package root re-exports ~3,700 icons).
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Bell from 'lucide-react-native/icons/bell';
import BookMarked from 'lucide-react-native/icons/book-bookmark';
import BookOpen from 'lucide-react-native/icons/book-open';
import Brain from 'lucide-react-native/icons/brain';
import Calendar from 'lucide-react-native/icons/calendar';
import ChartNoAxesColumn from 'lucide-react-native/icons/chart-no-axes-column';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleX from 'lucide-react-native/icons/circle-x';
import Compass from 'lucide-react-native/icons/compass';
import Database from 'lucide-react-native/icons/database';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Hand from 'lucide-react-native/icons/hand';
import Hourglass from 'lucide-react-native/icons/hourglass';
import House from 'lucide-react-native/icons/house';
import Info from 'lucide-react-native/icons/info';
import KeyRound from 'lucide-react-native/icons/key-round';
import Landmark from 'lucide-react-native/icons/landmark';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Lock from 'lucide-react-native/icons/lock';
import Mail from 'lucide-react-native/icons/mail';
import Map from 'lucide-react-native/icons/map';
import MapPin from 'lucide-react-native/icons/map-pin';
import Medal from 'lucide-react-native/icons/medal';
import Megaphone from 'lucide-react-native/icons/megaphone';
import Menu from 'lucide-react-native/icons/menu';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Settings from 'lucide-react-native/icons/settings';
import Shield from 'lucide-react-native/icons/shield';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Tag from 'lucide-react-native/icons/tag';
import Target from 'lucide-react-native/icons/target';
import Trash2 from 'lucide-react-native/icons/trash';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import User from 'lucide-react-native/icons/user';
import UserCog from 'lucide-react-native/icons/user-cog';
import Users from 'lucide-react-native/icons/users';
import Wallet from 'lucide-react-native/icons/wallet';
import X from 'lucide-react-native/icons/x';
import { colors } from '../styles/colors';

// Line-icon set (Lucide) used across the app in place of emoji.
// Usage: <Icon name="mail" size={18} color={colors.blue} />
const ICONS = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  bell: Bell,
  book: BookOpen,
  'book-marked': BookMarked,
  brain: Brain,
  calendar: Calendar,
  chart: ChartNoAxesColumn,
  check: Check,
  'check-circle': CircleCheck,
  help: CircleHelp,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  close: X,
  compass: Compass,
  database: Database,
  edit: Pencil,
  eye: Eye,
  'eye-off': EyeOff,
  'graduation-cap': GraduationCap,
  hand: Hand,
  home: House,
  hourglass: Hourglass,
  info: Info,
  key: KeyRound,
  landmark: Landmark,
  grid: LayoutGrid,
  lock: Lock,
  mail: Mail,
  map: Map,
  'map-pin': MapPin,
  medal: Medal,
  megaphone: Megaphone,
  menu: Menu,
  plus: Plus,
  search: Search,
  settings: Settings,
  shield: Shield,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  tag: Tag,
  target: Target,
  trash: Trash2,
  'trending-down': TrendingDown,
  warning: TriangleAlert,
  user: User,
  'user-cog': UserCog,
  users: Users,
  wallet: Wallet,
  'x-circle': CircleX,
};

export default function Icon({ name, size = 18, color = colors.blue, strokeWidth = 2, style }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}

// An icon followed (or preceded, with `trailing`) by a line of text, laid out in a row.
export function IconText({
  icon, size = 14, color = colors.blue, gap = 6, trailing = false,
  style, textStyle, numberOfLines, center = false, children,
}) {
  const ic = <Icon name={icon} size={size} color={color} style={trailing ? { marginLeft: gap } : { marginRight: gap }} />;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, center && { justifyContent: 'center' }, style]}>
      {!trailing && ic}
      <Text style={[textStyle, { marginTop: 0, marginBottom: 0, flexShrink: 1 }]} numberOfLines={numberOfLines}>{children}</Text>
      {trailing && ic}
    </View>
  );
}
