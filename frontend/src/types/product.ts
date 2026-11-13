export type ProductStatus = "DRAFT" | "ACTIVE" | "HIDDEN";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface Product {
  ratingAverage?: number;
  reviewCount?: number;
  soldCount?: number;
  variants: ProductVariant[];
  id: string;
  shopId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
  category: Category | null;
  shop: { id: string; name: string; status: string };
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
}
