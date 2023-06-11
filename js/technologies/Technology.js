import { Item } from '@liquid-labs/resource-model'

const Technology = class extends Item { }

const allFields = [
  'name',
  'purpose',
  'usageStatus',
  'embodiment',
  'departments',
  'productionInstallationSource',
  'productionVersion',
  'monitoredBy',
  'lastReviewDate',
  'compliancesSupported',
  'vendorName',
  'inProductionCriticalFlow',
  'sensitivityApproval',
  'licenseType',
  'licenseExpiryDate',
  'licenseAutoRenews',
  'annualLicenseCost',
  'hardeningStandards',
  'reduncanyStandards',
  'futureRequirements',
  'scalabilityEvaluation',
  'vulnerabilityAnnouncements',
  'notes',
  'documentReferences',
  'startDate'
]

const defaultFields = ['name', 'purpose', 'usageStatus']

Item.bindCreationConfig({
  allFields,
  dataCleaner   : (data) => { delete data.id; return data },
  dataFlattener : (data) => {
    data.departments = data.departments?.join(';')
    data.documentReferences = data.documentReferences?.join(';')
    return data
  },
  dataHydrater : (data) => {
    data.departments = data.departments.split(';')
    data.documentReferences = data.documentReferences.split(';')
    return data
  },
  defaultFields,
  itemClass    : Technology,
  itemName     : 'technology',
  keyField     : 'name',
  itemsName    : 'technologies'
})

export { Technology }
