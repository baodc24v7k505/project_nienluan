import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
const API = process.env.UI_API_URL ?? "http://localhost:3100/api";
async function login(page: Page) {
  await page.goto("/login");
  await page.locator("input[type=email]").fill("customer@ecom.local");
  await page.locator("input[type=password]").fill("password123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("link", { name: /Tài khoản:/ })).toBeVisible();
}

test("wishlist saves across reload and removes without opening the product", async ({
  page,
  request,
}) => {
  const products = await (
    await request.get(`${API}/products?search=Tai%20nghe%20Bluetooth%20Studio`)
  ).json();
  const product =
    products.items.find(
      (item: { name: string }) => item.name === "Tai nghe Bluetooth Studio",
    ) ?? products.items[0];
  await login(page);
  await page.goto(`/product/${product.id}`);
  const save = page
    .getByRole("button", { name: "Lưu yêu thích", exact: true })
    .first();
  const remove = page
    .getByRole("button", { name: "Bỏ yêu thích", exact: true })
    .first();
  if (await remove.isVisible()) {
    await remove.click();
    await expect(save).toBeVisible();
  }
  await save.click();
  await expect(remove).toBeVisible();
  await page.reload();
  await expect(remove).toBeVisible();
  await page
    .getByRole("link", { name: "Sản phẩm yêu thích", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sản phẩm yêu thích" }),
  ).toBeVisible();
  const card = page
    .locator("article")
    .filter({ has: page.locator(`a[href="/product/${product.id}"]`) });
  await expect(card).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/wishlist-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await card.getByRole("button", { name: "Bỏ yêu thích", exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect(page).toHaveURL(/\/wishlist/);
});

test("buyer uploads review images after delivery, filters and opens the image viewer", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function token(email: string) {
    const result = await request.post(`${API}/auth/login`, {
      data: { email, password: "password123" },
    });
    expect(result.ok()).toBeTruthy();
    return (await result.json()).accessToken as string;
  }
  const customer = await token("customer@ecom.local");
  const products = await (
    await request.get(`${API}/products?search=Tai%20nghe%20Bluetooth%20Studio`)
  ).json();
  const product =
      products.items.find(
        (item: { name: string }) => item.name === "Tai nghe Bluetooth Studio",
      ) ?? products.items[0],
    variant = product.variants.find((v: { stock: number }) => v.stock > 0);
  let seller = "";
  for (let i = 1; i <= 5; i++) {
    const candidate = await token(`seller${i}@ecom.local`);
    const shop = await (
      await request.get(`${API}/shops/me`, {
        headers: { Authorization: `Bearer ${candidate}` },
      })
    ).json();
    if (shop.id === product.shop.id) {
      seller = candidate;
      break;
    }
  }
  expect(seller).not.toBe("");
  const addresses = await (
    await request.get(`${API}/addresses`, {
      headers: { Authorization: `Bearer ${customer}` },
    })
  ).json();
  const placed = await request.post(`${API}/orders`, {
    headers: { Authorization: `Bearer ${customer}` },
    data: {
      addressId: addresses[0].id,
      paymentMethod: "COD",
      idempotencyKey: randomUUID(),
      directItem: { productId: product.id, variantId: variant.id, quantity: 1 },
    },
  });
  expect(placed.status()).toBe(201);
  const order = await placed.json(),
    so = order.shopOrders[0];
  const sellerHeaders = { Authorization: `Bearer ${seller}` };
  expect(
    (
      await request.patch(`${API}/seller/orders/${so.id}/status`, {
        headers: sellerHeaders,
        data: { status: "CONFIRMED" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.patch(`${API}/seller/orders/${so.id}/shipping`, {
        headers: sellerHeaders,
        data: { carrier: "Vận chuyển kiểm thử", trackingCode: randomUUID() },
      })
    ).ok(),
  ).toBeTruthy();
  for (const status of ["SHIPPING", "DELIVERED"])
    expect(
      (
        await request.patch(`${API}/seller/orders/${so.id}/status`, {
          headers: sellerHeaders,
          data: { status },
        })
      ).ok(),
    ).toBeTruthy();
  await login(page);
  await page.goto(`/product/${product.id}`);
  const buffer = await page
    .getByRole("button", { name: "Phóng to ảnh sản phẩm" })
    .locator("img")
    .screenshot();
  await page.goto(`/orders/${order.id}`);
  await page
    .getByRole("button", { name: "Đánh giá sản phẩm", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "4 sao", exact: true }).click();
  const comment = `Kiểm thử ảnh đánh giá ${randomUUID().slice(0, 8)}. Sản phẩm và bao bì đúng mô tả.`;
  await page.getByRole("textbox", { name: "Nhận xét của bạn" }).fill(comment);
  await page.getByLabel("Thêm ảnh đánh giá").setInputFiles([
    { name: "san-pham.png", mimeType: "image/png", buffer },
    { name: "bao-bi.png", mimeType: "image/png", buffer },
  ]);
  await expect(
    page.getByAltText("Ảnh đánh giá 2", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa ảnh 1", exact: true }).click();
  await expect(
    page.getByAltText("Ảnh đánh giá 2", { exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/review-composer-mobile.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Đã đánh giá · 4/5 sao", { exact: false }),
  ).toBeVisible();
  await page.goto(`/product/${product.id}`);
  await page.getByRole("tab", { name: /^Đánh giá/ }).click();
  await page.getByRole("checkbox", { name: /Có hình ảnh/ }).check();
  await page.getByRole("button", { name: "4 sao", exact: true }).click();
  const review = page.locator("article").filter({ hasText: comment });
  await expect(review).toBeVisible();
  await expect(review.getByText("Đã mua hàng", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: /Xem ảnh đánh giá 1/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByAltText("Ảnh phóng to 1")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("#product-information").screenshot({
    path: "test-results/reviews-mobile.png",
    style: "header, nav.fixed { visibility: hidden !important; }",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("catalogue preserves filters when reopening a product and using Back", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Điện tử", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Sắp xếp sản phẩm" })
    .selectOption("price_asc");
  await page.getByRole("spinbutton", { name: "Giá từ" }).fill("10000");
  await page.getByRole("spinbutton", { name: "Giá đến" }).fill("2000000");
  await page.getByRole("button", { name: "Lọc giá", exact: true }).click();
  await expect(page).toHaveURL(/minPrice=10000/);
  const catalogueUrl = page.url();
  await page.locator('#catalog a[href^="/product/"]').first().click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Phóng to ảnh sản phẩm" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(page).toHaveURL(catalogueUrl);
  await expect(
    page.getByRole("button", { name: "Điện tử", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Sắp xếp sản phẩm" }),
  ).toHaveValue("price_asc");
  await expect(page.getByRole("spinbutton", { name: "Giá từ" })).toHaveValue(
    "10000",
  );
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Giá đến" })).toHaveValue(
    "2000000",
  );
});
