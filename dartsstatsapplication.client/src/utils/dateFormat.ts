/** "15 August 2026" style display date, matching GameSummaryPanel.vue's existing format. */
export function formatDisplayDate(date: Date | string | undefined | null): string {
  if (!date) return ''

  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return typeof date === 'string' ? date : ''

  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = dateObj.toLocaleString('default', { month: 'long' })
  return `${day} ${month} ${dateObj.getFullYear()}`
}

/** yyyy-mm-dd, the value <input type="date"> expects - built from local date parts, not toISOString (which is UTC and can roll to the wrong day). */
export function toDateInputValue(date: Date): string {
  if (isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
