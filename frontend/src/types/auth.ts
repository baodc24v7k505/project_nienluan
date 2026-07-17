export type Role = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: 'ACTIVE' | 'BANNED';
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
