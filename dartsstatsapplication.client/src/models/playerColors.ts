// Stable per-player identity colour, keyed by the player's position in the
// game's player order (not a ranking) - reuses the app's existing accent
// blue for the first player rather than inventing an unrelated hue. Shared
// across ScoringConsole/ScoreLedgerPanel/StatsPanel so a player reads as the
// same "person" everywhere they appear in Match Center.
const PLAYER_COLORS = ['#3498db', '#8e44ad', '#16a085']

export function playerColor(playerIndex: number): string {
  return PLAYER_COLORS[playerIndex] ?? '#95a5a6'
}
