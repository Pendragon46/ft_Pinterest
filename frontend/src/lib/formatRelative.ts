// Localized relative time ("now" / "2 min" / "1 h" / "yesterday" / "12/03") via
// the built-in Intl APIs — no date library, RTL-correct in every locale.
export function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  const diff = (then - Date.now()) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  if (abs < 60) return rtf.format(0, 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day')
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(then)
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Localized day label for the thread's date separators. */
export function formatDayLabel(
  iso: string,
  locale: string,
  today: string,
  yesterday: string,
): string {
  const d = new Date(iso)
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000)
  if (days === 0) return today
  if (days === 1) return yesterday
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}
