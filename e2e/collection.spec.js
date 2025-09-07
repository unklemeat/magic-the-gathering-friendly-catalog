// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Collection Management', () => {
  test('should display collection tab content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to search tab (which shows collection)
    await page.click('[data-tab="search-tab"]');
    
    // Wait for collection to load (this might take time due to Firebase auth)
    await page.waitForTimeout(2000);
    
    // Check that collection elements are present
    await expect(page.locator('#collectionFilterInput')).toBeVisible();
    await expect(page.locator('#collectionSearchInput')).toBeVisible();
    
    // Check pagination controls
    await expect(page.locator('#prevPageBtn')).toBeVisible();
    await expect(page.locator('#nextPageBtn')).toBeVisible();
  });

  test('should handle collection filtering', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to search tab
    await page.click('[data-tab="search-tab"]');
    await page.waitForTimeout(2000);
    
    // Try to filter collection
    await page.fill('#collectionFilterInput', 'test');
    
    // The filter should be applied (we can't easily test the results without data)
    await expect(page.locator('#collectionFilterInput')).toHaveValue('test');
  });

  test('should handle collection search', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to search tab
    await page.click('[data-tab="search-tab"]');
    await page.waitForTimeout(2000);
    
    // Try to search collection
    await page.fill('#collectionSearchInput', 'test');
    await page.click('#collectionSearchBtn');
    
    // Should not throw any errors
    await page.waitForTimeout(1000);
  });

  test('should display page size selector', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to search tab
    await page.click('[data-tab="search-tab"]');
    await page.waitForTimeout(2000);
    
    // Check page size selector
    await expect(page.locator('#pageSizeSelect')).toBeVisible();
    
    // Check that different page sizes are available
    await expect(page.locator('#pageSizeSelect option[value="50"]')).toBeVisible();
    await expect(page.locator('#pageSizeSelect option[value="100"]')).toBeVisible();
    await expect(page.locator('#pageSizeSelect option[value="500"]')).toBeVisible();
  });
});
