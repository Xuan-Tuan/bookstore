// Format API responses

import { Response } from "express";
import { HTTP_STATUS, API_RESPONSE, PAGINATION } from "../config/constants";

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
    pageSize: number;
  };
  timestamp: string;
}

/**
 * Pagination calculation interface
 */
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export interface PaginationResult {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
  pageSize: number;
  skip: number;
}

/**
 * Success response helper functions
 */
export class ApiHelpers {
  /**
   * Send success response with data
   */
  static success<T>(
    res: Response,
    message: string = API_RESPONSE.SUCCESS,
    data?: T,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    message: string = API_RESPONSE.CREATED,
    data?: T
  ): Response {
    return this.success(res, message, data, HTTP_STATUS.CREATED);
  }

  /**
   * Send success response with pagination
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationResult,
    message: string = API_RESPONSE.SUCCESS
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev,
        pageSize: pagination.pageSize,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response, message: string = "No content"): Response {
    const response: ApiResponse = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    return res.status(HTTP_STATUS.NO_CONTENT).json(response);
  }

  /**
   * Calculate pagination parameters
   */
  static calculatePagination(
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_LIMIT,
    totalItems: number = 0
  ): PaginationResult {
    // Validate and sanitize inputs
    const currentPage = Math.max(1, parseInt(page.toString()));
    const pageSize = Math.min(
      Math.max(1, parseInt(limit.toString())),
      PAGINATION.MAX_LIMIT
    );
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return {
      currentPage,
      totalPages,
      totalItems,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      pageSize,
      skip: (currentPage - 1) * pageSize,
    };
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string = API_RESPONSE.INTERNAL_ERROR,
    errors: string[] = [],
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    errors: string[] = [],
    message: string = API_RESPONSE.VALIDATION_ERROR
  ): Response {
    return this.error(res, message, errors, HTTP_STATUS.VALIDATION_ERROR);
  }

  /**
   * Send not found response
   */
  static notFound(
    res: Response,
    message: string = API_RESPONSE.NOT_FOUND
  ): Response {
    return this.error(res, message, [], HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(
    res: Response,
    message: string = API_RESPONSE.UNAUTHORIZED
  ): Response {
    return this.error(res, message, [], HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Send forbidden response
   */
  static forbidden(
    res: Response,
    message: string = API_RESPONSE.FORBIDDEN
  ): Response {
    return this.error(res, message, [], HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Send conflict response
   */
  static conflict(
    res: Response,
    message: string = API_RESPONSE.CONFLICT
  ): Response {
    return this.error(res, message, [], HTTP_STATUS.CONFLICT);
  }

  /**
   * Extract pagination parameters from request query
   */
  static getPaginationParams(query: any): { page: number; limit: number } {
    const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    return { page, limit };
  }

  /**
   * Sanitize data for response (remove sensitive fields)
   */
  static sanitizeUser<T>(data: T): T {
    if (data && typeof data === "object") {
      const sanitized = { ...data } as any;

      // Remove sensitive fields
      const sensitiveFields = ["password", "pass", "refreshToken", "token"];
      sensitiveFields.forEach((field) => {
        if (field in sanitized) {
          delete sanitized[field];
        }
      });

      return sanitized;
    }
    return data;
  }

  /**
   * Format validation errors from validation library (like Joi, Zod)
   */
  static formatValidationErrors(validationResult: any): string[] {
    if (!validationResult || !validationResult.error) {
      return [];
    }

    if (Array.isArray(validationResult.error.details)) {
      return validationResult.error.details.map(
        (detail: any) => detail.message
      );
    }

    return [validationResult.error.message || "Validation failed"];
  }
}

/**
 * Utility functions for common operations
 */
export class CommonHelpers {
  /**
   * Generate random string (for tokens, IDs, etc.)
   */
  static generateRandomString(length: number = 32): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Generate numeric OTP
   */
  static generateOTP(length: number = 6): string {
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  }

  /**
   * Check if email is valid
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if password meets requirements
   */
  static isStrongPassword(password: string): boolean {
    // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Deep clone object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Delay execution (for testing, rate limiting, etc.)
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Default export for convenience
export default ApiHelpers;

// HOW TO USE:
// import ApiHelpers from '../utils/apiHelpers';

// In controllers:
// return ApiHelpers.success(res, 'User created successfully', userData);
// return ApiHelpers.paginated(res, users, pagination);
// return ApiHelpers.error(res, 'Something went wrong', errors, 400);
// return ApiHelpers.validationError(res, validationErrors);
