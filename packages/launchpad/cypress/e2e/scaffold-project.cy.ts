import type { FRONTEND_FRAMEWORKS } from '@packages/scaffold-config'

// The tests in this file take an existing project without Cypress Configured
// and add Cypress using the launchpad setup wizard.
//
// See `system-tests/projects/pristine` for an example.
//
// After adding a test for a project for the first time and running
// this spec, it will see what files are scaffolded and save them
// in a directory named `expected-cypress-{lang}-{testingType}`.
// For example, when configuring the `pristine` project using
// plain JS for E2E testing, it will make
// a new directory in `pristine` named `expected-cypress-js-e2e`
// containing the scaffolded files.
//
// Each subsequent run will compare the scaffolded files in the
// `expected-cypress-js-e2e` directory to the newly created ones.
//
// If there is a descrepancy, the test will fail and show the diff in the command log.
//
// To update your expected files, just delete the `expected-cypress` and re-run the test,
// or modify them by hand.
function scaffoldAndOpenE2EProject (
  name: Parameters<typeof cy.scaffoldProject>[0],
  language: 'js' | 'ts',
  args?: Parameters<typeof cy.openProject>[1],
) {
  cy.scaffoldProject(name)
  cy.openProject(name, args)

  cy.visitLaunchpad()

  cy.contains('Welcome to Cypress!').should('be.visible')
  cy.contains('[data-cy-testingtype="e2e"]', 'Not Configured')
  cy.contains('[data-cy-testingtype="component"]', 'Not Configured')
  cy.contains('E2E Testing').click()
  cy.contains(language === 'js' ? 'JavaScript' : 'TypeScript').click()
  cy.contains('Next').click()
  cy.contains('We added the following files to your project.')
  cy.contains('Continue').click()
  cy.contains('Choose a Browser')
}

function scaffoldAndOpenCTProject (
  name: Parameters<typeof cy.scaffoldProject>[0],
  language: 'js' | 'ts',
  framework: typeof FRONTEND_FRAMEWORKS[number]['name'],
  bundler?: typeof FRONTEND_FRAMEWORKS[number]['supportedBundlers'][number]['name'],
  args?: Parameters<typeof cy.openProject>[1],
) {
  cy.scaffoldProject(name)
  cy.openProject(name, args)

  cy.visitLaunchpad()

  cy.contains('Welcome to Cypress!').should('be.visible')
  cy.contains('[data-cy-testingtype="e2e"]', 'Not Configured')
  cy.contains('[data-cy-testingtype="component"]', 'Not Configured')
  cy.contains('Component Testing').click()
  cy.contains(language === 'js' ? 'JavaScript' : 'TypeScript').click()

  cy.contains('Pick a framework').click()
  cy.contains(framework).click()
  if (bundler) {
    cy.contains(bundler).click()
  }

  cy.contains('Next Step').click()
  cy.contains('Skip').click()
  cy.contains('We added the following files to your project.')
  cy.contains('Continue').click()
  cy.contains('Choose a Browser')
}

function assertScaffoldedFilesAreCorrect () {
  cy.withCtx(async (ctx) => {
    const result = await ctx.actions.test.snapshotCypressDirectory()

    if (result.status === 'ok') {
      return result
    }

    throw new Error(result.message)
  }).then((res) => {
    cy.log(`✅ ${res.message}`)
  })
}

describe('scaffolding new projects', () => {
  it('scaffolds E2E for a JS project', () => {
    scaffoldAndOpenE2EProject('pristine', 'js')
    assertScaffoldedFilesAreCorrect()
  })

  it('scaffolds E2E for a TS project', () => {
    scaffoldAndOpenE2EProject('pristine', 'ts')
    assertScaffoldedFilesAreCorrect()
  })

  it('scaffolds CT for a JS project', () => {
    scaffoldAndOpenCTProject('pristine', 'js', 'Create React App (v5)')
    assertScaffoldedFilesAreCorrect()
  })

  it('scaffolds CT for a TS project', () => {
    scaffoldAndOpenCTProject('pristine', 'ts', 'Create React App (v5)')
    assertScaffoldedFilesAreCorrect()
  })
})
