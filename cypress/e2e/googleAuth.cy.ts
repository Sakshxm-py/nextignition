/**
 * Cypress E2E: Google Auth flow
 * Run: npx cypress run --spec cypress/e2e/googleAuth.cy.ts
 */

// Replace with a real token from https://developers.google.com/oauthplayground
const REAL_TOKEN = Cypress.env('GOOGLE_TEST_TOKEN') || '';

describe('Google Sign-In E2E', () => {
  // ── Scenario A: Forged token shows error toast ──────────────────────────────
  it('shows an error toast when a forged token is sent', () => {
    cy.visit('/');

    // Intercept the backend call and supply a forged token   // <-- IMPORTANT
    cy.intercept('POST', '**/api/auth/google', (req) => {
      req.body = { token: 'forged.jwt.token' };
    }).as('googleAuth');

    // Click the Google sign-in button (adjust selector to your UI)
    cy.get('[data-testid="google-signin-btn"], button:contains("Google")')
      .first()
      .click({ force: true });

    cy.wait('@googleAuth').then((interception) => {
      expect(interception.response?.statusCode).to.eq(401);
    });

    // Assert error toast appears
    cy.contains(/invalid|failed|error/i, { timeout: 5000 }).should('be.visible');
  });

  // ── Scenario B: Real token loads dashboard ──────────────────────────────────
  it('loads the dashboard with a real Google token', function () {
    if (!REAL_TOKEN) {
      this.skip(); // Skip if no real token is configured
    }

    cy.visit('/');

    // Stub the Google GSI callback to inject our real token directly
    cy.intercept('POST', '**/api/auth/google', (req) => {
      req.body = { token: REAL_TOKEN };
    }).as('googleAuth');

    cy.get('[data-testid="google-signin-btn"], button:contains("Google")')
      .first()
      .click({ force: true });

    cy.wait('@googleAuth').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });

    // Assert dashboard loads and user email is visible
    cy.url({ timeout: 10000 }).should('not.include', '/login');
    cy.get('body').should('contain.text', '@'); // email should be visible somewhere
  });
});
