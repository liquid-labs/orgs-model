import { Evaluator } from '@liquid-labs/condition-eval'

import { Resources } from '../lib/resources.js'
import * as idxType from '../lib/index-relationships.js'
import { Vendor } from './Vendor'

/**
* Basic class wrapping vendor items. Functionality is split between 'Vendors' and 'Vendors' to simplify testing.
*/
const Vendors = class extends Resources {
  #indexByCommonName

  constructor(options) {
    super(Object.assign(options,
      {
        indexes      : [{ indexField : 'commonName', relationship : idxType.ONE_TO_MANY }],
        itemClass    : Vendor,
        itemName     : 'vendor',
        keyField     : 'legalName',
        resourceName : 'vendors'
      }))
    this.#indexByCommonName = this.listManager.addIndex({
      name         : 'byCommonName',
      keyField     : 'commonName',
      relationship : idxType.ONE_TO_MANY
    })

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

  // configure the non-existent tags to 'zero' out
  // const zeroRes = [/BUSINESS|NETWORKING/]
  const zeroRes = []

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

export { Vendors }
