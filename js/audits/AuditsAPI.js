import { Audits } from './Audits'

const AuditsAPI = class extends Audits {
  constructor(org) {
    super(org.innerState.audits)
    
    this.org = org
  }
}

export { AuditsAPI }
