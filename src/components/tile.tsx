/** A square tile with someone's initials, so every caller has a face in a list. */
export function initialsOf(displayName: string): string {
  const bracketed = displayName.match(/\(([A-Z]{1,3})\)/);
  if (bracketed) return bracketed[1]!;
  const words = displayName
    .replace(/^the\s+/i, "")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 || /^[A-Z]/.test(w));
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Tile({ name, mark = false, className = "" }: { name: string; mark?: boolean; className?: string }) {
  return (
    <span aria-hidden className={`tile ${mark ? "tile-mark" : ""} ${className}`}>
      {initialsOf(name)}
    </span>
  );
}
