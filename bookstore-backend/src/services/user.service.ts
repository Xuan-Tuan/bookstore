import {
  PrismaClient,
  Role,
  Gender,
  User,
  Authentication,
} from "@prisma/client";
import {
  UserResponse,
  UserProfileResponse,
  UserFilters,
  UserQueryParams,
  UserStatsResponse,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  CreateAddressRequest,
  UpdateAddressRequest,
  AddressResponse,
  isValidRole,
  isValidGender,
} from "../types/user.types";
import { PAGINATION, ROLES } from "../config/constants";
import { CommonHelpers } from "../utils/apiHelpers";
import AuthService from "./auth.service";
import { RegisterRequest } from "../types/auth.types";

const prisma = new PrismaClient();

/**
 * User Service handling business logic for user management
 */
export class UserService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Get all users with pagination and filtering (Admin only)
   */
  static async getAllUsers(params: UserQueryParams): Promise<{
    users: UserResponse[];
    total: number;
    pagination: any;
  }> {
    try {
      const {
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT,
        search = "",
        role,
        gender,
        sortBy = "registerDate",
        sortOrder = "desc",
      } = params;

      // Calculate pagination
      const skip = (page - 1) * limit;
      const take = Math.min(limit, PAGINATION.MAX_LIMIT);

      // Build where clause for filtering
      const where: any = {
        authentication: {
          email: { contains: search },
        },
      };

      if (role && isValidRole(role)) {
        where.authentication.role = role;
      }

      if (gender && isValidGender(gender)) {
        where.gender = gender;
      }

      // Get users with authentication data
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            authentication: true,
            addresses: true,
            orders: true,
            reviews: true,
          },
          skip,
          take,
          orderBy: this.getUserOrderBy(sortBy, sortOrder),
        }),
        prisma.user.count({ where }),
      ]);

      // Transform users to response format
      const userResponses: UserResponse[] = users.map((user) =>
        this.transformUserToResponse(user)
      );

      const pagination = {
        currentPage: page,
        totalPages: Math.ceil(total / take),
        totalItems: total,
        hasNext: page < Math.ceil(total / take),
        hasPrev: page > 1,
        pageSize: take,
      };

      return { users: userResponses, total, pagination };
    } catch (error) {
      console.error("UserService.getAllUsers error:", error);
      throw new Error("Failed to fetch users");
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userID: string): Promise<UserResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { userID },
        include: {
          authentication: true,
          addresses: true,
          orders: true,
          reviews: true,
          wishlists: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return this.transformUserToResponse(user);
    } catch (error) {
      console.error("UserService.getUserById error:", error);
      throw error;
    }
  }

  /**
   * Get user profile by authID (for current user)
   */
  static async getUserProfile(authID: string): Promise<UserProfileResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: { authID },
        include: {
          authentication: true,
          addresses: {
            orderBy: { city: "asc" },
          },
          orders: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              books: {
                include: {
                  book: true,
                },
              },
            },
          },
          wishlists: true,
          reviews: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const userResponse = this.transformUserToResponse(
        user
      ) as UserProfileResponse;

      // Add additional profile data
      userResponse.addresses = user.addresses.map((addr) => ({
        addressID: addr.addressID,
        city: addr.city,
        ward: addr.ward,
        specificAddress: addr.specificAddress || undefined,
        userID: addr.userID,
      }));

      userResponse.recentOrders = user.orders.map((order) => ({
        orderID: order.orderID,
        status: order.status,
        totalAmount: order.totalAmount.toNumber(),
        createdAt: order.createdAt,
        bookCount: order.books.length,
      }));

      userResponse.wishlistCount = user.wishlists.length;

      return userResponse;
    } catch (error) {
      console.error("UserService.getUserProfile error:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    authID: string,
    updateData: UpdateUserRequest
  ): Promise<UserResponse> {
    try {
      // Find user by authID
      const user = await prisma.user.findFirst({
        where: { authID },
        include: { authentication: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Prepare update data
      const updatePayload: any = {};
      if (updateData.name !== undefined) updatePayload.name = updateData.name;
      if (updateData.phone !== undefined)
        updatePayload.phone = updateData.phone;
      if (updateData.gender !== undefined)
        updatePayload.gender = updateData.gender;
      if (updateData.birthDate !== undefined) {
        updatePayload.birthDate = updateData.birthDate
          ? new Date(updateData.birthDate)
          : null;
      }

      const updatedUser = await prisma.user.update({
        where: { userID: user.userID },
        data: updatePayload,
        include: { authentication: true },
      });

      return this.transformUserToResponse(updatedUser);
    } catch (error) {
      console.error("UserService.updateUserProfile error:", error);
      throw error;
    }
  }

  /**
   * Update user role (Admin only)
   */
  static async updateUserRole(
    userID: string,
    roleData: UpdateUserRoleRequest
  ): Promise<UserResponse> {
    try {
      // Find user and their authentication
      const user = await prisma.user.findUnique({
        where: { userID },
        include: { authentication: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!isValidRole(roleData.role)) {
        throw new Error("Invalid role specified");
      }

      // Update role in authentication table
      await prisma.authentication.update({
        where: { authID: user.authID },
        data: { role: roleData.role },
      });

      // If changing from user to author, create author record
      if (
        user.authentication.role === ROLES.USER &&
        roleData.role === ROLES.AUTHOR
      ) {
        await prisma.author.create({
          data: {
            authorID: CommonHelpers.generateRandomString(36),
            name: user.name,
            authID: user.authID,
          },
        });
      }

      // If changing from author to user, delete author record
      if (
        user.authentication.role === ROLES.AUTHOR &&
        roleData.role === ROLES.USER
      ) {
        await prisma.author.deleteMany({
          where: { authID: user.authID },
        });
      }

      // Get updated user data
      const updatedUser = await prisma.user.findUnique({
        where: { userID },
        include: { authentication: true },
      });

      if (!updatedUser) {
        throw new Error("Failed to update user role");
      }

      return this.transformUserToResponse(updatedUser);
    } catch (error) {
      console.error("UserService.updateUserRole error:", error);
      throw error;
    }
  }

  /**
   * Delete user (Admin only)
   */
  static async deleteUser(userID: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { userID },
        include: { authentication: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { userID },
      });

      // Authentication record will be deleted due to cascade

      return true;
    } catch (error) {
      console.error("UserService.deleteUser error:", error);
      throw error;
    }
  }

  /**
   * Create new user (Admin only) - SỬ DỤNG LẠI AUTH SERVICE
   */
  static async createUser(userData: RegisterRequest): Promise<UserResponse> {
    try {
      // Sử dụng AuthService.register() đã có sẵn
      const { user: authUser } = await AuthService.register(userData);

      // Transform to UserResponse format
      if (!authUser.user) {
        throw new Error("User record not created properly");
      }

      // Get full user data with authentication
      const fullUser = await prisma.user.findUnique({
        where: { userID: authUser.user.userID },
        include: { authentication: true },
      });

      if (!fullUser) {
        throw new Error("Failed to retrieve created user");
      }

      return this.transformUserToResponse(fullUser);
    } catch (error) {
      console.error("UserService.createUser error:", error);
      throw error;
    }
  }

  /**
   * Get user statistics (Admin dashboard)
   */
  static async getUserStats(): Promise<UserStatsResponse> {
    try {
      const [
        totalUsers,
        usersByRole,
        usersByGender,
        newUsersThisMonth,
        activeUsers,
      ] = await Promise.all([
        // Total users count
        prisma.user.count(),

        // Users by role
        prisma.authentication.groupBy({
          by: ["role"],
          _count: { role: true },
        }),

        // Users by gender
        prisma.user.groupBy({
          by: ["gender"],
          _count: { gender: true },
          where: { gender: { not: null } },
        }),

        // New users this month
        prisma.user.count({
          where: {
            registerDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Active users (users with orders in last 30 days)
        prisma.user.count({
          where: {
            orders: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        }),
      ]);

      return {
        totalUsers,
        usersByRole: usersByRole.map((item) => ({
          role: item.role,
          count: item._count.role,
        })),
        usersByGender: usersByGender.map((item) => ({
          gender: item.gender as Gender,
          count: item._count.gender,
        })),
        newUsersThisMonth,
        activeUsers,
      };
    } catch (error) {
      console.error("UserService.getUserStats error:", error);
      throw new Error("Failed to get user statistics");
    }
  }

  /**
   * Search users by name or email
   */
  static async searchUsers(
    query: string,
    limit: number = 10
  ): Promise<UserResponse[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            {
              authentication: {
                email: { contains: query },
              },
            },
          ],
        },
        include: {
          authentication: true,
        },
        take: limit,
        orderBy: { name: "asc" },
      });

      return users.map((user) => this.transformUserToResponse(user));
    } catch (error) {
      console.error("UserService.searchUsers error:", error);
      throw new Error("Failed to search users");
    }
  }

  /**
   * Address Management
   */

  static async getUserAddresses(userID: string): Promise<AddressResponse[]> {
    try {
      const addresses = await prisma.address.findMany({
        where: { userID },
        orderBy: { city: "asc" },
      });

      return addresses.map((addr) => ({
        addressID: addr.addressID,
        city: addr.city,
        ward: addr.ward,
        specificAddress: addr.specificAddress || undefined,
        userID: addr.userID,
      }));
    } catch (error) {
      console.error("UserService.getUserAddresses error:", error);
      throw error;
    }
  }

  static async createUserAddress(
    userID: string,
    addressData: CreateAddressRequest
  ): Promise<AddressResponse> {
    try {
      const address = await prisma.address.create({
        data: {
          addressID: CommonHelpers.generateRandomString(36),
          city: addressData.city,
          ward: addressData.ward,
          specificAddress: addressData.specificAddress,
          userID: userID,
        },
      });

      return {
        addressID: address.addressID,
        city: address.city,
        ward: address.ward,
        specificAddress: address.specificAddress || undefined,
        userID: address.userID,
      };
    } catch (error) {
      console.error("UserService.createUserAddress error:", error);
      throw error;
    }
  }

  static async updateUserAddress(
    addressID: string,
    updateData: UpdateAddressRequest
  ): Promise<AddressResponse> {
    try {
      const address = await prisma.address.update({
        where: { addressID },
        data: updateData,
      });

      return {
        addressID: address.addressID,
        city: address.city,
        ward: address.ward,
        specificAddress: address.specificAddress || undefined,
        userID: address.userID,
      };
    } catch (error) {
      console.error("UserService.updateUserAddress error:", error);
      throw error;
    }
  }

  static async deleteUserAddress(addressID: string): Promise<boolean> {
    try {
      await prisma.address.delete({
        where: { addressID },
      });

      return true;
    } catch (error) {
      console.error("UserService.deleteUserAddress error:", error);
      throw error;
    }
  }

  /**
   * Utility methods
   */

  private static transformUserToResponse(
    user: User & { authentication: Authentication }
  ): UserResponse {
    return {
      userID: user.userID,
      authID: user.authID,
      email: user.authentication.email,
      name: user.name,
      phone: user.phone || undefined,
      gender: user.gender || undefined,
      birthDate: user.birthDate || undefined,
      registerDate: user.registerDate,
      role: user.authentication.role,
      addressesCount: (user as any).addresses?.length,
      ordersCount: (user as any).orders?.length,
      reviewsCount: (user as any).reviews?.length,
    };
  }

  private static getUserOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
    switch (sortBy) {
      case "name":
        return { name: sortOrder };
      case "email":
        return { authentication: { email: sortOrder } };
      case "role":
        return { authentication: { role: sortOrder } };
      case "registerDate":
      default:
        return { registerDate: sortOrder };
    }
  }
}

export default UserService;
