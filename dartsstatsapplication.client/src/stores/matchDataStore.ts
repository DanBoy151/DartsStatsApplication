import { defineStore } from 'pinia'
import type { Player } from '@/models/PlayerModel'

export interface MatchDataState {
  matchId: string | null
  opposition: string
  location: string
  date: Date
  availablePlayers: string[]
  games: GameDataState[]
  status: string | null
  gamesFor: number
  gamesAgainst: number
}

export interface MatchAvailablePlayers {
  playerId: string
  name: string
  isAvailable: boolean
}

export interface GameDataState {
  gameId: string
  players: string[] // Array of player Guids
  type: string
  status: string
  result: string
  wonBull: boolean
  order: number
  legs: LegDataState[]
  /** League-configured (or hardcoded-default) leg count/starting score for this game - an immutable snapshot set at game creation. */
  legsToPlay: number
  startingScore: number
  /** null = no League limit configured - a leg never gets decided by bull-off. */
  maxRounds: number | null
}

export interface LegDataState {
  gameId: string
  legId: string
  status: string
  score: { playerId: string, score: number }[] // ordered history of scores for the leg
  result: string
  finishDarts: number
  order: number
  remainingScore: number
  /** True once this leg was decided by bull-off rather than a normal checkout. */
  wonByBullOff: boolean
}

