interface ScoringRules {
  gameWon: number;
  gameDrawn: number;
  gameLost: number;
  bonusPoints: {
    lostButScored50Percent: number;
    scoredAllPrimaryObjectives: number;
  };
  maxPointsPerGame: number;
}

interface MatchResult {
  player1Score: number;
  player2Score: number;
  result: 'player1_win' | 'player2_win' | 'draw';
  player1BonusPoints: {
    lostButScored50Percent: boolean;
    scoredAllPrimaryObjectives: boolean;
  };
  player2BonusPoints: {
    lostButScored50Percent: boolean;
    scoredAllPrimaryObjectives: boolean;
  };
}

export function calculateLeaguePoints(
  matchResult: MatchResult,
  scoringRules: ScoringRules
): { player1Points: number; player2Points: number } {
  let player1Points = 0;
  let player2Points = 0;

  // Base points for win/draw/loss
  switch (matchResult.result) {
    case 'player1_win':
      player1Points += scoringRules.gameWon;
      player2Points += scoringRules.gameLost;
      break;
    case 'player2_win':
      player1Points += scoringRules.gameLost;
      player2Points += scoringRules.gameWon;
      break;
    case 'draw':
      player1Points += scoringRules.gameDrawn;
      player2Points += scoringRules.gameDrawn;
      break;
  }

  // Bonus points for player 1
  if (matchResult.player1BonusPoints.lostButScored50Percent) {
    player1Points += scoringRules.bonusPoints.lostButScored50Percent;
  }
  if (matchResult.player1BonusPoints.scoredAllPrimaryObjectives) {
    player1Points += scoringRules.bonusPoints.scoredAllPrimaryObjectives;
  }

  // Bonus points for player 2
  if (matchResult.player2BonusPoints.lostButScored50Percent) {
    player2Points += scoringRules.bonusPoints.lostButScored50Percent;
  }
  if (matchResult.player2BonusPoints.scoredAllPrimaryObjectives) {
    player2Points += scoringRules.bonusPoints.scoredAllPrimaryObjectives;
  }

  // Cap at max points per game
  player1Points = Math.min(player1Points, scoringRules.maxPointsPerGame);
  player2Points = Math.min(player2Points, scoringRules.maxPointsPerGame);

  return { player1Points, player2Points };
}

export function checkLostButScored50Percent(
  playerScore: number,
  opponentScore: number,
  playerWon: boolean
): boolean {
  // Only applies if player lost
  if (playerWon) return false;
  
  // Check if player scored more than 50% of opponent's total points
  return playerScore > (opponentScore * 0.5);
}

// Default Cryptic Cabin rules
export const CRYPTIC_CABIN_SCORING: ScoringRules = {
  gameWon: 4,
  gameDrawn: 2,
  gameLost: 0,
  bonusPoints: {
    lostButScored50Percent: 1,
    scoredAllPrimaryObjectives: 1,
  },
  maxPointsPerGame: 5,
};

// Default custom rules
export const DEFAULT_CUSTOM_SCORING: ScoringRules = {
  gameWon: 3,
  gameDrawn: 1,
  gameLost: 0,
  bonusPoints: {
    lostButScored50Percent: 0,
    scoredAllPrimaryObjectives: 0,
  },
  maxPointsPerGame: 3,
};