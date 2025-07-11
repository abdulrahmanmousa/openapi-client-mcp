export function safeClone<T>(obj: T, depth = 10, seen = new WeakSet()): T {
  if (depth <= 0 || obj === null || typeof obj !== "object") return obj;
  if (seen.has(obj as any)) return undefined as any;
  seen.add(obj as any);
  if (Array.isArray(obj)) {
    return obj.map((item) => safeClone(item, depth - 1, seen)) as any;
  }
  const out: any = {};
  for (const key of Object.keys(obj)) {
    out[key] = safeClone((obj as any)[key], depth - 1, seen);
  }
  return out;
}
