/**
 * The mark and the wordmark. The bird is drawn inline so it takes the current text colour.
 * If you have the original artwork, drop it in public/ and swap the <svg> for an <img>.
 */
export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className} fill="currentColor">
      <circle cx="49" cy="13" r="9.5" />
      <circle cx="42" cy="25" r="9" />
      <path d="M2 42 Q31.4 43.2 50 22 Q25.1 27.4 2 42 Z" />
      <path d="M2 56 Q25.2 54 40 36 Q19.6 43.3 2 56 Z" />
      <path d="M56 10 L64 12.5 L56 15 Z" />
      <circle cx="52" cy="11" r="1.9" className="fill-paper-2" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark />
      <span className="font-brand text-[22px] leading-none font-bold tracking-tight">sparbird</span>
    </span>
  );
}
