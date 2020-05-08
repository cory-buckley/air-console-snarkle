// game phases
export const GAME_PHASES = {
  WAITING_ON_PLAYERS: 0,
  //ARRANGE_PLAYERS: 1,
  //DETERMINE_FIRST_PLAYER: 2,
  IN_GAME: 3,
  LAST_ROUND: 4,
  ROLL_OFF: 5,
  GAME_SUMMARY: 6
}

export const GAME_MESSAGES = {
  ADD_PLAYER: 0,
  UPDATE_STATE: 1,
  ROLL: 2,
  SELECT_DICE: 3,
  UNSELECT_DICE: 4,
  END_TURN: 5,
  BUSTED: 6
}

// game rules
export const ON_THE_BOARD_MINIMUM = 650;
export const WINNING_SCORE = 2500;//10000;

export const RULES = [
  {
    name: 'Standard 100',
    roll: [{quantity: 1, value: 1}],
    pointValue: 100, active: true, default: true, totalDice: 1
  },
  {
    name: 'Standard 50',
    roll: [{quantity: 1, value: 5}],
    pointValue: 50, active: true, default: true, totalDice: 1
  },
  {
    name: 'Triple 1s',
    roll: [{quantity: 3, value: 1}],
    pointValue: 1000, active: true, default: true, totalDice: 3
  },
  {
    name: 'Triple 2s',
    roll: [{quantity: 3, value: 2}],
    pointValue: 200, active: true, default: true, totalDice: 3
  },
  {
    name: 'Triple 3s',
    roll: [{quantity: 3, value: 3}],
    pointValue: 300, active: true, default: true, totalDice: 3
  },
  {
    name: 'Triple 4s',
    roll: [{quantity: 3, value: 4}],
    pointValue: 400, active: true, default: true, totalDice: 3
  },
  {
    name: 'Triple 5s',
    roll: [{quantity: 3, value: 5}],
    pointValue: 500, active: true, default: true, totalDice: 3
  },
  {
    name: 'Triple 6s',
    roll: [{quantity: 3, value: 6}],
    pointValue: 600, active: true, default: true, totalDice: 3
  },
  {
    name: 'Three Pair',
    roll: [{quantity: 2, value: '*'}, {quantity: 2, value: '*'}, {quantity: 2, value: '*'}],
    pointValue: 1500, active: true, default: true, totalDice: 6
  },
  { name: 'Straight',
    roll:
      [
        {quantity: 1, value: 1}, {quantity: 1, value: 2}, {quantity: 1, value: 3},
        {quantity: 1, value: 4}, {quantity: 1, value: 5}, { quantity: 1, value: 6}
      ],
    pointValue: 2000, active: true, default: true, totalDice: 6
  }
]