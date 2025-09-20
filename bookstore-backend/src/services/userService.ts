import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import {
  UserWithRelations,
  UserCreateInput,
  UserUpdateInput,
  UserFilters,
} from "../types/user";

export interface PaginationResult {
  users: UserWithRelations[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const userService = {
  // GET ALL USERS
  async getAllUsers(filters: UserFilters): Promise<UserWithRelations[]> {
    try {
      const {
        search,
        name,
        email,
        phone,
        gender,
        role,
        sortBy = "name",
        sortOrder = "asc",
      } = filters;

      const where: Prisma.UserWhereInput = {};

      // Filter by gender
      if (gender) {
        where.gender = gender;
      }

      // Filter by role through authentication
      if (role) {
        where.authentication = {
          role: role,
        };
      }

      // Search logic
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { phone: { contains: search } },
          {
            authentication: {
              email: { contains: search },
            },
          },
        ];
      } else {
        if (name) {
          where.name = { contains: name };
        }
        if (email) {
          where.authentication = {
            email: { contains: email },
          };
        }
        if (phone) {
          where.phone = { contains: phone };
        }
      }

      // Determine sort field
      const validSortFields = ["name", "registerDate", "birthDate"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "name";

      const orderBy: Prisma.UserOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "asc",
      };

      const users = await prisma.user.findMany({
        where,
        include: {
          authentication: true,
          addresses: true,
        },
        orderBy,
      });

      return users as UserWithRelations[];
    } catch (error) {
      console.error("Error in getAllUsers service:", error);
      throw new Error("Failed to retrieve users");
    }
  },

  // GET USER BY ID
  async getUserById(id: string): Promise<UserWithRelations> {
    try {
      const user = await prisma.user.findUnique({
        where: { userID: id },
        include: {
          authentication: true,
          addresses: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user as UserWithRelations;
    } catch (error) {
      console.error(`Error retrieving user ${id}:`, error);
      if (error instanceof Error && error.message === "User not found") {
        throw error;
      }
      throw new Error("Failed to retrieve user");
    }
  },

  // GET USERS WITH PAGINATION
  async getUsersWithPagination(
    filters: UserFilters
  ): Promise<PaginationResult> {
    try {
      const {
        search,
        name,
        email,
        phone,
        gender,
        role,
        sortBy = "name",
        sortOrder = "asc",
        page = 1,
        limit = 10,
      } = filters;

      const skip = (page - 1) * limit;
      const where: Prisma.UserWhereInput = {};

      // Filter by gender
      if (gender) {
        where.gender = gender;
      }

      // Filter by role through authentication
      if (role) {
        where.authentication = {
          role: role,
        };
      }

      // Search logic
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { phone: { contains: search } },
          {
            authentication: {
              email: { contains: search },
            },
          },
        ];
      } else {
        if (name) {
          where.name = { contains: name };
        }
        if (email) {
          where.authentication = {
            email: { contains: email },
          };
        }
        if (phone) {
          where.phone = { contains: phone };
        }
      }

      // Determine sort field
      const validSortFields = ["name", "registerDate", "birthDate"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "name";

      const orderBy: Prisma.UserOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "asc",
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            authentication: true,
            addresses: true,
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users: users as UserWithRelations[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getUsersWithPagination service:", error);
      throw new Error("Failed to retrieve users with pagination");
    }
  },
  // Thêm hàm getProfile cho user
  async getUserProfile(userID: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { userID },
        include: {
          authentication: true,
          addresses: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user.userID,
        email: user.authentication.email,
        role: user.authentication.role,
        name: user.name,
        phone: user.phone,
        gender: user.gender,
        birthDate: user.birthDate,
        addresses: user.addresses,
        registerDate: user.registerDate,
      };
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw new Error("Failed to get user profile");
    }
  },
  // CREATE USER
  async createUser(userData: UserCreateInput): Promise<UserWithRelations> {
    try {
      const { name, email, password, phone, gender, birthDate } = userData;
      return await prisma.$transaction(async (tx) => {
        // Check if email already exists
        const existingAuth = await tx.authentication.findUnique({
          where: { email },
        });

        if (existingAuth) {
          throw new Error("Email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create authentication first
        const auth = await tx.authentication.create({
          data: {
            authID: uuidv4(),
            email,
            pass: hashedPassword,
            role: "user",
          },
        });

        // Create user
        const user = await tx.user.create({
          data: {
            userID: uuidv4(),
            name,
            phone: phone || null,
            gender: gender || null,
            birthDate: birthDate || null,
            authID: auth.authID,
          },
        });

        // Create cart for user
        await tx.cart.create({
          data: {
            cartID: uuidv4(),
            userID: user.userID,
          },
        });

        const completeUser = await tx.user.findUnique({
          where: { userID: user.userID },
          include: {
            authentication: true,
            addresses: true,
          },
        });

        if (!completeUser) {
          throw new Error("Failed to retrieve created user");
        }

        return completeUser as UserWithRelations;
      });
    } catch (error) {
      console.error("Error in createUser service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("User with this email already exists");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to create user");
    }
  },

  // UPDATE USER
  async updateUser(
    id: string,
    userData: UserUpdateInput
  ): Promise<UserWithRelations> {
    try {
      const { name, phone, gender, birthDate } = userData;

      const existingUser = await prisma.user.findUnique({
        where: { userID: id },
        include: { authentication: true },
      });

      if (!existingUser) {
        throw new Error("User not found");
      }

      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { userID: id },
          data: {
            ...(name !== undefined && { name }),
            ...(phone !== undefined && { phone }),
            ...(gender !== undefined && { gender }),
            ...(birthDate !== undefined && { birthDate: birthDate || null }),
          },
        });

        const completeUser = await tx.user.findUnique({
          where: { userID: id },
          include: {
            authentication: true,
            addresses: true,
          },
        });

        if (!completeUser) {
          throw new Error("Failed to retrieve updated user");
        }

        return completeUser as UserWithRelations;
      });
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("User update conflict");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update user");
    }
  },

  // DELETE USER
  async deleteUser(id: string): Promise<{ message: string }> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { userID: id },
        include: { authentication: true },
      });

      if (!existingUser) {
        throw new Error("User not found");
      }

      await prisma.$transaction(async (tx) => {
        // Delete user (this will cascade delete addresses, cart, etc. due to schema constraints)
        await tx.user.delete({
          where: { userID: id },
        });

        // Delete authentication
        if (existingUser.authentication) {
          await tx.authentication.delete({
            where: { authID: existingUser.authentication.authID },
          });
        }
      });

      return { message: "User deleted successfully" };
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Cannot delete user due to existing references");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to delete user");
    }
  },
};
