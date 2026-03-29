import React from "react";

interface LogoIconProps {
  className?: string;
  textColor?: string;
  goldStart?: string;
  goldEnd?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  className,
  textColor = "#0A1A35",
  goldStart = "#E6C769",
  goldEnd = "#B89434",
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="JahKnowsPR Logo Icon"
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: goldStart, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: goldEnd, stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Top Letters: JK */}
      <text
        x="48"
        y="45"
        fontSize="42"
        fontWeight="700"
        fontFamily="'Cinzel Decorative', serif"
        textAnchor="middle"
        fill={textColor}
        style={{ letterSpacing: "-0.05em" }}
      >
        JK
      </text>

      {/* Bottom Letters: PR */}
      <text
        x="48"
        y="82"
        fontSize="42"
        fontWeight="700"
        fontFamily="'Cinzel Decorative', serif"
        textAnchor="middle"
        fill={textColor}
        style={{ letterSpacing: "0.0em" }}
      >
        PR
      </text>

      {/* Detailed Natural Crescent Feather */}
      <g transform="translate(65, 28)">
        <path
          d="M0,0 C 10,-12, 28,-18, 42,-8 C 38,2, 28,8, 18,6 C 10,4, 3,1, 0,0 Z"
          fill="url(#goldGradient)"
          stroke={goldEnd}
          strokeWidth="0.5"
          strokeLinejoin="bevel"
          strokeDasharray="1 0.5"
        />
        <path
          d="M0,0 C 10,-12, 28,-18, 40,-9"
          stroke={goldEnd}
          strokeWidth="0.75"
          fill="none"
          opacity="0.9"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

