/**
 * A rendered bust for a caller: a clay figure lit from the top left, in greys, drawn from the
 * caller's id so the same person always gets the same face and no two look alike. Nothing
 * photographic, nobody real.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SKIN: Array<[string, string, string]> = [
  ["#f0f0f0", "#b9b9b9", "#6e6e6e"],
  ["#d9d9d9", "#9c9c9c", "#565656"],
  ["#b8b8b8", "#7d7d7d", "#3f3f3f"],
];

export function Avatar({ seed, className = "size-24" }: { seed: string; className?: string }) {
  const h = hash(seed);
  const hair = h % 5;
  const skin = SKIN[(h >> 3) % SKIN.length]!;
  const glasses = (h >> 6) % 3 === 0;
  const beard = (h >> 8) % 4 === 0 && hair !== 2 && hair !== 3;
  const smile = (h >> 10) % 2 === 0;
  const collar = (h >> 12) % 3;
  const wide = (h >> 14) % 2 === 0;
  const rx = wide ? 25 : 22.5;
  const u = seed.replace(/[^a-z0-9]/gi, "").slice(0, 12) || "a";

  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className}>
      <defs>
        <radialGradient id={`${u}-skin`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={skin[0]} />
          <stop offset="55%" stopColor={skin[1]} />
          <stop offset="100%" stopColor={skin[2]} />
        </radialGradient>
        <radialGradient id={`${u}-hair`} cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#7a7a7a" />
          <stop offset="60%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#171717" />
        </radialGradient>
        <linearGradient id={`${u}-shirt`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#4a4a4a" />
          <stop offset="100%" stopColor="#141414" />
        </linearGradient>
        <linearGradient id={`${u}-neck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin[2]} />
          <stop offset="100%" stopColor={skin[1]} />
        </linearGradient>
        <radialGradient id={`${u}-glow`} cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${u}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* light behind the figure */}
      <circle cx="60" cy="66" r="56" fill={`url(#${u}-glow)`} />

      {/* shadow the bust casts */}
      <ellipse cx="60" cy="116" rx="34" ry="5" fill="#000" opacity="0.55" filter={`url(#${u}-blur)`} />

      {/* torso */}
      {collar === 0 ? (
        <path d="M18 120c2-16 14-25 30-29 4 4 20 4 24 0 16 4 28 13 30 29Z" fill={`url(#${u}-shirt)`} />
      ) : collar === 1 ? (
        <>
          <path d="M18 120c2-16 14-25 30-29l12 12 12-12c16 4 28 13 30 29Z" fill={`url(#${u}-shirt)`} />
          <path d="M48 91l12 13 12-13-4-2-8 9-8-9Z" fill="#6a6a6a" opacity="0.7" />
        </>
      ) : (
        <>
          <path d="M18 120c2-15 12-23 26-27h32c14 4 24 12 26 27Z" fill={`url(#${u}-shirt)`} />
          <rect x="44" y="84" width="32" height="10" rx="3" fill="#555" />
        </>
      )}

      {/* neck, with the head's shadow on it */}
      <rect x="51" y="70" width="18" height="22" rx="6" fill={`url(#${u}-neck)`} />
      <ellipse cx="60" cy="76" rx="12" ry="5" fill="#000" opacity="0.35" filter={`url(#${u}-blur)`} />

      {/* ears */}
      <ellipse cx={60 - rx - 1} cy="52" rx="4" ry="5.5" fill={skin[1]} />
      <ellipse cx={60 + rx + 1} cy="52" rx="4" ry="5.5" fill={skin[1]} />

      {/* head */}
      <ellipse cx="60" cy="50" rx={rx} ry="27" fill={`url(#${u}-skin)`} />
      {/* specular */}
      <ellipse cx="50" cy="34" rx="9" ry="6" fill="#fff" opacity="0.22" transform="rotate(-25 50 34)" />

      {/* hair */}
      {hair === 0 ? (
        <path d={`M${60 - rx} 46c0-17 10-26 ${rx * 2 - 3} -25 ${rx - 4} 3 ${rx} 10 ${rx + 3} 25-4-10-14-14-25-13-11-1-21 3-27 13Z`} fill={`url(#${u}-hair)`} />
      ) : hair === 1 ? (
        <>
          <path d={`M${60 - rx} 46c0-17 10-26 ${rx * 2 - 3} -25 ${rx - 4} 3 ${rx} 10 ${rx + 3} 25-4-10-14-14-25-13-11-1-21 3-27 13Z`} fill={`url(#${u}-hair)`} />
          <path d="M40 34c8-6 20-8 34-4-4-4-10-7-18-7s-13 4-16 11Z" fill="#2a2a2a" opacity="0.7" />
        </>
      ) : hair === 2 ? (
        <>
          <path d={`M${60 - rx - 4} 100V48c0-19 12-28 ${rx * 2 + 5} -27 12 2 ${rx + 3} 8 ${rx + 4} 27v52c-4-4-6-10-6-18V56c-3-9-12-13-24-12-11 1-19 5-22 12v26c0 8-2 14-6 18Z`} fill={`url(#${u}-hair)`} />
        </>
      ) : hair === 3 ? (
        <>
          <circle cx="60" cy="18" r="9" fill={`url(#${u}-hair)`} />
          <path d={`M${60 - rx} 46c0-17 10-25 ${rx * 2 - 3} -24 ${rx - 4} 3 ${rx} 9 ${rx + 3} 24-4-9-14-13-25-12-11-1-21 3-27 12Z`} fill={`url(#${u}-hair)`} />
        </>
      ) : (
        <path d={`M${60 - rx + 2} 40c2-10 12-16 ${rx * 2 - 8} -16 8 1 ${rx - 3} 7 ${rx - 2} 16-4-6-14-9-25-8-10 0-18 3-23 8Z`} fill={`url(#${u}-hair)`} opacity="0.55" />
      )}

      {/* brows */}
      <path d="M46 42c3-2 8-2 11 0" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M63 42c3-2 8-2 11 0" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />

      {/* eyes */}
      <ellipse cx="51.5" cy="50" rx="2.6" ry="3" fill="#161616" />
      <ellipse cx="68.5" cy="50" rx="2.6" ry="3" fill="#161616" />
      <circle cx="52.5" cy="49" r="0.9" fill="#fff" opacity="0.9" />
      <circle cx="69.5" cy="49" r="0.9" fill="#fff" opacity="0.9" />

      {/* nose, as shading */}
      <path d="M60 50c-2 5-3 8-1 10" stroke="#000" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.18" />

      {/* mouth */}
      {smile ? (
        <path d="M53 65c3.5 3.5 10.5 3.5 14 0" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
      ) : (
        <path d="M54 65.5c3 1.5 9 1.5 12 0" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
      )}

      {/* beard */}
      {beard ? (
        <path d={`M${60 - rx + 3} 56c2 14 8 21 21 22 13-1 19-8 21-22-3 9-10 15-21 15-11 0-18-6-21-15Z`} fill={`url(#${u}-hair)`} opacity="0.85" />
      ) : null}

      {/* glasses */}
      {glasses ? (
        <>
          <circle cx="51.5" cy="50" r="7" stroke="#e8e8e8" strokeWidth="1.6" fill="#fff" fillOpacity="0.06" />
          <circle cx="68.5" cy="50" r="7" stroke="#e8e8e8" strokeWidth="1.6" fill="#fff" fillOpacity="0.06" />
          <path d="M58.5 50h3" stroke="#e8e8e8" strokeWidth="1.6" />
        </>
      ) : null}
    </svg>
  );
}
