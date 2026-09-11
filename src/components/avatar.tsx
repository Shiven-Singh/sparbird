/**
 * A line portrait for a caller, drawn from their id so the same person always gets the same face
 * and no two callers look alike. White strokes, nothing photographic.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function Avatar({ seed, className = "size-16" }: { seed: string; className?: string }) {
  const h = hash(seed);
  const hair = h % 5;
  const eyes = (h >> 3) % 3;
  const mouth = (h >> 6) % 3;
  const collar = (h >> 9) % 3;
  const wide = (h >> 12) % 2 === 0;
  const rx = wide ? 14.5 : 12.5;

  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <svg viewBox="0 0 64 64" aria-hidden className={`${className} text-text`}>
      {/* shoulders */}
      {collar === 0 ? (
        <path d="M8 64c2-9 9-14 17-16 3 3 11 3 14 0 8 2 15 7 17 16" {...stroke} />
      ) : collar === 1 ? (
        <>
          <path d="M8 64c2-9 9-14 17-16l7 8 7-8c8 2 15 7 17 16" {...stroke} />
          <path d="M25 48l7 14 7-14" {...stroke} />
        </>
      ) : (
        <>
          <path d="M8 64c2-9 8-13 15-15h18c7 2 13 6 15 15" {...stroke} />
          <path d="M24 49v-4h16v4" {...stroke} />
        </>
      )}
      {/* neck */}
      <path d="M27 40v7M37 40v7" {...stroke} />
      {/* head */}
      <ellipse cx="32" cy="27" rx={rx} ry="15.5" {...stroke} />
      {/* hair */}
      {hair === 0 ? (
        <path d={`M${32 - rx} 24c1-9 6-13 ${rx * 2 - 2} -12 6 1 ${rx - 3} 5 ${rx - 1} 12`} {...stroke} />
      ) : hair === 1 ? (
        <>
          <path d={`M${32 - rx} 23c2-9 8-12 ${rx * 2 - 4} -11 5 1 ${rx - 2} 4 ${rx - 1} 11`} {...stroke} />
          <path d="M22 20c4-3 10-5 18-3" {...stroke} />
        </>
      ) : hair === 2 ? (
        <>
          <path d={`M${32 - rx} 22c1-8 6-12 ${rx * 2 - 2} -11 6 1 ${rx - 3} 4 ${rx - 1} 11`} {...stroke} />
          <path d={`M${32 - rx} 22v22M${32 + rx} 22v22`} {...stroke} />
        </>
      ) : hair === 3 ? (
        <>
          <path d={`M${32 - rx} 23c1-8 6-12 ${rx * 2 - 2} -11 6 1 ${rx - 3} 4 ${rx - 1} 11`} {...stroke} />
          <circle cx="32" cy="9" r="4" {...stroke} />
        </>
      ) : (
        <path d={`M${32 - rx + 1} 22c2-3 4-4 6-2 2-3 5-4 7-2 2-3 5-3 7 0 2-1 4 0 5 2`} {...stroke} />
      )}
      {/* eyes */}
      {eyes === 0 ? (
        <>
          <circle cx="26.5" cy="27" r="1.4" fill="currentColor" />
          <circle cx="37.5" cy="27" r="1.4" fill="currentColor" />
        </>
      ) : eyes === 1 ? (
        <>
          <circle cx="26.5" cy="27.5" r="4" {...stroke} />
          <circle cx="37.5" cy="27.5" r="4" {...stroke} />
          <path d="M30.5 27.5h3" {...stroke} />
        </>
      ) : (
        <>
          <path d="M24 27.5c1.5-1.5 3.5-1.5 5 0" {...stroke} />
          <path d="M35 27.5c1.5-1.5 3.5-1.5 5 0" {...stroke} />
        </>
      )}
      {/* mouth */}
      {mouth === 0 ? (
        <path d="M27.5 34.5c2.5 2 6.5 2 9 0" {...stroke} />
      ) : mouth === 1 ? (
        <path d="M28 35h8" {...stroke} />
      ) : (
        <path d="M28.5 35.5c2-1.2 5-1.2 7 0" {...stroke} />
      )}
    </svg>
  );
}
