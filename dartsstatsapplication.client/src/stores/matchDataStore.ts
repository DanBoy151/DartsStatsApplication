import { defineStore } from 'pinia'

export interface MatchDataState {
  matchId: string | null
  opposition: string
  location: string
  date: Date
  availablePlayers: string[]
  games: GameDataState[]
}

export interface GameDataState {
  gameId: string
  players: string[] // Array of player Guids
  type: string
  status: string
  result: string
  legs: LegDataState[]
}

export interface LegDataState {
  gameId: string
  legId: string
  status: string
  score: Record<string, number> // Dictionary: Guid -> int
  result: string
  finishDarts: number
  order: number
  remainingScore: number
}

export const useMatchDataStore = defineStore('leg', {
  state: () => ({
    match: null as MatchDataState | null,
    selectedGame: null as GameDataState | null,
    selectedLeg: null as LegDataState | null,
  }),
  actions: {
    setMatchData(matchID: string, opposition: string, date: Date, location: string, availablePlayers: string[]) {
      this.match = {
        matchId: matchID,
        opposition: opposition,
        date: date,
        location: location,
        availablePlayers: availablePlayers,
        games: [],
      }
    },
    getMatchData() {
      return this.match
    },
    setGameData(gameID: string, players: string[], type: string, status: string, result: string) {
      if (!this.match) return;

      const existingIndex = this.match.games.findIndex(g => g.gameId === gameID);

      const newGame: GameDataState = {
        gameId: gameID,
        players,
        type,
        status,
        result,
        legs: [],
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
      if (existingIndex !== -1) {
        // Update existing game
        this.match.games[existingIndex] = this.selectedGame;
      }
      this.selectedGame = null;
    },
    setLegData(gameId: string, legId: string, status: string, score: Record<string, number>, result: string, finishDarts: number, order: number, remainingScore: number) {
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
      };

      if (existingIndex !== -1) {
        // Update existing leg
        game.legs[existingIndex] = newLeg;
      } else {
        // Add new leg
        game.legs.push(newLeg);
      }
    },
    setSelectedLeg(legID: string) {
      if (!this.selectedGame) return;

      this.selectedLeg = this.selectedGame.legs.find(l => l.legId === legID) || null;
    },
    getSelectedLeg() {
      return this.selectedLeg;
    },
    updateSelectedLegScore(score: Record<string, number>) {
      if (this.selectedLeg) { 
        Object.assign(this.selectedLeg.score, score);

        // Subtract the sum of the new score values from remainingScore
        const reduction = Object.values(score).reduce((acc, val) => acc + val, 0);
        this.selectedLeg.remainingScore -= reduction;
      }
    },
    doneWithSelectedLeg() {
      if (!this.match || !this.selectedLeg) return;

      const game = this.match.games.find(g => g.gameId === this.selectedLeg?.gameId);
      if (!game) return;

      const existingIndex = game.legs.findIndex(l => l.legId === this.selectedLeg?.legId);

      if (existingIndex !== -1) {
        // Update existing leg
        game.legs[existingIndex] = this.selectedLeg;
      }
      this.selectedLeg = null;
    } 
  },
  persist: true,
})

