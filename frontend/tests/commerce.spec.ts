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
  await page.screenshot({
    path: "test-results/product-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/product-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 720 });
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
  let releaseInitial = () => {};
  const initialGate = new Promise<void>((resolve) => {
    releaseInitial = resolve;
  });
  await page.route("**/api/admin/statistics?*", async (route) => {
    if (!new URL(route.request().url()).searchParams.has("from"))
      await initialGate;
    await route.continue();
  });
  await page.goto("/admin");
  await expect(
    page.getByText("Thực thu ròng trong kỳ", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Từ ngày", { exact: true }).fill("2026-01-01");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2026-12-31");
  const initialResponse = page.waitForResponse(
    (r) =>
      r.url().includes("/admin/statistics?") &&
      !new URL(r.url()).searchParams.has("from"),
  );
  releaseInitial();
  const initialReport = await (await initialResponse).json();
  await expect(
    page.getByRole("button", { name: "Áp dụng", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveValue(
    "2026-01-01",
  );
  const report = page.waitForResponse(
    (r) =>
      r.url().includes("/admin/statistics?") &&
      r.url().includes("from=2026-01-01"),
  );
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  expect((await report).status()).toBe(200);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "bao-cao-2026-01-01-2026-12-31.csv",
  );
  await page.screenshot({
    path: "test-results/admin-report.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "14 ngày", exact: true }).click();
  await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveValue(
    initialReport.range.from,
  );
  await page.getByLabel("Từ ngày", { exact: true }).fill("2025-01-01");
  await page.getByRole("button", { name: "14 ngày", exact: true }).click();
  await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveValue(
    initialReport.range.from,
  );
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

test("shop requests banner removal, admin responds and confirms deletion", async ({
  page,
  request,
}) => {
  const title = `Kiểm thử banner ${Date.now()}`;
  const auth = await request.post(`${API}/auth/login`, {
    data: { email: "seller1@ecom.local", password: "password123" },
  });
  expect(auth.ok()).toBeTruthy();
  const tokens = await auth.json();
  const created = await request.post(`${API}/seller/ads`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    data: {
      title,
      imageUrl:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900",
      startAt: new Date(Date.now() - 60000).toISOString(),
      endAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  expect(created.ok()).toBeTruthy();
  await login(page, "seller1@ecom.local");
  await page.goto("/seller/ads");
  let card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card.getByRole("button", { name: "Yêu cầu xóa", exact: true }).click();
  await page
    .getByLabel("Lý do yêu cầu", { exact: true })
    .fill("Chiến dịch kiểm thử đã kết thúc");
  await page
    .getByRole("button", { name: "Gửi yêu cầu xóa", exact: true })
    .click();
  await expect(
    card.getByText("Yêu cầu xóa đang chờ xử lý", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/seller-ad-request.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await login(page, "admin@ecom.local");
  await page.goto("/admin/ads");
  await page.getByRole("button", { name: /^Yêu cầu xóa/ }).click();
  await page.getByLabel("Tìm quảng cáo").fill(title);
  card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card
    .getByRole("button", { name: "Từ chối yêu cầu", exact: true })
    .click();
  await page
    .getByLabel("Lý do từ chối", { exact: true })
    .fill("Vui lòng kiểm tra lại thời hạn chiến dịch");
  await page.getByRole("button", { name: "Gửi phản hồi", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: `Xóa quảng cáo ${title}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: `Xóa quảng cáo ${title}`, exact: true })
    .click();
  await page.screenshot({
    path: "test-results/admin-ad-delete.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toHaveCount(0);
});

test("report handles positive and negative cash flow, large ranges and mobile layout", async ({
  page,
}) => {
  // Isolated display fixture; production continues to read actual database statistics.
  const series = Array.from({ length: 90 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 7, 1 + i)).toISOString().slice(0, 10),
    revenue: i % 18 < 3 ? -450000 : 1200000 + i * 34000,
  }));
  await login(page, "admin@ecom.local");
  await page.route("**/api/admin/statistics?*", (route) =>
    route.fulfill({
      json: {
        range: { from: series[0].date, to: series.at(-1)!.date },
        totalCollected: 224000000,
        totalRefunded: 4500000,
        totalRevenue: 219500000,
        grossMerchandiseValue: 205000000,
        pendingRefunds: 450000,
        totalOrders: 126,
        ordersByStatus: {
          PENDING: 10,
          CONFIRMED: 8,
          SHIPPING: 12,
          DELIVERED: 86,
          CANCELLED: 7,
          RETURNED: 3,
        },
        revenueByDay: series,
        totalUsers: 248,
        usersByRole: { CUSTOMER: 222, SELLER: 24, ADMIN: 1, STAFF: 1 },
        totalShops: 24,
        shopsByStatus: { APPROVED: 20, PENDING: 4 },
        topShops: [
          { shopId: "tech", name: "Tech & Home", revenue: 84000000 },
          { shopId: "fashion", name: "Phong cách Việt", revenue: 62000000 },
          { shopId: "beauty", name: "Beauty Corner", revenue: 38000000 },
        ],
        voucherStats: [
          {
            voucherId: "demo",
            code: "WELCOME10",
            discountType: "PERCENT",
            status: "ACTIVE",
            usedCount: 48,
            usageLimit: 100,
            totalDiscount: 4800000,
          },
        ],
      },
    }),
  );
  await page.goto("/admin");
  await expect(page.getByText("219.500.000 ₫", { exact: true })).toBeVisible();
  await expect(page.getByText("WELCOME10", { exact: true })).toBeVisible();
  await expect(page.locator('svg [role="button"]').first()).toBeVisible();
  await page.locator('svg [role="button"]').first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('svg rect[fill="#e9768a"]').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/admin-report-populated.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (await page.getByLabel("Từ ngày", { exact: true }).boundingBox())!.width,
  ).toBeGreaterThan(120);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/admin-report-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
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
