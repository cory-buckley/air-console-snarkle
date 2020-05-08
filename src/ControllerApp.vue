<template>
  <div id="app">
    <div class="snarkle-header"><b>Snarkle</b></div>
    <!-- NOT IN GAME -->
    <div class="not-in-game" v-if="gameState.gamePhase === null">
      Loading
    </div>
    <!-- WAITING ON PLAYERS -->
    <div class="waiting-on-players" v-if="gameState.gamePhase === GAME_PHASES.WAITING_ON_PLAYERS">
      <div class="name-input" v-if="!nameSubmitted">
        <input v-model="playerName" placeholder="Enter your Name">
        <button :disabled="playerName.length < 2" @click="joinGame()">Submit</button>
      </div>
      <div v-if="nameSubmitted">
        Waiting to Start
      </div>
    </div>
    <!-- IN GAME -->
    <div class="in-game" v-if="inGameLoop">
      <div class="not-your-turn" v-if="!yourTurn && bustRoll.length === 0">
        <div class="player-name">{{ gameState.players[gameState.activePlayerIndex].name }}'s Turn</div>
        <div>Your Score: {{ playerInfo.score }}</div>
      </div>
      <div class="your-turn" v-if="yourTurn && bustRoll.length === 0">
        Your Turn
        <div>Your Total Score: {{ playerInfo.score }}</div>
        <div>Current Turn Score: {{ gameState.currentTurnScore }}</div>
        <div v-if="gameState.lockedDice.length">Point Dice: {{ gameState.lockedDice.toString() }}</div>
        <div v-if="gameState.currentRoll.length" class="current-roll">
          <div v-for="(dice, index) in gameState.currentRoll" :key="index" class="dice-selectors">
            <label :for="'dice-' + index">{{ dice }}</label>
            <input type="checkbox" :id="'dice-' + index" :value="diceIsSelected(index)" @click="toggleDiceSelection(index)" :key="'dice-' + index">
          </div>
        </div>
        <div v-if="gameState.firstRollOfTurn" class="first-roll">
          <div v-if="gameState.lockedDice.length && !cannotBuildOnRoll">Remaining Dice: {{ 6 - gameState.lockedDice.length }}</div>
          <button @click="requestRoll(true)">Roll All Dice</button>
          <button v-if="gameState.lockedDice.length && !cannotBuildOnRoll" @click="requestRoll()">Build On Roll</button>
        </div>
        <div v-else>
          <div class="point-total-text" v-html="bestPointRulesText"></div>
          <button @click="requestRoll()" :disabled="cannotRollDice">
          {{ selectedDice.length === gameState.currentRoll.length ? 'Roll Again' : 'Roll Remaining Dice' }}
          </button>
          <button @click="endTurn()" :disabled="cannotEndTurn">End Turn</button>
        </div>
      </div>
      <div class="busted" v-if="bustRoll.length">
        <div>You Busted!</div>
        <div>{{ bustRoll.toString() }}</div>
        <button @click="dismissBust()">Continue</button>
      </div>
    </div>
    <!-- GAME SUMMARY -->
    <div class="game-summary" v-if="gameState.gamePhase === GAME_PHASES.GAME_SUMMARY">
      <div>{{ pendingWinner.name }} Wins!</div>
      <div>Final Score: {{ pendingWinner.score }}</div>
    </div>
  </div>
</template>

<script>
import { GAME_PHASES, GAME_MESSAGES, RULES, ON_THE_BOARD_MINIMUM, WINNING_SCORE } from './library/constants'
import { evaluatePoints, getTotalPoints, getLeftoverDice } from './library/calculation'

