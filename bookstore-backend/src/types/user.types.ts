import { Role, Gender, User, Authentication } from "@prisma/client";
import { Request } from "express";
import { PaginationParams, PaginatedResponse } from "./auth.types";

/**
 * User Management related types
 */

// Extend Express Request for user routes
export interface UserRequest extends Request {
  user?: {
    authID: string;
    email: string;
    role: Role;
  };
}

// User response types (combined User + Authentication data)
export interface UserResponse {
  userID: string;
  authID: string;
  email: string;
  name: string;
  phone?: string;
  gender?: Gender;
  birthDate?: Date;
  registerDate: Date;
  role: Role;
  addressesCount?: number;
  ordersCount?: number;
  reviewsCount?: number;
}

export interface UserProfileResponse extends UserResponse {
  addresses?: AddressResponse[];
  recentOrders?: OrderSummaryResponse[];
  wishlistCount?: number;
}

export interface AddressResponse {
  addressID: string;
  city: string;
  ward: string;
  specificAddress?: string;
  userID: string;
}

export interface OrderSummaryResponse {
  orderID: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  bookCount: number;
}

// Request types for user operations
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  gender?: Gender;
  birthDate?: string;
  role: Role;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  gender?: Gender;
  birthDate?: string;
}

export interface UpdateUserRoleRequest {
  role: Role;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  gender?: Gender;
  sortBy?: "name" | "email" | "registerDate" | "role";
  sortOrder?: "asc" | "desc";
}

export interface UserStatsResponse {
  totalUsers: number;
  usersByRole: {
    role: Role;
    count: number;
  }[];
  usersByGender: {
    gender: Gender;
    count: number;
  }[];
  newUsersThisMonth: number;
  activeUsers: number;
}

export interface UserSearchResult {
  users: UserResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
    pageSize: number;
  };
}

// Service types
export interface UserWithAuth extends User {
  authentication: Authentication;
}

export interface UserFilters {
  search?: string;
  role?: Role;
  gender?: Gender;
  startDate?: Date;
  endDate?: Date;
}

// Validation types
export interface UserValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Address management types
 */
export interface CreateAddressRequest {
  city: string;
  ward: string;
  specificAddress?: string;
}

export interface UpdateAddressRequest {
  city?: string;
  ward?: string;
  specificAddress?: string;
}

export interface AddressWithUser extends AddressResponse {
  user: {
    userID: string;
    name: string;
    email: string;
  };
}

/**
 * Export Prisma types for convenience
 */
export { Role, Gender };

/**
 * Type guards for validation
 */
export function isValidRole(role: string): role is Role {
  return Object.values(Role).includes(role as Role);
}

export function isValidGender(gender: string): gender is Gender {
  return Object.values(Gender).includes(gender as Gender);
}

/**
 * Utility types for frontend consumption
 */
export interface UserFormData {
  email: string;
  name: string;
  phone?: string;
  gender?: Gender;
  birthDate?: string;
  role: Role;
  password?: string;
}

export interface UserTableData {
  userID: string;
  email: string;
  name: string;
  phone?: string;
  gender?: string;
  role: string;
  registerDate: string;
  actions: string[];
}

// HOW TO USE:
// In controllers: import { UserResponse, UserQueryParams } from '../types/user.types';
// In services: import { UserWithAuth, UserFilters } from '../types/user.types';
