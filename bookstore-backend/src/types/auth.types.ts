import { Role, Gender } from "@prisma/client";
import { Request } from "express";
/**
 * Authentication related types
 */

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

// Request types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  gender?: Gender;
  birthDate?: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  authID: string;
  email: string;
  role: Role;
}

// Response types
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      phone?: string;
      gender?: Gender;
      birthDate?: Date;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  gender?: Gender;
  birthDate?: Date;
  registerDate: Date;
}

// Service types
export interface AuthUser {
  authID: string;
  email: string;
  role: Role;
  user?: {
    userID: string;
    name: string;
    phone?: string;
    gender?: Gender;
    birthDate?: Date;
    registerDate: Date;
  };
  author?: {
    authorID: string;
    name: string;
  };
  admin?: {
    adminID: string;
  };
}

// Token types
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  authID: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// Middleware types
// export interface AuthenticatedRequest extends Express.Request {
//   user?: AuthTokenPayload;
// }

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Password reset types
 */
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

/**
 * Pagination types
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Export Prisma enums for convenience
export { Role, Gender };