export default {
  name: 'ControllerApp',
  data() {
    return {
      playerDeviceId: null,
      playerName: '',
      playerScore: 0,
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
        gamePhase: null,
        players: [
          // { deviceId: 123, name: 'cory', score: 0, inRollOff: false }
          // inRollOff refers to whether or not the player will enter a roll off after the last turn
        ]
      },
      GAME_PHASES,
      nameSubmitted: false,
      bustRoll: []
    }
  },
  computed: {
    yourTurn() {
      return this.playerDeviceId === this.gameState.players[this.gameState.activePlayerIndex].deviceId
    },
    playerInfo() {
      return this.gameState.players.find((player) => {
        return player.deviceId === this.playerDeviceId
      })
    },
    pendingWinner() {
      if (this.gameState.pendingWinnerIndex) {
        return this.gameState.players[this.gameState.pendingWinnerIndex]
      }
      else {
        return null
      }
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
    },
    bestPointRules() {
      return evaluatePoints(this.selectedDice, RULES)
    },
    bestPointRulesText() {
      let bestPointRules = []
      if (this.selectedDice.length) {
        bestPointRules = this.bestPointRules
      }
      let bestPointRulesText = '';
      if (bestPointRules.length) {
        bestPointRules.forEach(ruleObj => {
          bestPointRulesText += ruleObj.rule.name
          if (ruleObj.multiplier > 1) {
            bestPointRulesText = bestPointRulesText + ' x ' + ruleObj.multiplier
          }
          bestPointRulesText += (' = ' + (ruleObj.rule.pointValue * ruleObj.multiplier) + '\n')
        })
        bestPointRulesText += ('<b>Total Points: ' + getTotalPoints(bestPointRules) + '\n')
      }
      return bestPointRulesText
    },
    cannotRollDice() {
      return this.selectedDice.length === 0 || getLeftoverDice(this.selectedDice, this.bestPointRules) !== 0
    },
    cannotEndTurn() {
      if (this.cannotRollDice) {
        return true
      }
      if (this.gameState.firstRollOfTurn) {
        return true
      }
      if (this.playerInfo.score === 0 && (this.gameState.currentTurnScore + getTotalPoints(this.bestPointRules)) < ON_THE_BOARD_MINIMUM) {
        return true
      }
      if (this.selectedDice.length === this.gameState.currentRoll.length) {
        // player has scored points on all dice and must roll again
        return true
      }
      // player can end the turn
      return false
    },
    cannotBuildOnRoll() {
      if (this.playerInfo.score === 0 || this.playerInfo.score + this.gameState.currentTurnScore >= WINNING_SCORE) {
        return true
      }
      else {
        return false
      }
    }
  },
  methods: {
    requestGameState() {
      this.$airconsole.message(this.$screen, { messageType: GAME_MESSAGES.UPDATE_STATE })
    },
    joinGame() {
      this.$airconsole.message(this.$screen, { messageType: GAME_MESSAGES.ADD_PLAYER, name: this.playerName })
      this.nameSubmitted = true
    },
    syncPlayer() {
      // find the index of the current player in the players object
      let playerIndex = this.gameState.players.findIndex(player => {
        return player.deviceId === this.playerDeviceId
      })

      if (playerIndex > -1) {
        this.nameSubmitted = true
        this.playerName = this.gameState.players[playerIndex].name
        this.playerScore = this.gameState.players[playerIndex].score
      }
    },
    requestRoll(rollAllDice) {
      this.gameState.currentRollSelectedIndices.forEach(index => {
        console.log(document.getElementById('dice-' + index))
        document.getElementById('dice-' + index).checked = false
      })
      if (rollAllDice) {
        this.$airconsole.message(this.$screen, { messageType: GAME_MESSAGES.ROLL, rollAllDice: true })
      }
      else {
        this.$airconsole.message(this.$screen, { messageType: GAME_MESSAGES.ROLL })
      }
    },
    diceIsSelected(index) {
      return this.gameState.currentRollSelectedIndices.includes(index)
    },
    toggleDiceSelection(index) {
      if (this.gameState.currentRollSelectedIndices.includes(index)) {
        this.$airconsole.message(this.$screen, { messageType: GAME_MESSAGES.UNSELECT_DICE, removedIndices: [index] })
      }
      else {
        this.$airconsole.message(this.$screen, { messageType: GAME_MESSAGES.SELECT_DICE, selectedIndices: [index] })
      }
    },
    endTurn() {
      this.$airconsole.message(this.$screen, { messageType: GAME_MESSAGES.END_TURN })
    },
    dismissBust() {
      this.bustRoll = []
    }
  },
  mounted() {
    this.$airconsole.onReady = () => {
      this.playerDeviceId = this.$airconsole.getDeviceId()
    }

    this.$airconsole.onMessage = (from, data) => {

      /* ANY PHASE */
      if (from === this.$screen && data.messageType === GAME_MESSAGES.UPDATE_STATE) {
        Object.keys(data.gameState).forEach(key => {
          this.gameState[key] = data.gameState[key]
        })

        // sync important player data
        this.syncPlayer()
      }

      if (from === this.$screen && data.messageType === GAME_MESSAGES.BUSTED) {
        this.bustRoll = data.bustRoll
      }

    }
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
}

.snarkle-header {
  margin-bottom: 2.5vh;
  font-size: 150%;
  font-weight: bold;
}

.current-roll {
  margin-top: -2.5vh;
  margin-bottom: 5vh;
  width: 100%;
}

.dice-selectors {
  display: inline-block;
  width: 50%;

  &:nth-child(even)::after {
    content: '\A';
    white-space: pre;
  }

  label {
    margin-right: 10vw;
    font-size: 150%;
  }
  input {
    margin-top: 10vh;
    transform: scale(3.0) translateY(-1px);
  }
}

.point-total-text {
  margin-bottom: 2.5vh;
  white-space: pre-wrap;
}

.first-roll {
  button {
    margin-top: 10vh;
  }
}

.player-name {
  text-transform: capitalize;
}

.busted {
  margin-top: 10vh;
  button {
    margin-top: 15vh;
  }
}
</style>
