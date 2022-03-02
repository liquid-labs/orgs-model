import { Evaluator } from '@liquid-labs/condition-eval'

import { Source } from './Source'
import * as idxType from '../../lib/index-relationships.js'
import { Resources } from '../../lib/resources'

/**
* Public API for managing third-party account records. Uses the `Sources` library, which actually implements the
* functions. The library is split like this to make testing easier.
*/
const Sources = class extends Resources {
  constructor(options) {
    super(Object.assign(
      {},
      options,
      Source.creationOptions
    ))
    this.checkCondition = Sources.checkCondition
  }
}

/**
* Obligitory 'checkCondition' function provided by the API for processing inclusion or exclusion of Source targets in
* an audit. We do this weird 'defineProperty' thing because it effectively gives us a 'static const'
*/
const checkCondition = (condition, acct) => {
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
    acct.parameters
  )

  // TODO: create a handly conversion class/lib for the sensitivity codes; SensitivityCode?
  const sensitivityCode = acct.sensitivity || 'EXISTENTIAL'

  switch (sensitivityCode) {
  case 'NONE':
    parameters.SENSITIVITY = 0; break
  case 'LOW':
    parameters.SENSITIVITY = 1; break
  case 'MODERATE':
    parameters.SENSITIVITY = 2; break
  case 'HIGH':
    parameters.SENSITIVITY = 3; break
  case 'EXISTENTIAL':
    parameters.SENSITIVITY = 4; break
  default:
    throw new Error(`Unknown sensitivity code: '${sensitivityCode}'.`)
  }

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

Object.defineProperty(Sources, 'checkCondition', {
  value        : checkCondition,
  writable     : false,
  enumerable   : false,
  configurable : false
})

export { Sources }
