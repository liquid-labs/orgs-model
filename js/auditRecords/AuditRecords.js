import { Evaluator } from '@liquid-labs/condition-eval'

import { AuditRecord } from './AuditRecord.js'
import { Resources } from '../lib/resources.js'
import * as idxType from '../lib/index-relationships.js'

/**
* Basic class for accessing the audit record data.
*/
const AuditRecords = class extends Resources {
  constructor(options) {
    super(Object.assign(
      {},
      options,
      AuditRecord.itemConfig,
      {
        indexes : [
          { indexField : 'auditId', relationship : idxType.ONE_TO_MANY },
          { indexField : 'domain', relationship : idxType.ONE_TO_MANY },
          { indexField : 'targetId', relationship : idxType.ONE_TO_MANY }]
      }
    ))

    this.checkCondition = AuditRecords.checkCondition
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

Object.defineProperty(AuditRecords, 'checkCondition', {
  value        : checkCondition,
  writable     : false,
  enumerable   : true,
  configurable : false
})

Object.defineProperty(AuditRecords, 'itemConfig', {
  value        : AuditRecord.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { AuditRecords }
