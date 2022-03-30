// @ts-ignore / session support is needed for visiting about:blank between tests
describe('multi-domain', { experimentalSessionSupport: true }, () => {
  it('passes viewportWidth/Height state to the secondary domain', () => {
    const expectedViewport = [320, 480]

    cy.viewport(320, 480).then(() => {
      const primaryViewport = [cy.state('viewportWidth'), cy.state('viewportHeight')]

      expect(primaryViewport).to.deep.equal(expectedViewport)
    })

    cy.visit('/fixtures/multi-domain.html')
    cy.get('a[data-cy="multi-domain-secondary-link"]').click()

    cy.switchToDomain('http://foobar.com:3500', { args: expectedViewport }, (expectedViewport) => {
      const secondaryViewport = [cy.state('viewportWidth'), cy.state('viewportHeight')]

      expect(secondaryViewport).to.deep.equal(expectedViewport)
    })
  })

  context('withBeforeEach', () => {
    beforeEach(() => {
      cy.visit('/fixtures/multi-domain.html')
      cy.get('a[data-cy="multi-domain-secondary-link"]').click()
    })

    it('runs commands in secondary domain', () => {
      cy.switchToDomain('http://foobar.com:3500', () => {
        cy
        .get('[data-cy="dom-check"]')
        .invoke('text')
        .should('equal', 'From a secondary domain')
      })

      cy.log('after switchToDomain')
    })

    it('passes runnable state to the secondary domain', () => {
      const runnable = cy.state('runnable')
      const expectedRunnable = {
        clearTimeout: null,
        isPending: null,
        resetTimeout: null,
        timeout: null,
        id: runnable.id,
        _currentRetry: runnable._currentRetry,
        _timeout: 4000,
        type: 'test',
        title: 'passes runnable state to the secondary domain',
        titlePath: [
          'multi-domain',
          'withBeforeEach',
          'passes runnable state to the secondary domain',
        ],
        parent: {
          id: runnable.parent.id,
          type: 'suite',
          title: 'withBeforeEach',
          titlePath: [
            'withBeforeEach',
          ],
          parent: {
            id: runnable.parent.parent.id,
            type: 'suite',
            title: '',
            titlePath: undefined,
            ctx: {},
          },
          ctx: {},
        },
        ctx: {},
      }

      cy.switchToDomain('http://foobar.com:3500', { args: expectedRunnable }, (expectedRunnable) => {
        const actualRunnable = cy.state('runnable')

        expect(actualRunnable.titlePath()).to.deep.equal(expectedRunnable.titlePath)
        expectedRunnable.titlePath = actualRunnable.titlePath

        expect(actualRunnable.title).to.equal(expectedRunnable.title)
        expect(actualRunnable.id).to.equal(expectedRunnable.id)
        expect(actualRunnable.ctx).to.deep.equal(expectedRunnable.ctx)
        expect(actualRunnable._timeout).to.equal(expectedRunnable._timeout)
        expect(actualRunnable.type).to.equal(expectedRunnable.type)
        expect(actualRunnable.callback).to.exist
        expect(actualRunnable.timeout).to.exist
        expect(actualRunnable.parent.title).to.equal(expectedRunnable.parent.title)
        expect(actualRunnable.parent.type).to.equal(expectedRunnable.parent.type)
      })
    })

    it('handles querying nested elements', () => {
      cy.switchToDomain('http://foobar.com:3500', () => {
        cy
        .get('form button')
        .invoke('text')
        .should('equal', 'Submit')
      })

      cy.log('after switchToDomain')
    })

    it('sets up window.Cypress in secondary domain', () => {
      cy.switchToDomain('http://foobar.com:3500', () => {
        cy
        .get('[data-cy="cypress-check"]')
        .invoke('text')
        .should('equal', 'Has window.Cypress')
      })
    })

    describe('data argument', () => {
      it('passes object to callback function', () => {
        cy.switchToDomain('http://foobar.com:3500', { args: { foo: 'foo', bar: 'bar' } }, ({ foo, bar }) => {
          expect(foo).to.equal('foo')
          expect(bar).to.equal('bar')
        })
      })

      it('passes array to callback function', () => {
        cy.switchToDomain('http://foobar.com:3500', { args: ['foo', 'bar'] }, ([foo, bar]) => {
          expect(foo).to.equal('foo')
          expect(bar).to.equal('bar')
        })
      })

      it('passes string to callback function', () => {
        cy.switchToDomain('http://foobar.com:3500', { args: 'foo' }, (foo) => {
          expect(foo).to.equal('foo')
        })
      })

      it('passes number to callback function', () => {
        cy.switchToDomain('http://foobar.com:3500', { args: 1 }, (num) => {
          expect(num).to.equal(1)
        })
      })

      it('passes boolean to callback function', () => {
        cy.switchToDomain('http://foobar.com:3500', { args: true }, (bool) => {
          expect(bool).to.be.true
        })
      })

      it('passes mixed types to callback function', () => {
        cy.switchToDomain('http://foobar.com:3500', { args: { foo: 'foo', num: 1, bool: true } }, ({ foo, num, bool }) => {
          expect(foo).to.equal('foo')
          expect(num).to.equal(1)
          expect(bool).to.be.true
        })
      })
    })

    describe('errors', () => {
    // TODO: Proper stack trace printing still needs to be addressed here
      it('propagates secondary domain errors to the primary that occur within the test', () => {
        return new Promise((resolve) => {
          cy.on('fail', (e) => {
            expect(e.message).to.equal('done is not defined')
            resolve(undefined)
          })

          cy.switchToDomain('http://foobar.com:3500', () => {
          // done is not defined on purpose here as we want to test the error gets sent back to the primary domain correctly
          // @ts-ignore
            done()
          })
        })
      })

      it('propagates thrown errors in the secondary domain back to the primary w/ done', (done) => {
        cy.on('fail', (e) => {
          expect(e.message).to.equal('oops')
          done()
        })

        cy.switchToDomain('http://foobar.com:3500', () => {
          throw 'oops'
        })
      })

      it('propagates thrown errors in the secondary domain back to the primary w/o done', () => {
        return new Promise((resolve) => {
          cy.on('fail', (e) => {
            expect(e.message).to.equal('oops')
            resolve(undefined)
          })

          cy.switchToDomain('http://foobar.com:3500', () => {
            throw 'oops'
          })
        })
      })

      it('receives command failures from the secondary domain', (done) => {
        const timeout = 50

        cy.on('fail', (err) => {
          expect(err.message).to.include(`Timed out retrying after ${timeout}ms: Expected to find element: \`#doesnt-exist\`, but never found it`)
          //  make sure that the secondary domain failures do NOT show up as spec failures or AUT failures
          expect(err.message).not.to.include(`The following error originated from your test code, not from Cypress`)
          expect(err.message).not.to.include(`The following error originated from your application code, not from Cypress`)
          done()
        })

        cy.switchToDomain('http://foobar.com:3500', { args: timeout }, (timeout) => {
          cy.get('#doesnt-exist', {
            timeout,
          })
        })
      })

      it('receives command failures from the secondary domain with the default timeout', { defaultCommandTimeout: 50 }, (done) => {
        cy.on('fail', (err) => {
          expect(err.message).to.include(`Timed out retrying after 50ms: Expected to find element: \`#doesnt-exist\`, but never found it`)
          //  make sure that the secondary domain failures do NOT show up as spec failures or AUT failures
          expect(err.message).not.to.include(`The following error originated from your test code, not from Cypress`)
          expect(err.message).not.to.include(`The following error originated from your application code, not from Cypress`)
          done()
        })

        cy.switchToDomain('http://foobar.com:3500', () => {
          cy.get('#doesnt-exist')
        })
      })
    })
  })
})

