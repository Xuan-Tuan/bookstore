import { Request, Response } from "express";
import { authService } from "../services/authService";
import { LoginInput } from "../types/auth";
import { userService } from "../services/userService";
import { authorService } from "../services/authorService";

// Utility: lấy message an toàn từ error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, phone, gender, birthDate } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({
        success: false,
        message: "Email, password, name, and role are required",
      });
      return;
    }

    if (!["user", "author", "admin"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Role must be one of: user, author, admin",
      });
      return;
    }

    const result = await authService.register({
      email: email.trim(),
      password: password,
      name: name.trim(),
      role: role as "user" | "author" | "admin",
      phone: phone?.trim(),
      gender: gender as "male" | "female" | "other",
      birthDate: birthDate ? new Date(birthDate) : undefined,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in register:", error);
    const message = getErrorMessage(error);

    if (message.includes("already exists")) {
      res.status(409).json({
        success: false,
        message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error:
        process.env.NODE_ENV === "development"
          ? message
          : "Internal server error",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const result = await authService.login({
      email: email.trim(),
      password: password,
    });

    // Set HTTP-only cookie
    res.cookie("token", result.data?.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in login:", error);
    const message = getErrorMessage(error);

    if (message.includes("Invalid email or password")) {
      res.status(401).json({
        success: false,
        message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Login failed",
      error:
        process.env.NODE_ENV === "development"
          ? message
          : "Internal server error",
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear the token cookie
    res.clearCookie("token");

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Error in logout:", error);
    const message = getErrorMessage(error);

    res.status(500).json({
      success: false,
      message: "Logout failed",
      error:
        process.env.NODE_ENV === "development"
          ? message
          : "Internal server error",
    });
  }
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as any).user;

    // Phân luồng theo role
    let profile;
    if (user.role === "user" && user.userID) {
      profile = await userService.getUserProfile(user.userID);
    } else if (user.role === "author" && user.authorID) {
      profile = await authorService.getAuthorProfile(user.authorID);
    } else if (user.role === "admin" && user.adminID) {
      profile = {
        id: user.adminID,
        email: user.email,
        role: user.role,
        name: "Administrator",
      };
    } else {
      throw new Error("Invalid user role");
    }

    res.status(200).json({
      success: true,
      data: profile,
      message: "Profile retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    const message = getErrorMessage(error);

    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error:
        process.env.NODE_ENV === "development"
          ? message
          : "Internal server error",
    });
  }
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = (req as any).user;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
      return;
    }

    const result = await authService.changePassword(
      user.authID,
      currentPassword,
      newPassword
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error changing password:", error);
    const message = getErrorMessage(error);

    if (message.includes("Current password is incorrect")) {
      res.status(400).json({
        success: false,
        message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error:
        process.env.NODE_ENV === "development"
          ? message
          : "Internal server error",
    });
  }
};
