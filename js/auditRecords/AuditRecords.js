import { Resources } from '../lib/resources.js'
import * as idxType from '../lib/index-relationships.js'

/**
* Basic class for accessing the audit record data.
*/
const AuditRecords = class extends Resources {
  constructor(options) {
    super(Object.assign(options, {
      indexes : [ { indexField : 'auditId', relationship: idxType.ONE_TO_MANY },
        { indexField : 'domain', relationship: idxType.ONE_TO_MANY },
        { indexField : 'targetId', relationship: idxType.ONE_TO_MANY } ],
      itemName : 'audit record',
      keyField : 'id',
      resourceName : 'audit records'
    }))
  }
}

// TODO: deprecated; retained for reference
/*
const persist = (data, { domain, domains }) => {
  if (!domains && domain) {
    domains = [domain]
  }
  if (domains && domains.length > 0) {
    for (domain of domains) {
      fjson.write({ data, saveFrom : `.auditRecords.${domain}` })
    }
  }
  else {
    fjson.write({ data, saveFrom : '.auditRecords' })
  }
}

const update = (data, auditRecord) => {
  const { id } = auditRecord
  const [auditName, targetId] = splitId(id)
  const [domain] = auditName.split('-')

  if (!data.auditRecords[domain]) {
    data.auditRecords[domain] = {}
  }
  if (!data.auditRecords[domain][auditName]) {
    data.auditRecords[domain][auditName] = {}
  }

  const auditRecCopy = Object.assign({}, auditRecord)
  delete auditRecCopy.id
  delete auditRecCopy.weight
  delete auditRecCopy.auditName
  data.auditRecords[domain][auditName][targetId] = auditRecCopy
}

// helper/non-exported items
const splitId = (id) => {
  if (id === undefined) {
    throw new Error('Must provide id in call to get audit records.')
  }
  const [auditName, targetId] = id.split(/\/(.+)/)
  if (auditName === undefined || targetId === undefined) {
    throw new Error(`Malformed audit record ID '${id}'. Should have form '<audit name>/<target ID>'.`)
  }
  return [auditName, targetId]
}
END deprecated methods */

export { AuditRecords }
