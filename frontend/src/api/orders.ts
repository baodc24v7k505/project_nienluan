import { apiClient } from "./client";
import type {
  Order,
  PaymentMethod,
  ShopOrder,
  ShopOrderStatus,
} from "../types/order";
import type { PaginatedResult } from "../types/shop";

export interface CheckoutPayload {
  addressId: string;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  cartItemIds?: string[];
  directItem?: { productId: string; variantId?: string; quantity: number };
  idempotencyKey?: string;
}
export async function checkout(payload: CheckoutPayload) {
  const res = await apiClient.post<Order>("/orders", payload);
  return res.data;
}

export async function listMyOrders(page = 1) {
  const res = await apiClient.get<PaginatedResult<Order>>("/orders", {
    params: { page },
  });
  return res.data;
}

export async function getMyOrder(id: string) {
  const res = await apiClient.get<Order>(`/orders/${id}`);
  return res.data;
}

export async function listSellerOrders(page = 1) {
  const res = await apiClient.get<PaginatedResult<ShopOrder>>(
    "/seller/orders",
    { params: { page } },
  );
  return res.data;
}

export async function updateShopOrderStatus(
  id: string,
  status: ShopOrderStatus,
  reason?: string,
) {
  const res = await apiClient.patch<ShopOrder>(`/seller/orders/${id}/status`, {
    status,
    reason,
  });
  return res.data;
}

export async function listAdminOrders(page = 1) {
  const res = await apiClient.get<PaginatedResult<Order>>("/admin/orders", {
    params: { page },
  });
  return res.data;
}

export interface OrderQuote {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  items: {
    id: string;
    quantity: number;
    product: { name: string };
    variant: { name: string; price: string };
  }[];
  shops: {
    shopId: string;
    shopName: string;
    shippingFee: number;
    totalAmount: number;
  }[];
}
export async function quoteOrder(payload: CheckoutPayload) {
  return (await apiClient.post<OrderQuote>("/orders/quote", payload)).data;
}
export async function setShipping(
  id: string,
  carrier: string,
  trackingCode: string,
) {
  return (
    await apiClient.patch(`/seller/orders/${id}/shipping`, {
      carrier,
      trackingCode,
    })
  ).data;
}
export async function requestReturn(
  id: string,
  reason: string,
  evidenceUrls: string[],
) {
  return (
    await apiClient.post(`/orders/shop-orders/${id}/return`, {
      reason,
      evidenceUrls,
    })
  ).data;
}
export async function resolveReturn(
  id: string,
  status: string,
  resolution: string,
  admin = false,
) {
  return (
    await apiClient.patch(
      admin
        ? `/admin/orders/shop-orders/${id}/return`
        : `/seller/orders/${id}/return`,
      { status, resolution },
    )
  ).data;
}
export async function completeRefund(id: string, reference: string) {
  return (
    await apiClient.patch(`/admin/orders/refunds/${id}/complete`, { reference })
  ).data;
}
export async function collectCod(id: string) { return (await apiClient.patch(`/seller/orders/${id}/collect-cod`)).data; }

export async function cancelOrder(shopOrderId: string, reason: string) {
  const res = await apiClient.patch<ShopOrder>(
    `/orders/shop-orders/${shopOrderId}/cancel`,
    {
      reason,
    },
  );
  return res.data;
}
