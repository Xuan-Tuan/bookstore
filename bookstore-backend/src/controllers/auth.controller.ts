import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { HTTP_STATUS, API_RESPONSE, ROLES } from "../config/constants";
import AuthService from "../services/auth.service";
import ApiHelpers from "../utils/apiHelpers";
import {
  RegisterRequest,
  LoginRequest,
  AuthenticatedRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../types/auth.types";

/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */
export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<Response> {
    try {
      const registerData: RegisterRequest = req.body;

      // Validate required fields
      if (
        !registerData.email ||
        !registerData.password ||
        !registerData.name ||
        !registerData.role
      ) {
        return ApiHelpers.validationError(res, [
          "Email, password, name, and role are required",
        ]);
      }

      // Validate birthDate format if provided
      if (registerData.birthDate) {
        const birthDate = new Date(registerData.birthDate);
        if (isNaN(birthDate.getTime())) {
          return ApiHelpers.validationError(res, [
            "Invalid birthDate format. Use YYYY-MM-DD",
          ]);
        }

        // Ensure date is not in the future
        if (birthDate > new Date()) {
          return ApiHelpers.validationError(res, [
            "Birth date cannot be in the future",
          ]);
        }
      }
      // Validate role
      if (!Object.values(Role).includes(registerData.role)) {
        return ApiHelpers.validationError(res, [
          `Invalid role. Must be one of: ${Object.values(Role).join(", ")}`,
        ]);
      }

      // Register user
      const { user, tokens } = await AuthService.register(registerData);

      // Sanitize user data for response
      const sanitizedUser = ApiHelpers.sanitizeUser(user);

      return ApiHelpers.created(res, "User registered successfully", {
        user: sanitizedUser,
        tokens,
      });
    } catch (error) {
      console.error("AuthController.register error:", error);

      if (error instanceof Error) {
        if (error.message.includes(API_RESPONSE.ACCOUNT_EXISTS)) {
          return ApiHelpers.conflict(res, API_RESPONSE.ACCOUNT_EXISTS);
        }
        if (
          error.message.includes("validation") ||
          error.message.includes("required")
        ) {
          return ApiHelpers.validationError(res, [error.message]);
        }
      }

      return ApiHelpers.error(res, "Registration failed");
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const loginData: LoginRequest = req.body;

      // Validate required fields
      if (!loginData.email || !loginData.password) {
        return ApiHelpers.validationError(res, [
          "Email and password are required",
        ]);
      }

      // Login user
      const { user, tokens } = await AuthService.login(loginData);

      // Sanitize user data for response
      const sanitizedUser = ApiHelpers.sanitizeUser(user);

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return ApiHelpers.success(res, "Login successful", {
        user: sanitizedUser,
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: 15 * 60, // 15 minutes in seconds
        },
      });
    } catch (error) {
      console.error("AuthController.login error:", error);

      if (error instanceof Error) {
        if (error.message.includes(API_RESPONSE.INVALID_CREDENTIALS)) {
          return ApiHelpers.unauthorized(res, API_RESPONSE.INVALID_CREDENTIALS);
        }
      }

      return ApiHelpers.error(res, "Login failed");
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ApiHelpers.validationError(res, ["Refresh token is required"]);
      }

      // Refresh tokens
      const tokens = await AuthService.refreshToken(refreshToken);

      return ApiHelpers.success(res, "Token refreshed successfully", {
        accessToken: tokens.accessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      });
    } catch (error) {
      console.error("AuthController.refreshToken error:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("invalid") ||
          error.message.includes("expired")
        ) {
          return ApiHelpers.unauthorized(
            res,
            "Invalid or expired refresh token"
          );
        }
      }

      return ApiHelpers.error(res, "Token refresh failed");
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      const userProfile = await AuthService.getProfile(req.user.authID);
      const sanitizedUser = ApiHelpers.sanitizeUser(userProfile);

      return ApiHelpers.success(
        res,
        "Profile retrieved successfully",
        sanitizedUser
      );
    } catch (error) {
      console.error("AuthController.getProfile error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "User not found");
        }
      }

      return ApiHelpers.error(res, "Failed to get profile");
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      const passwordData: ChangePasswordRequest = req.body;

      // Validate required fields
      if (!passwordData.currentPassword || !passwordData.newPassword) {
        return ApiHelpers.validationError(res, [
          "Current password and new password are required",
        ]);
      }

      // Change password
      await AuthService.changePassword(req.user.authID, passwordData);

      return ApiHelpers.success(res, "Password changed successfully");
    } catch (error) {
      console.error("AuthController.changePassword error:", error);

      if (error instanceof Error) {
        if (error.message.includes("incorrect")) {
          return ApiHelpers.unauthorized(res, "Current password is incorrect");
        }
        if (error.message.includes("required")) {
          return ApiHelpers.validationError(res, [error.message]);
        }
        if (error.message.includes("strong")) {
          return ApiHelpers.validationError(res, [error.message]);
        }
      }

      return ApiHelpers.error(res, "Password change failed");
    }
  }

  /**
   * Forgot password - send reset email
   */
  static async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email }: ForgotPasswordRequest = req.body;

      if (!email) {
        return ApiHelpers.validationError(res, ["Email is required"]);
      }

      // Process forgot password
      const result = await AuthService.forgotPassword({ email });

      // For security, always return success even if email doesn't exist
      return ApiHelpers.success(
        res,
        "If the email exists, a reset link will be sent"
      );
    } catch (error) {
      console.error("AuthController.forgotPassword error:", error);
      return ApiHelpers.error(res, "Failed to process password reset request");
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const resetData: ResetPasswordRequest = req.body;

      if (!resetData.token || !resetData.newPassword) {
        return ApiHelpers.validationError(res, [
          "Token and new password are required",
        ]);
      }

      // Reset password
      await AuthService.resetPassword(resetData);

      return ApiHelpers.success(res, "Password reset successfully");
    } catch (error) {
      console.error("AuthController.resetPassword error:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("invalid") ||
          error.message.includes("expired")
        ) {
          return ApiHelpers.unauthorized(res, "Invalid or expired reset token");
        }
        if (error.message.includes("strong")) {
          return ApiHelpers.validationError(res, [error.message]);
        }
      }

      return ApiHelpers.error(res, "Password reset failed");
    }
  }

  /**
   * Logout user
   */
  static async logout(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      // Clear refresh token cookie
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      // In a real application, you might want to:
      // 1. Add the token to a blacklist
      // 2. Update user status
      // 3. Log the logout event

      return ApiHelpers.success(res, "Logout successful");
    } catch (error) {
      console.error("AuthController.logout error:", error);
      return ApiHelpers.error(res, "Logout failed");
    }
  }

  /**
   * Verify token validity
   */
  static async verifyToken(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      // Token is valid (passed through auth middleware)
      const userProfile = await AuthService.getProfile(req.user.authID);
      const sanitizedUser = ApiHelpers.sanitizeUser(userProfile);

      return ApiHelpers.success(res, "Token is valid", {
        user: sanitizedUser,
        valid: true,
      });
    } catch (error) {
      console.error("AuthController.verifyToken error:", error);
      return ApiHelpers.error(res, "Token verification failed");
    }
  }

  /**
   * Get user roles (for frontend role-based UI)
   */
  static async getRoles(req: Request, res: Response): Promise<Response> {
    try {
      const roles = Object.values(Role).map((role) => ({
        value: role,
        label: role.charAt(0).toUpperCase() + role.slice(1),
      }));

      return ApiHelpers.success(res, "Roles retrieved successfully", roles);
    } catch (error) {
      console.error("AuthController.getRoles error:", error);
      return ApiHelpers.error(res, "Failed to get roles");
    }
  }

  /**
   * Check if email exists (for registration validation)
   */
  static async checkEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.query;

      if (!email || typeof email !== "string") {
        return ApiHelpers.validationError(res, [
          "Email query parameter is required",
        ]);
      }

      const exists = await AuthService.emailExists(email);

      return ApiHelpers.success(res, "Email check completed", {
        email,
        exists,
        available: !exists,
      });
    } catch (error) {
      console.error("AuthController.checkEmail error:", error);
      return ApiHelpers.error(res, "Failed to check email availability");
    }
  }
}

export default AuthController;
