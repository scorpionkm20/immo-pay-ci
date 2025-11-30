import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to auth when not logged in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Email ou mot de passe incorrect')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Logout
    await page.click('button[aria-label="Profil"]');
    await page.click('text=Déconnexion');
    
    // Should redirect to auth
    await page.waitForURL('/auth');
    await expect(page).toHaveURL('/auth');
  });
});
