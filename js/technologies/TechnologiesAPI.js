import { Evaluator } from '@liquid-labs/condition-eval'

import { Technologies } from './Technologies'
import { commonAPIInstanceSetup } from '../lib/resources'

/**
* Public API for managing vendor/product records. Uses the `Technologies` library, which actually implements the functions.
* The library is split like this to make testing easier.
*/
const TechnologiesAPI = class extends Technologies {
  constructor(org) {
    super(org.innerState.technologies)
    commonAPIInstanceSetup({ self : this, org, checkCondition })
  }

  hydrate() {
    for (const technology of this.items || []) {
      const { 'Vendor name': vendorName, Name: name } = technology

      const vendor = this.org.vendors.get(vendorName)
      if (vendor === undefined) {
        const badRefEntry = { sourceType : 'technology', sourceName : name, ref : vendorName }
        const commonVendors = this.org.vendors.getByCommonName(vendorName)
        if (commonVendors.length === 1) {
          badRefEntry.advice = `There is a vendor with that common name. If that is the correct vendor, use legal name '${commonVendors[0].legalName}' in the technology entry.`
        }
        else if (commonVendors.length > 1) {
          badRefEntry.advice = `Multiple vendors use that common name. Perhaps on of ${commonVendors.slice(0, commonVendors.length - 1).map((v) => v.legalName).join(', ')}, or ${commonVendors}`
        }
        this.hydrationErrors.push(badRefEntry)
      }
      else {
        technology.vendor = vendor
      }
    }
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

export { TechnologiesAPI }
