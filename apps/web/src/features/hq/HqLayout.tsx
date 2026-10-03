import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  FileText,
  BookOpen,
  Newspaper,
  Scale,
  Briefcase,
  Settings,
  UserCog,
  Search,
  LogOut,
  Menu,
  X,
  Radar,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { useHqAuth } from "./HqAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { hqApi } from "./api";
import { Link } from "react-router-dom";

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  module: Parameters<ReturnType<typeof useHqAuth>["can"]>[0];
};

const COMMAND: NavItem[] = [
  { label: "Dashboard", to: "/hq", icon: LayoutDashboard, module: "dashboard" },
];

const BUSINESS: NavItem[] = [
  { label: "CRM", to: "/hq/crm", icon: Users, module: "crm" },
  { label: "Clients", to: "/hq/clients", icon: Building2, module: "clients" },
  { label: "Tasks", to: "/hq/tasks", icon: CheckSquare, module: "tasks" },
];

const INTELLIGENCE: NavItem[] = [
  {
    label: "Communications",
    to: "/hq/intelligence",
    icon: Radar,
    module: "intelligence",
  },
];

const CONTENT: NavItem[] = [
  { label: "Content", to: "/hq/content", icon: FileText, module: "content" },
  { label: "The Brief", to: "/hq/content?type=the-brief", icon: BookOpen, module: "content" },
  { label: "SPAM Report", to: "/hq/content?type=spam-report", icon: Newspaper, module: "content" },
  { label: "PR Court", to: "/hq/content?type=pr-court", icon: Scale, module: "content" },
  { label: "Case Studies", to: "/hq/content?type=case-study", icon: Briefcase, module: "content" },
];

const OPERATIONS: NavItem[] = [
  { label: "Team", to: "/hq/team", icon: UserCog, module: "team" },
  { label: "Settings", to: "/hq/settings", icon: Settings, module: "settings" },
];

function NavSection({
  title,
  items,
  can,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  can: ReturnType<typeof useHqAuth>["can"];
  onNavigate?: () => void;
}) {
  const visible = items.filter((i) => can(i.module));
  if (!visible.length) return null;
  return (
    <div className="mb-6">
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark/90">
        {title}
      </p>
      <ul className="space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to + item.label}>
              <NavLink
                to={item.to}
                end={item.to === "/hq" || item.to === "/hq/intelligence"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-600 hover:bg-cream hover:text-primary",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HqLayout() {
  const { user } = useAuth();
  const { hqRole, can } = useHqAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    leads: { id: string; full_name: string }[];
    clients: { id: string; client_name: string }[];
    content: { id: string; title: string }[];
  } | null>(null);

  const onSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    try {
      const data = await hqApi.search(value);
      setResults(data as typeof results);
    } catch {
      setResults(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-[#0A1A35] text-white">
      <div className="border-b border-white/10 px-4 py-5">
        <p className="font-serif text-lg font-bold tracking-tight">JahKnowsPR HQ</p>
        <p className="text-[11px] text-white/60 mt-0.5">Strategic Communications Operations</p>
        {hqRole ? (
          <p className="mt-2 inline-flex rounded-full bg-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
            {hqRole}
          </p>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <NavSection title="Command Center" items={COMMAND} can={can} onNavigate={() => setMobileOpen(false)} />
        <NavSection title="Business" items={BUSINESS} can={can} onNavigate={() => setMobileOpen(false)} />
        <NavSection
          title="Communications"
          items={INTELLIGENCE}
          can={can}
          onNavigate={() => setMobileOpen(false)}
        />
        <NavSection title="Content" items={CONTENT} can={can} onNavigate={() => setMobileOpen(false)} />
        <NavSection title="Operations" items={OPERATIONS} can={can} onNavigate={() => setMobileOpen(false)} />
        <div className="px-3 pt-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30 mb-2">Later</p>
          <p className="text-xs text-white/35 leading-relaxed">
            Sessions · Projects · Media · Pitches · Placements · Revenue · Documents
          </p>
        </div>
      </nav>
      <div className="border-t border-white/10 p-3 space-y-2">
        <p className="truncate px-2 text-xs text-white/50">{user?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-cream/40 text-foreground overflow-hidden">
      <div className="hidden lg:block">{sidebar}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => void onSearch(e.target.value)}
              placeholder="Search clients, leads, content…"
              className="pl-9 bg-background"
            />
            {results ? (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg p-2 text-sm max-h-72 overflow-auto">
                {!results.leads.length && !results.clients.length && !results.content.length ? (
                  <p className="px-2 py-3 text-muted-foreground">No matches</p>
                ) : (
                  <>
                    {results.clients.map((c) => (
                      <Link
                        key={c.id}
                        to={`/hq/clients/${c.id}`}
                        className="block rounded px-2 py-1.5 hover:bg-muted"
                        onClick={() => setResults(null)}
                      >
                        Client · {c.client_name}
                      </Link>
                    ))}
                    {results.leads.map((l) => (
                      <Link
                        key={l.id}
                        to={`/hq/crm/${l.id}`}
                        className="block rounded px-2 py-1.5 hover:bg-muted"
                        onClick={() => setResults(null)}
                      >
                        Lead · {l.full_name}
                      </Link>
                    ))}
                    {results.content.map((p) => (
                      <Link
                        key={p.id}
                        to={`/hq/content/${p.id}`}
                        className="block rounded px-2 py-1.5 hover:bg-muted"
                        onClick={() => setResults(null)}
                      >
                        Content · {p.title}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            ) : null}
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary hidden sm:inline">
            Public site
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
