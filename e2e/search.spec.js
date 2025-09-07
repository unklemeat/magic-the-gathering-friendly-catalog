// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Card Search Functionality', () => {
  test('should search for a card and display results', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the API to be ready (this might take a moment)
    await page.waitForSelector('#statusBtn', { state: 'visible' });
    
    // Type a card name in the search input
    await page.fill('#cardNameInput', 'Lightning Bolt');
    
    // Click the search button
    await page.click('#searchCardBtn');
    
    // Wait for the search to complete (look for progress indicator to disappear)
    await page.waitForSelector('#progress', { state: 'hidden', timeout: 10000 });
    
    // The search should either:
    // 1. Add the card to collection (if found)
    // 2. Show a modal with multiple results
    // 3. Show a "not found" message
    
    // We'll check if any of these outcomes occurred
    const hasModal = await page.locator('.modal').isVisible();
    const hasAlert = await page.locator('.alert').isVisible();
    
    // At least one of these should be true if the search worked
    expect(hasModal || hasAlert).toBeTruthy();
  });

  test('should handle empty search input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to search with empty input
    await page.click('#searchCardBtn');
    
    // Should show a validation message
    await expect(page.locator('.modal')).toBeVisible();
  });

  test('should handle invalid card name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Search for a non-existent card
    await page.fill('#cardNameInput', 'ThisCardDoesNotExist12345');
    await page.click('#searchCardBtn');
    
    // Wait for search to complete
    await page.waitForSelector('#progress', { state: 'hidden', timeout: 10000 });
    
    // Should show "not found" message
    await expect(page.locator('.modal')).toBeVisible();
  });

  test('should clear search input after successful search', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Search for a card
    await page.fill('#cardNameInput', 'Lightning Bolt');
    await page.click('#searchCardBtn');
    
    // Wait for search to complete
    await page.waitForSelector('#progress', { state: 'hidden', timeout: 10000 });
    
    // Input should be cleared after search
    await expect(page.locator('#cardNameInput')).toHaveValue('');
  });
});
