/* ==========================================================================
 * Formatação de distância, tempo e texto (pt-BR)
 * ========================================================================== */

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Distância por extenso para síntese de voz ("50 metros", "1,2 quilômetro"). */
export function formatSpokenDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${rounded} metros`;
  }
  const km = (meters / 1000).toFixed(1).replace('.', ',');
  return km === '1,0' ? '1 quilômetro' : `${km} quilômetros`;
}

export function formatDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'agora';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${pluralize(days, 'dia', 'dias')}`;
  const months = Math.floor(days / 30);
  return `há ${pluralize(months, 'mês', 'meses')}`;
}

export function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** Normaliza texto para busca sem acento e sem diferenciar maiúsculas. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
