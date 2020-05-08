<template>
  <div id="app">
    <div class="snarkle-header"><b>Snarkle</b></div>
    <div class="waiting-on-players" v-if="gameState.gamePhase === GAME_PHASES.WAITING_ON_PLAYERS">
      <div v-if="gameState.players.length">Players</div>
      <div v-else>Waiting for players to join</div>
      <div v-for="player in gameState.players" :key="player.name">
        {{ player.name }}, {{ player.deviceId }}
      </div>
      <br/>
      <button v-if="gameState.players.length > 1" @click="startGame()">Start Game</button>
    </div>
    <div class="in-game" v-if="inGameLoop">
      <div class="active-player">{{ gameState.players[gameState.activePlayerIndex].name }}'s turn</div>
      <div v-if="gameState.currentRoll.length">Roll: {{ gameState.currentRoll.toString() }}</div>
      <div v-if="gameState.lockedDice.length">Point Dice: {{ gameState.lockedDice.toString() }}</div>
      <div>Turn Score: {{ gameState.currentTurnScore }}</div>
      <table v-if="gameState.players.length" class="player-score">
        <tr>
          <td>Name</td><td>Score</td><td>Device Id</td><td>In Roll-Off?</td>
        </tr>
        <tr v-for="player in gameState.players" :key="player.deviceId">
          <td class="player-name">{{player.name}}</td>
          <td>{{player.score}}</td>
          <td>{{player.deviceId}}</td>
          <td>{{player.inRollOff ? 'yes' : 'no'}}</td>
        </tr>
      </table>
    </div>
    <div class="" v-if="gameState.gamePhase === GAME_PHASES.GAME_SUMMARY">
      <div>{{ gameState.players[gameState.pendingWinnerIndex].name }} wins!</div>
      <div>Final Score: {{ gameState.players[gameState.pendingWinnerIndex].score }}</div>
    </div>
  </div>
</template>

<script>
import { evaluatePoints } from './library/calculation'
import { GAME_PHASES, GAME_MESSAGES, RULES, WINNING_SCORE } from './library/constants'

