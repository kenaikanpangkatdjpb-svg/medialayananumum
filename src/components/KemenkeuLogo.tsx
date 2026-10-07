import React, { useState, useEffect } from 'react';
import { subscribeAppSettings } from '../lib/firebase';

interface KemenkeuLogoProps {
  className?: string;
  size?: number;
  customSrc?: string;
}

export default function KemenkeuLogo({ className = "w-8 h-8", size, customSrc }: KemenkeuLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (customSrc !== undefined) return customSrc;
    return localStorage.getItem('app_custom_logo') || null;
  });

  useEffect(() => {
    if (customSrc !== undefined) {
      setLogoUrl(customSrc);
      return;
    }

    // 1. Initial check from localStorage
    const savedLogo = localStorage.getItem('app_custom_logo');
    if (savedLogo) {
      setLogoUrl(savedLogo);
    }

    // 2. Listen to local event updates
    const handleLogoChange = () => {
      const updated = localStorage.getItem('app_custom_logo');
      setLogoUrl(updated || null);
    };

    window.addEventListener('app_logo_updated', handleLogoChange);

    // 3. Listen to real-time Firestore synchronization for cross-device consistency (PC & Mobile)
    const unsubscribe = subscribeAppSettings((settings) => {
      if (settings.logoUrl) {
        setLogoUrl(settings.logoUrl);
      } else if (settings.logoUrl === null) {
        setLogoUrl(null);
      }
    });

    return () => {
      window.removeEventListener('app_logo_updated', handleLogoChange);
      unsubscribe();
    };
  }, [customSrc]);

  const sizeStyle = size ? { width: `${size}px`, height: `${size}px` } : {};

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Logo Instansi / Kementerian Keuangan"
        className={`object-contain shrink-0 bg-transparent ${className}`}
        style={sizeStyle}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 500 500"
      className={`shrink-0 ${className}`}
      style={sizeStyle}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Kementerian Keuangan RI"
    >
      <defs>
        {/* Drop shadow for ribbon */}
        <filter id="ribbonShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>

        {/* Curved Path for Text NAGARA DANA RAKÇA */}
        <path id="kemenkeuTextCurve" d="M 165,392 Q 250,370 335,392" />
      </defs>

      {/* 1. OUTER WHITE BAND WITH BLACK FRAME (BINGKAI RESMI KEMENKEU RI) */}
      <polygon
        points="250,14 485,182 396,448 104,448 15,182"
        fill="#FFFFFF"
        stroke="#18181B"
        strokeWidth="6"
        strokeLinejoin="miter"
      />

      {/* 2. MAIN ROYAL BLUE PENTAGON SHIELD */}
      <polygon
        points="250,28 468,188 382,434 118,434 32,188"
        fill="#0D5CA8"
        stroke="#18181B"
        strokeWidth="5"
        strokeLinejoin="miter"
      />

      {/* 3. GOLDEN WINGS (SAYAP EMAS - SYMMETRICAL 9-FEATHER WINGS) */}
      <g stroke="#18181B" strokeWidth="2.4" strokeLinejoin="round" fill="#FFC800">
        {/* Left Wing Feathers */}
        <path d="M 215,348 C 170,368 128,375 110,365 C 100,358 112,342 135,332 C 165,320 198,328 215,348 Z" />
        <path d="M 210,332 C 160,345 115,348 95,338 C 85,330 98,315 125,305 C 158,295 192,308 210,332 Z" />
        <path d="M 205,312 C 150,320 102,320 85,308 C 76,300 90,285 120,278 C 155,270 188,288 205,312 Z" />
        <path d="M 200,292 C 142,295 92,290 78,278 C 70,270 85,255 118,250 C 152,245 182,268 200,292 Z" />
        <path d="M 198,270 C 138,268 88,258 75,245 C 68,236 82,222 115,220 C 150,218 180,245 198,270 Z" />
        <path d="M 196,245 C 135,238 86,225 76,210 C 70,200 85,188 118,190 C 152,192 180,222 196,245 Z" />
        <path d="M 195,220 C 135,205 88,190 80,175 C 75,165 92,152 125,158 C 158,162 182,198 195,220 Z" />
        <path d="M 195,195 C 140,172 95,152 90,138 C 86,128 105,118 135,128 C 168,138 185,175 195,195 Z" />
        <path d="M 196,170 C 148,138 108,118 105,105 C 102,96 122,88 150,102 C 178,115 188,150 196,170 Z" />

        {/* Wing Base Swirl Left */}
        <path d="M 215,350 C 200,360 185,372 175,370 C 165,368 165,355 180,345 C 195,335 210,340 215,350 Z" />

        {/* Right Wing Feathers (Flipped) */}
        <path d="M 285,348 C 330,368 372,375 390,365 C 400,358 388,342 365,332 C 335,320 302,328 285,348 Z" />
        <path d="M 290,332 C 340,345 385,348 405,338 C 415,330 402,315 375,305 C 342,295 308,308 290,332 Z" />
        <path d="M 295,312 C 350,320 398,320 415,308 C 424,300 410,285 380,278 C 345,270 312,288 295,312 Z" />
        <path d="M 300,292 C 358,295 408,290 422,278 C 430,270 415,255 382,250 C 348,245 318,268 300,292 Z" />
        <path d="M 302,270 C 362,268 412,258 425,245 C 432,236 418,222 385,220 C 350,218 320,245 302,270 Z" />
        <path d="M 304,245 C 365,238 414,225 424,210 C 430,200 415,188 382,190 C 348,192 320,222 304,245 Z" />
        <path d="M 305,220 C 365,205 412,190 420,175 C 425,165 408,152 375,158 C 342,162 318,198 305,220 Z" />
        <path d="M 305,195 C 360,172 405,152 410,138 C 414,128 395,118 365,128 C 332,138 315,175 305,195 Z" />
        <path d="M 304,170 C 352,138 392,118 395,105 C 398,96 378,88 350,102 C 322,115 312,150 304,170 Z" />

        {/* Wing Base Swirl Right */}
        <path d="M 285,350 C 300,360 315,372 325,370 C 335,368 335,355 320,345 C 305,335 290,340 285,350 Z" />
      </g>

      {/* 4. PADI (RICE STALK - LEFT OF CENTER) */}
      <g>
        {/* Main Stem */}
        <path d="M 206,340 Q 190,290 194,155 Q 195,120 188,110" fill="none" stroke="#15803D" strokeWidth="2.5" />

        {/* Golden Rice Grains */}
        <g fill="#FFC800" stroke="#18181B" strokeWidth="1.4" strokeLinejoin="round">
          {/* Top Grain */}
          <path d="M 188,110 C 185,102 188,94 188,94 C 188,94 191,102 188,110 Z" />
          
          {/* Pair 1 */}
          <path d="M 188,118 C 178,112 174,118 174,118 C 174,118 183,125 188,118 Z" />
          <path d="M 188,118 C 198,112 202,118 202,118 C 202,118 193,125 188,118 Z" />

          {/* Pair 2 */}
          <path d="M 190,135 C 180,128 174,136 174,136 C 174,136 184,143 190,135 Z" />
          <path d="M 190,135 C 200,128 206,136 206,136 C 206,136 196,143 190,135 Z" />

          {/* Pair 3 */}
          <path d="M 192,152 C 181,145 174,154 174,154 C 174,154 185,161 192,152 Z" />
          <path d="M 192,152 C 203,145 210,154 210,154 C 210,154 199,161 192,152 Z" />

          {/* Pair 4 */}
          <path d="M 193,170 C 182,162 175,172 175,172 C 175,172 186,180 193,170 Z" />
          <path d="M 193,170 C 204,162 211,172 211,172 C 211,172 200,180 193,170 Z" />

          {/* Pair 5 */}
          <path d="M 194,188 C 183,180 176,190 176,190 C 176,190 187,198 194,188 Z" />
          <path d="M 194,188 C 205,180 212,190 212,190 C 212,190 201,198 194,188 Z" />

          {/* Pair 6 */}
          <path d="M 195,206 C 184,198 177,208 177,208 C 177,208 188,216 195,206 Z" />
          <path d="M 195,206 C 206,198 213,208 213,208 C 213,208 202,216 195,206 Z" />

          {/* Pair 7 */}
          <path d="M 196,224 C 185,216 178,226 178,226 C 178,226 189,234 196,224 Z" />
          <path d="M 196,224 C 207,216 214,226 214,226 C 214,226 203,234 196,224 Z" />

          {/* Pair 8 */}
          <path d="M 197,242 C 186,234 179,244 179,244 C 179,244 190,252 197,242 Z" />
          <path d="M 197,242 C 208,234 215,244 215,244 C 215,244 204,252 197,242 Z" />

          {/* Pair 9 */}
          <path d="M 198,260 C 187,252 180,262 180,262 C 180,262 191,270 198,260 Z" />
          <path d="M 198,260 C 209,252 216,262 216,262 C 216,262 205,270 198,260 Z" />

          {/* Pair 10 */}
          <path d="M 199,278 C 188,270 181,280 181,280 C 181,280 192,288 199,278 Z" />
          <path d="M 199,278 C 210,270 217,280 217,280 C 217,280 206,288 199,278 Z" />
        </g>
      </g>

      {/* 5. KAPAS (COTTON STALK - RIGHT OF CENTER) */}
      <g>
        {/* Main Stem */}
        <path d="M 294,340 Q 310,290 306,155 Q 305,120 312,110" fill="none" stroke="#15803D" strokeWidth="2.5" />

        {/* Cotton Blooms (Green Sepal + White Fluff with Black outlines) */}
        <g stroke="#18181B" strokeWidth="1.4">
          {/* Bloom 1 (Top) */}
          <path d="M 307,105 Q 312,100 317,105 Q 312,112 307,105 Z" fill="#16a34a" />
          <circle cx="312" cy="100" r="5" fill="#FFFFFF" />

          {/* Bloom 2 */}
          <path d="M 304,125 Q 310,120 316,125 Q 310,132 304,125 Z" fill="#16a34a" />
          <circle cx="310" cy="120" r="6" fill="#FFFFFF" />

          {/* Bloom 3 */}
          <path d="M 302,148 Q 308,142 314,148 Q 308,155 302,148 Z" fill="#16a34a" />
          <circle cx="308" cy="142" r="6.5" fill="#FFFFFF" />

          {/* Bloom 4 */}
          <path d="M 301,171 Q 307,165 313,171 Q 307,178 301,171 Z" fill="#16a34a" />
          <circle cx="307" cy="165" r="7" fill="#FFFFFF" />

          {/* Bloom 5 */}
          <path d="M 300,194 Q 306,188 312,194 Q 306,201 300,194 Z" fill="#16a34a" />
          <circle cx="306" cy="188" r="7" fill="#FFFFFF" />

          {/* Bloom 6 */}
          <path d="M 299,217 Q 305,211 311,217 Q 305,224 299,217 Z" fill="#16a34a" />
          <circle cx="305" cy="211" r="7.5" fill="#FFFFFF" />

          {/* Bloom 7 */}
          <path d="M 298,240 Q 304,234 310,240 Q 304,247 298,240 Z" fill="#16a34a" />
          <circle cx="304" cy="234" r="7.5" fill="#FFFFFF" />

          {/* Bloom 8 */}
          <path d="M 297,263 Q 303,257 309,263 Q 303,270 297,263 Z" fill="#16a34a" />
          <circle cx="303" cy="257" r="8" fill="#FFFFFF" />

          {/* Bloom 9 */}
          <path d="M 296,286 Q 302,280 308,286 Q 302,293 296,286 Z" fill="#16a34a" />
          <circle cx="302" cy="280" r="8" fill="#FFFFFF" />
        </g>
      </g>

      {/* 6. CENTER GADA / MENARA PERSEDIAAN (GOLDEN SLENDER TOWER) */}
      <g stroke="#18181B" strokeWidth="2" strokeLinejoin="round" fill="#FFC800">
        {/* Base Pedestal Pot */}
        <path d="M 230,342 Q 250,348 270,342 L 275,362 Q 250,370 225,362 Z" />
        <path d="M 220,360 Q 250,370 280,360 Q 285,372 278,375 Q 250,380 222,375 Z" />

        {/* Gada Tower Ribbed Segments */}
        <ellipse cx="250" cy="132" rx="17" ry="8" />
        <path d="M 233,132 Q 250,138 267,132 L 268,145 Q 250,152 232,145 Z" />
        <path d="M 232,145 Q 250,152 268,145 L 269,160 Q 250,167 231,160 Z" />
        <path d="M 231,160 Q 250,167 269,160 L 270,176 Q 250,183 230,176 Z" />
        <path d="M 230,176 Q 250,183 270,176 L 271,193 Q 250,200 229,193 Z" />
        <path d="M 229,193 Q 250,200 271,193 L 272,211 Q 250,218 228,211 Z" />
        <path d="M 228,211 Q 250,218 272,211 L 273,230 Q 250,237 227,230 Z" />
        <path d="M 227,230 Q 250,237 273,230 L 274,250 Q 250,257 226,250 Z" />
        <path d="M 226,250 Q 250,257 274,250 L 275,271 Q 250,278 225,271 Z" />
        <path d="M 225,271 Q 250,278 275,271 L 276,293 Q 250,300 224,293 Z" />
        <path d="M 224,293 Q 250,300 276,293 L 277,316 Q 250,323 223,316 Z" />
        <path d="M 223,316 Q 250,323 277,316 L 278,340 Q 250,347 222,340 Z" />

        {/* Dome Cap at top of Gada */}
        <path d="M 233,132 C 233,110 267,110 267,132 Z" />
        <circle cx="250" cy="115" r="4" fill="#FFC800" stroke="#18181B" strokeWidth="1.5" />
      </g>

      {/* 7. BANNER SCROLL (PITA WHITE BANNER "NAGARA DANA RAKÇA") */}
      <g>
        {/* Banner Tails/Ends Left & Right */}
        <path d="M 142,390 L 165,372 L 165,410 L 142,420 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M 358,390 L 335,372 L 335,410 L 358,420 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.2" strokeLinejoin="round" />

        {/* Main Curved White Banner Body */}
        <path
          d="M 152,390 C 210,368 290,368 348,390 L 340,422 C 285,400 215,400 160,422 Z"
          fill="#FFFFFF"
          stroke="#18181B"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Text NAGARA DANA RAKÇA on Path */}
        <text
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="17"
          fill="#111827"
          letterSpacing="1.2"
        >
          <textPath href="#kemenkeuTextCurve" startOffset="50%" textAnchor="middle">
            NAGARA DANA RAKÇA
          </textPath>
        </text>
      </g>
    </svg>
  );
}

