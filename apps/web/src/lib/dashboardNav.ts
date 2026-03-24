import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Lightbulb,
  Calendar,
  Video,
  BookText,
  FolderOpen,
  Briefcase,
  CalendarDays,
  CalendarClock,
  UserCheck,
  Target,
  Mail,
  BarChart3,
  FileBarChart,
  Settings,
  Shield,
  Sparkles,
  Megaphone,
  Wand2,
  Layers,
  Globe,
} from "lucide-react";

export interface NavItem {
  key: string;
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Sidebar structure: DASHBOARD, STRATEGY, CONTENT OPERATIONS, CLIENT MANAGEMENT, GROWTH, PERFORMANCE, SYSTEM */
export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    label: "DASHBOARD",
    items: [{ key: "overview", title: "Overview", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "STRATEGY",
    items: [
      { key: "inspired", title: "Get Inspired", url: "/dashboard/get-inspired", icon: Sparkles },
      { key: "blueprints", title: "Brand Blueprints", url: "/dashboard/blueprints", icon: FileText },
      { key: "audience", title: "Target Audience", url: "/dashboard/audience", icon: Users },
      { key: "strategy", title: "Brand Strategy", url: "/dashboard/strategy", icon: Lightbulb },
      { key: "sources", title: "Intelligence Sources", url: "/dashboard/sources", icon: Globe, adminOnly: true },
    ],
  },
  {
    label: "KORA AI",
    items: [
      { key: "content-strategy", title: "Content Strategy", url: "/dashboard/content-strategy", icon: Layers },
      { key: "campaign-generator", title: "Campaign Generator", url: "/dashboard/campaign-generator", icon: Wand2 },
      { key: "campaigns", title: "Campaigns", url: "/dashboard/campaigns", icon: Megaphone },
    ],
  },
  {
    label: "CONTENT OPERATIONS",
    items: [
      { key: "calendar", title: "Content Calendar", url: "/dashboard/calendar", icon: Calendar },
      { key: "filming", title: "Filming Schedule", url: "/dashboard/filming", icon: Video },
      { key: "blog", title: "Blog Management", url: "/dashboard/blog", icon: BookText, adminOnly: true },
      { key: "assets", title: "Asset Library", url: "/dashboard/assets", icon: FolderOpen },
    ],
  },
  {
    label: "CLIENT MANAGEMENT",
    items: [
      { key: "meetings", title: "Meetings", url: "/dashboard/meetings", icon: Briefcase },
      {
        key: "strategy-session-calendar",
        title: "Strategy Session calendar",
        url: "/dashboard/strategy-session-calendar",
        icon: CalendarClock,
        adminOnly: true,
      },
      { key: "events", title: "Events", url: "/dashboard/events", icon: CalendarDays, adminOnly: true },
      { key: "clients", title: "Active Clients", url: "/dashboard/clients", icon: UserCheck, adminOnly: true },
    ],
  },
  {
    label: "GROWTH",
    items: [
      { key: "leads", title: "Leads", url: "/dashboard/leads", icon: Target, adminOnly: true },
      { key: "subscribers", title: "Subscribers", url: "/dashboard/subscribers", icon: Mail, adminOnly: true },
    ],
  },
  {
    label: "PERFORMANCE",
    items: [
      { key: "analytics", title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
      { key: "reports", title: "Reports", url: "/dashboard/reports", icon: FileBarChart },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { key: "admin", title: "Admin", url: "/dashboard/clients", icon: Shield },
      { key: "settings", title: "Settings", url: "/dashboard/settings", icon: Settings },
    ],
  },
];

export const ADMIN_ONLY_KEYS = [
  "blog",
  "events",
  "leads",
  "subscribers",
  "clients",
  "admin",
  "sources",
  "strategy-session-calendar",
];
export const ADMIN_TAB_KEY = "admin";
