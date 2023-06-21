import { Evaluator } from '@liquid-labs/condition-eval'
import { idxType, ItemManager } from '@liquid-labs/resource-model'

import { Vendor } from './Vendor'

/**
* Basic class wrapping vendor items. Functionality is split between 'Vendors' and 'Vendors' to simplify testing.
*/
const Vendors = class extends ItemManager {
  #indexByCommonName

  constructor(options) {
    // add (and override) basic 'vendor' item configurations
    super(Object.assign(
      {},
      options,
      { indexes : [{ indexField : 'commonName', relationship : idxType.ONE_TO_MANY }] }
    ))

    this.#indexByCommonName = this.listManager.getIndex('commonName')

    this.checkCondition = checkCondition
  }

  cleanedData() {
    // return this.list({ rawData: true }).map(StaffMember.itemConfig.dataCleaner)
    return this.list({ rawData : true }).map((s) => {
      return Vendor.itemConfig.dataCleaner(s)
    })
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

Object.defineProperty(Vendors, 'itemConfig', {
  value        : Vendor.itemConfig,
  writable     : false,
  enumerable   : true,
  configurable : false
})

export { Vendors }
