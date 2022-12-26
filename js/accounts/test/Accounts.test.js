/* global beforeAll describe expect test */

import { Accounts, Account } from '../'

describe('Accounts', () => {
  let accounts
  beforeAll(() => {
    accounts = new Accounts({ fileName : './js/test-data/orgs/third-party-accounts.json', readFromFile : true })
  })

  describe('get', () => {
    test('retrieves account by name', () => {
      const acct = accounts.get('jim@foo.com')
      expect(acct).toBeTruthy()
      expect(acct.directEmail).toBe('jim@foo.com')
      expect(acct.department).toBe('Operations')
    })

    test('returns undefined for unknown account', () => {
      expect(accounts.get('no-such-account')).toBeUndefined()
    })
  })

  describe('list', () => {
    let acctList
    let rawList
    beforeAll(() => {
      acctList = accounts.list()
      rawList = accounts.list({ rawData : true })
    })

    test('retrieves all accounts by default', () => expect(acctList.length).toBe(2))

    test('retrieves object data by default', () => {
      expect(acctList[0] instanceof Account).toBe(true)
    })

    test('can produce raw data', () => {
      expect(rawList[0] instanceof Account).toBe(false)
    })

    test('produces sorted results', () => {
      const names = acctList.map((acct) => acct.name)
      expect(names).toEqual(names.sort())
    })
  })

  describe('getByDepartment', () => {
    test.each([['Operations', 'jim@foo.com'], ['DevOps', 'sue@foo.com']])('%s department has $s',
      (department, email) => {
        const arr = accounts.getByDepartment(department)
        expect(arr).toHaveLength(1)
        expect(arr[0].directEmail).toEqual(email)
      })
  })
  /*
  describe('checkCondition', () => {
    let acctList
    beforeAll(() => { acctList = acctsAPI.list() })

    test.each`
      desc | condition | expectation
      ${'existential sensitivity'} | ${'SENSITIVITY == EXISTENTIAL'} | ${['networks/acme-co']}
      ${'greater than none'}|${'SENSITIVITY > NONE'}|${['business/fax-co', 'networks/acme-co']}
      ${'parameter tags'}|${'BUSINESS'}|${['business/fax-co']}
      ${'parameter numbers'}|${'REVIEW_PERIOD == 360'}|${['business/fax-co']}
    `('properly evaluates $desc ($condition)', ({ desc, condition, expectation }) => {
      const accts = acctList.filter((acct) => Accounts.checkCondition(condition, acct))
      expect(accts.map(e => e.name)).toEqual(expectation)
    })

    test('complains of unknown parameters', () =>
      expect(() => Accounts.checkCondition('BLAH', acctList[0]))
        .toThrow(/'BLAH' is not defined/)
    )

    test('complains of complicated condition', () =>
      expect(() => Accounts.checkCondition('exit()', acctList[0]))
        .toThrow(/unsafe code/)
    )
  })
  */
})
