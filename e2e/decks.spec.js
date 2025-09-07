// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Deck Management', () => {
  test('should display deck management interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to decks tab
    await page.click('[data-tab="decks-tab"]');
    await page.waitForTimeout(2000);
    
    // Check that deck management elements are present
    await expect(page.locator('#decks-list')).toBeVisible();
    await expect(page.locator('#newDeckNameInput')).toBeVisible();
    await expect(page.locator('#createDeckBtn')).toBeVisible();
  });

  test('should create a new deck', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to decks tab
    await page.click('[data-tab="decks-tab"]');
    await page.waitForTimeout(2000);
    
    // Create a new deck
    const deckName = `Test Deck ${Date.now()}`;
    await page.fill('#newDeckNameInput', deckName);
    await page.click('#createDeckBtn');
    
    // Wait for deck to be created
    await page.waitForTimeout(2000);
    
    // Check that the deck appears in the list
    await expect(page.locator(`text=${deckName}`)).toBeVisible();
  });

  test('should handle empty deck name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to decks tab
    await page.click('[data-tab="decks-tab"]');
    await page.waitForTimeout(2000);
    
    // Try to create deck with empty name
    await page.click('#createDeckBtn');
    
    // Should not create a deck (input should remain empty)
    await expect(page.locator('#newDeckNameInput')).toHaveValue('');
  });

  test('should enter deck editor when clicking on a deck', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to decks tab
    await page.click('[data-tab="decks-tab"]');
    await page.waitForTimeout(2000);
    
    // Create a deck first
    const deckName = `Test Deck ${Date.now()}`;
    await page.fill('#newDeckNameInput', deckName);
    await page.click('#createDeckBtn');
    await page.waitForTimeout(2000);
    
    // Click on the deck to enter editor
    await page.click(`text=${deckName}`);
    
    // Should enter deck editor
    await expect(page.locator('#deck-editor')).toBeVisible();
    await expect(page.locator('#deck-editor-name-input')).toBeVisible();
    await expect(page.locator('#backToDecksBtn')).toBeVisible();
  });

  test('should return to deck list from editor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to decks tab
    await page.click('[data-tab="decks-tab"]');
    await page.waitForTimeout(2000);
    
    // Create a deck first
    const deckName = `Test Deck ${Date.now()}`;
    await page.fill('#newDeckNameInput', deckName);
    await page.click('#createDeckBtn');
    await page.waitForTimeout(2000);
    
    // Enter deck editor
    await page.click(`text=${deckName}`);
    await page.waitForTimeout(1000);
    
    // Return to deck list
    await page.click('#backToDecksBtn');
    
    // Should be back in deck list
    await expect(page.locator('#decks-list')).toBeVisible();
  });
});
