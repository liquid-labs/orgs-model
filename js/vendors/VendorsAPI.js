import { Evaluator } from '@liquid-labs/condition-eval'

import { Vendors } from './Vendors'
import { commonAPIInstanceSetup } from '../lib/resources'

const VendorsAPI = class extends Vendors {
  constructor(org) {
    super(org.innerState.vendors)
    commonAPIInstanceSetup({ self : this, org, checkCondition })

    this.hydrationErrors = [] // list of: { ref: ..., sourceName: ..., sourceType: ..., advice?: ...}
    // e.g.: { ref: "bad-audit-name", sourceName: "Acme Vendor", "sourceType": "vendor" }
  }

  hydrate() {
    for (const vendor of this.items) {
      const { auditResponsibilities } = vendor
      for (let i = 0; i < auditResponsibilities.length; i += 1) {
        const auditName = auditResponsibilities[i]
        const audit = this.audits.get(auditName)

        if (audit === undefined) {
          this.hydrationErrors.push({ sourceType : 'vendor', sourceName : vendor.legalName, ref : auditName })
          auditResponsibilities.splice(i, 1)
          i -= 1
        }
        else {
          auditResponsibilities[i] = audit
          audit.responsibleParty = vendor
        }
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

  // configure the non-existent tags to 'zero' out
  // const zeroRes = [/BUSINESS|NETWORKING/]
  const zeroRes = []

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

export { VendorsAPI }
