import { Prisma } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import {
  LoginInput,
  RegisterInput,
  AuthResponse,
  JwtPayload,
} from "../types/auth";
import { userFactory } from "./userFactory"; // Import factory

export const authService = {
  // REGISTER USER
  // async register(userData: RegisterInput): Promise<AuthResponse> {
  //   try {
  //     const { email, password, name, role, phone, gender, birthDate } =
  //       userData;

  //     return await prisma.$transaction(async (tx) => {
  //       // Check if email already exists
  //       const existingAuth = await tx.authentication.findUnique({
  //         where: { email },
  //       });

  //       if (existingAuth) {
  //         throw new Error("Email already exists");
  //       }

  //       // Hash password
  //       const hashedPassword = await bcrypt.hash(password, 12);

  //       // Create authentication
  //       const auth = await tx.authentication.create({
  //         data: {
  //           authID: uuidv4(),
  //           email,
  //           pass: hashedPassword,
  //           role: role,
  //         },
  //       });

  //       // Create user based on role
  //       let userID = uuidv4();

  //       if (role === "user") {
  //         await tx.user.create({
  //           data: {
  //             userID: userID,
  //             name,
  //             phone: phone || null,
  //             gender: gender || null,
  //             birthDate: birthDate || null,
  //             authID: auth.authID,
  //           },
  //         });

  //         // Create cart for user
  //         await tx.cart.create({
  //           data: {
  //             cartID: uuidv4(),
  //             userID: userID,
  //           },
  //         });
  //       } else if (role === "author") {
  //         await tx.author.create({
  //           data: {
  //             authorID: userID,
  //             name,
  //             authID: auth.authID,
  //           },
  //         });
  //       } else if (role === "admin") {
  //         await tx.admin.create({
  //           data: {
  //             adminID: userID,
  //             authID: auth.authID,
  //           },
  //         });
  //       }

  //       // Generate JWT token
  //       const token = this.generateToken({
  //         authID: auth.authID,
  //         email: auth.email,
  //         role: auth.role,
  //         userID: role === "user" ? userID : undefined,
  //         authorID: role === "author" ? userID : undefined,
  //         adminID: role === "admin" ? userID : undefined,
  //       });

  //       return {
  //         success: true,
  //         message: "Registration successful",
  //         data: {
  //           token,
  //           user: {
  //             id: userID,
  //             email: auth.email,
  //             name: name,
  //             role: auth.role,
  //           },
  //         },
  //       };
  //     });
  //   } catch (error) {
  //     console.error("Error in register service:", error);

  //     if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //       if (error.code === "P2002") {
  //         throw new Error("Email already exists");
  //       }
  //     }

  //     throw new Error("Registration failed");
  //   }
  // },
  // REGISTER - Chỉ xử lý authentication, gọi factory để tạo user/author/admin
  async register(userData: RegisterInput): Promise<AuthResponse> {
    try {
      const { email, password, name, role, phone, gender, birthDate } =
        userData;

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

        // Create authentication
        const auth = await tx.authentication.create({
          data: {
            authID: uuidv4(),
            email,
            pass: hashedPassword,
            role: role,
          },
        });

        let userID = uuidv4();

        // Gọi factory để tạo user/author/admin
        if (role === "user") {
          await userFactory.createUser({
            name,
            phone,
            gender,
            birthDate,
            authID: auth.authID,
          });

          // Create cart for user
          await tx.cart.create({
            data: {
              cartID: uuidv4(),
              userID: userID,
            },
          });
        } else if (role === "author") {
          await userFactory.createAuthor({
            name,
            authID: auth.authID,
          });
        } else if (role === "admin") {
          await userFactory.createAdmin({
            authID: auth.authID,
          });
        }

        // Generate JWT token
        const token = this.generateToken({
          authID: auth.authID,
          email: auth.email,
          role: auth.role,
          userID: role === "user" ? userID : undefined,
          authorID: role === "author" ? userID : undefined,
          adminID: role === "admin" ? userID : undefined,
        });

        return {
          success: true,
          message: "Registration successful",
          data: {
            token,
            user: {
              id: userID,
              email: auth.email,
              name: name,
              role: auth.role,
            },
          },
        };
      });
    } catch (error) {
      console.error("Error in register service:", error);
      throw new Error("Registration failed");
    }
  },

  // LOGIN
  async login(loginData: LoginInput): Promise<AuthResponse> {
    try {
      const { email, password } = loginData;

      // Find authentication
      const auth = await prisma.authentication.findUnique({
        where: { email },
        include: {
          user: true,
          author: true,
          admin: true,
        },
      });

      if (!auth) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, auth.pass);
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Get user info based on role và xử lý riêng từng type
      let userName = "";
      let userID = "";

      if (auth.role === "user" && auth.user) {
        const userInfo = await prisma.user.findUnique({
          where: { userID: auth.user.userID },
        });
        userName = userInfo?.name || "";
        userID = auth.user.userID;
      } else if (auth.role === "author" && auth.author) {
        const authorInfo = await prisma.author.findUnique({
          where: { authorID: auth.author.authorID },
        });
        userName = authorInfo?.name || "";
        userID = auth.author.authorID;
      } else if (auth.role === "admin" && auth.admin) {
        // Admin không có name, nên dùng email hoặc tạo default name
        userName = "Administrator";
        userID = auth.admin.adminID;
      }

      if (!userID) {
        throw new Error("User not found");
      }

      // Generate JWT token
      const token = this.generateToken({
        authID: auth.authID,
        email: auth.email,
        role: auth.role,
        userID: auth.user?.userID,
        authorID: auth.author?.authorID,
        adminID: auth.admin?.adminID,
      });

      return {
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: userID,
            email: auth.email,
            name: userName,
            role: auth.role,
          },
        },
      };
    } catch (error) {
      console.error("Error in login service:", error);
      throw new Error("Login failed");
    }
  },

  // GENERATE JWT TOKEN
  generateToken(payload: JwtPayload): string {
    const secret = process.env.JWT_SECRET || "your-secret-key";

    const expiresIn = (process.env.JWT_EXPIRES_IN ||
      "7d") as SignOptions["expiresIn"];

    const options: SignOptions = { expiresIn };

    return jwt.sign(payload, secret, options);
  },

  // VERIFY JWT TOKEN
  verifyToken(token: string): JwtPayload {
    try {
      const secret = process.env.JWT_SECRET || "your-secret-key";
      const decoded = jwt.verify(token, secret);

      if (typeof decoded === "string" || !decoded) {
        throw new Error("Invalid token format");
      }

      // Bây giờ decoded là object, ta cast sang JwtPayload
      return decoded as JwtPayload;
    } catch (error) {
      throw new Error("Invalid token");
    }
  },

  // GET USER PROFILE
  async getProfile(authID: string): Promise<any> {
    try {
      const auth = await prisma.authentication.findUnique({
        where: { authID },
        include: {
          user: true,
          author: true,
          admin: true,
        },
      });

      if (!auth) {
        throw new Error("User not found");
      }

      // Xử lý riêng từng role
      let profileData: any = {
        id: "",
        email: auth.email,
        role: auth.role,
        name: "",
        phone: null,
        gender: null,
        birthDate: null,
        addresses: [],
      };

      if (auth.role === "user" && auth.user) {
        const userData = await prisma.user.findUnique({
          where: { userID: auth.user.userID },
          include: {
            addresses: true,
          },
        });

        if (userData) {
          profileData = {
            id: userData.userID,
            email: auth.email,
            role: auth.role,
            name: userData.name,
            phone: userData.phone,
            gender: userData.gender,
            birthDate: userData.birthDate,
            addresses: userData.addresses,
            registerDate: userData.registerDate,
          };
        }
      } else if (auth.role === "author" && auth.author) {
        const authorData = await prisma.author.findUnique({
          where: { authorID: auth.author.authorID },
        });

        if (authorData) {
          profileData = {
            id: authorData.authorID,
            email: auth.email,
            role: auth.role,
            name: authorData.name,
            phone: null,
            gender: null,
            birthDate: null,
            addresses: [],
          };
        }
      } else if (auth.role === "admin" && auth.admin) {
        // Admin chỉ có basic info
        profileData = {
          id: auth.admin.adminID,
          email: auth.email,
          role: auth.role,
          name: "Administrator",
          phone: null,
          gender: null,
          birthDate: null,
          addresses: [],
        };
      }

      return profileData;
    } catch (error) {
      console.error("Error in getProfile service:", error);
      throw new Error("Failed to get profile");
    }
  },

  // CHANGE PASSWORD
  async changePassword(
    authID: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      const auth = await prisma.authentication.findUnique({
        where: { authID },
      });

      if (!auth) {
        throw new Error("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        auth.pass
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.authentication.update({
        where: { authID },
        data: { pass: hashedNewPassword },
      });

      return { message: "Password changed successfully" };
    } catch (error) {
      console.error("Error in changePassword service:", error);
      throw new Error("Failed to change password");
    }
  },
};
