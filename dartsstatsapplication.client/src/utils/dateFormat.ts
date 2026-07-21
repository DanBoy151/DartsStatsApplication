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

// Australia/Brisbane stays on AEST (UTC+10) year-round - unlike
// Australia/Sydney/Melbourne, it never shifts to AEDT for daylight saving -
// so it's used here as a fixed stand-in for "AEST" regardless of the
// viewer's own timezone or the time of year.
const AEST_TIME_ZONE = 'Australia/Brisbane'

/** yyyy-mm-dd for `date` as it falls in AEST, independent of the viewer's local timezone. */
function toAESTDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AEST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** True when `date`'s AEST calendar day is today or earlier, per the current AEST date. */
export function isTodayOrPastAEST(date: Date): boolean {
  if (isNaN(date.getTime())) return false
  return toAESTDateKey(date) <= toAESTDateKey(new Date())
}
