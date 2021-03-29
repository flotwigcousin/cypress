import { builders as b } from 'ast-types'
import Promise from 'bluebird'
import * as recast from 'recast'
import sinon from 'sinon'
import snapshot from 'snap-shot-it'
import { expect } from 'chai'

import Fixtures from '../../support/helpers/fixtures'
import { fs } from '../../../lib/util/fs'
import {
  generateCypressCommand,
  addCommandsToBody,
  generateTest,
  appendCommandsToTest,
  createNewTestInSuite,
  createNewTestInFile,
  createFile,
  wasTestExtended,
  wasTestCreated,
} from '../../../lib/util/spec_writer'

const unwrittenSpec = Fixtures.get('projects/studio/cypress/integration/unwritten.spec.js')
const emptyCommentsSpec = Fixtures.get('projects/studio/cypress/integration/empty-comments.spec.js')
const writtenSpec = Fixtures.get('projects/studio/cypress/integration/written.spec.js')

const exampleTestCommands = [
  {
    selector: '.input',
    name: 'type',
    message: 'typed text',
  }, {
    selector: '.btn',
    name: 'click',
  },
]

const verifyOutput = (ast) => {
  const { code } = recast.print(ast)

  snapshot(code)
}

describe('lib/util/spec_writer', () => {
  let readFile

  // recast doesn't play nicely with mockfs so we do it manually
  beforeEach(() => {
    readFile = sinon.stub(fs, 'readFile').resolves(unwrittenSpec)
    sinon.stub(fs, 'writeFile').callsFake((path, output) => {
      snapshot(output)

      return Promise.resolve()
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('#generateCypressComand', () => {
    it('can generate a full command', () => {
      const command = generateCypressCommand({
        selector: '.input',
        name: 'type',
        message: 'typed text',
      })

      verifyOutput(command)
    })

    it('can generate a command with no message', () => {
      const command = generateCypressCommand({
        selector: '.btn',
        name: 'click',
      })

      verifyOutput(command)
    })

    it('can generate a command with an array as message', () => {
      const command = generateCypressCommand({
        selector: '.select',
        name: 'select',
        message: ['one', 'two', 'three'],
      })

      verifyOutput(command)
    })

    it('can generate a command with no selector', () => {
      const command = generateCypressCommand({
        name: 'visit',
        message: 'the://url',
      })

      verifyOutput(command)
    })
  })

  describe('#addCommandsToBody', () => {
    it('adds commands with comments', () => {
      const program = b.program([])

      addCommandsToBody(program.body, exampleTestCommands)

      verifyOutput(program)
    })
  })

  describe('#generateTest', () => {
    it('creates a new test with body', () => {
      const testBody = b.blockStatement([])

      addCommandsToBody(testBody.body, exampleTestCommands)

      const test = generateTest('my new test', testBody)

      verifyOutput(test)
    })
  })

  describe('#appendCommandsToTest', () => {
    it('can add commands to an existing test defined with it', () => {
      appendCommandsToTest({
        absoluteFile: '',
        line: 3,
        column: 5,
      }, exampleTestCommands)
    })

    it('can add commands to an existing test defined with specify', () => {
      appendCommandsToTest({
        absoluteFile: '',
        line: 7,
        column: 5,
      }, exampleTestCommands)
    })

    it('can add commands to an existing test defined with it only', () => {
      appendCommandsToTest({
        absoluteFile: '',
        line: 12,
        column: 8,
      }, exampleTestCommands)
    })

    it('can add commands to an existing test with config', () => {
      appendCommandsToTest({
        absoluteFile: '',
        line: 16,
        column: 8,
      }, exampleTestCommands)
    })
  })

  describe('#createNewTestInSuite', () => {
    it('can create a new test in a suite defined with describe', () => {
      createNewTestInSuite({
        absoluteFile: '',
        line: 2,
        column: 3,
      }, exampleTestCommands, 'test added to describe')
    })

    it('can create a new test in a suite defined with context', () => {
      createNewTestInSuite({
        absoluteFile: '',
        line: 21,
        column: 3,
      }, exampleTestCommands, 'test added to context')
    })

    it('can create a new test in a suite defined with describe only', () => {
      createNewTestInSuite({
        absoluteFile: '',
        line: 26,
        column: 12,
      }, exampleTestCommands, 'test added to describe only')
    })

    it('can create a new test in a suite with config', () => {
      createNewTestInSuite({
        absoluteFile: '',
        line: 30,
        column: 12,
      }, exampleTestCommands, 'test added to describe with config')
    })
  })

  describe('#createNewTestInFile', () => {
    it('can create a new test in the root of a file', () => {
      createNewTestInFile({ absoluteFile: '' }, exampleTestCommands, 'test added to file')
    })

    it('preserves comments in a completely empty spec', () => {
      readFile.resolves(emptyCommentsSpec)
      createNewTestInFile({ absoluteFile: '' }, exampleTestCommands, 'test added to empty file')
    })
  })

  describe('#createFile', () => {
    it('creates a new file with templated comments', () => {
      createFile('/path/to/project/cypress/integration/my_new_spec.js')
    })
  })

  describe('#wasTestExtended', () => {
    beforeEach(() => {
      readFile.resolves(writtenSpec)
    })

    it('returns true for test that was only extended', () => {
      return wasTestExtended({
        absoluteFile: '',
        line: 2,
        column: 5,
      }).then((result) => {
        expect(result).to.be.true
      })
    })

    it('returns true for test that was created and therefore extended', () => {
      return wasTestExtended({
        absoluteFile: '',
        line: 9,
        column: 3,
      }).then((result) => {
        expect(result).to.be.true
      })
    })

    it('returns false for test that was not created or extended', () => {
      return wasTestExtended({
        absoluteFile: '',
        line: 15,
        column: 3,
      }).then((result) => {
        expect(result).to.be.false
      })
    })
  })

  describe('#wasTestCreated', () => {
    beforeEach(() => {
      readFile.resolves(writtenSpec)
    })

    it('returns true for test that was created', () => {
      return wasTestCreated({
        absoluteFile: '',
        line: 9,
        column: 3,
      }).then((result) => {
        expect(result).to.be.true
      })
    })

    it('returns false for test that was only extended', () => {
      return wasTestCreated({
        absoluteFile: '',
        line: 2,
        column: 5,
      }).then((result) => {
        expect(result).to.be.false
      })
    })

    it('returns false for test that was not created or extended', () => {
      return wasTestCreated({
        absoluteFile: '',
        line: 15,
        column: 3,
      }).then((result) => {
        expect(result).to.be.false
      })
    })
  })
})
