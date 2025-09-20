import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import {
  ReviewWithRelations,
  ReviewCreateInput,
  ReviewUpdateInput,
  ReviewFilters,
} from "../types/review";

export interface PaginationResult {
  reviews: ReviewWithRelations[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const reviewService = {
  // GET ALL REVIEWS
  async getAllReviews(filters: ReviewFilters): Promise<ReviewWithRelations[]> {
    try {
      const {
        userID,
        bookID,
        rating,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      const where: Prisma.ReviewWhereInput = {};

      if (userID) {
        where.userID = userID;
      }

      if (bookID) {
        where.bookID = bookID;
      }

      if (rating) {
        where.rating = rating;
      }

      // Determine sort field
      const validSortFields = ["createdAt", "updatedAt", "rating"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

      const orderBy: Prisma.ReviewOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "desc",
      };

      const reviews = await prisma.review.findMany({
        where,
        include: {
          book: true,
          user: {
            include: {
              authentication: true,
            },
          },
        },
        orderBy,
      });

      return reviews as ReviewWithRelations[];
    } catch (error) {
      console.error("Error in getAllReviews service:", error);
      throw new Error("Failed to retrieve reviews");
    }
  },

  // GET REVIEW BY ID
  async getReviewById(id: string): Promise<ReviewWithRelations> {
    try {
      const review = await prisma.review.findUnique({
        where: { reviewID: id },
        include: {
          book: true,
          user: {
            include: {
              authentication: true,
            },
          },
        },
      });

      if (!review) {
        throw new Error("Review not found");
      }

      return review as ReviewWithRelations;
    } catch (error) {
      console.error(`Error retrieving review ${id}:`, error);
      if (error instanceof Error && error.message === "Review not found") {
        throw error;
      }
      throw new Error("Failed to retrieve review");
    }
  },

  // GET REVIEWS WITH PAGINATION
  async getReviewsWithPagination(
    filters: ReviewFilters
  ): Promise<PaginationResult> {
    try {
      const {
        userID,
        bookID,
        rating,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 10,
      } = filters;

      const skip = (page - 1) * limit;
      const where: Prisma.ReviewWhereInput = {};

      if (userID) {
        where.userID = userID;
      }

      if (bookID) {
        where.bookID = bookID;
      }

      if (rating) {
        where.rating = rating;
      }

      // Determine sort field
      const validSortFields = ["createdAt", "updatedAt", "rating"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

      const orderBy: Prisma.ReviewOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "desc",
      };

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
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
          orderBy,
        }),
        prisma.review.count({ where }),
      ]);

      return {
        reviews: reviews as ReviewWithRelations[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getReviewsWithPagination service:", error);
      throw new Error("Failed to retrieve reviews with pagination");
    }
  },

  // GET BOOK REVIEWS
  async getBookReviews(bookID: string): Promise<ReviewWithRelations[]> {
    try {
      const reviews = await prisma.review.findMany({
        where: { bookID },
        include: {
          book: true,
          user: {
            include: {
              authentication: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reviews as ReviewWithRelations[];
    } catch (error) {
      console.error(`Error retrieving reviews for book ${bookID}:`, error);
      throw new Error("Failed to retrieve book reviews");
    }
  },

  // GET USER REVIEWS
  async getUserReviews(userID: string): Promise<ReviewWithRelations[]> {
    try {
      const reviews = await prisma.review.findMany({
        where: { userID },
        include: {
          book: true,
          user: {
            include: {
              authentication: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reviews as ReviewWithRelations[];
    } catch (error) {
      console.error(`Error retrieving reviews for user ${userID}:`, error);
      throw new Error("Failed to retrieve user reviews");
    }
  },

  // CREATE REVIEW
  async createReview(
    reviewData: ReviewCreateInput
  ): Promise<ReviewWithRelations> {
    try {
      const { userID, bookID, rating, cmt } = reviewData;

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

        // Check if user already reviewed this book
        const existingReview = await tx.review.findFirst({
          where: {
            userID,
            bookID,
          },
        });

        if (existingReview) {
          throw new Error("User already reviewed this book");
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
          throw new Error("Rating must be between 1 and 5");
        }

        // Create review
        const review = await tx.review.create({
          data: {
            reviewID: uuidv4(),
            userID,
            bookID,
            rating,
            cmt: cmt || null,
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

        return review as ReviewWithRelations;
      });
    } catch (error) {
      console.error("Error in createReview service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Review already exists");
        }
        if (error.code === "P2003") {
          throw new Error("Invalid userID or bookID");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to create review");
    }
  },

  // UPDATE REVIEW
  async updateReview(
    id: string,
    reviewData: ReviewUpdateInput
  ): Promise<ReviewWithRelations> {
    try {
      const { rating, cmt } = reviewData;

      const existingReview = await prisma.review.findUnique({
        where: { reviewID: id },
      });

      if (!existingReview) {
        throw new Error("Review not found");
      }

      // Validate rating if provided
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw new Error("Rating must be between 1 and 5");
      }

      return await prisma.$transaction(async (tx) => {
        const review = await tx.review.update({
          where: { reviewID: id },
          data: {
            ...(rating !== undefined && { rating }),
            ...(cmt !== undefined && { cmt: cmt || null }),
            updatedAt: new Date(),
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

        return review as ReviewWithRelations;
      });
    } catch (error) {
      console.error(`Error updating review ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Review update conflict");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update review");
    }
  },

  // DELETE REVIEW
  async deleteReview(id: string): Promise<{ message: string }> {
    try {
      const existingReview = await prisma.review.findUnique({
        where: { reviewID: id },
      });

      if (!existingReview) {
        throw new Error("Review not found");
      }

      await prisma.review.delete({
        where: { reviewID: id },
      });

      return { message: "Review deleted successfully" };
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Review not found");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to delete review");
    }
  },

  // GET BOOK RATING SUMMARY
  async getBookRatingSummary(bookID: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const reviews = await prisma.review.findMany({
        where: { bookID },
        select: {
          rating: true,
        },
      });

      if (reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const averageRating =
        Math.round((totalRating / reviews.length) * 10) / 10;

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((review) => {
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
      });

      return {
        averageRating,
        totalReviews: reviews.length,
        ratingDistribution,
      };
    } catch (error) {
      console.error(`Error getting rating summary for book ${bookID}:`, error);
      throw new Error("Failed to get rating summary");
    }
  },
};
