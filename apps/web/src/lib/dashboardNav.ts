import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
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
  Megaphone,
  Wand2,
  Globe,
  Truck,
  SearchCheck,
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
      { key: "intake", title: "Intake", url: "/dashboard/intake", icon: ClipboardList, adminOnly: true },
      { key: "blueprints", title: "Brand Identities", url: "/dashboard/identities", icon: FileText },
      { key: "audience", title: "Audiences", url: "/dashboard/audience", icon: Users },
    ],
  },
  {
    label: "CAMPAIGN MANAGEMENT",
    items: [
      { key: "creative-hub", title: "Creative Hub", url: "/dashboard/creative-hub", icon: Wand2 },
      { key: "campaigns", title: "Campaigns", url: "/dashboard/campaigns", icon: Megaphone },
      { key: "logistics", title: "Logistics", url: "/dashboard/logistics", icon: Truck },
    ],
  },
  {
    label: "CONTENT OPERATIONS",
    items: [
      { key: "calendar", title: "Content Calendar", url: "/dashboard/calendar", icon: Calendar },
      { key: "filming", title: "Filming Schedule", url: "/dashboard/filming", icon: Video },
      { key: "blog", title: "Blog Management", url: "/dashboard/blog", icon: BookText },
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
    ],
  },
  {
    label: "GROWTH",
    items: [
      { key: "audits", title: "Audits", url: "/dashboard/audits", icon: SearchCheck, adminOnly: true },
      { key: "leads", title: "Leads", url: "/dashboard/leads", icon: Target, adminOnly: true },
      { key: "subscribers", title: "Subscribers", url: "/dashboard/subscribers", icon: Mail },
      { key: "clients", title: "Telegram users", url: "/dashboard/clients", icon: UserCheck, adminOnly: true },
    ],
  },
  {
    label: "PERFORMANCE",
    items: [
      { key: "sources", title: "Intelligence Sources", url: "/dashboard/sources", icon: Globe, adminOnly: true },
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
  "events",
  "leads",
  "audits",
  "clients",
  "intake",
  "admin",
  "sources",
  "strategy-session-calendar",
];
export const ADMIN_TAB_KEY = "admin";

/** Every sidebar route key the owner can grant to workers (clients); used for Users → Sidebar permissions. */
export type SidebarPermissionTabDef = {
  key: string;
  title: string;
  group: string;
  adminOnly?: boolean;
};

export function getSidebarPermissionTabDefinitions(): SidebarPermissionTabDef[] {
  const fromNav = DASHBOARD_NAV_GROUPS.flatMap((g) =>
    g.items.map((item) => ({
      key: item.key,
      title: item.title,
      group: g.label,
      adminOnly: item.adminOnly,
    })),
  );
  return [
    ...fromNav,
    { key: "get-inspired", title: "KORA", group: "FOOTER" },
  ];
}
