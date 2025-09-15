import { Request, Response } from "express";
import { bookService } from "../services/bookService";

export const getAllBooks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      sortBy = "title",
      sortOrder = "asc",
      search,
      title,
      author,
      genre,
    } = req.query;

    const filters = {
      search: search as string,
      title: title as string,
      author: author as string,
      genre: genre as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const books = await bookService.getAllBooks(filters);

    res.status(200).json({
      success: true,
      data: books,
      filters: {
        ...(search && { search }),
        ...(title && { title }),
        ...(author && { author }),
        ...(genre && { genre }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Books retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving books:", error);

    // Handle specific service errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving books",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getBookById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const book = await bookService.getBookById(id);

    res.status(200).json({
      success: true,
      data: book,
      message: "Book retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving book:", error);

    if (error instanceof Error) {
      if (error.message === "Book not found") {
        res.status(404).json({
          success: false,
          message: "Book not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving book details",
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
      message: "Error retrieving book",
      error: "Internal server error",
    });
  }
};

export const getBooksWithPagination = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      genre,
      search,
      title,
      author,
      sortBy = "title",
      sortOrder = "asc",
    } = req.query;

    const filters = {
      search: search as string,
      title: title as string,
      author: author as string,
      genre: genre as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 10)), // Limit max 100 items per page
    };

    const result = await bookService.getBooksWithPagination(filters);

    res.status(200).json({
      success: true,
      data: {
        books: result.books,
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
        ...(search && { search }),
        ...(title && { title }),
        ...(author && { author }),
        ...(genre && { genre }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Books retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving books with pagination:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving books",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const addBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      price,
      description,
      stockQuantity,
      genreID,
      authorIDs,
      images,
      pubTime,
    } = req.body;

    // Parse and validate numeric fields
    const parsedPrice = parseFloat(price);
    const parsedStockQuantity = parseInt(stockQuantity);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      res.status(400).json({
        success: false,
        message: "Valid price is required and must be greater than 0",
      });
      return;
    }

    if (isNaN(parsedStockQuantity) || parsedStockQuantity < 0) {
      res.status(400).json({
        success: false,
        message: "Valid stock quantity is required and must be non-negative",
      });
      return;
    }

    const newBook = await bookService.createBook({
      title: title.trim(),
      price: parsedPrice,
      description: description?.trim(),
      stockQuantity: parsedStockQuantity,
      genreID: genreID?.trim(),
      authorIDs: Array.isArray(authorIDs)
        ? authorIDs.map((id: string) => id.trim())
        : undefined,
      images: Array.isArray(images)
        ? images.map((url: string) => url.trim())
        : undefined,
      pubTime: pubTime ? new Date(pubTime) : undefined,
    });

    res.status(201).json({
      success: true,
      data: newBook,
      message: "Book created successfully",
    });
  } catch (error) {
    console.error("Error creating book:", error);

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Invalid author IDs")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Invalid genre ID")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error creating book",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updateBook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      price,
      description,
      stockQuantity,
      soldNumber,
      genreID,
      authorIDs,
      images,
      pubTime,
    } = req.body;

    // Prepare update data with proper parsing
    const updateData: any = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (genreID !== undefined) updateData.genreID = genreID.trim();

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        res.status(400).json({
          success: false,
          message: "Price must be a valid number greater than 0",
        });
        return;
      }
      updateData.price = parsedPrice;
    }

    if (stockQuantity !== undefined) {
      const parsedStockQuantity = parseInt(stockQuantity);
      if (isNaN(parsedStockQuantity) || parsedStockQuantity < 0) {
        res.status(400).json({
          success: false,
          message: "Stock quantity must be a valid non-negative number",
        });
        return;
      }
      updateData.stockQuantity = parsedStockQuantity;
    }

    if (soldNumber !== undefined) {
      const parsedSoldNumber = parseInt(soldNumber);
      if (isNaN(parsedSoldNumber) || parsedSoldNumber < 0) {
        res.status(400).json({
          success: false,
          message: "Sold number must be a valid non-negative number",
        });
        return;
      }
      updateData.soldNumber = parsedSoldNumber;
    }

    if (authorIDs !== undefined) {
      updateData.authorIDs = Array.isArray(authorIDs)
        ? authorIDs.map((id: string) => id.trim())
        : [];
    }

    if (images !== undefined) {
      updateData.images = Array.isArray(images)
        ? images.map((url: string) => url.trim())
        : [];
    }

    if (pubTime !== undefined) {
      const parsedDate = new Date(pubTime);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "pubTime must be a valid date (ISO format: YYYY-MM-DD)",
        });
        return;
      }
      updateData.pubTime = parsedDate;
    }

    const updatedBook = await bookService.updateBook(id, updateData);

    res.status(200).json({
      success: true,
      data: updatedBook,
      message: "Book updated successfully",
    });
  } catch (error) {
    console.error("Error updating book:", error);

    if (error instanceof Error) {
      if (error.message === "Book not found") {
        res.status(404).json({
          success: false,
          message: "Book not found",
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

      if (
        error.message.includes("Invalid author IDs") ||
        error.message.includes("Invalid genre ID")
      ) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error updating book",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const deleteBook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await bookService.deleteBook(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting book:", error);

    if (error instanceof Error) {
      if (error.message === "Book not found") {
        res.status(404).json({
          success: false,
          message: "Book not found",
        });
        return;
      }

      if (
        error.message.includes("Cannot delete book due to existing references")
      ) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error deleting book",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
