export type ShopOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentMethod = 'COD' | 'MOMO';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
export type CancelledBy = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export interface Address {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  line: string;
  city: string;
  isDefault: boolean;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: string;
    stock: number;
    images: { id: string; url: string }[];
    shop: { id: string; name: string };
  };
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface OrderItemLine {
  id: string;
  productId: string;
  nameSnapshot: string;
  unitPrice: string;
  quantity: number;
  product: { id: string; name: string };
}

export interface ShopOrder {
  id: string;
  orderId: string;
  shopId: string;
  status: ShopOrderStatus;
  subtotal: string;
  cancelReason: string | null;
  cancelledBy: CancelledBy | null;
  createdAt: string;
  updatedAt: string;
  shop: { id: string; name: string };
  orderItems: OrderItemLine[];
  order?: {
    id: string;
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    paymentMethod: PaymentMethod;
    customer: { id: string; fullName: string; email: string; phone: string | null };
  };
}

export interface Order {
  id: string;
  customerId: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  voucherCode: string | null;
  discountAmount: string;
  createdAt: string;
  shopOrders: ShopOrder[];
  payment: { id: string; method: PaymentMethod; status: PaymentStatus } | null;
}
