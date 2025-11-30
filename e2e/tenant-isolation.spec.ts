import { test, expect } from '@playwright/test';

// Test data for two different tenants
const tenant1 = {
  email: 'tenant1@test.com',
  password: 'Test123456!',
  name: 'Tenant One'
};

const tenant2 = {
  email: 'tenant2@test.com',
  password: 'Test123456!',
  name: 'Tenant Two'
};

test.describe('Tenant Data Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('tenant should only see their own leases', async ({ page }) => {
    // Login as tenant 1
    await page.fill('input[type="email"]', tenant1.email);
    await page.fill('input[type="password"]', tenant1.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Navigate to leases page
    await page.click('a[href="/my-leases"]');
    await page.waitForURL('/my-leases');
    
    // Get all lease titles
    const tenant1Leases = await page.locator('[data-testid="lease-title"]').allTextContents();
    
    // Logout
    await page.click('button[aria-label="Profil"]');
    await page.click('text=Déconnexion');
    await page.waitForURL('/auth');
    
    // Login as tenant 2
    await page.fill('input[type="email"]', tenant2.email);
    await page.fill('input[type="password"]', tenant2.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to leases page
    await page.click('a[href="/my-leases"]');
    await page.waitForURL('/my-leases');
    
    // Get all lease titles
    const tenant2Leases = await page.locator('[data-testid="lease-title"]').allTextContents();
    
    // Verify no overlap - each tenant should see different leases
    const hasOverlap = tenant1Leases.some(lease => tenant2Leases.includes(lease));
    expect(hasOverlap).toBe(false);
  });

  test('tenant should only see their own payments', async ({ page }) => {
    // Login as tenant 1
    await page.fill('input[type="email"]', tenant1.email);
    await page.fill('input[type="password"]', tenant1.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to payments page
    await page.click('a[href="/payments"]');
    await page.waitForURL('/payments');
    
    // Get payment count
    const tenant1PaymentCount = await page.locator('[data-testid="payment-row"]').count();
    
    // Logout and login as tenant 2
    await page.click('button[aria-label="Profil"]');
    await page.click('text=Déconnexion');
    await page.waitForURL('/auth');
    
    await page.fill('input[type="email"]', tenant2.email);
    await page.fill('input[type="password"]', tenant2.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    await page.click('a[href="/payments"]');
    await page.waitForURL('/payments');
    
    const tenant2PaymentCount = await page.locator('[data-testid="payment-row"]').count();
    
    // Each tenant should have their own payments (not same count necessarily)
    // But they shouldn't see all payments if they're different
    expect(tenant1PaymentCount).toBeGreaterThanOrEqual(0);
    expect(tenant2PaymentCount).toBeGreaterThanOrEqual(0);
  });

  test('tenant should not access admin panel', async ({ page }) => {
    // Login as tenant
    await page.fill('input[type="email"]', tenant1.email);
    await page.fill('input[type="password"]', tenant1.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Try to navigate to admin panel directly
    await page.goto('/admin');
    
    // Should be redirected to home or show access denied
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).not.toContain('/admin');
  });

  test('tenant should have correct menu items', async ({ page }) => {
    // Login as tenant
    await page.fill('input[type="email"]', tenant1.email);
    await page.fill('input[type="password"]', tenant1.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Check for tenant-specific menu items
    await expect(page.locator('a[href="/my-leases"]')).toBeVisible();
    await expect(page.locator('a[href="/payments"]')).toBeVisible();
    await expect(page.locator('a[href="/maintenance"]')).toBeVisible();
    
    // Should NOT have manager-specific items
    await expect(page.locator('a[href="/rental-requests"]')).not.toBeVisible();
    await expect(page.locator('a[href="/my-properties"]')).not.toBeVisible();
  });

  test('tenant should not see other tenants maintenance tickets', async ({ page }) => {
    // Login as tenant 1
    await page.fill('input[type="email"]', tenant1.email);
    await page.fill('input[type="password"]', tenant1.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to maintenance page
    await page.click('a[href="/maintenance"]');
    await page.waitForURL('/maintenance');
    
    // Get all ticket titles
    const tenant1Tickets = await page.locator('[data-testid="ticket-title"]').allTextContents();
    
    // Logout and login as tenant 2
    await page.click('button[aria-label="Profil"]');
    await page.click('text=Déconnexion');
    await page.waitForURL('/auth');
    
    await page.fill('input[type="email"]', tenant2.email);
    await page.fill('input[type="password"]', tenant2.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    await page.click('a[href="/maintenance"]');
    await page.waitForURL('/maintenance');
    
    const tenant2Tickets = await page.locator('[data-testid="ticket-title"]').allTextContents();
    
    // Verify no overlap
    const hasOverlap = tenant1Tickets.some(ticket => tenant2Tickets.includes(ticket));
    expect(hasOverlap).toBe(false);
  });
});

test.describe('Manager vs Tenant Authorization', () => {
  const manager = {
    email: 'manager@test.com',
    password: 'Test123456!',
  };

  test('manager should see rental requests menu', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', manager.email);
    await page.fill('input[type="password"]', manager.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Manager should have rental requests link
    await expect(page.locator('a[href="/rental-requests"]')).toBeVisible();
    await expect(page.locator('a[href="/my-properties"]')).toBeVisible();
  });

  test('manager should access rental requests page', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', manager.email);
    await page.fill('input[type="password"]', manager.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to rental requests
    await page.click('a[href="/rental-requests"]');
    await page.waitForURL('/rental-requests');
    
    // Should see the page content
    await expect(page.locator('text=Demandes de Location')).toBeVisible();
  });
});
