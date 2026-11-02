import {
  Home,
  Rocket,
  Users,
  MessageCircle,
  Calendar,
  Settings,
  DollarSign,
  Compass,
  Mic,
  Newspaper,
  User,
  Sparkles,
  Target,
  Briefcase,
  FolderOpen,
  PieChart,
  BarChart3,
  FileText,
  TrendingUp,
  Award,
} from 'lucide-react';
import { SidebarItem } from '../types/dashboard';

export const founderSidebarItems: SidebarItem[] = [
  { icon: Home, label: 'Home Feed' },
  { icon: Rocket, label: 'My Startup' },
  { icon: Compass, label: 'Discover' },
  { icon: MessageCircle, label: 'Messages' },
  { icon: DollarSign, label: 'Funding Portal' },
  { icon: Users, label: 'Communities' },
  { icon: Calendar, label: 'Events' },
  { icon: Mic, label: 'Podcasts' },
  { icon: Newspaper, label: 'News' },
  { icon: Sparkles, label: 'Ignisha AI' },
  { icon: User, label: 'Profile' },
  { icon: Settings, label: 'Settings' },
];

export const investorSidebarItems: SidebarItem[] = [
  { icon: Home, label: 'Home Feed' },
  { icon: Target, label: 'Discover' },
  { icon: Briefcase, label: 'Pipeline' },
  { icon: FolderOpen, label: 'Deal Rooms' },
  { icon: PieChart, label: 'Portfolio' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: MessageCircle, label: 'Messages' },
  { icon: Users, label: 'Communities' },
  { icon: Calendar, label: 'Events' },
  { icon: Sparkles, label: 'Ignisha AI' },
  { icon: Mic, label: 'Podcasts' },
  { icon: Newspaper, label: 'News' },
  { icon: User, label: 'Profile' },
  { icon: Settings, label: 'Settings' },
];

export const expertSidebarItems: SidebarItem[] = [
  { icon: Home, label: 'Home' },
  { icon: Users, label: 'My Clients' },
  { icon: FileText, label: 'Content Studio' },
  { icon: Calendar, label: 'Schedule' },
  { icon: TrendingUp, label: 'Earnings' },
  { icon: MessageCircle, label: 'Messages' },
  { icon: Users, label: 'Communities' },
  { icon: Calendar, label: 'Events' },
  { icon: Sparkles, label: 'Ignisha AI' },
  { icon: Mic, label: 'Podcasts' },
  { icon: Newspaper, label: 'News' },
  { icon: User, label: 'Profile' },
  { icon: Settings, label: 'Settings' },
];

export const founderMobileNavItems = [
  { icon: Home, label: 'Home', tab: 'Home Feed', fillIcon: true },
  { icon: Compass, label: 'Discover', tab: 'Discover', fillIcon: false },
  { icon: Home, label: '', tab: '', fillIcon: false }, // Placeholder for center button
  { icon: MessageCircle, label: 'Messages', tab: 'Messages', hasBadge: true, fillIcon: false },
  { icon: User, label: 'Profile', tab: 'Profile', fillIcon: false },
];

export const investorMobileNavItems = [
  { icon: Home, label: 'Home', tab: 'Home Feed', fillIcon: true },
  { icon: Target, label: 'Discover', tab: 'Discover', fillIcon: false },
  { icon: Home, label: '', tab: '', fillIcon: false }, // Placeholder for center button
  { icon: MessageCircle, label: 'Messages', tab: 'Messages', hasBadge: true, fillIcon: false },
  { icon: User, label: 'Profile', tab: 'Profile', fillIcon: false },
];

export const expertMobileNavItems = [
  { icon: Home, label: 'Home', tab: 'Home', fillIcon: true },
  { icon: Users, label: 'Clients', tab: 'My Clients', fillIcon: false },
  { icon: Home, label: '', tab: '', fillIcon: false }, // Placeholder for center button
  { icon: MessageCircle, label: 'Messages', tab: 'Messages', hasBadge: true, fillIcon: false },
  { icon: User, label: 'Profile', tab: 'Profile', fillIcon: false },
];
