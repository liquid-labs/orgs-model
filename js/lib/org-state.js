import * as fs from 'fs'

import * as yaml from 'js-yaml'

import * as fjson from '@liquid-labs/federated-json'

const loadOrgState = ({ dataPath, rootJsonPath, ...fjsonOptions }) => {
  if (!dataPath) {
    throw new Error('Data path cannot be non-truthy. Must be a string pointing to the root org direcotry.')
  }

  // for fjson var replacement
  process.env.LIQ_PLAYGROUND = `${process.env.HOME}/.liq/playground`
  process.env.ORG_DATA_PATH = dataPath
  process.env.ORG_ROOT_JSON_PATH = rootJsonPath

  fjsonOptions = Object.assign({}, fjsonOptions, { rememberSource : true })
  const orgState = fjson.read(rootJsonPath, fjsonOptions)

  return orgState
}

export { loadOrgState }
