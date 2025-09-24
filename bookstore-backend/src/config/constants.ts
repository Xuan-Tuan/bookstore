//Application constants
// Environment variables
// API response codes
// Pagination defaults

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * API Response Codes và Messages
 */
export const API_RESPONSE = {
  // Success messages
  SUCCESS: "Success",
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",

  // Error messages
  INTERNAL_ERROR: "Internal server error",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Forbidden access",
  VALIDATION_ERROR: "Validation failed",
  CONFLICT: "Resource already exists",

  // Auth messages
  INVALID_CREDENTIALS: "Invalid email or password",
  ACCOUNT_EXISTS: "Account already exists",
  INVALID_TOKEN: "Invalid or expired token",
  TOKEN_REQUIRED: "Access token required",
} as const;

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Database Constraints
 */
export const DB_CONSTRAINTS = {
  MAX_STRING_LENGTH: 255,
  MAX_TEXT_LENGTH: 65535,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 20,
  MAX_URL_LENGTH: 500,
  DECIMAL_PRECISION: 10,
  DECIMAL_SCALE: 2,
} as const;

/**
 * User Roles và Permissions
 */
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  AUTHOR: "author",
} as const;

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: "manage_users",
  MANAGE_BOOKS: "manage_books",
  MANAGE_ORDERS: "manage_orders",
  MANAGE_GENRES: "manage_genres",

  // Author permissions
  CREATE_BOOK: "create_book",
  UPDATE_OWN_BOOK: "update_own_book",
  DELETE_OWN_BOOK: "delete_own_book",

  // User permissions
  PLACE_ORDER: "place_order",
  WRITE_REVIEW: "write_review",
  MANAGE_WISHLIST: "manage_wishlist",
} as const;

/**
 * Order và Payment Status
 */
export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  CANCELED: "canceled",
  COMPLETED: "completed",
} as const;

export const PAYMENT_STATUS = {
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
} as const;

export const PAYMENT_METHODS = {
  QR_CODE: "qr_code",
  CREDIT_CARD: "credit_card",
  COD: "cod",
} as const;

/**
 * Gender Options
 */
export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
} as const;

/**
 * Validation Rules
 */
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 255,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/,
  },
} as const;

/**
 * Cache Keys và TTL
 */
export const CACHE = {
  TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 1 day
  },
  KEYS: {
    GENRES: "genres:all",
    BOOK_PREFIX: "book:",
    USER_PREFIX: "user:",
  },
} as const;

/**
 * File Upload Limits
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  MAX_FILES: 5,
} as const;

/**
 * Environment Names
 */
export const ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

/**
 * Default Values
 */
export const DEFAULTS = {
  AVATAR: "/default-avatar.png",
  BOOK_COVER: "/default-book-cover.jpg",
  STOCK_QUANTITY: 0,
  SOLD_NUMBER: 0,
} as const;

/**
 * Export type definitions for TypeScript
 */
export type Role = (typeof ROLES)[keyof typeof ROLES];
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
export type Gender = (typeof GENDER)[keyof typeof GENDER];

// HOW TO USE:
// Trong controllers
// import { HTTP_STATUS, API_RESPONSE } from '../config/constants';

// res.status(HTTP_STATUS.OK).json({
//   success: true,
//   message: API_RESPONSE.SUCCESS,
//   data: result
// });

// Trong services
// import { PAGINATION, ROLES } from '../config/constants';

// const limit = Math.min(req.query.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

// Trong validation
// import { VALIDATION } from '../config/constants';

// if (!VALIDATION.EMAIL.PATTERN.test(email)) {
//   throw new Error('Invalid email format');
// }
