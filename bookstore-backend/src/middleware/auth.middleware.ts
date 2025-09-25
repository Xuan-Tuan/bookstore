import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { HTTP_STATUS, API_RESPONSE, ROLES } from "../config/constants";
import { AuthenticatedRequest, TokenPayload } from "../types/auth.types";
import AuthService from "../services/auth.service";
import ApiHelpers from "../utils/apiHelpers";

/**
 * Authentication middleware for JWT verification
 */

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      ApiHelpers.unauthorized(res, API_RESPONSE.TOKEN_REQUIRED);
      return;
    }

    // Verify token
    const decoded = AuthService.verifyToken(token) as TokenPayload;

    // Get fresh user data from database
    const user = await AuthService.getProfile(decoded.authID);

    // Attach user to request object
    req.user = {
      authID: decoded.authID,
      email: decoded.email,
      role: decoded.role,
    };

    // Add user details to request for easier access
    (req as any).userDetails = user;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        ApiHelpers.unauthorized(res, "Token has expired");
        return;
      }
      if (error.message.includes("invalid")) {
        ApiHelpers.unauthorized(res, "Invalid token");
        return;
      }
    }

    ApiHelpers.unauthorized(res, API_RESPONSE.INVALID_TOKEN);
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (allowedRoles: Role | Role[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      return;
    }

    const rolesArray = Array.isArray(allowedRoles)
      ? allowedRoles
      : [allowedRoles];

    if (!rolesArray.includes(req.user.role)) {
      ApiHelpers.forbidden(res, API_RESPONSE.FORBIDDEN);
      return;
    }

    next();
  };
};

/**
 * Convenience middleware for common role checks
 */

// Require admin role
export const requireAdmin = requireRole(ROLES.ADMIN);

// Require author role
export const requireAuthor = requireRole(ROLES.AUTHOR);

// Require user role
export const requireUser = requireRole(ROLES.USER);

// Require either admin or author
export const requireAdminOrAuthor = requireRole([ROLES.ADMIN, ROLES.AUTHOR]);

// Require either admin or user
export const requireAdminOrUser = requireRole([ROLES.ADMIN, ROLES.USER]);

// Require authenticated user (any role)
export const requireAuth = authenticateToken;

/**
 * Middleware to check ownership of resource
 */
export const requireOwnership = (resourceOwnerField: string = "userID") => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
        return;
      }

      // Admins can access any resource
      if (req.user.role === ROLES.ADMIN) {
        next();
        return;
      }

      // Get resource owner ID from request params or body
      let resourceOwnerId: string | undefined;

      // Try to get from different sources
      if (req.params[resourceOwnerField]) {
        resourceOwnerId = req.params[resourceOwnerField];
      } else if (req.body[resourceOwnerField]) {
        resourceOwnerId = req.body[resourceOwnerField];
      } else if (req.query[resourceOwnerField]) {
        resourceOwnerId = req.query[resourceOwnerField] as string;
      }

      if (!resourceOwnerId) {
        ApiHelpers.forbidden(res, "Unable to determine resource ownership");
        return;
      }

      // Get user details to check ownership
      const userDetails = await AuthService.getProfile(req.user.authID);

      let userOwnedId: string | undefined;

      // Determine the ID that this user owns based on their role
      if (req.user.role === ROLES.USER && userDetails.user) {
        userOwnedId = userDetails.user.userID;
      } else if (req.user.role === ROLES.AUTHOR && userDetails.author) {
        userOwnedId = userDetails.author.authorID;
      }

      // Check if the user owns the resource
      if (userOwnedId && userOwnedId === resourceOwnerId) {
        next();
        return;
      }

      ApiHelpers.forbidden(
        res,
        "You do not have permission to access this resource"
      );
    } catch (error) {
      console.error("Ownership middleware error:", error);
      ApiHelpers.forbidden(res, "Error checking resource ownership");
    }
  };
};

/**
 * Middleware to check if user can modify their own profile
 */