export const useMatchDataStore = defineStore('leg', {
  state: () => ({
    memDateTime: null as Date | null,
    match: null as MatchDataState | null,
    selectedGame: null as GameDataState | null,
    selectedLeg: null as LegDataState | null,
    matchAvailablePlayers: [] as MatchAvailablePlayers[],
    currentPlayer: null as string | null,
    lastError: null as string | null,
  }),
  actions: {
    setMemoryDateTime() {
      this.memDateTime = new Date()
    },
    getMemoryDateTime() {
      return this.memDateTime
    },
    setMatchData(matchID: string, opposition: string, date: Date, location: string, availablePlayers: string[], status: string, gamesFor: number, gamesAgainst: number) {
      // Preserve already-loaded games when this is an update to the SAME
      // match (e.g. updateMatchScore() after completing a game) - only reset
      // to empty when switching to a genuinely different match. Otherwise
      // every call here (including ones mid-match, after games have already
      // been fetched) wipes the games list back to [], which is what made
      // GameSummaryPanel go blank right after completing a game.
      const existingGames = this.match?.matchId === matchID ? this.match.games : []

      this.match = {
        matchId: matchID,
        opposition: opposition,
        date: date,
        location: location,
        availablePlayers: availablePlayers,
        games: existingGames,
        status: status,
        gamesFor: gamesFor,
        gamesAgainst: gamesAgainst
      }
      this.setMemoryDateTime()
    },
    clearStore() {
      this.match = null;
      this.selectedGame = null;
      this.selectedLeg = null;
      this.memDateTime = null;
      this.matchAvailablePlayers = [];
    },
    resetStore() {
      if (!this.memDateTime) return;

      // Clone before adding hours - Date.setHours mutates in place, and
      // mutating memDateTime itself here would silently push its own
      // expiry back by 6 hours every time this runs without expiring.
      const expiry = new Date(this.memDateTime);
      expiry.setHours(expiry.getHours() + 6);

      if (expiry < new Date()) {
        this.clearStore();
      }
    },
    getMatchData() {
      return this.match
    },
    setMatchAvailablePlayers(players: Player[]) {
      // Get the list of available player IDs from the match, if present
      const availableIds = this.match?.availablePlayers ?? [];

      this.matchAvailablePlayers = players.map(player => ({
        playerId: player.playerId,
        name: player.name,
        isAvailable: availableIds.includes(player.playerId)
      }));
    },
    getMatchAvailablePlayers() {
      return this.matchAvailablePlayers
    },
    setPlayerAvailability(playerId: string, isAvailable: boolean) {
      if (!this.matchAvailablePlayers) return;

      const existingIndex = this.matchAvailablePlayers.findIndex(p => p.playerId === playerId);
      if (existingIndex !== -1 && this.matchAvailablePlayers[existingIndex]) {
        // Update existing game
        this.matchAvailablePlayers[existingIndex].isAvailable = isAvailable;
      }
    },
    updateMatchAvailablePlayers() {
      if (!this.match) return;
      // Update the match's availablePlayers based on matchAvailablePlayers
      this.match.availablePlayers = this.matchAvailablePlayers
        .filter(p => p.isAvailable)
        .map(p => p.playerId);
    },
    setGameData(gameID: string, players: string[], type: string, status: string, result: string, wonBull: boolean, order: number, legsToPlay: number, startingScore: number, maxRounds: number | null) {
      if (!this.match) return;

      const existingIndex = this.match.games.findIndex(g => g.gameId === gameID);

      const newGame: GameDataState = {
        gameId: gameID,
        players,
        type,
        status,
        result,
        legs: [],
        wonBull,
        order,
        legsToPlay,
        startingScore,
        maxRounds,
      };

      if (existingIndex !== -1) {
        // Update existing game
        this.match.games[existingIndex] = newGame;
      } else {
        // Add new game
        this.match.games.push(newGame);
      }
    },
    setSelectedGame(gameID: string) {
      if (!this.match) return;

      this.selectedGame = this.match.games.find(g => g.gameId === gameID) || null;
    },
    getSelectedGame() {
      return this.selectedGame;
    },
    doneWithSelectedGame() {
      if (!this.match || !this.selectedGame) return;

      const existingIndex = this.match.games.findIndex(g => g.gameId === this.selectedGame?.gameId);
      const existingGame = existingIndex !== -1 ? this.match.games[existingIndex] : undefined;
      if (existingGame) {
        // setGameData() (called after completing the game, via GameService's
        // completeGame()) already wrote the authoritative status/result into
        // match.games[existingIndex] - it just can't carry `legs` too, since
        // that's client-only state the server response doesn't include.
        // selectedGame is the other way around: it accumulated the real legs
        // during play, but setGameData() replaces the array entry with a new
        // object rather than updating selectedGame's reference, so it never
        // saw that status/result change. Take legs from selectedGame and
        // everything else from what's already in the array, rather than
        // blindly overwriting one with the other (which previously reverted
        // a just-completed game back to its pre-completion status).
        this.match.games[existingIndex] = {
          ...existingGame,
          legs: this.selectedGame.legs,
        };
      }
      this.selectedGame = null;
    },
    setLegData(gameId: string, legId: string, status: string, score: { playerId: string, score: number }[], result: string, finishDarts: number, order: number, remainingScore: number, wonByBullOff: boolean) {
      if (
        !this.match ||
        !Array.isArray(this.match.games) ||
        this.match.games.length === 0 ||
        !this.match.games.some(g => g.gameId === gameId)
      ) {
        return;
      }

      // Find the game to update
      const game = this.match.games.find(g => g.gameId === gameId);
      if (!game) return;

      const existingIndex = game.legs.findIndex(l => l.legId === legId);
      
      const newLeg: LegDataState = {
        gameId,
        legId,
        status,
        score,
        result,
        finishDarts,
        order,
        remainingScore,
        wonByBullOff,
      };

      if (existingIndex !== -1) {
        // Update existing leg
        game.legs[existingIndex] = newLeg;
      } else {
        // Add new leg
        game.legs.push(newLeg);
      }

      if (this.selectedGame && this.selectedGame.gameId === gameId) {
        this.selectedGame = game;
      }

      // Mirrors the selectedGame resync above: setSelectedLeg() is called
      // right before startLeg()/completeLeg() resolve, so selectedLeg can
      // already be pointing at the leg this update just replaced in
      // game.legs[] - without this, further mutations (e.g.
      // updateSelectedLegScore()) land on an orphaned copy that never makes
      // it back into the array, which only surfaces when a leg is abandoned
      // mid-play (Back) and reopened rather than completed.
      if (this.selectedLeg && this.selectedLeg.legId === legId) {
        this.selectedLeg = newLeg;
      }

    },
    setSelectedLeg(legID: string) {
      if (!this.selectedGame) return;

      this.selectedLeg = this.selectedGame.legs.find(l => l.legId === legID) || null;
    },
    clearSelectedLeg() {
      // A freshly-selected game that hasn't been started yet has no leg of
      // its own (legs only exist once StartGame creates them server-side),
      // so nothing here calls setSelectedLeg() to replace the old one -
      // without this, ScoreLedgerPanel/EnterScorePanel (which read
      // selectedLeg/currentPlayer directly, unlike RemainingScorePanel)
      // keep showing whatever game was selected previously.
      this.selectedLeg = null;
      this.currentPlayer = null;
    },
    getSelectedLeg() {
      return this.selectedLeg;
    },
    updateSelectedLegScore(score: Record<string, number>) {
      if (this.selectedLeg) {
        for (const [playerId, value] of Object.entries(score)) {
          this.selectedLeg.score.push({ playerId, score: value });
          this.selectedLeg.remainingScore -= value;
        }
      }
    },
    /**
     * Corrects a previously-recorded throw (e.g. a scorer's mis-entry) at
     * `index` in the current leg's score history. Unlike
     * updateSelectedLegScore() (which appends a new throw and decrements
     * remainingScore relatively), this replaces an existing entry and
     * recomputes remainingScore from scratch against startingScore, since
     * the edit can land anywhere in the history, not just the latest throw.
     * Refuses the edit (returns false) rather than leaving remainingScore
     * negative - callers should validate the single-throw value (0-180)
     * themselves before calling this, the same as normal entry does.
     */
    editSelectedLegScoreEntry(index: number, newScore: number, startingScore: number): boolean {
      if (!this.selectedLeg) return false;
      if (index < 0 || index >= this.selectedLeg.score.length) return false;

      const total = this.selectedLeg.score.reduce(
        (sum, entry, i) => sum + (i === index ? newScore : entry.score),
        0
      );
      if (startingScore - total < 0) return false;

      const entry = this.selectedLeg.score[index];
      if (!entry) return false;
      entry.score = newScore;
      this.selectedLeg.remainingScore = startingScore - total;
      return true;
    },
    completeSelectedLeg(result: string, finishDarts: number) {
      if (this.selectedLeg) {
        this.selectedLeg.result = result;
        this.selectedLeg.finishDarts = finishDarts;
      }
    },
    /**
     * Local-only completion for a leg decided by bull-off (the popup answer
     * IS the result - there's no checkout to record). Mirrors
     * completeSelectedLeg(); MatchCenter.vue's onFinishLeg() branches on
     * wonByBullOff to call the matching server endpoint afterwards.
     */
    completeSelectedLegByBullOff(result: string) {
      if (this.selectedLeg) {
        this.selectedLeg.result = result;
        this.selectedLeg.wonByBullOff = true;
      }
    },
    doneWithSelectedLeg() {
      // Unlike doneWithSelectedGame(), this doesn't need to merge anything
      // back into game.legs: setLegData() (called after completing the leg,
      // via LegService's completeLeg()) already wrote the complete,
      // authoritative leg - status, score, result, and finishDarts all come
      // straight from that server response, with no client-only field (like
      // a game's `legs`) that would be lost by leaving it alone. Overwriting
      // it here with the stale selectedLeg reference (which never saw that
      // update) previously reverted a just-completed leg back to Started.
      this.selectedLeg = null;
    },
    setNextPlayerTurn(playerId: string) {
      this.currentPlayer = playerId
    },
    getCurrentPlayer() {
      return this.currentPlayer
    },
    setError(message: string) {
      this.lastError = message
    },
    clearError() {
      this.lastError = null
    },
  },
  persist: true,
})

