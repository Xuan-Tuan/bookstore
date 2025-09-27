import { Response } from "express";
import { Role, Gender } from "@prisma/client";
import { HTTP_STATUS, API_RESPONSE, ROLES } from "../config/constants";
import UserService from "../services/user.service";
import ApiHelpers from "../utils/apiHelpers";
import {
  UserRequest,
  UserQueryParams,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  CreateAddressRequest,
  UpdateAddressRequest,
  isValidRole,
  isValidGender,
} from "../types/user.types";
import { AuthenticatedRequest } from "../types/auth.types";
import AuthService from "../services/auth.service";
import { RegisterRequest } from "../types/auth.types";

/**
 * User Controller
 * Handles HTTP requests for user management operations
 */
export class UserController {
  /**
   * Get all users (Admin only)
   */
  static async getAllUsers(req: UserRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || req.user.role !== ROLES.ADMIN) {
        return ApiHelpers.forbidden(res, "Admin access required");
      }

      const queryParams: UserQueryParams = {
        page: parseInt(req.query.page as string) || undefined,
        limit: parseInt(req.query.limit as string) || undefined,
        search: (req.query.search as string) || undefined,
        role: (req.query.role as Role) || undefined,
        gender: (req.query.gender as Gender) || undefined,
        sortBy:
          (req.query.sortBy as "name" | "email" | "registerDate" | "role") ||
          undefined,
        sortOrder: (req.query.sortOrder as "asc" | "desc") || undefined,
      };

      // Validate role and gender if provided
      if (queryParams.role && !isValidRole(queryParams.role)) {
        return ApiHelpers.validationError(res, [
          `Invalid role. Must be one of: ${Object.values(Role).join(", ")}`,
        ]);
      }

      if (queryParams.gender && !isValidGender(queryParams.gender)) {
        return ApiHelpers.validationError(res, [
          `Invalid gender. Must be one of: ${Object.values(Gender).join(", ")}`,
        ]);
      }

      const { users, total, pagination } = await UserService.getAllUsers(
        queryParams
      );

