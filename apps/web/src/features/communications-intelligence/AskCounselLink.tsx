import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { askCounselPath, type CiCounselPrefill } from "./workspace";

export function AskCounselLink({
  prefill,
  search = "",
  children = "Ask JahKnowsPR",
  className,
}: {
  prefill?: CiCounselPrefill;
  search?: string;
  children?: string;
  className?: string;
}) {
  const to = askCounselPath(prefill, search);
  return (
    <Link
      to={to}
      className={cn("text-sm text-primary underline underline-offset-4", className)}
    >
      {children}
    </Link>
  );
}
