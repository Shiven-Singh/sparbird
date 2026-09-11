/**
 * The mark and the wordmark, cut from the original artwork (public/sparbird-*.png).
 * The files are ink on transparent; `invert` turns them white for the black theme.
 */
export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/sparbird-mark.png" alt="" aria-hidden className={`${className} invert select-none`} draggable={false} />
  );
}

export function Wordmark({ className = "h-7" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/sparbird-wordmark.png" alt="Sparbird" className={`${className} w-auto invert select-none`} draggable={false} />
  );
}
