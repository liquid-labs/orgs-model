import { Evaluator } from '@liquid-labs/condition-eval'

import { AuditRecords } from './AuditRecords.js'

/**
* Public API for managing third-party account records. Uses the `Accounts` library, which actually implements the
* functions. The library is split like this to make testing easier.
*/
const AuditRecordsAPI = class extends AuditRecords {
  constructor(org) {
    super(org.innerState.auditRecords)

    this.checkCondition = AuditRecordsAPI.checkCondition

    this.key = 'id'
  }
}

/**
* Obligitory 'checkCondition' function provided by the API for processing inclusion or exclusion of Account targets in
* an audit. We do this weird 'defineProperty' thing because it effectively gives us a 'static const'
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

  const zeroRes = []
  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

Object.defineProperty(AuditRecordsAPI, 'checkCondition', {
  value        : checkCondition,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { AuditRecordsAPI }
