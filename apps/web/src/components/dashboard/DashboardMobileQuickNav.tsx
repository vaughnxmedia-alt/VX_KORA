import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  flattenVisibleNavItems,
  isNavItemActive,
  useDashboardNav,
} from "@/hooks/useDashboardNav";

export function DashboardMobileQuickNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { visibleNavGroups } = useDashboardNav();

  const allItems = useMemo(
    () => flattenVisibleNavItems(visibleNavGroups),
    [visibleNavGroups],
  );

  const activeItem = useMemo(
    () => allItems.find((item) => isNavItemActive(location.pathname, item)),
    [allItems, location.pathname],
  );

  if (allItems.length === 0) return null;

  return (
    <div className="border-b bg-muted/30 px-4 py-2 md:hidden">
      <Select
        value={activeItem?.url ?? ""}
        onValueChange={(url) => {
          if (url) navigate(url);
        }}
      >
        <SelectTrigger className="h-10 w-full bg-background">
          <SelectValue placeholder="Jump to dashboard page">
            {activeItem?.title ?? "Dashboard pages"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[min(70vh,28rem)]">
          {visibleNavGroups.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.items.map((item) => (
                <SelectItem key={item.key} value={item.url}>
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.title}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Full dashboard navigation, grouped like desktop.
      </p>
    </div>
  );
}