export const canModifyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      return;
    }

    const targetUserId = req.params.userID || req.body.userID;

    // Users can modify their own profile, admins can modify any profile
    if (req.user.role === ROLES.ADMIN) {
      next();
      return;
    }

    // Get current user's userID if they are a regular user
    const userDetails = await AuthService.getProfile(req.user.authID);

    if (
      req.user.role === ROLES.USER &&
      userDetails.user &&
      userDetails.user.userID === targetUserId
    ) {
      next();
      return;
    }

    ApiHelpers.forbidden(res, "You can only modify your own profile");
  } catch (error) {
    console.error("Profile modification middleware error:", error);
    ApiHelpers.forbidden(
      res,
      "Error verifying profile modification permissions"
    );
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      next();
      return;
    }

    // Verify token
    const decoded = AuthService.verifyToken(token) as TokenPayload;

    // Get fresh user data from database
    const user = await AuthService.getProfile(decoded.authID);

    // Attach user to request object
    req.user = {
      authID: decoded.authID,
      email: decoded.email,
      role: decoded.role,
    };

    // Add user details to request for easier access
    (req as any).userDetails = user;

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (
  requestsPerMinute: number = 5,
  message: string = "Too many authentication attempts, please try again later"
) => {
  const attempts = new Map<string, number[]>();

  // Thêm hàm dọn dẹp định kỳ: Tránh memory leak bằng cách định kỳ dọn dẹp các IP không còn hoạt động
  setInterval(() => {
    const now = Date.now();
    const windowStart = now - 60000;

    for (const [ip, ipAttempts] of attempts.entries()) {
      const recentAttempts = ipAttempts.filter((time) => time > windowStart);

      if (recentAttempts.length === 0) {
        attempts.delete(ip); // Xóa IP không có request trong 1 phút
      } else {
        attempts.set(ip, recentAttempts); // Cập nhật lại mảng
      }
    }
  }, 30000); // Dọn dẹp mỗi 30 giây

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!attempts.has(ip)) {
      attempts.set(ip, []);
    }

    const ipAttempts = attempts.get(ip)!;

    // Remove attempts outside the current window
    const recentAttempts = ipAttempts.filter((time) => time > windowStart);
    attempts.set(ip, recentAttempts);

    // Check if rate limit exceeded
    if (recentAttempts.length >= requestsPerMinute) {
      ApiHelpers.error(res, message, [], HTTP_STATUS.SERVICE_UNAVAILABLE);
      return;
    }

    // Add current attempt
    recentAttempts.push(now);
    attempts.set(ip, recentAttempts);

    next();
  };
};

/**
 * Middleware to validate refresh token specifically
 */
export const validateRefreshToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    ApiHelpers.unauthorized(res, "Refresh token is required");
    return;
  }

  next();
};

/**
 * Middleware to check if user is active:  all user are considered active
 */
export const checkUserActive = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      return;
    }

    // All users are considered active in current implementation
    next();
  } catch (error) {
    console.error("User active check middleware error:", error);
    ApiHelpers.forbidden(res, "Error checking user status");
  }
};

/**
 * Export middleware groups for common use cases
 */
export const middlewareGroups = {
  // For protected API routes that require any authenticated user
  protected: [authenticateToken, checkUserActive],

  // For admin-only routes
  adminOnly: [authenticateToken, checkUserActive, requireAdmin],

  // For user-only routes (regular users)
  userOnly: [authenticateToken, checkUserActive, requireUser],

  // For author-only routes
  authorOnly: [authenticateToken, checkUserActive, requireAuthor],

  // For admin or author routes
  adminOrAuthor: [authenticateToken, checkUserActive, requireAdminOrAuthor],

  // For authentication endpoints with rate limiting
  authEndpoints: [authRateLimit()],
};

export default {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireAuthor,
  requireUser,
  requireAdminOrAuthor,
  requireAdminOrUser,
  requireAuth,
  requireOwnership,
  canModifyProfile,
  optionalAuth,
  authRateLimit,
  validateRefreshToken,
  checkUserActive,
  middlewareGroups,
};
