import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  glowColor?: string;
}

export const HUDPanel: React.FC<PanelProps> = ({ children, title, className = "", glowColor = "cyan" }) => {
  const borderColor = glowColor === 'red' ? 'border-red-500/40' : 'border-cyan-500/40';
  const textColor = glowColor === 'red' ? 'text-red-400' : 'text-cyan-400';
  const bgColor = glowColor === 'red' ? 'bg-red-950/10' : 'bg-cyan-950/10';

  return (
    <div className={`relative border ${borderColor} ${bgColor} backdrop-blur-sm p-4 flex flex-col ${className}`}>
      {/* HUD Corner Accents */}
      <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${borderColor}`} />
      <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${borderColor}`} />
      <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${borderColor}`} />
      <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${borderColor}`} />
      
      {title && (
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-1">
          <h3 className={`font-header text-sm tracking-widest uppercase ${textColor}`}>{title}</h3>
          <div className="flex space-x-1">
             <div className={`w-1 h-1 rounded-full ${glowColor === 'red' ? 'bg-red-500' : 'bg-cyan-500'} animate-pulse`}></div>
             <div className={`w-1 h-1 rounded-full ${glowColor === 'red' ? 'bg-red-500' : 'bg-cyan-500'} opacity-50`}></div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden relative z-10">
        {children}
      </div>
    </div>
  );
};

export const HUDButton: React.FC<{ onClick: () => void; label: string; active?: boolean; danger?: boolean }> = ({ onClick, label, active, danger }) => {
  const baseClasses = "px-4 py-2 font-header text-xs uppercase tracking-wider border transition-all duration-200 flex items-center justify-center relative overflow-hidden group";
  
  let colorClasses = "";
  if (danger) {
    colorClasses = active 
      ? "border-red-500 bg-red-500/20 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
      : "border-red-900/50 text-red-700 hover:border-red-500 hover:text-red-400";
  } else {
    colorClasses = active 
      ? "border-cyan-400 bg-cyan-500/20 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
      : "border-cyan-900/50 text-cyan-700 hover:border-cyan-400 hover:text-cyan-400";
  }

  return (
    <button onClick={onClick} className={`${baseClasses} ${colorClasses}`}>
      <span className="relative z-10">{label}</span>
      {/* Hover fill effect */}
      <div className={`absolute inset-0 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${danger ? 'bg-red-500/10' : 'bg-cyan-500/10'}`} />
    </button>
  );
};

export const CircularGauge: React.FC<{ value: number; max: number; label: string; unit: string; color?: string }> = ({ value, max, label, unit, color = "#22d3ee" }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  const dashoffset = circumference - progress;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width="100" height="100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#1e293b"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-header text-white">{value}</span>
        <span className="text-[10px] text-slate-400 uppercase">{unit}</span>
      </div>
      <span className="text-xs mt-2 uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
};