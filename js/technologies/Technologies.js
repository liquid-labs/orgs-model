import { Evaluator } from '@liquid-labs/condition-eval'

import { Resources } from '../lib/resources'
import { Technology } from './Technology'

/**
* Basic class wrapping technology items.
*/
const Technologies = class extends Resources {
  // add (and override) basic 'tehnology' item configurations
  constructor(options) {
    super(Object.assign(
      {},
      options,
      Technology.itemConfig
    ))

    this.checkCondition = checkCondition
  }
}

/**
* Obligitory 'checkCondition' function provided by the API for processing inclusion or exclusion of Technology targets
* in an audit.
*/
const checkCondition = (condition, productRec) => {
  const parameters = Object.assign(
    {
      SEC_TRIVIAL : 1,
      ALWAYS      : 1,
      NEVER       : 0,
      NONE        : 0,
      LOW         : 1,
      MODERATE    : 2,
      HIGH        : 3,
      EXISTENTIAL : 4
    },
    productRec.parameters
  )

  // TODO: create a handly conversion class/lib for the sensitivity codes; SensitivityCode?
  const sensitivityCode = productRec['Sensitivity approval'] || 'quarantined only'

  switch (sensitivityCode) {
  case 'top secret use':
    parameters.SENSITIVITY = 0; break
  case 'secret use':
    parameters.SENSITIVITY = 1; break
  case 'sensitive use':
    parameters.SENSITIVITY = 2; break
  case 'general use':
    parameters.SENSITIVITY = 3; break
  case 'quarantined only':
    parameters.SENSITIVITY = 4; break
  default:
    throw new Error(`Unknown sensitivity approval code: '${sensitivityCode}'.`)
  }

  // configure the non-existent tags to 'zero' out
  // const zeroRes = [/BUSINESS|NETWORKING/]
  const zeroRes = []

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

Object.defineProperty(Technologies, 'itemConfig', {
  value        : Technology.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { Technologies }
