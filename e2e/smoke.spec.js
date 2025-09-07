// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('MGT Application Smoke Tests', () => {
  test('should load the application and display main UI elements', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the main title is present
    await expect(page.locator('h1')).toContainText('MTG Friendly Catalog');

    // Check that the main navigation tabs are present
    await expect(page.locator('[data-tab="search-tab"]')).toBeVisible();
    await expect(page.locator('[data-tab="explore-tab"]')).toBeVisible();
    await expect(page.locator('[data-tab="decks-tab"]')).toBeVisible();

    // Check that the search input is present
    await expect(page.locator('#cardNameInput')).toBeVisible();
    await expect(page.locator('#searchCardBtn')).toBeVisible();

    // Check that the API status indicator is present
    await expect(page.locator('#statusBtn')).toBeVisible();
  });

  test('should be able to switch between tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test switching to explore tab
    await page.click('[data-tab="explore-tab"]');
    await expect(page.locator('#setSelect')).toBeVisible();

    // Test switching to decks tab
    await page.click('[data-tab="decks-tab"]');
    await expect(page.locator('#decks-list')).toBeVisible();

    // Test switching back to search tab
    await page.click('[data-tab="search-tab"]');
    await expect(page.locator('#cardNameInput')).toBeVisible();
  });

  test('should display language selector', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that language selector is present
    await expect(page.locator('#languageSelect')).toBeVisible();
    
    // Check that both language options are available
    await expect(page.locator('#languageSelect option[value="eng"]')).toBeVisible();
    await expect(page.locator('#languageSelect option[value="ita"]')).toBeVisible();
  });

  test('should handle search input interaction', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Type in the search input
    await page.fill('#cardNameInput', 'Lightning Bolt');
    
    // Verify the input has the value
    await expect(page.locator('#cardNameInput')).toHaveValue('Lightning Bolt');
    
    // Clear the input
    await page.fill('#cardNameInput', '');
    await expect(page.locator('#cardNameInput')).toHaveValue('');
  });
});