export const KEMENKEU_LOGO_SVG_HTML = `<svg viewBox="0 0 500 500" style="width:100%;height:100%;" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logo Kementerian Keuangan RI"><defs><filter id="ribbonShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" /></filter><path id="kemenkeuTextCurve" d="M 165,392 Q 250,370 335,392" /></defs><polygon points="250,14 485,182 396,448 104,448 15,182" fill="#FFFFFF" stroke="#18181B" stroke-width="6" stroke-linejoin="miter" /><polygon points="250,28 468,188 382,434 118,434 32,188" fill="#0D5CA8" stroke="#18181B" stroke-width="5" stroke-linejoin="miter" /><g stroke="#18181B" stroke-width="2.4" stroke-linejoin="round" fill="#FFC800"><path d="M 215,348 C 170,368 128,375 110,365 C 100,358 112,342 135,332 C 165,320 198,328 215,348 Z" /><path d="M 210,332 C 160,345 115,348 95,338 C 85,330 98,315 125,305 C 158,295 192,308 210,332 Z" /><path d="M 205,312 C 150,320 102,320 85,308 C 76,300 90,285 120,278 C 155,270 188,288 205,312 Z" /><path d="M 200,292 C 142,295 92,290 78,278 C 70,270 85,255 118,250 C 152,245 182,268 200,292 Z" /><path d="M 198,270 C 138,268 88,258 75,245 C 68,236 82,222 115,220 C 150,218 180,245 198,270 Z" /><path d="M 196,245 C 135,238 86,225 76,210 C 70,200 85,188 118,190 C 152,192 180,222 196,245 Z" /><path d="M 195,220 C 135,205 88,190 80,175 C 75,165 92,152 125,158 C 158,162 182,198 195,220 Z" /><path d="M 195,195 C 140,172 95,152 90,138 C 86,128 105,118 135,128 C 168,138 185,175 195,195 Z" /><path d="M 196,170 C 148,138 108,118 105,105 C 102,96 122,88 150,102 C 178,115 188,150 196,170 Z" /><path d="M 215,350 C 200,360 185,372 175,370 C 165,368 165,355 180,345 C 195,335 210,340 215,350 Z" /><path d="M 285,348 C 330,368 372,375 390,365 C 400,358 388,342 365,332 C 335,320 302,328 285,348 Z" /><path d="M 290,332 C 340,345 385,348 405,338 C 415,330 402,315 375,305 C 342,295 308,308 290,332 Z" /><path d="M 295,312 C 350,320 398,320 415,308 C 424,300 410,285 380,278 C 345,270 312,288 295,312 Z" /><path d="M 300,292 C 358,295 408,290 422,278 C 430,270 415,255 382,250 C 348,245 318,268 300,292 Z" /><path d="M 302,270 C 362,268 412,258 425,245 C 432,236 418,222 385,220 C 350,218 320,245 302,270 Z" /><path d="M 304,245 C 365,238 414,225 424,210 C 430,200 415,188 382,190 C 348,192 320,222 304,245 Z" /><path d="M 305,220 C 365,205 412,190 420,175 C 425,165 408,152 375,158 C 342,162 318,198 305,220 Z" /><path d="M 305,195 C 360,172 405,152 410,138 C 414,128 395,118 365,128 C 332,138 315,175 305,195 Z" /><path d="M 304,170 C 352,138 392,118 395,105 C 398,96 378,88 350,102 C 322,115 312,150 304,170 Z" /><path d="M 285,350 C 300,360 315,372 325,370 C 335,368 335,355 320,345 C 305,335 290,340 285,350 Z" /></g><g><path d="M 206,340 Q 190,290 194,155 Q 195,120 188,110" fill="none" stroke="#15803D" stroke-width="2.5" /><g fill="#FFC800" stroke="#18181B" stroke-width="1.4" stroke-linejoin="round"><path d="M 188,110 C 185,102 188,94 188,94 C 188,94 191,102 188,110 Z" /><path d="M 188,118 C 178,112 174,118 174,118 C 174,118 183,125 188,118 Z" /><path d="M 188,118 C 198,112 202,118 202,118 C 202,118 193,125 188,118 Z" /><path d="M 190,135 C 180,128 174,136 174,136 C 174,136 184,143 190,135 Z" /><path d="M 190,135 C 200,128 206,136 206,136 C 206,136 196,143 190,135 Z" /><path d="M 192,152 C 181,145 174,154 174,154 C 174,154 185,161 192,152 Z" /><path d="M 192,152 C 203,145 210,154 210,154 C 210,154 199,161 192,152 Z" /><path d="M 193,170 C 182,162 175,172 175,172 C 175,172 186,180 193,170 Z" /><path d="M 193,170 C 204,162 211,172 211,172 C 211,172 200,180 193,170 Z" /><path d="M 194,188 C 183,180 176,190 176,190 C 176,190 187,198 194,188 Z" /><path d="M 194,188 C 205,180 212,190 212,190 C 212,190 201,198 194,188 Z" /><path d="M 195,206 C 184,198 177,208 177,208 C 177,208 188,216 195,206 Z" /><path d="M 195,206 C 206,198 213,208 213,208 C 213,208 202,216 195,206 Z" /><path d="M 196,224 C 185,216 178,226 178,226 C 178,226 189,234 196,224 Z" /><path d="M 196,224 C 207,216 214,226 214,226 C 214,226 203,234 196,224 Z" /><path d="M 197,242 C 186,234 179,244 179,244 C 179,244 190,252 197,242 Z" /><path d="M 197,242 C 208,234 215,244 215,244 C 215,244 204,252 197,242 Z" /><path d="M 198,260 C 187,252 180,262 180,262 C 180,262 191,270 198,260 Z" /><path d="M 198,260 C 209,252 216,262 216,262 C 216,262 205,270 198,260 Z" /><path d="M 199,278 C 188,270 181,280 181,280 C 181,280 192,288 199,278 Z" /><path d="M 199,278 C 210,270 217,280 217,280 C 217,280 206,288 199,278 Z" /></g></g><g><path d="M 294,340 Q 310,290 306,155 Q 305,120 312,110" fill="none" stroke="#15803D" stroke-width="2.5" /><g stroke="#18181B" stroke-width="1.4"><path d="M 307,105 Q 312,100 317,105 Q 312,112 307,105 Z" fill="#16a34a" /><circle cx="312" cy="100" r="5" fill="#FFFFFF" /><path d="M 304,125 Q 310,120 316,125 Q 310,132 304,125 Z" fill="#16a34a" /><circle cx="310" cy="120" r="6" fill="#FFFFFF" /><path d="M 302,148 Q 308,142 314,148 Q 308,155 302,148 Z" fill="#16a34a" /><circle cx="308" cy="142" r="6.5" fill="#FFFFFF" /><path d="M 301,171 Q 307,165 313,171 Q 307,178 301,171 Z" fill="#16a34a" /><circle cx="307" cy="165" r="7" fill="#FFFFFF" /><path d="M 300,194 Q 306,188 312,194 Q 306,201 300,194 Z" fill="#16a34a" /><circle cx="306" cy="188" r="7" fill="#FFFFFF" /><path d="M 299,217 Q 305,211 311,217 Q 305,224 299,217 Z" fill="#16a34a" /><circle cx="305" cy="211" r="7.5" fill="#FFFFFF" /><path d="M 298,240 Q 304,234 310,240 Q 304,247 298,240 Z" fill="#16a34a" /><circle cx="304" cy="234" r="7.5" fill="#FFFFFF" /><path d="M 297,263 Q 303,257 309,263 Q 303,270 297,263 Z" fill="#16a34a" /><circle cx="303" cy="257" r="8" fill="#FFFFFF" /><path d="M 296,286 Q 302,280 308,286 Q 302,293 296,286 Z" fill="#16a34a" /><circle cx="302" cy="280" r="8" fill="#FFFFFF" /></g></g><g stroke="#18181B" stroke-width="2" stroke-linejoin="round" fill="#FFC800"><path d="M 230,342 Q 250,348 270,342 L 275,362 Q 250,370 225,362 Z" /><path d="M 220,360 Q 250,370 280,360 Q 285,372 278,375 Q 250,380 222,375 Z" /><ellipse cx="250" cy="132" rx="17" ry="8" /><path d="M 233,132 Q 250,138 267,132 L 268,145 Q 250,152 232,145 Z" /><path d="M 232,145 Q 250,152 268,145 L 269,160 Q 250,167 231,160 Z" /><path d="M 231,160 Q 250,167 269,160 L 270,176 Q 250,183 230,176 Z" /><path d="M 230,176 Q 250,183 270,176 L 271,193 Q 250,200 229,193 Z" /><path d="M 229,193 Q 250,200 271,193 L 272,211 Q 250,218 228,211 Z" /><path d="M 228,211 Q 250,218 272,211 L 273,230 Q 250,237 227,230 Z" /><path d="M 227,230 Q 250,237 273,230 L 274,250 Q 250,257 226,250 Z" /><path d="M 226,250 Q 250,257 274,250 L 275,271 Q 250,278 225,271 Z" /><path d="M 225,271 Q 250,278 275,271 L 276,293 Q 250,300 224,293 Z" /><path d="M 224,293 Q 250,300 276,293 L 277,316 Q 250,323 223,316 Z" /><path d="M 223,316 Q 250,323 277,316 L 278,340 Q 250,347 222,340 Z" /><path d="M 233,132 C 233,110 267,110 267,132 Z" /><circle cx="250" cy="115" r="4" fill="#FFC800" stroke="#18181B" stroke-width="1.5" /></g><g><path d="M 142,390 L 165,372 L 165,410 L 142,420 Z" fill="#FFFFFF" stroke="#18181B" stroke-width="2.2" stroke-linejoin="round" /><path d="M 358,390 L 335,372 L 335,410 L 358,420 Z" fill="#FFFFFF" stroke="#18181B" stroke-width="2.2" stroke-linejoin="round" /><path d="M 152,390 C 210,368 290,368 348,390 L 340,422 C 285,400 215,400 160,422 Z" fill="#FFFFFF" stroke="#18181B" stroke-width="2.5" stroke-linejoin="round" /><text font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="17" fill="#111827" letter-spacing="1.2"><textPath href="#kemenkeuTextCurve" startOffset="50%" text-anchor="middle">NAGARA DANA RAKÇA</textPath></text></g></svg>`;

