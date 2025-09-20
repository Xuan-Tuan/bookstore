import { PrismaClient, Gender } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";

export const userFactory = {
  // CREATE USER (chỉ tạo user, không tạo auth)
  async createUser(userData: {
    name: string;
    phone?: string;
    gender?: string;
    birthDate?: Date;
    authID: string;
  }) {
    const gender = userData.gender ? (userData.gender as Gender) : null;
    return await prisma.user.create({
      data: {
        userID: uuidv4(),
        name: userData.name,
        phone: userData.phone || null,
        gender: gender,
        birthDate: userData.birthDate || null,
        authID: userData.authID,
      },
    });
  },

  // CREATE AUTHOR (chỉ tạo author, không tạo auth)
  async createAuthor(authorData: { name: string; authID: string }) {
    return await prisma.author.create({
      data: {
        authorID: uuidv4(),
        name: authorData.name,
        authID: authorData.authID,
      },
    });
  },

  // CREATE ADMIN (chỉ tạo admin, không tạo auth)
  async createAdmin(adminData: { authID: string }) {
    return await prisma.admin.create({
      data: {
        adminID: uuidv4(),
        authID: adminData.authID,
      },
    });
  },
};
