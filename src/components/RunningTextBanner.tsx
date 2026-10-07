import React from 'react';
import { Sparkles, Megaphone } from 'lucide-react';

interface RunningTextBannerProps {
  customText?: string;
}

export default function RunningTextBanner({ customText }: RunningTextBannerProps) {
  const primaryText = customText || "SELAMAT DATANG DI MEDIA LAYANAN UMUM (MELAYU)";
  
  const marqueeItems = [
    primaryText,
    "KANWIL DJPb PROVINSI RIAU",
    "INTEGRITAS • TRANSPARANSI • AKUNTABILITAS",
    primaryText,
    "LAYANAN SARPRAS, KEPEGAWAIAN, KINERJA & KEUANGAN TERPADU",
    "BERAKHLAK - BANGGA MELAYANI BANGSA"
  ];

  return (
    <div className="bg-gradient-to-r from-[#032e1e] via-[#083c74] via-[#3b1704] to-[#032e1e] text-white shadow-md border-y border-amber-400/40 relative overflow-hidden shrink-0 select-none">
      {/* Background Traditional Melayu Songket / Pucuk Rebung Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="melayuSongketPattern" width="40" height="36" patternUnits="userSpaceOnUse">
              {/* Malay Diamond & Floral Geometry */}
              <path d="M 20 0 L 40 18 L 20 36 L 0 18 Z" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.7" />
              <path d="M 20 6 L 32 18 L 20 30 L 8 18 Z" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.5" />
              <circle cx="20" cy="18" r="2.5" fill="#fcd34d" opacity="0.8" />
              <path d="M 0 0 L 10 9 M 40 0 L 30 9 M 0 36 L 10 27 M 40 36 L 30 27" stroke="#f59e0b" strokeWidth="0.6" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#melayuSongketPattern)" />
        </svg>
      </div>

      {/* Decorative Gold Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/15 via-transparent to-transparent pointer-events-none"></div>

      <div className="max-w-full mx-auto flex items-center h-9 px-3 relative z-10">
        {/* Left Fixed Badge with Melayu Gold Style */}
        <div className="shrink-0 flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 px-2.5 py-0.5 rounded-md font-extrabold text-[11px] tracking-wider uppercase shadow-sm border border-amber-200/50 mr-3">
          <Megaphone className="w-3.5 h-3.5 animate-bounce text-slate-950" />
          <span>INFO MELAYU</span>
        </div>

        {/* Marquee Outer Container with Gradient Masking Edges */}
        <div className="relative overflow-hidden flex-1 flex items-center h-full">
          {/* Fade edges matching dark background */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#032e1e] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#032e1e] to-transparent z-10 pointer-events-none"></div>

          {/* Marquee Track (Double repeat for seamless infinite loop) */}
          <div className="animate-marquee flex items-center whitespace-nowrap space-x-8 text-xs font-semibold tracking-wide font-display">
            {/* Repeat list twice for smooth scroll loop */}
            {[...marqueeItems, ...marqueeItems].map((text, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <span className="font-extrabold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider text-xs">
                  {text}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
