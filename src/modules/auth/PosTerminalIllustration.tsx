import React from 'react';

interface PosTerminalIllustrationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 3D Smart POS Terminal Illustration
 * Faithful vector recreation of the hero 3D terminal from PRODX_LOGIN_UI_REFERENCE.png
 * Features:
 * - Glowing circular amber/orange platform with concentric orbital light rings
 * - Isometric matte black dual-screen terminal displaying orange velocity charts
 * - Integrated thermal receipt printer with emerging white receipt paper
 * - Three ascending 3D orange bar chart columns
 */
export const PosTerminalIllustration: React.FC<PosTerminalIllustrationProps> = ({
  className = '',
  size = 'md',
}) => {
  const id = React.useId().replace(/:/g, '');

  const dimensions = {
    sm: { width: 260, height: 210 },
    md: { width: 380, height: 310 },
    lg: { width: 480, height: 390 },
  }[size];

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 480 390"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-full drop-shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
        aria-hidden="true"
      >
        <defs>
          {/* Ambient Glow */}
          <radialGradient id={`platform-glow-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
          </radialGradient>

          {/* Podium Top Disc */}
          <linearGradient id={`podium-top-${id}`} x1="120" y1="220" x2="360" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="30%" stopColor="#3B82F6" />
            <stop offset="80%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>

          {/* Podium Edge Cylinder */}
          <linearGradient id={`podium-edge-${id}`} x1="70" y1="285" x2="410" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="40%" stopColor="#2563EB" />
            <stop offset="70%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Inner Light Ring */}
          <linearGradient id={`ring-glow-${id}`} x1="140" y1="230" x2="340" y2="310" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="50%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Terminal Main Body Stand */}
          <linearGradient id={`stand-face-${id}`} x1="200" y1="180" x2="280" y2="270" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2D3039" />
            <stop offset="60%" stopColor="#1A1C22" />
            <stop offset="100%" stopColor="#0E0F14" />
          </linearGradient>

          <linearGradient id={`stand-side-${id}`} x1="170" y1="220" x2="250" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1F2128" />
            <stop offset="100%" stopColor="#0B0C10" />
          </linearGradient>

          {/* Terminal Screen Frame */}
          <linearGradient id={`screen-bezel-${id}`} x1="190" y1="120" x2="310" y2="230" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3A3E4A" />
            <stop offset="50%" stopColor="#1C1E24" />
            <stop offset="100%" stopColor="#101116" />
          </linearGradient>

          {/* Terminal Screen Display (Glowing POS Dashboard) */}
          <linearGradient id={`screen-content-${id}`} x1="200" y1="130" x2="300" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="40%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#090D16" />
          </linearGradient>

          {/* Chart Blue Bars on Screen */}
          <linearGradient id={`chart-bar-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Bar 1 (Shortest, Left) */}
          <linearGradient id={`pillar1-front-${id}`} x1="330" y1="210" x2="355" y2="290" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id={`pillar1-top-${id}`} x1="330" y1="210" x2="355" y2="225" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>

          {/* Bar 2 (Medium, Center) */}
          <linearGradient id={`pillar2-front-${id}`} x1="365" y1="170" x2="395" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id={`pillar2-top-${id}`} x1="365" y1="170" x2="395" y2="185" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Bar 3 (Tallest, Right) */}
          <linearGradient id={`pillar3-front-${id}`} x1="405" y1="130" x2="435" y2="270" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id={`pillar3-top-${id}`} x1="405" y1="130" x2="435" y2="145" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Printer & Receipt */}
          <linearGradient id={`printer-body-${id}`} x1="160" y1="220" x2="210" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2C2E38" />
            <stop offset="100%" stopColor="#14151B" />
          </linearGradient>
          <linearGradient id={`receipt-paper-${id}`} x1="170" y1="210" x2="195" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#F0F1F5" />
            <stop offset="100%" stopColor="#D9DCE3" />
          </linearGradient>
        </defs>

        {/* 1. Ambient Radial Aura / Atmosphere */}
        <ellipse cx="240" cy="275" rx="200" ry="85" fill={`url(#platform-glow-${id})`} />

        {/* 2. Concentric Orbit Light Rings */}
        <ellipse
          cx="240"
          cy="275"
          rx="190"
          ry="75"
          stroke="#FFA040"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeDasharray="6 6"
        />
        <ellipse
          cx="240"
          cy="275"
          rx="165"
          ry="65"
          stroke="#FF7A00"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />

        {/* 3. Lower Platform Base Cylinder Thickness */}
        <path
          d="M75 275 C75 315 145 345 240 345 C335 345 405 315 405 275 L405 295 C405 335 335 365 240 365 C145 365 75 335 75 295 Z"
          fill={`url(#podium-edge-${id})`}
        />

        {/* 4. Podium Top Disc Surface */}
        <ellipse cx="240" cy="275" rx="165" ry="65" fill={`url(#podium-top-${id})`} />

        {/* 5. Glowing Inset Ring Accent on Podium */}
        <ellipse
          cx="240"
          cy="275"
          rx="145"
          ry="55"
          stroke={`url(#ring-glow-${id})`}
          strokeWidth="2.5"
          strokeOpacity="0.8"
        />

        {/* 6. Cast Shadow under Terminal Base & Pillars */}
        <ellipse cx="230" cy="280" rx="90" ry="32" fill="#050608" fillOpacity="0.5" />
        <ellipse cx="380" cy="275" rx="55" ry="18" fill="#050608" fillOpacity="0.35" />

        {/* 7. Cash Drawer / Counter Base Platform (Dark Graphite Box) */}
        {/* Drawer Left Face */}
        <path d="M165 260 L215 285 L215 305 L165 280 Z" fill="#131418" />
        {/* Drawer Front Face */}
        <path d="M215 285 L295 245 L295 265 L215 305 Z" fill="#1A1C22" />
        {/* Drawer Top Face */}
        <path d="M165 260 L245 220 L295 245 L215 285 Z" fill="#262832" />
        {/* Drawer Keyhole / Seam */}
        <line x1="250" y1="272" x2="265" y2="265" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />

        {/* 8. POS Terminal Stand Pillar */}
        <path d="M235 225 L255 215 L255 170 L235 180 Z" fill={`url(#stand-side-${id})`} />
        <path d="M255 215 L275 225 L275 180 L255 170 Z" fill={`url(#stand-face-${id})`} />

        {/* 9. Dual-Screen Terminal Head Unit (Tilted Angle) */}
        {/* Screen Bezel Back Casing */}
        <path
          d="M200 135 L285 90 L305 130 L220 175 Z"
          fill="#111216"
        />
        {/* Screen Bezel Front Face */}
        <path
          d="M205 130 L290 85 L315 135 L230 180 Z"
          fill={`url(#screen-bezel-${id})`}
          stroke="#474B59"
          strokeWidth="1.5"
        />
        {/* Screen Inner Glass Display */}
        <path
          d="M212 133 L283 95 L307 137 L236 175 Z"
          fill={`url(#screen-content-${id})`}
        />

        {/* Screen UI Contents: Header bar + PRODX Logo on Screen + Chart */}
        {/* Mini PRODX Logo icon on screen */}
        <circle cx="225" cy="130" r="4" fill="#3B82F6" />
        <line x1="233" y1="128" x2="255" y2="118" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />

        {/* Mini Bar Chart Graph on Screen Display */}
        <path d="M225 158 L232 154 L232 163 L225 167 Z" fill={`url(#chart-bar-${id})`} />
        <path d="M236 150 L243 146 L243 163 L236 167 Z" fill={`url(#chart-bar-${id})`} />
        <path d="M247 142 L254 138 L254 163 L247 167 Z" fill={`url(#chart-bar-${id})`} />
        <path d="M258 132 L265 128 L265 163 L258 167 Z" fill={`url(#chart-bar-${id})`} />
        <path d="M269 122 L276 118 L276 163 L269 167 Z" fill={`url(#chart-bar-${id})`} />

        {/* Trend Line crossing bars */}
        <path
          d="M225 158 L240 148 L255 135 L275 115"
          stroke="#93C5FD"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="275" cy="115" r="2" fill="#FFFFFF" />

        {/* 10. Thermal Receipt Printer (Left of Terminal) */}
        {/* Printer Box Left */}
        <path d="M155 240 L185 255 L185 275 L155 260 Z" fill={`url(#printer-body-${id})`} />
        {/* Printer Box Front */}
        <path d="M185 255 L220 238 L220 258 L185 275 Z" fill="#20222A" />
        {/* Printer Box Top */}
        <path d="M155 240 L190 223 L220 238 L185 255 Z" fill="#323642" />
        {/* Printer Paper Slot */}
        <path d="M170 237 L205 220 L208 222 L173 239 Z" fill="#0C0D10" />

        {/* Emerging Curled White Receipt Paper */}
        <path
          d="M175 235 C175 220 185 210 195 205 C205 200 210 210 205 222 L198 226 C195 218 190 215 185 220 C180 225 178 230 178 234 Z"
          fill={`url(#receipt-paper-${id})`}
          stroke="#E0E3EB"
          strokeWidth="0.8"
        />
        {/* Lines on receipt paper */}
        <line x1="185" y1="216" x2="193" y2="212" stroke="#8E95A5" strokeWidth="1" strokeLinecap="round" />
        <line x1="187" y1="220" x2="197" y2="215" stroke="#8E95A5" strokeWidth="1" strokeLinecap="round" />

        {/* 11. Three 3D Vertical Bar Chart Columns (Ascending Sales Velocity) */}

        {/* --- Bar 1 (Shortest) --- */}
        {/* Left Shadow Side */}
        <path d="M335 240 L350 248 L350 288 L335 280 Z" fill="#1E3A8A" />
        {/* Front Bright Side */}
        <path d="M350 248 L365 240 L365 280 L350 288 Z" fill={`url(#pillar1-front-${id})`} />
        {/* Top Diamond Face */}
        <path d="M335 240 L350 232 L365 240 L350 248 Z" fill={`url(#pillar1-top-${id})`} />

        {/* --- Bar 2 (Medium) --- */}
        {/* Left Shadow Side */}
        <path d="M370 195 L387 204 L387 275 L370 266 Z" fill="#1E40AF" />
        {/* Front Bright Side */}
        <path d="M387 204 L404 195 L404 266 L387 275 Z" fill={`url(#pillar2-front-${id})`} />
        {/* Top Diamond Face */}
        <path d="M370 195 L387 186 L404 195 L387 204 Z" fill={`url(#pillar2-top-${id})`} />

        {/* --- Bar 3 (Tallest) --- */}
        {/* Left Shadow Side */}
        <path d="M410 150 L428 159 L428 262 L410 253 Z" fill="#1D4ED8" />
        {/* Front Bright Side */}
        <path d="M428 159 L446 150 L446 253 L428 262 Z" fill={`url(#pillar3-front-${id})`} />
        {/* Top Diamond Face */}
        <path d="M410 150 L428 141 L446 150 L428 159 Z" fill={`url(#pillar3-top-${id})`} />

        {/* 12. Sparkle / Specular Highlights */}
        <circle cx="428" cy="141" r="2.5" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="387" cy="186" r="2" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="350" cy="232" r="1.5" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="285" cy="90" r="2" fill="#FFFFFF" fillOpacity="0.7" />
      </svg>
    </div>
  );
};
