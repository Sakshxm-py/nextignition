import { LucideIcon } from 'lucide-react';

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  badge?: number;
}

export interface QuickAction {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export interface Post {
  id: number;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  time: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
}

export interface Event {
  title: string;
  date: string;
  attendees: number;
}

export interface Milestone {
  title: string;
  completed: boolean;
  progress?: number;
}

export interface Connection {
  name: string;
  role: string;
  mutual: number;
  avatar: string;
}

export interface TrendingTopic {
  tag: string;
  posts: number;
}

export interface Story {
  author: string;
  image: string;
  isAdd?: boolean;
  color?: string;
}

export interface Startup {
  id: number;
  name: string;
  tagline: string;
  founder: string;
  industry: string;
  stage: string;
  fundingGoal: string;
  raised: string;
  valuation: string;
  location: string;
  teamSize: number;
  revenue: string;
  growth: string;
  matchScore: number;
}

export type DashboardTab = 
  | 'Home Feed'
  | 'My Startup'
  | 'Discover'
  | 'Messages'
  | 'Communities'
  | 'Funding Portal'
  | 'Events'
  | 'Podcasts'
  | 'News'
  | 'Ignisha AI'
  | 'Profile'
  | 'Settings'
  | 'My Clients'
  | 'Content Studio'
  | 'Schedule'
  | 'Earnings'
  | 'Pipeline'
  | 'Deal Rooms'
  | 'Portfolio'
  | 'Analytics';

export interface DashboardState {
  activeTab: string;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isAIOpen: boolean;
  isNotificationsOpen: boolean;
}
