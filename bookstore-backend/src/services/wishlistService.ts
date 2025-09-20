import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import {
  WishlistWithRelations,
  WishlistCreateInput,
  WishlistFilters,
} from "../types/wishlist";

export interface PaginationResult {
  wishlists: WishlistWithRelations[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const wishlistService = {
  // GET ALL WISHLISTS
  async getAllWishlists(
    filters: WishlistFilters
  ): Promise<WishlistWithRelations[]> {
    try {
      const { userID, bookID } = filters;

      const where: Prisma.WishlistWhereInput = {};

      if (userID) {
        where.userID = userID;
      }

      if (bookID) {
        where.bookID = bookID;
      }

      const wishlists = await prisma.wishlist.findMany({
        where,
        include: {
          book: true,
          user: {
            include: {
              authentication: true,
            },
          },
        },
      });

      return wishlists as WishlistWithRelations[];
    } catch (error) {
      console.error("Error in getAllWishlists service:", error);
      throw new Error("Failed to retrieve wishlists");
    }
  },

  // GET WISHLIST BY ID
  async getWishlistById(id: string): Promise<WishlistWithRelations> {
    try {
      const wishlist = await prisma.wishlist.findUnique({
        where: { wishListID: id },
        include: {
          book: true,
          user: {
            include: {
              authentication: true,
            },
          },
        },
      });

      if (!wishlist) {
        throw new Error("Wishlist not found");
      }

      return wishlist as WishlistWithRelations;
    } catch (error) {
      console.error(`Error retrieving wishlist ${id}:`, error);
      if (error instanceof Error && error.message === "Wishlist not found") {
        throw error;
      }
      throw new Error("Failed to retrieve wishlist");
    }
  },

  // GET WISHLISTS WITH PAGINATION
  async getWishlistsWithPagination(
    filters: WishlistFilters
  ): Promise<PaginationResult> {
    try {
      const { userID, bookID, page = 1, limit = 10 } = filters;

      const skip = (page - 1) * limit;
      const where: Prisma.WishlistWhereInput = {};

      if (userID) {
        where.userID = userID;
      }

      if (bookID) {
        where.bookID = bookID;
      }

      const [wishlists, total] = await Promise.all([
        prisma.wishlist.findMany({
          where,
          include: {
            book: true,
            user: {
              include: {
                authentication: true,
              },
            },
          },
          skip,
          take: limit,
        }),
        prisma.wishlist.count({ where }),
      ]);

      return {
        wishlists: wishlists as WishlistWithRelations[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getWishlistsWithPagination service:", error);
      throw new Error("Failed to retrieve wishlists with pagination");
    }
  },

  // GET USER WISHLIST
  async getUserWishlist(userID: string): Promise<WishlistWithRelations[]> {
    try {
      const wishlists = await prisma.wishlist.findMany({
        where: { userID },
        include: {
          book: {
            include: {
              genre: true,
              images: true,
              authors: {
                include: { author: true },
              },
            },
          },
          user: {
            include: {
              authentication: true,
            },
          },
        },
      });

      return wishlists as WishlistWithRelations[];
    } catch (error) {
      console.error(`Error retrieving wishlist for user ${userID}:`, error);
      throw new Error("Failed to retrieve user wishlist");
    }
  },

  // ADD TO WISHLIST
  async addToWishlist(
    wishlistData: WishlistCreateInput
  ): Promise<WishlistWithRelations> {
    try {
      const { userID, bookID } = wishlistData;

      return await prisma.$transaction(async (tx) => {
        // Check if user exists
        const user = await tx.user.findUnique({
          where: { userID },
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Check if book exists
        const book = await tx.book.findUnique({
          where: { bookID },
        });

        if (!book) {
          throw new Error("Book not found");
        }

        // Check if already in wishlist
        const existingWishlist = await tx.wishlist.findFirst({
          where: {
            userID,
            bookID,
          },
        });

        if (existingWishlist) {
          throw new Error("Book already in wishlist");
        }

        // Add to wishlist
        const wishlist = await tx.wishlist.create({
          data: {
            wishListID: uuidv4(),
            userID,
            bookID,
          },
          include: {
            book: true,
            user: {
              include: {
                authentication: true,
              },
            },
          },
        });

        return wishlist as WishlistWithRelations;
      });
    } catch (error) {
      console.error("Error in addToWishlist service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Wishlist item already exists");
        }
        if (error.code === "P2003") {
          throw new Error("Invalid userID or bookID");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to add to wishlist");
    }
  },

  // REMOVE FROM WISHLIST
  async removeFromWishlist(id: string): Promise<{ message: string }> {
    try {
      const existingWishlist = await prisma.wishlist.findUnique({
        where: { wishListID: id },
      });

      if (!existingWishlist) {
        throw new Error("Wishlist item not found");
      }

      await prisma.wishlist.delete({
        where: { wishListID: id },
      });

      return { message: "Removed from wishlist successfully" };
    } catch (error) {
      console.error(`Error removing wishlist item ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Wishlist item not found");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to remove from wishlist");
    }
  },

  // REMOVE FROM WISHLIST BY USER AND BOOK
  async removeFromWishlistByUserAndBook(
    userID: string,
    bookID: string
  ): Promise<{ message: string }> {
    try {
      const existingWishlist = await prisma.wishlist.findFirst({
        where: {
          userID,
          bookID,
        },
      });

      if (!existingWishlist) {
        throw new Error("Wishlist item not found");
      }

      await prisma.wishlist.delete({
        where: { wishListID: existingWishlist.wishListID },
      });

      return { message: "Removed from wishlist successfully" };
    } catch (error) {
      console.error(
        `Error removing wishlist item for user ${userID} and book ${bookID}:`,
        error
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Wishlist item not found");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to remove from wishlist");
    }
  },

  // CHECK IF IN WISHLIST
  async checkInWishlist(
    userID: string,
    bookID: string
  ): Promise<{ inWishlist: boolean; wishlistID?: string }> {
    try {
      const wishlist = await prisma.wishlist.findFirst({
        where: {
          userID,
          bookID,
        },
      });

      return {
        inWishlist: !!wishlist,
        wishlistID: wishlist?.wishListID,
      };
    } catch (error) {
      console.error(
        `Error checking wishlist for user ${userID} and book ${bookID}:`,
        error
      );
      throw new Error("Failed to check wishlist status");
    }
  },
};
