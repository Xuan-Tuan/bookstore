import { Request, Response } from "express";
import { authorService } from "../services/authorService";

export const getAllAuthors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      sortBy = "name",
      sortOrder = "asc",
      search,
      name,
      email,
    } = req.query;

    const filters = {
      search: search as string,
      name: name as string,
      email: email as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const authors = await authorService.getAllAuthors(filters);

    res.status(200).json({
      success: true,
      data: authors,
      filters: {
        ...(search && { search }),
        ...(name && { name }),
        ...(email && { email }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Authors retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving authors:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving authors",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getAuthorById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const author = await authorService.getAuthorById(id);

    res.status(200).json({
      success: true,
      data: author,
      message: "Author retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving author:", error);

    if (error instanceof Error) {
      if (error.message === "Author not found") {
        res.status(404).json({
          success: false,
          message: "Author not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving author details",
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
      message: "Error retrieving author",
      error: "Internal server error",
    });
  }
};

export const getAuthorsWithPagination = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      name,
      email,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const filters = {
      search: search as string,
      name: name as string,
      email: email as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 10)),
    };

    const result = await authorService.getAuthorsWithPagination(filters);

    res.status(200).json({
      success: true,
      data: {
        authors: result.authors,
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
        ...(name && { name }),
        ...(email && { email }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Authors retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving authors with pagination:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving authors",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const addAuthor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
      return;
    }

    const newAuthor = await authorService.createAuthor({
      name: name.trim(),
      email: email.trim(),
      password: password,
    });

    res.status(201).json({
      success: true,
      data: newAuthor,
      message: "Author created successfully",
    });
  } catch (error) {
    console.error("Error creating author:", error);

    if (error instanceof Error) {
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
      message: "Error creating author",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updateAuthor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();

    const updatedAuthor = await authorService.updateAuthor(id, updateData);

    res.status(200).json({
      success: true,
      data: updatedAuthor,
      message: "Author updated successfully",
    });
  } catch (error) {
    console.error("Error updating author:", error);

    if (error instanceof Error) {
      if (error.message === "Author not found") {
        res.status(404).json({
          success: false,
          message: "Author not found",
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
      message: "Error updating author",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const deleteAuthor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await authorService.deleteAuthor(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting author:", error);

    if (error instanceof Error) {
      if (error.message === "Author not found") {
        res.status(404).json({
          success: false,
          message: "Author not found",
        });
        return;
      }

      if (
        error.message.includes(
          "Cannot delete author due to existing book references"
        )
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
      message: "Error deleting author",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
