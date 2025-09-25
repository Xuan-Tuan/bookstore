import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, Role, Gender } from "@prisma/client";
import {
  RegisterRequest,
  LoginRequest,
  AuthUser,
  TokenPair,
  TokenPayload,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  ValidationResult,
} from "../types/auth.types";
import { API_RESPONSE, VALIDATION, ROLES } from "../config/constants";
import { CommonHelpers } from "../utils/apiHelpers";

const prisma = new PrismaClient();

/**
 * Authentication service handling business logic
 */
export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
  private static readonly PASSWORD_RESET_EXPIRY = "1h"; // 1 hour

  /**
   * Register a new user
   */
  static async register(
    userData: RegisterRequest
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    try {
      // Validate input
      const validation = this.validateRegistration(userData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      // Check if email already exists
      const existingAuth = await prisma.authentication.findUnique({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingAuth) {
        throw new Error(API_RESPONSE.ACCOUNT_EXISTS);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        userData.password,
        this.SALT_ROUNDS
      );

      // Start transaction to create authentication and user record
      const result = await prisma.$transaction(async (tx) => {
        // Create authentication record
        const auth = await tx.authentication.create({
          data: {
            authID: CommonHelpers.generateRandomString(36),
            email: userData.email.toLowerCase(),
            pass: hashedPassword,
            role: userData.role,
          },
        });

        let userDetails: any = {};

        // Create role-specific record based on role
        if (userData.role === ROLES.USER) {
          const user = await tx.user.create({
            data: {
              userID: CommonHelpers.generateRandomString(36),
              name: userData.name,
              phone: userData.phone,
              gender: userData.gender,
              birthDate: userData.birthDate
                ? new Date(userData.birthDate)
                : null,
              authID: auth.authID,
            },
            include: {
              authentication: true,
            },
          });

          // Create cart for user
          await tx.cart.create({
            data: {
              cartID: CommonHelpers.generateRandomString(36),
              userID: user.userID,
            },
          });

          userDetails.user = {
            userID: user.userID,
            name: user.name,
            phone: user.phone,
            gender: user.gender,
            birthDate: user.birthDate,
            registerDate: user.registerDate,
          };
        } else if (userData.role === ROLES.AUTHOR) {
          const author = await tx.author.create({
            data: {
              authorID: CommonHelpers.generateRandomString(36),
              name: userData.name,
              authID: auth.authID,
            },
            include: {
              authentication: true,
            },
          });

          userDetails.author = {
            authorID: author.authorID,
            name: author.name,
          };
        } else if (userData.role === ROLES.ADMIN) {
          const admin = await tx.admin.create({
            data: {
              adminID: CommonHelpers.generateRandomString(36),
              authID: auth.authID,
            },
            include: {
              authentication: true,
            },
          });

          userDetails.admin = {
            adminID: admin.adminID,
          };
        }

        return {
          auth,
          ...userDetails,
        };
      });

      // Generate tokens
      const tokens = this.generateTokens({
        authID: result.auth.authID,
        email: result.auth.email,
        role: result.auth.role,
      });

      return {
        user: {
          authID: result.auth.authID,
          email: result.auth.email,
          role: result.auth.role,
          ...result,
        },
        tokens,
      };
    } catch (error) {
      console.error("AuthService.register error:", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(
    credentials: LoginRequest
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    try {
      // Validate input
      if (!credentials.email || !credentials.password) {
        throw new Error("Email and password are required");
      }

      // Find authentication record
      const auth = await prisma.authentication.findUnique({
        where: { email: credentials.email.toLowerCase() },
        include: {
          user: true,
          author: true,
          admin: true,
        },
      });

      if (!auth) {
        throw new Error(API_RESPONSE.INVALID_CREDENTIALS);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        auth.pass
      );
      if (!isPasswordValid) {
        throw new Error(API_RESPONSE.INVALID_CREDENTIALS);
      }

      // Get user details based on role
      let userDetails: any = {};

      if (auth.role === ROLES.USER && auth.user) {
        userDetails.user = {
          userID: auth.user.userID,
          name: auth.user.name,
          phone: auth.user.phone,
          gender: auth.user.gender,
          birthDate: auth.user.birthDate,
          registerDate: auth.user.registerDate,
        };
      } else if (auth.role === ROLES.AUTHOR && auth.author) {
        userDetails.author = {
          authorID: auth.author.authorID,
          name: auth.author.name,
        };
      } else if (auth.role === ROLES.ADMIN && auth.admin) {
        userDetails.admin = {
          adminID: auth.admin.adminID,
        };
      }

      // Generate tokens
      const tokens = this.generateTokens({
        authID: auth.authID,
        email: auth.email,
        role: auth.role,
      });

      return {
        user: {
          authID: auth.authID,
          email: auth.email,
          role: auth.role,
          ...userDetails,
        },
        tokens,
      };
    } catch (error) {
      console.error("AuthService.login error:", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      if (!refreshToken) {
        throw new Error("Refresh token is required");
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET!
      ) as TokenPayload;

      // Check if authentication record still exists
      const auth = await prisma.authentication.findUnique({
        where: { authID: decoded.authID },
      });

      if (!auth) {
        throw new Error("Invalid refresh token");
      }

      // Generate new tokens
      return this.generateTokens({
        authID: auth.authID,
        email: auth.email,
        role: auth.role,
      });
    } catch (error) {
      console.error("AuthService.refreshToken error:", error);
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Get user profile by authID
   */
  static async getProfile(authID: string): Promise<AuthUser> {
    try {
      const auth = await prisma.authentication.findUnique({
        where: { authID },
        include: {
          user: true,
          author: true,
          admin: true,
        },
      });

      if (!auth) {
        throw new Error("User not found");
      }

      let userDetails: any = {};

      if (auth.role === ROLES.USER && auth.user) {
        userDetails.user = {
          userID: auth.user.userID,
          name: auth.user.name,
          phone: auth.user.phone,
          gender: auth.user.gender,
          birthDate: auth.user.birthDate,
          registerDate: auth.user.registerDate,
        };
      } else if (auth.role === ROLES.AUTHOR && auth.author) {
        userDetails.author = {
          authorID: auth.author.authorID,
          name: auth.author.name,
        };
      } else if (auth.role === ROLES.ADMIN && auth.admin) {
        userDetails.admin = {
          adminID: auth.admin.adminID,
        };
      }

      return {
        authID: auth.authID,
        email: auth.email,
        role: auth.role,
        ...userDetails,
      };
    } catch (error) {
      console.error("AuthService.getProfile error:", error);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    authID: string,
    passwords: ChangePasswordRequest
  ): Promise<boolean> {
    try {
      const { currentPassword, newPassword } = passwords;

      if (!currentPassword || !newPassword) {
        throw new Error("Current password and new password are required");
      }

      // Validate new password strength
      if (!CommonHelpers.isStrongPassword(newPassword)) {
        throw new Error(
          "New password must be at least 6 characters with uppercase, lowercase, and number"
        );
      }

      // Get current authentication
      const auth = await prisma.authentication.findUnique({
        where: { authID },
      });

      if (!auth) {
        throw new Error("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        auth.pass
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(
        newPassword,
        this.SALT_ROUNDS
      );

      // Update password
      await prisma.authentication.update({
        where: { authID },
        data: { pass: hashedNewPassword },
      });

      return true;
    } catch (error) {
      console.error("AuthService.changePassword error:", error);
      throw error;
    }
  }

  /**
   * Forgot password - generate reset token
   */
  static async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<{ resetToken: string }> {
    try {
      const auth = await prisma.authentication.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (!auth) {
        // Don't reveal if email exists or not for security
        return { resetToken: "If the email exists, a reset link will be sent" };
      }

      // Generate reset token (you might want to store this in database for validation)
      const resetToken = jwt.sign(
        {
          authID: auth.authID,
          email: auth.email,
          type: "password_reset",
        },
        process.env.JWT_SECRET!,
        { expiresIn: this.PASSWORD_RESET_EXPIRY }
      );

      // In a real application, you would:
      // 1. Store the reset token in database with expiry
      // 2. Send email with reset link
      // 3. Implement rate limiting

      return { resetToken };
    } catch (error) {
      console.error("AuthService.forgotPassword error:", error);
      throw new Error("Failed to process password reset request");
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(data: ResetPasswordRequest): Promise<boolean> {
    try {
      const { token, newPassword } = data;

      if (!token || !newPassword) {
        throw new Error("Token and new password are required");
      }

      // Validate new password strength
      if (!CommonHelpers.isStrongPassword(newPassword)) {
        throw new Error(
          "New password must be at least 6 characters with uppercase, lowercase, and number"
        );
      }

      // Verify reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (decoded.type !== "password_reset") {
        throw new Error("Invalid reset token");
      }

      // Check if authentication exists
      const auth = await prisma.authentication.findUnique({
        where: { authID: decoded.authID },
      });

      if (!auth) {
        throw new Error("Invalid reset token");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await prisma.authentication.update({
        where: { authID: decoded.authID },
        data: { pass: hashedPassword },
      });

      return true;
    } catch (error) {
      console.error("AuthService.resetPassword error:", error);
      throw new Error("Invalid or expired reset token");
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Generate JWT tokens
   */
  private static generateTokens(payload: TokenPayload): TokenPair {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validate registration data
   */
  private static validateRegistration(data: RegisterRequest): ValidationResult {
    const errors: string[] = [];

    if (!data.email || !CommonHelpers.isValidEmail(data.email)) {
      errors.push("Valid email is required");
    }

    if (!data.password || !CommonHelpers.isStrongPassword(data.password)) {
      errors.push(
        "Password must be at least 6 characters with uppercase, lowercase, and number"
      );
    }

    if (!data.name || data.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }

    if (!Object.values(Role).includes(data.role)) {
      errors.push("Invalid role specified");
    }

    if (data.phone && data.phone.length > 20) {
      errors.push("Phone number too long");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if user has specific role
   */
  static async userHasRole(authID: string, role: Role): Promise<boolean> {
    try {
      const auth = await prisma.authentication.findUnique({
        where: { authID },
        select: { role: true },
      });

      return auth?.role === role;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const auth = await prisma.authentication.findUnique({
        where: { email: email.toLowerCase() },
      });

      return !!auth;
    } catch (error) {
      return false;
    }
  }
}

export default AuthService;
