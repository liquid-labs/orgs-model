import * as fs from 'fs'

import * as fjson from '@liquid-labs/federated-json'

const domainRe = /(policy|src)\/(.+)\/glossary\.(json|yaml)/

/**
* Expects JSON files of the form: { <term>: "<definition>", ... }
*/
const generateGlossary = ({ definitionFiles, continueOnError=false }) => {
  // Will have the sturcture: { <term>: { definition: "...", sourcePath: "..." }, ... }
  const allTerms = {}
  const domainTerms = {}

  // build up 'allTerms' while verifying terms unique
  for (const sourcePath of definitionFiles) {
    const sourceTerms = fjson.read(sourcePath)
    const match = domainRe.exec(sourcePath)
    const domain = match?.[2]

    for (const term of Object.keys(sourceTerms)) {
      // check if mulitple definitions
      if (allTerms[term] !== undefined) {
        const msg = `'${term}' defined in '${sourcePath}' also defined in '${allTerms[term].sourcePath}'; keeping original definition.`
        if (continueOnError === true) {
          console.error(msg)
        }
        else {
          throw new Error(msg)
        }
      } // end multiple definition test
      else { // the term is unique
        if (domain !== undefined) {
          if (domainTerms[domain] === undefined) {
            domainTerms[domain] = [];
          }
          domainTerms[domain].push(term)
        }
        else {
          console.error(`Could not determine domain for term '${term}' defined in '${sourcePath}'.`)
        }
        allTerms[term] = sourceTerms[term]
      }
    } // for of source terms
  } // for in definitionFiles

  return [ allTerms, domainTerms ]
}

const printGlossary = () => {
  const dashCase = (term) => {
    return term.toLowerCase().replace(/[^a-z0-9]/ig, '-')
  }

  const definitionFiles = [...process.argv.slice(2)]

  const [ allTerms, domainTerms ] = generateGlossary({ definitionFiles })

  const caseInsensitiveSort = function(a, b) {
    a = a.toLowerCase()
    b = b.toLowerCase()
    if (a < b) {
      return -1
    }
    else if (a > b) {
      return 1
    }
    else { // names must be equal
      return 0
    }
  }

  // Note: 'console.log(...)' adds it's own newline, so the '\n' in the following creates a blank line.
  console.log('# Glossary\n')
  
  console.log('Terms are listed below in alphabetical order. You can also refer to the lists of [domain specific terms](#domain-specific-terms) to browse terms by domain.')
  
  console.log('<dl>\n')
  const termKeys = Object.keys(allTerms) || []
  termKeys.sort(caseInsensitiveSort)
  for (const term of termKeys) {
    console.log(`<dt id="${dashCase(term)}">${term}</dt>`)
    console.log(`<dd>\n\n${allTerms[term]}\n\n</dd>\n`) // the blank line tells Markdown to process the contents.
  }
  console.log('</dl>\n')

  console.log('## Domain specific terms\n')
  const domainKeys = Object.keys(domainTerms) || []
  domainKeys.sort(caseInsensitiveSort)
  for (const domain of domainKeys) {
    const domainSectionName = `${domain.charAt(0).toUpperCase() + domain.slice(1)} terms`
    
    console.log(`### ${domainSectionName}\n`)
    domainTerms[domain].sort(caseInsensitiveSort)
    for (const term of domainTerms[domain]) {
      console.log(`* [${term}](#${term.toLowerCase().replace(/[^a-z0-9]/g, '-')})`)
    }
    console.log('\n')
  }
}

export { printGlossary }
