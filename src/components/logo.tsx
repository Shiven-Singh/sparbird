/**
 * The mark and the wordmark, cut from the original artwork (public/sparbird-*.png).
 * `onDark` flips the ink to paper for the rail.
 */
export function Mark({ className = "size-8", onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/sparbird-mark.png"
      alt=""
      aria-hidden
      className={`${className} select-none ${onDark ? "invert" : ""}`}
      draggable={false}
    />
  );
}

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark onDark={onDark} />
      <span className="font-brand text-[22px] leading-none font-bold tracking-tight">sparbird</span>
    </span>
  );
}
