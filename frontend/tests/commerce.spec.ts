import { test, expect, type Page } from "@playwright/test";
const API = process.env.UI_API_URL ?? "http://localhost:3100/api";
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill("password123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("link", { name: /Tài khoản:/ })).toBeVisible();
}
test("catalogue categories, search, sorting and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator('a[href^="/product/"]')).toHaveCount(12);
  const categoryResult = page.waitForResponse(
    (r) =>
      r.url().includes("/products?") &&
      new URL(r.url()).searchParams.has("categoryId"),
  );
  await page.getByRole("button", { name: "Điện tử", exact: true }).click();
  const categoryData = await (await categoryResult).json();
  await expect(page.locator('a[href^="/product/"]')).toHaveCount(
    categoryData.items.length,
  );
  expect(categoryData.items.length).toBeGreaterThan(0);
  await page
    .getByRole("combobox", { name: "Sắp xếp sản phẩm" })
    .selectOption("price_asc");
  await page.screenshot({
    path: "test-results/catalogue-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  await page.screenshot({
    path: "test-results/catalogue-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("customer buys one chosen SKU, sees shipping and cancels the order", async ({
  page,
  request,
}) => {
  await login(page, "customer@ecom.local");
  const products = await (
    await request.get(`${API}/products?search=Tai%20nghe%20Bluetooth%20Studio`)
  ).json();
  const p = products.items[0];
  expect(p.variants.length).toBe(3);
  await page.goto(`/product/${p.id}`);
  await page.getByRole("button", { name: "Tiêu chuẩn", exact: true }).click();
  await page.getByRole("button", { name: "Mua Ngay", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Xác nhận đặt hàng" }),
  ).toBeVisible();
  await expect(page.getByText("Phí giao hàng", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/checkout.png", fullPage: true });
  await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+/);
  await expect(page.getByText("SKU", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
  await page
    .getByPlaceholder("Nhập lý do hủy đơn...")
    .fill("Kiểm thử giao diện đặt và hủy đơn");
  await page.getByRole("button", { name: "Xác nhận hủy", exact: true }).click();
  await expect(page.getByText("Đã hủy", { exact: true }).first()).toBeVisible();
  await page.getByText("Lịch sử đơn hàng").click();
  await page.screenshot({
    path: "test-results/order-detail.png",
    fullPage: true,
  });
});
test("seller views SKU editor and order management without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "seller1@ecom.local");
  await page.goto("/seller/products");
  await expect(
    page.getByText("Phân loại và SKU", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "+ Thêm phân loại", exact: true })
    .click();
  await expect(page.getByPlaceholder("Giá (VNĐ)", { exact: true })).toHaveValue(
    "10000",
  );
  await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
  await expect(
    page.getByRole("textbox", { name: "sku 1", exact: true }),
  ).toBeVisible();
  const save = page.waitForResponse(
    (r) =>
      r.request().method() === "PATCH" && r.url().includes("/seller/products/"),
  );
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  expect((await save).status()).toBe(200);
  await page.getByRole("button", { name: "Sửa", exact: true }).first().click();
  await page.screenshot({
    path: "test-results/seller-products.png",
    fullPage: true,
  });
  await page.goto("/seller/orders");
  await expect(
    page.getByRole("heading", { name: "Kênh người bán" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("admin changes report dates and downloads CSV", async ({ page }) => {
  await login(page, "admin@ecom.local");
  await page.goto("/admin");
  await expect(
    page.getByText("Thực thu ròng trong kỳ", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Từ ngày", { exact: true }).fill("2026-01-01");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2026-12-31");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("bao-cao");
  await page.screenshot({
    path: "test-results/admin-report.png",
    fullPage: true,
  });
});
test("customer manages profile and address book", async ({ page }) => {
  await login(page, "customer@ecom.local");
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Sổ địa chỉ" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lưu thông tin", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/account.png", fullPage: true });
});
test("switching sellers clears private cached shop information", async ({
  page,
}) => {
  await login(page, "seller1@ecom.local");
  await page.goto("/seller");
  await expect(
    page.getByRole("heading", { name: "Tech & Home", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await login(page, "seller2@ecom.local");
  await page.goto("/seller");
  await expect(
    page.getByRole("heading", { name: "Phong cách Việt", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tech & Home", exact: true }),
  ).toHaveCount(0);
});
