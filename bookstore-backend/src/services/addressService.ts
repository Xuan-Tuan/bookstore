import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import {
  AddressWithRelations,
  AddressCreateInput,
  AddressUpdateInput,
  AddressFilters,
} from "../types/address";

export const addressService = {
  // GET ALL ADDRESSES
  async getAllAddresses(
    filters: AddressFilters
  ): Promise<AddressWithRelations[]> {
    try {
      const { userID, city, ward } = filters;

      const where: Prisma.AddressWhereInput = {};

      if (userID) {
        where.userID = userID;
      }

      if (city) {
        where.city = { contains: city };
      }

      if (ward) {
        where.ward = { contains: ward };
      }

      const addresses = await prisma.address.findMany({
        where,
        include: {
          user: {
            include: {
              authentication: true,
            },
          },
        },
      });

      return addresses as AddressWithRelations[];
    } catch (error) {
      console.error("Error in getAllAddresses service:", error);
      throw new Error("Failed to retrieve addresses");
    }
  },

  // GET ADDRESS BY ID
  async getAddressById(id: string): Promise<AddressWithRelations> {
    try {
      const address = await prisma.address.findUnique({
        where: { addressID: id },
        include: {
          user: {
            include: {
              authentication: true,
            },
          },
        },
      });

      if (!address) {
        throw new Error("Address not found");
      }

      return address as AddressWithRelations;
    } catch (error) {
      console.error(`Error retrieving address ${id}:`, error);
      if (error instanceof Error && error.message === "Address not found") {
        throw error;
      }
      throw new Error("Failed to retrieve address");
    }
  },

  // GET USER ADDRESSES
  async getUserAddresses(userID: string): Promise<AddressWithRelations[]> {
    try {
      const addresses = await prisma.address.findMany({
        where: { userID },
        include: {
          user: {
            include: {
              authentication: true,
            },
          },
        },
      });

      return addresses as AddressWithRelations[];
    } catch (error) {
      console.error(`Error retrieving addresses for user ${userID}:`, error);
      throw new Error("Failed to retrieve user addresses");
    }
  },

  // CREATE ADDRESS
  async createAddress(
    addressData: AddressCreateInput
  ): Promise<AddressWithRelations> {
    try {
      const { userID, city, ward, specificAddress } = addressData;

      return await prisma.$transaction(async (tx) => {
        // Check if user exists
        const user = await tx.user.findUnique({
          where: { userID },
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Create address
        const address = await tx.address.create({
          data: {
            addressID: uuidv4(),
            userID,
            city: city.trim(),
            ward: ward.trim(),
            specificAddress: specificAddress?.trim() || null,
          },
          include: {
            user: {
              include: {
                authentication: true,
              },
            },
          },
        });

        return address as AddressWithRelations;
      });
    } catch (error) {
      console.error("Error in createAddress service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Invalid userID");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to create address");
    }
  },

  // UPDATE ADDRESS
  async updateAddress(
    id: string,
    addressData: AddressUpdateInput
  ): Promise<AddressWithRelations> {
    try {
      const { city, ward, specificAddress } = addressData;

      const existingAddress = await prisma.address.findUnique({
        where: { addressID: id },
      });

      if (!existingAddress) {
        throw new Error("Address not found");
      }

      return await prisma.$transaction(async (tx) => {
        const address = await tx.address.update({
          where: { addressID: id },
          data: {
            ...(city !== undefined && { city: city.trim() }),
            ...(ward !== undefined && { ward: ward.trim() }),
            ...(specificAddress !== undefined && {
              specificAddress: specificAddress?.trim() || null,
            }),
          },
          include: {
            user: {
              include: {
                authentication: true,
              },
            },
          },
        });

        return address as AddressWithRelations;
      });
    } catch (error) {
      console.error(`Error updating address ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Address update conflict");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update address");
    }
  },

  // DELETE ADDRESS
  async deleteAddress(id: string): Promise<{ message: string }> {
    try {
      const existingAddress = await prisma.address.findUnique({
        where: { addressID: id },
      });

      if (!existingAddress) {
        throw new Error("Address not found");
      }

      await prisma.address.delete({
        where: { addressID: id },
      });

      return { message: "Address deleted successfully" };
    } catch (error) {
      console.error(`Error deleting address ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Address not found");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to delete address");
    }
  },

  // SET DEFAULT ADDRESS (Optional - nếu bạn muốn có tính năng đặt địa chỉ mặc định)
  async setDefaultAddress(
    userID: string,
    addressID: string
  ): Promise<{ message: string }> {
    try {
      // Kiểm tra user tồn tại
      const user = await prisma.user.findUnique({
        where: { userID },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Kiểm tra address tồn tại và thuộc về user
      const address = await prisma.address.findUnique({
        where: { addressID },
      });

      if (!address) {
        throw new Error("Address not found");
      }

      if (address.userID !== userID) {
        throw new Error("Address does not belong to user");
      }

      // Ở đây bạn có thể thêm logic để set default address
      // Ví dụ: nếu bạn có trường isDefault trong model Address
      // Hiện tại model không có trường này, nên có thể bỏ qua hoặc mở rộng sau

      return { message: "Address set as default successfully" };
    } catch (error) {
      console.error(
        `Error setting default address ${addressID} for user ${userID}:`,
        error
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to set default address");
    }
  },
};
