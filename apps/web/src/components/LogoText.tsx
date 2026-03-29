import React from "react";
import { cn } from "@/lib/utils";

interface LogoTextProps {
  className?: string;
  variant?: "light" | "dark";
}

const COLORS = {
  darkBlue: "#0A1A35",
};

export const LogoText: React.FC<LogoTextProps> = ({
  className,
  variant = "dark",
}) => {
  const textColor = variant === "light" ? "white" : COLORS.darkBlue;
  const mutedTextColor = variant === "light" ? "rgba(255,255,255,0.8)" : COLORS.darkBlue;

  return (
    <div className={cn("flex flex-col justify-center items-center text-center select-none", className)}>
      <span
        className="text-xl font-bold leading-none tracking-tight"
        style={{ fontFamily: "'Cinzel Decorative', serif", color: textColor }}
      >
        JahKnowsPR
      </span>
      <span
        className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase opacity-80 mt-1"
        style={{ color: mutedTextColor }}
      >
        Firm
      </span>
    </div>
  );
};