// @ts-ignore
describe('domain validation', { experimentalSessionSupport: true }, () => {
  it('finds the right spec bridge with a subdomain', () => {
    cy.visit('/fixtures/auth/index.html') // Establishes Primary Domain
    cy.window().then((win) => {
      win.location.href = 'http://baz.foobar.com:3500/fixtures/auth/idp.html'
    })

    cy.switchToDomain('http://foobar.com:3500', () => {
      cy.get('[data-cy="username"]').type('TJohnson')
      cy.get('[data-cy="login"]').click()
    })

    cy.get('[data-cy="welcome"]')
    .invoke('text')
    .should('equal', 'Welcome TJohnson')
  })

  it('uses switchToDomain twice', () => {
    cy.visit('/fixtures/auth/index.html') // Establishes Primary Domain
    cy.get('[data-cy="login-idp"]').click() // Takes you to idp.com
    cy.switchToDomain('http://idp.com:3500', () => {
      cy.get('[data-cy="username"]').type('BJohnson')
      cy.get('[data-cy="login"]').click()
    }) // Trailing edge wait, waiting to return to the primary domain

    // Verify that the user has logged in on /siteA
    cy.get('[data-cy="welcome"]')
    .invoke('text')
    .should('equal', 'Welcome BJohnson')

    cy.get('[data-cy="logout"]').click()

    cy.window().then((win) => {
      win.location.href = 'http://baz.foobar.com:3500/fixtures/auth/idp.html'
    })

    cy.switchToDomain('http://foobar.com:3500', () => {
      cy.get('[data-cy="username"]').type('TJohnson')
      cy.get('[data-cy="login"]').click()
    }) // Trailing edge wait, waiting to return to the primary domain

    // Verify that the user has logged in on /siteA
    cy.get('[data-cy="welcome"]')
    .invoke('text')
    .should('equal', 'Welcome TJohnson')
  })

  it('creates a spec bridge for https://idp.com:3502', () => {
    cy.visit('/fixtures/auth/index.html') // Establishes Primary Domain
    cy.switchToDomain('idp.com:3502', () => {
      cy.visit('https://www.idp.com:3502/fixtures/auth/index.html')
      cy.get('[data-cy="login-idp"]').invoke('text').should('equal', 'Login IDP')
    })
  })

  it('creates a spec bridge for http://idp.com:3500', () => {
    cy.visit('/fixtures/auth/index.html') // Establishes Primary Domain
    cy.switchToDomain('http://idp.com:3500', () => {
      cy.visit('http://www.idp.com:3500/fixtures/auth/index.html')
      cy.get('[data-cy="login-idp"]').invoke('text').should('equal', 'Login IDP')
    })
  })
})
