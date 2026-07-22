import React from "react";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  textColor?: string;
  labelColor?: string;
  trackColor?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  className = "",
  showLabel = true,
  textColor,
  labelColor,
  trackColor = "stroke-slate-200",
}) => {
  // Map score (0-9) to a percentage (0-100)
  const percentage = (score / 9) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color mapping based on band score
  const getColor = (s: number) => {
    if (s >= 7.5) return { stroke: "stroke-yellow-400", text: "text-yellow-600", bg: "bg-yellow-50" };
    if (s >= 6.5) return { stroke: "stroke-blue-700", text: "text-blue-700", bg: "bg-blue-50" };
    if (s >= 5.0) return { stroke: "stroke-amber-500", text: "text-amber-600", bg: "bg-amber-50" };
    return { stroke: "stroke-rose-500", text: "text-rose-600", bg: "bg-rose-50" };
  };

  const colors = getColor(score);

  // Proportional typography sizing based on gauge radius/size
  const isSmall = size < 100;
  const numberClass = textColor || (isSmall ? "text-2xl font-black text-white" : "text-4xl font-black text-blue-900");
  const subtextClass = labelColor || (isSmall ? "text-[8px] font-bold tracking-wider text-yellow-300 uppercase" : "text-[10px] font-bold tracking-widest text-slate-500 uppercase");

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} id="score-gauge-container">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Track */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`${trackColor} fill-none`}
            strokeWidth={strokeWidth}
          />
          {/* Active Score Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`fill-none transition-all duration-1000 ease-out ${colors.stroke}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Score Value Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
          <span className={`leading-none font-black tracking-tight ${isSmall ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"} ${textColor || "text-blue-900"}`}>
            {score.toFixed(1)}
          </span>
          <span className={`leading-tight mt-0.5 font-extrabold uppercase ${isSmall ? "text-[8px] tracking-wider" : "text-[10px] tracking-widest"} ${labelColor || "text-slate-500"}`}>
            BAND SCORE
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={`mt-2 text-xs font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
          {score >= 8.0 ? "Very Good / Expert" : score >= 7.0 ? "Good User" : score >= 6.0 ? "Competent" : score >= 5.0 ? "Modest User" : "Limited / Weak"}
        </span>
      )}
    </div>
  );
};
