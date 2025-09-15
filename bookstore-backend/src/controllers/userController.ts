import { Request, Response } from "express";
import { userService } from "../services/userService";

export const getAllUsers = async (
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
      phone,
      gender,
      role,
    } = req.query;

    const filters = {
      search: search as string,
      name: name as string,
      email: email as string,
      phone: phone as string,
      gender: gender as "male" | "female" | "other",
      role: role as "admin" | "user" | "author",
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const users = await userService.getAllUsers(filters);

    res.status(200).json({
      success: true,
      data: users,
      filters: {
        ...(search && { search }),
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(gender && { gender }),
        ...(role && { role }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Users retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving users:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving users",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    res.status(200).json({
      success: true,
      data: user,
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving user:", error);

    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving user details",
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
      message: "Error retrieving user",
      error: "Internal server error",
    });
  }
};

export const getUsersWithPagination = async (
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
      phone,
      gender,
      role,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const filters = {
      search: search as string,
      name: name as string,
      email: email as string,
      phone: phone as string,
      gender: gender as "male" | "female" | "other",
      role: role as "admin" | "user" | "author",
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 10)),
    };

    const result = await userService.getUsersWithPagination(filters);

    res.status(200).json({
      success: true,
      data: {
        users: result.users,
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
        ...(phone && { phone }),
        ...(gender && { gender }),
        ...(role && { role }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Users retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving users with pagination:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving users",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const addUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, gender, birthDate, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
      return;
    }

    const newUser = await userService.createUser({
      name: name.trim(),
      email: email.trim(),
      password: password,
      phone: phone?.trim(),
      gender: gender as "male" | "female" | "other",
      birthDate: birthDate ? new Date(birthDate) : undefined,
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);

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
      message: "Error creating user",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, gender, birthDate } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone?.trim();
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) {
      const parsedDate = new Date(birthDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({
          success: false,
          message: "birthDate must be a valid date (ISO format: YYYY-MM-DD)",
        });
        return;
      }
      updateData.birthDate = parsedDate;
    }

    const updatedUser = await userService.updateUser(id, updateData);

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({
          success: false,
          message: "User not found",
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
      message: "Error updating user",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

// debug
// export const updateUser = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     console.log("📨 Update user request received:", {
//       params: req.params,
//       body: req.body,
//       timestamp: new Date().toISOString(),
//     });

//     const { id } = req.params;
//     const { name, phone, gender, birthDate } = req.body;

//     const updateData: any = {};

//     if (name !== undefined) updateData.name = name.trim();
//     if (phone !== undefined) updateData.phone = phone?.trim();
//     if (gender !== undefined) updateData.gender = gender;
//     if (birthDate !== undefined) {
//       const parsedDate = new Date(birthDate);
//       if (isNaN(parsedDate.getTime())) {
//         res.status(400).json({
//           success: false,
//           message: "birthDate must be a valid date (ISO format: YYYY-MM-DD)",
//         });
//         return;
//       }
//       updateData.birthDate = parsedDate;
//     }

//     console.log(`🔄 Calling userService.updateUser with ID: ${id}`);
//     const updatedUser = await userService.updateUser(id, updateData);

//     res.status(200).json({
//       success: true,
//       data: updatedUser,
//       message: "User updated successfully",
//     });
//   } catch (error) {
//     console.error("❌ Error in updateUser controller:", error);

//     // TẠM THỜI: trả về chi tiết lỗi để debug
//     res.status(500).json({
//       success: false,
//       message: "Error updating user",
//       error: error instanceof Error ? error.message : "Unknown error",
//       stack:
//         process.env.NODE_ENV === "development" && error instanceof Error
//           ? error.stack
//           : undefined,
//     });
//   }
// };

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      if (
        error.message.includes("Cannot delete user due to existing references")
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
      message: "Error deleting user",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
