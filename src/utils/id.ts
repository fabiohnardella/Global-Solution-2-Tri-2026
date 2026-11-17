/** Gera um id curto e único o bastante para uso local (sem dependência externa). */
export function createId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${time}-${random}`;
}
