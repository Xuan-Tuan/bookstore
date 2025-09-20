import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import {
  AuthorWithRelations,
  AuthorCreateInput,
  AuthorUpdateInput,
  AuthorFilters,
} from "../types/author";

export interface PaginationResult {
  authors: AuthorWithRelations[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const authorService = {
  // GET ALL AUTHORS
  async getAllAuthors(filters: AuthorFilters): Promise<AuthorWithRelations[]> {
    try {
      const {
        search,
        name,
        email,
        sortBy = "name",
        sortOrder = "asc",
      } = filters;

      const where: Prisma.AuthorWhereInput = {};

      // Search logic
      if (search) {
        where.OR = [
          { name: { contains: search } },
          {
            authentication: {
              email: { contains: search },
            },
          },
        ];
      } else {
        if (name) {
          where.name = { contains: name };
        }
        if (email) {
          where.authentication = {
            email: { contains: email },
          };
        }
      }

      // Determine sort field
      const validSortFields = ["name", "createdAt"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "name";

      const orderBy: Prisma.AuthorOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "asc",
      };

      const authors = await prisma.author.findMany({
        where,
        include: {
          authentication: true,
          books: {
            include: { book: true },
          },
        },
        orderBy,
      });

      return authors as AuthorWithRelations[];
    } catch (error) {
      console.error("Error in getAllAuthors service:", error);
      throw new Error("Failed to retrieve authors");
    }
  },

  // GET AUTHOR BY ID
  async getAuthorById(id: string): Promise<AuthorWithRelations> {
    try {
      const author = await prisma.author.findUnique({
        where: { authorID: id },
        include: {
          authentication: true,
          books: {
            include: { book: true },
          },
        },
      });

      if (!author) {
        throw new Error("Author not found");
      }

      return author as AuthorWithRelations;
    } catch (error) {
      console.error(`Error retrieving author ${id}:`, error);
      if (error instanceof Error && error.message === "Author not found") {
        throw error;
      }
      throw new Error("Failed to retrieve author");
    }
  },

  // GET AUTHORS WITH PAGINATION
  async getAuthorsWithPagination(
    filters: AuthorFilters
  ): Promise<PaginationResult> {
    try {
      const {
        search,
        name,
        email,
        sortBy = "name",
        sortOrder = "asc",
        page = 1,
        limit = 10,
      } = filters;

      const skip = (page - 1) * limit;
      const where: Prisma.AuthorWhereInput = {};

      // Search logic
      if (search) {
        where.OR = [
          { name: { contains: search } },
          {
            authentication: {
              email: { contains: search },
            },
          },
        ];
      } else {
        if (name) {
          where.name = { contains: name };
        }
        if (email) {
          where.authentication = {
            email: { contains: email },
          };
        }
      }

      // Determine sort field
      const validSortFields = ["name", "createdAt"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "name";

      const orderBy: Prisma.AuthorOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "asc",
      };

      const [authors, total] = await Promise.all([
        prisma.author.findMany({
          where,
          include: {
            authentication: true,
            books: {
              include: { book: true },
            },
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.author.count({ where }),
      ]);

      return {
        authors: authors as AuthorWithRelations[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getAuthorsWithPagination service:", error);
      throw new Error("Failed to retrieve authors with pagination");
    }
  },
  // Thêm hàm getProfile cho author
  async getAuthorProfile(authorID: string): Promise<any> {
    try {
      const author = await prisma.author.findUnique({
        where: { authorID },
        include: {
          authentication: true,
          books: {
            include: {
              book: true,
            },
          },
        },
      });

      if (!author) {
        throw new Error("Author not found");
      }

      return {
        id: author.authorID,
        email: author.authentication.email,
        role: author.authentication.role,
        name: author.name,
        books: author.books,
      };
    } catch (error) {
      console.error("Error getting author profile:", error);
      throw new Error("Failed to get author profile");
    }
  },
  // CREATE AUTHOR
  async createAuthor(
    authorData: AuthorCreateInput
  ): Promise<AuthorWithRelations> {
    try {
      const { name, email, password } = authorData;

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

        // Create authentication với role "author"
        const auth = await tx.authentication.create({
          data: {
            authID: uuidv4(),
            email,
            pass: hashedPassword,
            role: "author",
          },
        });

        // Create author
        const author = await tx.author.create({
          data: {
            authorID: uuidv4(),
            name,
            authID: auth.authID,
          },
        });

        const completeAuthor = await tx.author.findUnique({
          where: { authorID: author.authorID },
          include: {
            authentication: true,
            books: {
              include: { book: true },
            },
          },
        });

        if (!completeAuthor) {
          throw new Error("Failed to retrieve created author");
        }

        return completeAuthor as AuthorWithRelations;
      });
    } catch (error) {
      console.error("Error in createAuthor service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Author with this email already exists");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to create author");
    }
  },

  // UPDATE AUTHOR
  async updateAuthor(
    id: string,
    authorData: AuthorUpdateInput
  ): Promise<AuthorWithRelations> {
    try {
      const { name } = authorData;

      const existingAuthor = await prisma.author.findUnique({
        where: { authorID: id },
        include: { authentication: true },
      });

      if (!existingAuthor) {
        throw new Error("Author not found");
      }

      return await prisma.$transaction(async (tx) => {
        const author = await tx.author.update({
          where: { authorID: id },
          data: {
            ...(name !== undefined && { name }),
          },
        });

        const completeAuthor = await tx.author.findUnique({
          where: { authorID: id },
          include: {
            authentication: true,
            books: {
              include: { book: true },
            },
          },
        });

        if (!completeAuthor) {
          throw new Error("Failed to retrieve updated author");
        }

        return completeAuthor as AuthorWithRelations;
      });
    } catch (error) {
      console.error(`Error updating author ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Author update conflict");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update author");
    }
  },

  // DELETE AUTHOR
  async deleteAuthor(id: string): Promise<{ message: string }> {
    try {
      const existingAuthor = await prisma.author.findUnique({
        where: { authorID: id },
        include: { authentication: true },
      });

      if (!existingAuthor) {
        throw new Error("Author not found");
      }

      await prisma.$transaction(async (tx) => {
        // Delete author (this will cascade delete author_books due to schema constraints)
        await tx.author.delete({
          where: { authorID: id },
        });

        // Delete authentication
        if (existingAuthor.authentication) {
          await tx.authentication.delete({
            where: { authID: existingAuthor.authentication.authID },
          });
        }
      });

      return { message: "Author deleted successfully" };
    } catch (error) {
      console.error(`Error deleting author ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error(
            "Cannot delete author due to existing book references"
          );
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to delete author");
    }
  },
};
