import { test, expect } from "@playwright/test";

const THRESHOLD = 0.05;

test("first landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot({ threshold: THRESHOLD });
});

test("first landing page with limit width", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 1000 });
  await page.goto("/");

  await expect(page).toHaveScreenshot({ threshold: THRESHOLD });
});

test("about button", async ({ page }) => {
  await page.goto("/");

  await page.click("//li/a[@href='/#about']");

  await expect(page).toHaveScreenshot({ threshold: THRESHOLD });
});

test("about button with limit width", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 1000 });
  await page.goto("/");

  await page.click("//label[contains(@for, 'drawer')]");
  await page.click("//li/a[@href='/#about']");

  await expect(page).toHaveScreenshot({ threshold: THRESHOLD });
});

test("projects button", async ({ page }) => {
  await page.goto("/");

  await page.click("//li/a[contains(@href, 'projects/1')]");

  const maskedElement = await page.locator("//img[contains(@src, '.gif')]");
  await expect(page).toHaveScreenshot({
    animations: "disabled",
    threshold: THRESHOLD,
    mask: [maskedElement],
  });
});

test("projects button with limit width", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 1000 });
  await page.goto("/");

  await page.click("//label[contains(@for, 'drawer')]");
  await page.click("//li/a[contains(@href, 'projects/1')]");

  const maskedElement = await page.locator("//img[contains(@src, '.gif')]");
  await expect(page).toHaveScreenshot({
    animations: "disabled",
    threshold: THRESHOLD,
    mask: [maskedElement],
  });
});

test("show latest project button", async ({ page }) => {
  await page.goto("/");

  await page.click("//a[contains(@href, 'projects/')]");
  const maskedElement = await page.locator("//img[contains(@src, '.gif')]");
  await expect(page).toHaveScreenshot({
    animations: "disabled",
    threshold: THRESHOLD,
    mask: [maskedElement],
  });
});

test("show latest project button with limit width", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 1000 });
  await page.goto("/");

  await page.click("//a[contains(@href, 'projects/')]");

  const maskedElement = await page.locator("//img[contains(@src, '.gif')]");
  await expect(page).toHaveScreenshot({
    animations: "disabled",
    threshold: THRESHOLD,
    mask: [maskedElement],
  });
});
