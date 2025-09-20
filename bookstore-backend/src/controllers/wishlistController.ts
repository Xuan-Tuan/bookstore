import { Request, Response } from "express";
import { wishlistService } from "../services/wishlistService";

export const getAllWishlists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, bookID } = req.query;

    const filters = {
      userID: userID as string,
      bookID: bookID as string,
    };

    const wishlists = await wishlistService.getAllWishlists(filters);

    res.status(200).json({
      success: true,
      data: wishlists,
      filters: {
        ...(userID && { userID }),
        ...(bookID && { bookID }),
      },
      message: "Wishlists retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving wishlists:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving wishlists",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getWishlistById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const wishlist = await wishlistService.getWishlistById(id);

    res.status(200).json({
      success: true,
      data: wishlist,
      message: "Wishlist retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving wishlist:", error);

    if (error instanceof Error) {
      if (error.message === "Wishlist not found") {
        res.status(404).json({
          success: false,
          message: "Wishlist not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving wishlist details",
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
      message: "Error retrieving wishlist",
      error: "Internal server error",
    });
  }
};

export const getWishlistsWithPagination = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", userID, bookID } = req.query;

    const filters = {
      userID: userID as string,
      bookID: bookID as string,
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 10)),
    };

    const result = await wishlistService.getWishlistsWithPagination(filters);

    res.status(200).json({
      success: true,
      data: {
        wishlists: result.wishlists,
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
      },
      message: "Wishlists retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving wishlists with pagination:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving wishlists",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getUserWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID } = req.params;
    const wishlists = await wishlistService.getUserWishlist(userID);

    res.status(200).json({
      success: true,
      data: wishlists,
      message: "User wishlist retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving user wishlist:", error);

    if (error instanceof Error) {
      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving user wishlist",
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
      message: "Error retrieving user wishlist",
      error: "Internal server error",
    });
  }
};

export const addToWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, bookID } = req.body;

    if (!userID || !bookID) {
      res.status(400).json({
        success: false,
        message: "UserID and BookID are required",
      });
      return;
    }

    const newWishlist = await wishlistService.addToWishlist({
      userID: userID.trim(),
      bookID: bookID.trim(),
    });

    res.status(201).json({
      success: true,
      data: newWishlist,
      message: "Added to wishlist successfully",
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("already in wishlist")
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
    }

    res.status(500).json({
      success: false,
      message: "Error adding to wishlist",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const removeFromWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await wishlistService.removeFromWishlist(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);

    if (error instanceof Error) {
      if (error.message === "Wishlist item not found") {
        res.status(404).json({
          success: false,
          message: "Wishlist item not found",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error removing from wishlist",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const removeFromWishlistByUserAndBook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, bookID } = req.body;

    if (!userID || !bookID) {
      res.status(400).json({
        success: false,
        message: "UserID and BookID are required",
      });
      return;
    }

    const result = await wishlistService.removeFromWishlistByUserAndBook(
      userID.trim(),
      bookID.trim()
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);

    if (error instanceof Error) {
      if (error.message === "Wishlist item not found") {
        res.status(404).json({
          success: false,
          message: "Wishlist item not found",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error removing from wishlist",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const checkInWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, bookID } = req.query;

    if (!userID || !bookID) {
      res.status(400).json({
        success: false,
        message: "UserID and BookID are required",
      });
      return;
    }

    const result = await wishlistService.checkInWishlist(
      userID as string,
      bookID as string
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Wishlist check completed successfully",
    });
  } catch (error) {
    console.error("Error checking wishlist:", error);

    res.status(500).json({
      success: false,
      message: "Error checking wishlist status",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
