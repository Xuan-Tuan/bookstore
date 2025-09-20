import { Request, Response } from "express";
import { reviewService } from "../services/reviewService";

export const getAllReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      sortBy = "createdAt",
      sortOrder = "desc",
      userID,
      bookID,
      rating,
    } = req.query;

    const filters = {
      userID: userID as string,
      bookID: bookID as string,
      rating: rating ? parseInt(rating as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const reviews = await reviewService.getAllReviews(filters);

    res.status(200).json({
      success: true,
      data: reviews,
      filters: {
        ...(userID && { userID }),
        ...(bookID && { bookID }),
        ...(rating && { rating }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Reviews retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving reviews:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving reviews",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getReviewById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await reviewService.getReviewById(id);

    res.status(200).json({
      success: true,
      data: review,
      message: "Review retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving review:", error);

    if (error instanceof Error) {
      if (error.message === "Review not found") {
        res.status(404).json({
          success: false,
          message: "Review not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving review details",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Internal server error",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error retrieving review",
      error: "Internal server error",
    });
  }
};

export const getReviewsWithPagination = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      userID,
      bookID,
      rating,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {
      userID: userID as string,
      bookID: bookID as string,
      rating: rating ? parseInt(rating as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 10)),
    };

    const result = await reviewService.getReviewsWithPagination(filters);

    res.status(200).json({
      success: true,
      data: {
        reviews: result.reviews,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: filters.limit,
          hasNext: result.currentPage < result.totalPages,
          hasPrev: result.currentPage > 1,
        },
      },
      filters: {
        ...(userID && { userID }),
        ...(bookID && { bookID }),
        ...(rating && { rating }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Reviews retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving reviews with pagination:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving reviews",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getBookReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookID } = req.params;
    const reviews = await reviewService.getBookReviews(bookID);

    res.status(200).json({
      success: true,
      data: reviews,
      message: "Book reviews retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving book reviews:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving book reviews",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const getUserReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID } = req.params;
    const reviews = await reviewService.getUserReviews(userID);

    res.status(200).json({
      success: true,
      data: reviews,
      message: "User reviews retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving user reviews:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving user reviews",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const createReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, bookID, rating, cmt } = req.body;

    if (!userID || !bookID || !rating) {
      res.status(400).json({
        success: false,
        message: "UserID, BookID, and Rating are required",
      });
      return;
    }

    const newReview = await reviewService.createReview({
      userID: userID.trim(),
      bookID: bookID.trim(),
      rating: parseInt(rating),
      cmt: cmt?.trim(),
    });

    res.status(201).json({
      success: true,
      data: newReview,
      message: "Review created successfully",
    });
  } catch (error) {
    console.error("Error creating review:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("already reviewed") ||
        error.message.includes("already exists")
      ) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Rating must be between 1 and 5")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error creating review",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updateReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, cmt } = req.body;

    const updateData: any = {};

    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (cmt !== undefined) updateData.cmt = cmt?.trim();

    const updatedReview = await reviewService.updateReview(id, updateData);

    res.status(200).json({
      success: true,
      data: updatedReview,
      message: "Review updated successfully",
    });
  } catch (error) {
    console.error("Error updating review:", error);

    if (error instanceof Error) {
      if (error.message === "Review not found") {
        res.status(404).json({
          success: false,
          message: "Review not found",
        });
        return;
      }

      if (error.message.includes("Rating must be between 1 and 5")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("already exists")) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error updating review",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const deleteReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await reviewService.deleteReview(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting review:", error);

    if (error instanceof Error) {
      if (error.message === "Review not found") {
        res.status(404).json({
          success: false,
          message: "Review not found",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error deleting review",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const getBookRatingSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookID } = req.params;
    const summary = await reviewService.getBookRatingSummary(bookID);

    res.status(200).json({
      success: true,
      data: summary,
      message: "Book rating summary retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving book rating summary:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving book rating summary",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
