// determine if a roll meets a rule's criteria
export function rollMeetsRuleCriteria(roll, rule) {
  let numberTally = getRollNumberTally(roll)
  let meetsCriteria = true;

  // determine if the roll contains any "wildcard" criteria
  let wildcardCriteria = rule.roll.filter(criteria => {
    return criteria.value === '*'
  })
  // sort "wildcard" criteria in descending order by quantity
  wildcardCriteria.sort((a, b) => b.quantity - a.quantity);

  // handle non-"wildcard" criteria
  rule.roll.forEach(criteria => {
    if (criteria.value !== '*') {
      let targetNumberIndex = numberTally.findIndex(number => {
        return number.value === criteria.value
      })
      if (targetNumberIndex > -1) {
        numberTally[targetNumberIndex].quantity = numberTally[targetNumberIndex].quantity - criteria.quantity
      }
      // we didn't find the number in the roll or the quantity was not enough to meet the criteria
      if (targetNumberIndex < 0 || numberTally[targetNumberIndex].quantity < 0) {
        meetsCriteria = false
      }
    }
  })

  // handle "wildcard" criteria
  wildcardCriteria.forEach(criteria => {
    let targetNumberIndex = numberTally.findIndex(number => {
      return number.quantity >= criteria.quantity
    })
    if (targetNumberIndex > -1) {
      numberTally[targetNumberIndex].quantity = numberTally[targetNumberIndex].quantity - criteria.quantity
    }
    // we didn't find a number in the roll with sufficient quantity to meet the criteria
    if (targetNumberIndex < 0) {
      meetsCriteria = false
    }
  })

  return meetsCriteria;
}

// tally each number (1-6) up to find the quantity of each in the roll
export function getRollNumberTally(roll) {
  let numberTally = []
  if (roll) {
    roll.forEach(die => {
      let targetNumberIndex = numberTally.findIndex(number => {
        return number.value === die
      })
      if (targetNumberIndex > -1) {
        numberTally[targetNumberIndex].quantity = numberTally[targetNumberIndex].quantity + 1
      }
      else {
        numberTally.push({value: die, quantity: 1});
      }
    })
  }
  return numberTally
}

// subtract a rule's criteria quantities from the number tally quantities
export function subtractRuleCriteriaFromNumberTally(numberTally, rule) {
  rule.roll.forEach(criteria => {
    if (criteria.value === '*') {
      let targetNumberIndex = numberTally.findIndex(number => {
        return number.quantity >= criteria.quantity
      })
      if (targetNumberIndex > -1) {
        numberTally[targetNumberIndex].quantity = numberTally[targetNumberIndex].quantity - criteria.quantity
      }
    }
    else {
      let targetNumberIndex = numberTally.findIndex(number => {
        return number.value === criteria.value
      })
      if (targetNumberIndex > -1) {
        numberTally[targetNumberIndex].quantity = numberTally[targetNumberIndex].quantity - criteria.quantity
      }
    }
  })
}

export function getRemainingDice(roll, rule) {
  // we must assume that the rule is always applicable
  let numberTally = getRollNumberTally(roll)

  // subtract the roll criteria quantity from the number tally
  subtractRuleCriteriaFromNumberTally(numberTally, rule)

  // recalculate the roll as an array of numbers
  let newRoll = []
  numberTally.forEach(die => {
    for (let i = 0; i < die.quantity; i++) {
      newRoll.push(die.value)
    }
  })
  return newRoll
}

export function getBestPointRules(roll, rules, bestPointRules) {
  // search each rule for the highest point value based on the roll
  let highestPointRule = null
  rules.forEach(rule => {
    if (highestPointRule === null || rule.pointValue > highestPointRule.pointValue) {
      highestPointRule = rule
    }
  })

  // we found the applicable rule with the highest point value
  if (highestPointRule !== null) {
    // does the current point tally already include the highest point value rule?
    let targetRuleIndex = bestPointRules.findIndex(bestPointRule => {
      return bestPointRule.rule.name === highestPointRule.name
    });
    // if so, increase the multiplier by 1
    if (bestPointRules.length && targetRuleIndex > -1) {
      bestPointRules[targetRuleIndex].multiplier = bestPointRules[targetRuleIndex].multiplier + 1
    }
    // if not, add it to the talley with a multiplier of 1
    else {
      bestPointRules.push({rule: highestPointRule, multiplier: 1 })
    }
    // find the remaining dice after applying the highest point value rule
    let newRoll = getRemainingDice(roll, highestPointRule)
    // if there are still point dice, continue finding the best point rules
    if (newRoll.length) {
      // find the applicable rules for the remaining dice
      let applicableRules = []
      rules.forEach(rule => {
        // is there enough dice in the roll to test this rule?
        if (newRoll.length >= rule.totalDice) {
          let ruleIsApplicable = rollMeetsRuleCriteria(newRoll, rule)
          if (ruleIsApplicable) {
            applicableRules.push(rule)
          }
        }
      })
      bestPointRules = getBestPointRules(newRoll, applicableRules, bestPointRules)
    }
  }

  return bestPointRules
}

export function evaluatePoints(roll, rules) {
  let applicableRules = []
  rules.forEach(rule => {
    // is there enough dice in the roll to test this rule?
    if (roll.length >= rule.totalDice) {
      let ruleIsApplicable = rollMeetsRuleCriteria(roll, rule)
      if (ruleIsApplicable) {
        applicableRules.push(rule)
      }
    }
  })

  if (applicableRules.length === 0) {
    return []
  }

  let bestPointRules = []
  // find the set of rules that results in the best point value
  return getBestPointRules(roll, applicableRules, bestPointRules)
}

export function getLeftoverDice(roll, bestPointRules) {
  let bestPointRuleDiceCount = 0
  bestPointRules.forEach(pointRule => {
    bestPointRuleDiceCount = bestPointRuleDiceCount + (pointRule.rule.totalDice * pointRule.multiplier)
  })
  return roll.length - bestPointRuleDiceCount
}

export function getTotalPoints(bestPointRules) {
  let totalPoints = 0
  if (bestPointRules && bestPointRules.length) {
    bestPointRules.forEach(ruleObj => {
      totalPoints += (ruleObj.rule.pointValue * ruleObj.multiplier)
    })
  }
  return totalPoints
}