export default {
  name: 'ScreenApp',
  data() {
    return {
      gameState: {
        activePlayerIndex: null,
        // players need to know if it is the first roll of the turn so they have the option
        // to roll all of the dice or continue from the last roll
        firstRollOfTurn: true,
        currentRoll: [],
        // the indices of the dice currently selected by the player in the active roll
        currentRollSelectedIndices: [],
        // the dice that have been locked in by previous rolls in the turn
        lockedDice: [],
        currentTurnScore: 0,
        // the player index of the first player to hit the winning total
        pendingWinnerIndex: null,
        gamePhase: GAME_PHASES.WAITING_ON_PLAYERS,
        players: [
          // { deviceId: 123, name: 'cory', score: 0, inRollOff: false }
          // inRollOff refers to whether or not the player will enter a roll off after the last turn
        ]
      },
      GAME_PHASES
    }
  },
  computed: {
    activePlayer() {
      if (this.gameState.activePlayerIndex !== null) {
        return this.gameState.players[this.gameState.activePlayerIndex]
      }
      else {
        return null
      }
    },
    playersInRollOff() {
      return this.gameState.players.filter(player => {
        return player.inRollOff
      })
    },
    inGameLoop() {
      return [GAME_PHASES.IN_GAME, GAME_PHASES.LAST_ROUND, GAME_PHASES.ROLL_OFF].includes(this.gameState.gamePhase)
    },
    selectedDice() {
      let selectedDice = []
      if (this.gameState.currentRollSelectedIndices.length) {
        this.gameState.currentRollSelectedIndices.forEach(index => {
          selectedDice.push(this.gameState.currentRoll[index])
        })
      }
      return selectedDice
    }
  },
  methods: {
    broadcastState() {
      this.$airconsole.broadcast({ messageType: GAME_MESSAGES.UPDATE_STATE, gameState:this.gameState })
    },
    sendStateToDevice(deviceId) {
      this.$airconsole.message(
        deviceId,
        { messageType: GAME_MESSAGES.UPDATE_STATE, gameState:this.gameState }
      )
    },
    addPlayer(deviceId, name) {
      this.gameState.players.push({ deviceId: deviceId, name: name, score: 0 })
    },
    startGame() {
      this.gameState.gamePhase = GAME_PHASES.IN_GAME
      this.gameState.activePlayerIndex = 0
      this.broadcastState()
    },
    rollDice(numberOfDice) {
      let newRoll = []
      for (let i = 0; i < numberOfDice; i++) {
        newRoll.push(Math.floor(Math.random() * 6) + 1)
      }
      return newRoll
    },
    moveOnToNextPlayer(activePlayerBusted) {

      // the next roll will be the first roll of the turn
      this.gameState.firstRollOfTurn = true

      if (activePlayerBusted) {
        // if this is the roll off, the player's final score is the current turn score
        if (this.gameState.gamePhase === GAME_PHASES.ROLL_OFF) {
          this.gameState.players[this.gameState.activePlayerIndex].score = this.gameState.currentTurnScore
        }

        // tell the player that they busted
        this.$airconsole.message(this.activePlayer.deviceId, { messageType: GAME_MESSAGES.BUSTED, bustRoll: this.gameState.currentRoll })

        // the player busted so reset the dice and current roll score
        this.gameState.currentRoll = []
        this.gameState.currentRollSelectedIndices = []
        this.gameState.lockedDice = []
        this.gameState.currentTurnScore = 0
      }
      else {
        // player didn't bust so add the current turn score to the player's total score
        this.gameState.players[this.gameState.activePlayerIndex].score += this.gameState.currentTurnScore
        // add currently selected dice to the locked dice
        if (this.gameState.currentRollSelectedIndices.length) {
          this.gameState.currentRollSelectedIndices.forEach(index => {
            this.gameState.lockedDice.push(this.gameState.currentRoll[index])
          })
          this.gameState.currentRollSelectedIndices = []
        }
      }

      for (let i = 1; i < this.gameState.players.length; i++) {
        let nextPotentialPlayerIndex = (this.gameState.activePlayerIndex + i) % this.gameState.players.length


        if (this.gameState.gamePhase === GAME_PHASES.IN_GAME) {
          // always move to the next player during the in-game phase
          this.gameState.activePlayerIndex = nextPotentialPlayerIndex
        }

        else if (this.gameState.gamePhase === GAME_PHASES.LAST_ROUND) {
          if (nextPotentialPlayerIndex !== this.gameState.pendingWinnerIndex) {
            // there are still more players to roll in the last round
            this.gameState.activePlayerIndex = nextPotentialPlayerIndex
          }
          else {
            // everybody has rolled their last turn
            if (this.playersInRollOff.length > 1) {
              // we need a roll off starting with the pending winner
              this.gameState.gamePhase = GAME_PHASES.ROLL_OFF
              this.gameState.activePlayerIndex = nextPotentialPlayerIndex
            }
            else {
              // the pending winner has won the game!
              this.gameState.gamePhase = GAME_PHASES.GAME_SUMMARY
            }
          }
        }

        else if (this.gameState.gamePhase === GAME_PHASES.ROLL_OFF) {
          if (nextPotentialPlayerIndex === this.gameState.pendingWinnerIndex) {
            // we are back at the pending winner
            // find the maximum score among the roll-off players
            let highestScore = 0
            let highestScoringPlayerIndex = 0
            for( let i = 0; i < this.gameState.players.length; i++ ) {
              if (this.gameState.players[i].inRollOff) {
                let maximumScore = Math.max(maximumScore, this.gameState.players[i].score)
                highestScoringPlayerIndex = i
              }
            }
            // eliminate the players who do not have the highest score
            this.gameState.players.forEach(player => {
              if (player.score !== highestScore) {
                player.inRollOff = false
              }
            })
            // set the pending winner; do we have one winner or do we need another roll-off?
            this.gameState.pendingWinnerIndex = highestScoringPlayerIndex
            if (this.playersInRollOff.length > 1) {
              // we need another roll-off
              this.gameState.activePlayerIndex = highestScoringPlayerIndex
            }
            else {
              // we have a winner
              this.gameState.gamePhase = GAME_PHASES.GAME_SUMMARY
            }
          }
          else if (this.gameState.players[nextPotentialPlayerIndex].inRollOff) {
            // move to the next player in the roll-off until we reach the pending winner
            this.gameState.activePlayerIndex = nextPotentialPlayerIndex
          }
        }

      }

    }
  },
  watch: {
    gameState: {
      deep: true,
      handler() {
        console.log(this.gameState)
      }
    }
  },
  mounted() {
    this.$airconsole.onReady = () => {
      this.broadcastState()
    }

    this.$airconsole.onConnect = (deviceId) => {
      this.sendStateToDevice(deviceId)
    }

    this.$airconsole.onMessage = (from, data) => {

      /* WAITING ON PLAYERS PHASE */

      if (this.gameState.gamePhase === GAME_PHASES.WAITING_ON_PLAYERS) {

        // Add a player when requested
        if (data.messageType === GAME_MESSAGES.ADD_PLAYER) {
          this.addPlayer(from, data.name)
        }

        // tell the other players about the new changes
        this.broadcastState()

      }

      /* IN GAME PHASE */

      if ([GAME_PHASES.IN_GAME, GAME_PHASES.LAST_ROUND, GAME_PHASES.ROLL_OFF].includes(this.gameState.gamePhase)) {

        // player is requesting a dice roll
        if (data.messageType === GAME_MESSAGES.ROLL) {

          // reset the locked dice if the player is on their first roll of the turn and they do not
          // want to continue from the score of a previous turn
          if (this.gameState.firstRollOfTurn && data.rollAllDice) {
            this.gameState.lockedDice = []
            this.gameState.currentRollSelectedIndices = []
            this.gameState.currentRoll = []
            this.gameState.currentTurnScore = 0
          }

          // the player rolled so the next roll will not be the first roll of the turn
          this.gameState.firstRollOfTurn = false

          // check to see if the player had selected any point dice during a previous roll on this turn
          // we are assuming the client is enforcing the rules and only point dice were selected
          if (this.gameState.currentRollSelectedIndices.length) {

            // calculate the points from the selected dice
            let currentRollScore = 0
            let maximumPointRulesFromRoll = evaluatePoints(this.selectedDice, RULES)
            if (maximumPointRulesFromRoll) {
              maximumPointRulesFromRoll.forEach(pointRule => {
                currentRollScore += (pointRule.rule.pointValue * pointRule.multiplier)
              })
            }

            // add the points from the selected dice to the current turn score
            this.gameState.currentTurnScore += currentRollScore

            // lock the dice that were selected
            this.gameState.currentRollSelectedIndices.forEach(index => {
              this.gameState.lockedDice.push(this.gameState.currentRoll[index])
            })
            this.gameState.currentRollSelectedIndices = []
          }

          // roll the appropriate amount of dice for the active player
          if (this.gameState.lockedDice.length === 6) {
            // if the player has rolled points for all six dice, roll again
            this.gameState.lockedDice = []
          }
          this.gameState.currentRoll = this.rollDice(6 - this.gameState.lockedDice.length)

          // make sure the player has not busted from this roll
          let maximumPointRulesFromRoll = evaluatePoints(this.gameState.currentRoll, RULES)
          let currentRollScore = 0
          if (maximumPointRulesFromRoll) {
            maximumPointRulesFromRoll.forEach(pointRule => {
              currentRollScore += (pointRule.rule.pointValue * pointRule.multiplier)
            })
          }
          if (currentRollScore === 0 || (this.gameState.gamePhase !== GAME_PHASES.ROLL_OFF && this.activePlayer.score + this.gameState.currentTurnScore + currentRollScore > WINNING_SCORE)) {
            // the player has busted
            this.moveOnToNextPlayer(true)
          }
          else if (this.activePlayer.score + currentRollScore === WINNING_SCORE) {
            // the active player has reached the winning threshold and will be in the roll off
            this.gameState.players[this.gameState.activePlayerIndex].score = WINNING_SCORE
            this.gameState.players[this.gameState.activePlayerIndex].inRollOff = true
            if (this.gameState.pendingWinnerIndex !== null) {
              // there is already a pending winner, move on to the next player
              this.moveOnToNextPlayer()
            }
            else {
              // the player has initiated the last round
              this.gameState.gamePhase = GAME_PHASES.LAST_ROUND
              this.gameState.pendingWinnerIndex = this.gameState.activePlayerIndex
              this.moveOnToNextPlayer()
            }
          }

          // if we get here, the player has not busted and we will now wait on their decision
          // to either roll again or end their turn
        }

        // player is requesting to end their turn so calculate the current roll score
        if (data.messageType === GAME_MESSAGES.END_TURN) {

          let currentRollScore = 0;

          // check to see if the player had selected any point dice on this turn
          // we are assuming the client is enforcing the rules and only point dice were selected
          if (this.gameState.currentRollSelectedIndices.length) {

            // calculate the points from the current roll
            let maximumPointRulesFromRoll = evaluatePoints(this.selectedDice, RULES)
            if (maximumPointRulesFromRoll) {
              maximumPointRulesFromRoll.forEach(pointRule => {
                currentRollScore += (pointRule.rule.pointValue * pointRule.multiplier)
              })
            }

            // add the selected dice to the locked dice for the next turn to build
            this.gameState.currentRollSelectedIndices.forEach(index => {
              this.gameState.lockedDice.push(this.gameState.currentRoll[index])
            })
            this.gameState.currentRollSelectedIndices = []
          }
          
          // add the current roll points to the current turn score
          this.gameState.currentTurnScore += currentRollScore
          this.gameState.currentRoll = []
          this.moveOnToNextPlayer()
        }

        if (data.messageType === GAME_MESSAGES.SELECT_DICE) {
          this.gameState.currentRollSelectedIndices.push(...data.selectedIndices)
        }

        if (data.messageType === GAME_MESSAGES.UNSELECT_DICE) {
          this.gameState.currentRollSelectedIndices = this.gameState.currentRollSelectedIndices.filter(index => {
            return !data.removedIndices.includes(index)
          })
        }

        // tell the other players about the new changes
        this.broadcastState()

      }

      /* ANY PHASE */

      // Send the game state when requested
      if (data.messageType === GAME_MESSAGES.UPDATE_STATE) {
        this.sendStateToDevice(from)
      }
    }

    /*
    let roll = [4,4,4,4,5,5]
    let bestPointRules = evaluatePoints(roll, RULES)
    let leftoverDice = getLeftoverDice(roll, bestPointRules)
    console.log(bestPointRules)
    console.log(leftoverDice)

    roll = [2,2,6,6,3,3]
    bestPointRules = evaluatePoints(roll, RULES)
    leftoverDice = getLeftoverDice(roll, bestPointRules)
    console.log(bestPointRules)
    console.log(leftoverDice)
    */
  }
}
</script>

<style lang="scss">
body {
  background: #3b3b3b;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #ffffff;
  margin-top: 60px;

  table {
    margin: auto;
  }
}

.snarkle-header {
  margin-bottom: 20px;
  font-size: 220%;
}

.player-score {
  padding-top: 20px;
  border-spacing: 0;
  tr:first-child {
    font-weight: bold;
    font-size: 120%;
  }
  tr:nth-child(odd) {
    background-color: rgba(0,0,0,0.2);
  }
  tr {
    td {
      padding: 0 15px;
    }
  }
}

.active-player {
  font-size: 150%;
  font-weight: bold;
  text-transform: capitalize;
}

.player-name {
  text-transform: capitalize;
}
</style>
