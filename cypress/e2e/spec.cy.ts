describe('App smoke tests', () => {
  it('loads home page', () => {
    cy.visit('/')
    cy.contains('Chakri AI')
  })

  it('loads sign-in page', () => {
    cy.visit('/sign-in')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
  })
})