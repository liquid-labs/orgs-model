import * as fs from 'fs'
import structuredClone from 'core-js-pure/actual/structured-clone'

import { Evaluator } from '@liquid-labs/condition-eval'

import { StaffMember } from './StaffMember'

// TODO: convert to standard 'Resources'
const Staff = class {
  #requiresValidation
  #map

  get keyField() { return 'email' }
  get itemName() { return 'staff member' }
  get resourceName() { return 'staff' }

  constructor({ fileName, org }) {
    this.fileName = fileName
    this.org = org
    this.members = JSON.parse(fs.readFileSync(fileName))

    this.checkCondition = checkCondition
    this.#indexMembers()
  }

  list() { return this.members.map((s) => new StaffMember({ data : s, org : this.org })) }

  getData(email) { return structuredClone(this.#map[email]) }

  get(email) {
    const data = this.#map[email]
    if (data === undefined) return undefined

    return new StaffMember({ data : data, org : this.org })
  }

  getByRoleName(roleName) {
    return this.list().filter(s => s.hasRole(roleName))
  }

  add(item) {
    // verify?
    const safeItem = structuredClone(item)
    safeItem.id = safeItem.email.toLowerCase()
    this.members.push(structuredClone(safeItem))

    return this.get(safeItem.id)
  }

  delete(email) {
    email = email.toLowerCase()
    let index = -1
    const matches = this.members.filter((member, i) => {
      if (member.email === email) {
        index = i
        return true
      }
      return false
    })

    // TODO: also need to check if this person is a manager and refuse to remove until that's changed
    if (matches.length === 0) {
      throw new Error(`Could not find staff member with email ${email}.`)
    }
    else if (matches.length > 1) {
      throw new Error(`Staff database consistency error. Found multiple entires for '${email}'.`)
    }

    this.members.splice(index, 1)
  }

  update(item) {
    const safeItem = structuredClone(item)
    if (safeItem.id === undefined) safeItem.id = safeItem.email.toLowerCase()

    const origItem = this.#map[safeItem.id]
    if (origItem === undefined) {
      throw new Error(`No such staff member with key '${safeItem.id}' to update; try 'add'.`)
    }
    const itemIndex = this.members.indexOf(origItem)
    this.members.splice(itemIndex, 1, safeItem)
    this.#map[safeItem.id] = safeItem

    return this.get(safeItem.id)
  }

  write() {
    for (const member of this.members) {
      delete member._sourceFileName
      delete member.title
    }
    fs.writeFileSync(this.fileName, JSON.stringify(this.members))
  }

  validate({ required = false } = {}) {
    const errors = []
    for (const member of this.members) { StaffMember.validateData({ data : member, errors, org : this.org }) }

    if (errors.length > 0 && required) { throw new Error(`Error${errors.length > 1 ? 's' : ''}: ${errors.join(' ')}`) }

    return errors.length === 0 ? true : errors
  }

  #indexMembers() {
    this.#map = this.members.reduce((acc, member, i) => {
      if (acc[member.email] !== undefined) {
        throw new Error(`Staff member with email '${member.email}' already exists at entry ${i}.`)
      }
      acc[member.email] = member
      return acc
    }, {})
  }
}

// Setup 'zeroRes' matchers for 'checkCondition'. If matching parameters are missing, treated as false rather than an
// error
const roleRe = /^HAS_[A-Z_]+_ROLE$/
const staffParameters = ['^USES_CENTRALIZED_ANTIVIRUS$', '^USES_CENTRALIZED_FIREWALL$']
const zeroRes = staffParameters.map(p => new RegExp(p))
zeroRes.push(roleRe)

/**
* Obligitory 'checkCondition' function provided by the API for processing inclusion or exclusion of Staff targets in
* an audit.
*/
const checkCondition = (condition, member) => {
  const parameters = Object.assign(
    {
      SEC_TRIVIAL : 1,
      ALWAYS      : 1,
      NEVER       : 0
    },
    member.parameters)

  // TODO: test if leaving it 'true'/'false' works.
  parameters.IS_EMPLOYEE = member.getEmploymentStatus() === 'employee' ? 1 : 0
  parameters.IS_CONTRACTOR = member.getEmploymentStatus() === 'contractor' ? 1 : 0

  member.getOwnRoleNames().forEach(role => {
    parameters[`HAS_${role.toUpperCase().replace(/ /g, '_')}_ROLE`] = 1
  })

  const evaluator = new Evaluator({ parameters, zeroRes })
  return evaluator.evalTruth(condition)
}

Staff.checkCondition = checkCondition

export { Staff }
