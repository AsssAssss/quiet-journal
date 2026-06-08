import { expect, test } from '@playwright/test';

test('打开首页并切换主题', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Quiet')).toBeVisible();
  await expect(page.getByTestId('title-placeholder')).toBeVisible();

  const html = page.locator('html');
  const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
  await page.getByTestId('theme-toggle').click();
  await expect
    .poll(() => html.evaluate((el) => el.classList.contains('dark')))
    .toBe(!wasDark);
});

test('跳转设置页', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /设置/ }).click();
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
});
