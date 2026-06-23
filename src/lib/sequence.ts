// Sequential record numbers (client/case/invoice/quote numbers) must never repeat.
// count()-based generation breaks the moment any record is ever deleted — the count
// drops, so the next insert reuses an already-issued number and hits the unique
// constraint. This derives the next number from the highest number actually on file.
export async function nextNumber(opts: {
  current: () => Promise<string | null>; // highest existing formatted number with this prefix, or null
  prefix: string;
  padLen: number;
  start: number;
}): Promise<string> {
  const last = await opts.current();
  const lastNum = last ? parseInt(last.slice(opts.prefix.length), 10) : opts.start - 1;
  return `${opts.prefix}${String(lastNum + 1).padStart(opts.padLen, "0")}`;
}
