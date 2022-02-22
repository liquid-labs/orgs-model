import * as fjson from '@liquid-labs/federated-json'

import { loadBashSettings } from './bash-env'

const loadOrgState = ({ dataPath, ...fjsonOptions }) => {
  if (!dataPath) {
    throw new Error('Data path cannot be non-truthy. Must be a string pointing to the root org direcotry.')
  }

  const liqSettingsPath = `${process.env.HOME}/.liq/settings.sh`
  // console.error(`Loading settings from '${liqSettingsPath}'.`) // DEBUG / TODO: this is useful, but we can't output blindly to stdout because sometimes that output is being captured.
  loadBashSettings(liqSettingsPath, 'LIQ_PLAYGROUND')

  // first, we handle the original bash-centric approach, centered on individual settings
  const orgSettingsPath = `${dataPath}/orgs/settings.sh`
  // TODO: the 'ORG_ID' is expected to be set from the old style settings.sh; we should take this in the constructor
  loadBashSettings(orgSettingsPath, 'ORG_ID')
  // the 'settings.sh' values are now availale on process.env

  // and here's the prototype new approach; the read function handles the 'exists' check
  const rootJsonPath = `${dataPath}/orgs/${process.env.ORG_ID}.json`
  process.env.ORG_DATA_PATH = dataPath
  process.env.ORG_ROOT_JSON_PATH = rootJsonPath

  // console.error(`Loading root JSON from '${rootJsonPath}'.`) // DEBUG / TODO: this is useful, but we can't output
  // blindly to stdout because sometimes that output is being captured.
  fjsonOptions = Object.assign({}, fjsonOptions, { rememberSource : true })
  return fjson.read(rootJsonPath, fjsonOptions)
}

export { loadOrgState }
