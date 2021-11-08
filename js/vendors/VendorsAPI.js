import { Vendors } from './Vendors'

const VendorsAPI = class extends Vendors {
  constructor(org) {
    super(org.innerState.vendors)
    this.org = org
    
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
          this.hydrationErrors.push({ sourceType: 'vendor', sourceName: vendor.legalName, ref: auditName })
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

export { VendorsAPI }
