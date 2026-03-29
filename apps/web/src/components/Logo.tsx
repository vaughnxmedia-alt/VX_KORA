import React from "react";
import { cn } from "@/lib/utils";
import { LogoIcon } from "./LogoIcon";

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "light" | "dark";
}

// Define specific colors based on the reference image and gold requirements
const COLORS = {
  darkBlue: "#0A1A35", // Deep navy from the image letters
  goldStart: "#E6C769", // Bright gold light part
  goldEnd: "#B89434",   // Richer gold shadow part
};

export const Logo: React.FC<LogoProps> = ({
  className,
  showText = true,
  variant = "dark",
}) => {
  // Determine text color based on variant
  const textColor = variant === "light" ? "white" : COLORS.darkBlue;
  const mutedTextColor = variant === "light" ? "rgba(255,255,255,0.8)" : COLORS.darkBlue;
  
  return (
    <div className={cn("flex items-center gap-2 select-none relative", className)}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <LogoIcon 
          className="w-full h-full overflow-visible" 
          textColor={textColor}
          goldStart={COLORS.goldStart}
          goldEnd={COLORS.goldEnd}
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center items-center text-center">
          <span
            className={cn(
              "text-xl font-bold leading-none tracking-tight",
            )}
            style={{ fontFamily: "'Cinzel Decorative', serif", color: textColor }}
          >
            JahKnowsPR
          </span>
          <span
            className={cn(
              "text-[0.65rem] font-semibold tracking-[0.2em] uppercase opacity-80 mt-1",
            )}
            style={{ color: mutedTextColor }}
          >
            Firm
          </span>
        </div>
      )}
    </div>
  );
};