      return ApiHelpers.success(res, "Users retrieved successfully", {
        users,
        pagination: {
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          totalItems: pagination.totalItems,
          hasNext: pagination.hasNext,
          hasPrev: pagination.hasPrev,
          pageSize: pagination.pageSize,
        },
      });
    } catch (error) {
      console.error("UserController.getAllUsers error:", error);

      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch users")) {
          return ApiHelpers.error(res, "Failed to retrieve users");
        }
      }

      return ApiHelpers.error(res, "Internal server error");
    }
  }

  /**
   * Get user by ID (Admin or own profile)
   */
  static async getUserById(req: UserRequest, res: Response): Promise<Response> {
    try {
      const { userID } = req.params;

      if (!userID) {
        return ApiHelpers.validationError(res, ["User ID is required"]);
      }

      // Check permissions: Admin can access any user, users can only access their own data
      if (req.user?.role !== ROLES.ADMIN) {
        // Get current user's profile to check ownership
        const currentUserProfile = await AuthService.getProfile(
          req.user!.authID
        );
        if (currentUserProfile.user?.userID !== userID) {
          return ApiHelpers.forbidden(
            res,
            "You can only access your own profile"
          );
        }
      }

      const user = await UserService.getUserById(userID);

      return ApiHelpers.success(res, "User retrieved successfully", user);
    } catch (error) {
      console.error("UserController.getUserById error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "User not found");
        }
      }

      return ApiHelpers.error(res, "Failed to retrieve user");
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUserProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      const userProfile = await UserService.getUserProfile(req.user.authID);

      return ApiHelpers.success(
        res,
        "Profile retrieved successfully",
        userProfile
      );
    } catch (error) {
      console.error("UserController.getCurrentUserProfile error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "User profile not found");
        }
      }

      return ApiHelpers.error(res, "Failed to retrieve profile");
    }
  }

  /**
   * Update current user profile
   */
  static async updateCurrentUserProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      const updateData: UpdateUserRequest = req.body;

      // Validate input
      if (Object.keys(updateData).length === 0) {
        return ApiHelpers.validationError(res, ["No data provided for update"]);
      }

      // Validate gender if provided
      if (updateData.gender && !isValidGender(updateData.gender)) {
        return ApiHelpers.validationError(res, [
          `Invalid gender. Must be one of: ${Object.values(Gender).join(", ")}`,
        ]);
      }

      const updatedUser = await UserService.updateUserProfile(
        req.user.authID,
        updateData
      );

      return ApiHelpers.success(
        res,
        "Profile updated successfully",
        updatedUser
      );
    } catch (error) {
      console.error("UserController.updateCurrentUserProfile error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "User not found");
        }
        if (error.message.includes("validation")) {
          return ApiHelpers.validationError(res, [error.message]);
        }
      }

      return ApiHelpers.error(res, "Failed to update profile");
    }
  }

  /**
   * Create new user (Admin only)
   */
  static async createUser(req: UserRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || req.user.role !== ROLES.ADMIN) {
        return ApiHelpers.forbidden(res, "Admin access required");
      }

      const userData: RegisterRequest = req.body;

      // Validate required fields
      if (
        !userData.email ||
        !userData.password ||
        !userData.name ||
        !userData.role
      ) {
        return ApiHelpers.validationError(res, [
          "Email, password, name, and role are required",
        ]);
      }

      // Validate role
      if (!isValidRole(userData.role)) {
        return ApiHelpers.validationError(res, [
          `Invalid role. Must be one of: ${Object.values(Role).join(", ")}`,
        ]);
      }

      // Validate gender if provided
      if (userData.gender && !isValidGender(userData.gender)) {
        return ApiHelpers.validationError(res, [
          `Invalid gender. Must be one of: ${Object.values(Gender).join(", ")}`,
        ]);
      }

      const newUser = await UserService.createUser(userData);

      return ApiHelpers.created(res, "User created successfully", newUser);
    } catch (error) {
      console.error("UserController.createUser error:", error);

      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          return ApiHelpers.conflict(res, "Email already exists");
        }
        if (error.message.includes("validation")) {
          return ApiHelpers.validationError(res, [error.message]);
        }
      }

      return ApiHelpers.error(res, "Failed to create user");
    }
  }

  /**
   * Update user role (Admin only)
   */
  static async updateUserRole(
    req: UserRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user || req.user.role !== ROLES.ADMIN) {
        return ApiHelpers.forbidden(res, "Admin access required");
      }

      const { userID } = req.params;
      const roleData: UpdateUserRoleRequest = req.body;

      if (!userID) {
        return ApiHelpers.validationError(res, ["User ID is required"]);
      }

      if (!roleData.role || !isValidRole(roleData.role)) {
        return ApiHelpers.validationError(res, ["Valid role is required"]);
      }

      // Prevent admin from changing their own role
      const currentUserProfile = await AuthService.getProfile(req.user.authID);
      if (currentUserProfile.user?.userID === userID) {
        return ApiHelpers.forbidden(res, "Cannot change your own role");
      }

      const updatedUser = await UserService.updateUserRole(userID, roleData);

      return ApiHelpers.success(
        res,
        "User role updated successfully",
        updatedUser
      );
    } catch (error) {
      console.error("UserController.updateUserRole error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "User not found");
        }
        if (error.message.includes("Invalid role")) {
          return ApiHelpers.validationError(res, [error.message]);
        }
      }

      return ApiHelpers.error(res, "Failed to update user role");
    }
  }

  /**
   * Delete user (Admin only)
   */
  static async deleteUser(req: UserRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || req.user.role !== ROLES.ADMIN) {
        return ApiHelpers.forbidden(res, "Admin access required");
      }

      const { userID } = req.params;

      if (!userID) {
        return ApiHelpers.validationError(res, ["User ID is required"]);
      }

      // Prevent admin from deleting themselves
      const currentUserProfile = await AuthService.getProfile(req.user.authID);
      if (currentUserProfile.user?.userID === userID) {
        return ApiHelpers.forbidden(res, "Cannot delete your own account");
      }

      await UserService.deleteUser(userID);

      return ApiHelpers.success(res, "User deleted successfully");
    } catch (error) {
      console.error("UserController.deleteUser error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "User not found");
        }
      }

      return ApiHelpers.error(res, "Failed to delete user");
    }
  }

  /**
   * Get user statistics (Admin only)
   */
  static async getUserStats(
    req: UserRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user || req.user.role !== ROLES.ADMIN) {
        return ApiHelpers.forbidden(res, "Admin access required");
      }

      const stats = await UserService.getUserStats();

      return ApiHelpers.success(
        res,
        "User statistics retrieved successfully",
        stats
      );
    } catch (error) {
      console.error("UserController.getUserStats error:", error);
      return ApiHelpers.error(res, "Failed to retrieve user statistics");
    }
  }

  /**
   * Search users (Admin only)
   */
  static async searchUsers(req: UserRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || req.user.role !== ROLES.ADMIN) {
        return ApiHelpers.forbidden(res, "Admin access required");
      }

      const { q, limit } = req.query;

      if (!q || typeof q !== "string") {
        return ApiHelpers.validationError(res, [
          "Search query (q) is required",
        ]);
      }

      const searchLimit = limit ? Math.min(parseInt(limit as string), 50) : 10;
      const users = await UserService.searchUsers(q, searchLimit);

      return ApiHelpers.success(res, "Users search completed", {
        query: q,
        results: users,
        count: users.length,
      });
    } catch (error) {
      console.error("UserController.searchUsers error:", error);
      return ApiHelpers.error(res, "Failed to search users");
    }
  }

  /**
   * Address Management
   */

  /**
   * Get user addresses
   */
  static async getUserAddresses(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      // Get current user's userID
      const currentUserProfile = await AuthService.getProfile(req.user.authID);
      const userID = currentUserProfile.user?.userID;

      if (!userID) {
        return ApiHelpers.notFound(res, "User profile not found");
      }

      const addresses = await UserService.getUserAddresses(userID);

      return ApiHelpers.success(
        res,
        "Addresses retrieved successfully",
        addresses
      );
    } catch (error) {
      console.error("UserController.getUserAddresses error:", error);
      return ApiHelpers.error(res, "Failed to retrieve addresses");
    }
  }

  /**
   * Create user address
   */
  static async createUserAddress(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      const addressData: CreateAddressRequest = req.body;

      // Validate required fields
      if (!addressData.city || !addressData.ward) {
        return ApiHelpers.validationError(res, ["City and ward are required"]);
      }

      // Get current user's userID
      const currentUserProfile = await AuthService.getProfile(req.user.authID);
      const userID = currentUserProfile.user?.userID;

      if (!userID) {
        return ApiHelpers.notFound(res, "User profile not found");
      }

      const newAddress = await UserService.createUserAddress(
        userID,
        addressData
      );

      return ApiHelpers.created(
        res,
        "Address created successfully",
        newAddress
      );
    } catch (error) {
      console.error("UserController.createUserAddress error:", error);
      return ApiHelpers.error(res, "Failed to create address");
    }
  }

  /**
   * Update user address
   */
  static async updateUserAddress(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      const { addressID } = req.params;
      const updateData: UpdateAddressRequest = req.body;

      if (!addressID) {
        return ApiHelpers.validationError(res, ["Address ID is required"]);
      }

      if (Object.keys(updateData).length === 0) {
        return ApiHelpers.validationError(res, ["No data provided for update"]);
      }

      const updatedAddress = await UserService.updateUserAddress(
        addressID,
        updateData
      );

      return ApiHelpers.success(
        res,
        "Address updated successfully",
        updatedAddress
      );
    } catch (error) {
      console.error("UserController.updateUserAddress error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "Address not found");
        }
      }

      return ApiHelpers.error(res, "Failed to update address");
    }
  }

  /**
   * Delete user address
   */
  static async deleteUserAddress(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return ApiHelpers.unauthorized(res, API_RESPONSE.UNAUTHORIZED);
      }

      const { addressID } = req.params;

      if (!addressID) {
        return ApiHelpers.validationError(res, ["Address ID is required"]);
      }

      await UserService.deleteUserAddress(addressID);

      return ApiHelpers.success(res, "Address deleted successfully");
    } catch (error) {
      console.error("UserController.deleteUserAddress error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiHelpers.notFound(res, "Address not found");
        }
      }

      return ApiHelpers.error(res, "Failed to delete address");
    }
  }
}

export default UserController;
