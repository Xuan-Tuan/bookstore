import { Prisma } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import {
  BookWithRelations,
  BookCreateInput,
  BookUpdateInput,
} from "../types/book";

export interface BookFilters {
  search?: string;
  title?: string;
  author?: string;
  genre?: string;
  sortBy?: string;
  sortOrder?: Prisma.SortOrder;
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  books: BookWithRelations[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const bookService = {
  // GET ALL BOOKS
  async getAllBooks(filters: BookFilters): Promise<BookWithRelations[]> {
    try {
      const {
        search,
        title,
        author,
        genre,
        sortBy = "title",
        sortOrder = "asc",
      } = filters;

      const where: Prisma.BookWhereInput = {};

      // Filter by genre
      if (genre) {
        where.genre = {
          name: {
            contains: genre,
          },
        };
      }

      // Search logic
      if (search) {
        where.OR = [
          { title: { contains: search } },
          {
            authors: {
              some: {
                author: {
                  name: { contains: search },
                },
              },
            },
          },
          {
            genre: {
              name: { contains: search },
            },
          },
        ];
      } else {
        if (title) {
          where.title = { contains: title };
        }
        if (author) {
          where.authors = {
            some: {
              author: {
                name: { contains: author },
              },
            },
          };
        }
      }

      // Determine sort field
      const validSortFields = ["title", "price", "soldNumber", "pubTime"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "title";

      const orderBy: Prisma.BookOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "asc",
      };

      const books = await prisma.book.findMany({
        where,
        include: {
          genre: true,
          images: true,
          authors: {
            include: { author: true },
          },
        },
        orderBy,
      });

      return books as BookWithRelations[];
    } catch (error) {
      console.error("Error in getAllBooks service:", error);
      throw new Error("Failed to retrieve books");
    }
  },

  // GET BOOK BY ID
  async getBookById(id: string): Promise<BookWithRelations> {
    try {
      const book = await prisma.book.findUnique({
        where: { bookID: id },
        include: {
          genre: true,
          images: true,
          authors: {
            include: { author: true },
          },
        },
      });

      if (!book) {
        throw new Error("Book not found");
      }

      return book as BookWithRelations;
    } catch (error) {
      console.error(`Error retrieving book ${id}:`, error);
      if (error instanceof Error && error.message === "Book not found") {
        throw error;
      }
      throw new Error("Failed to retrieve book");
    }
  },

  // GET BOOKS WITH PAGINATION
  async getBooksWithPagination(
    filters: BookFilters
  ): Promise<PaginationResult> {
    try {
      const {
        search,
        title,
        author,
        genre,
        sortBy = "title",
        sortOrder = "asc",
        page = 1,
        limit = 10,
      } = filters;

      const skip = (page - 1) * limit;
      const where: Prisma.BookWhereInput = {};

      // Filter by genre
      if (genre) {
        where.genre = {
          name: {
            contains: genre,
          },
        };
      }

      // Search logic
      if (search) {
        where.OR = [
          { title: { contains: search } },
          {
            authors: {
              some: {
                author: {
                  name: {
                    contains: search,
                  },
                },
              },
            },
          },
          {
            genre: {
              name: { contains: search },
            },
          },
        ];
      } else {
        if (title) {
          where.title = { contains: title };
        }
        if (author) {
          where.authors = {
            some: {
              author: {
                name: { contains: author },
              },
            },
          };
        }
      }

      // Determine sort field
      const validSortFields = ["title", "price", "soldNumber", "pubTime"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "title";

      const orderBy: Prisma.BookOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "asc",
      };

      const [books, total] = await Promise.all([
        prisma.book.findMany({
          where,
          include: {
            genre: true,
            images: true,
            authors: {
              include: { author: true },
            },
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.book.count({ where }),
      ]);

      return {
        books: books as BookWithRelations[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getBooksWithPagination service:", error);
      throw new Error("Failed to retrieve books with pagination");
    }
  },

  // CREATE BOOK
  async createBook(bookData: BookCreateInput): Promise<BookWithRelations> {
    try {
      const {
        title,
        price,
        description,
        stockQuantity,
        pubTime,
        genreID,
        authorIDs,
        images,
      } = bookData;

      return await prisma.$transaction(async (tx) => {
        const book = await tx.book.create({
          data: {
            bookID: uuidv4(),
            title,
            price,
            description: description ?? null,
            stockQuantity,
            genreID: genreID ?? null,
            pubTime: pubTime ?? null,
          },
        });

        if (authorIDs && authorIDs.length > 0) {
          const existingAuthors = await tx.author.findMany({
            where: { authorID: { in: authorIDs } },
            select: { authorID: true },
          });

          const existingAuthorIDs = existingAuthors.map((a) => a.authorID);
          const invalidAuthors = authorIDs.filter(
            (id) => !existingAuthorIDs.includes(id)
          );

          if (invalidAuthors.length > 0) {
            throw new Error(`Invalid author IDs: ${invalidAuthors.join(", ")}`);
          }

          await tx.authorBook.createMany({
            data: authorIDs.map((authorID) => ({
              bookID: book.bookID,
              authorID,
            })),
          });
        }

        if (images && images.length > 0) {
          await tx.bookImage.createMany({
            data: images.map((url) => ({
              bookImageID: uuidv4(),
              url,
              bookID: book.bookID,
            })),
          });
        }

        const completeBook = await tx.book.findUnique({
          where: { bookID: book.bookID },
          include: {
            genre: true,
            images: true,
            authors: {
              include: { author: true },
            },
          },
        });

        if (!completeBook) {
          throw new Error("Failed to retrieve created book");
        }

        return completeBook as BookWithRelations;
      });
    } catch (error) {
      console.error("Error in createBook service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Book with this title already exists");
        }
        if (error.code === "P2003") {
          throw new Error("Invalid genre ID provided");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to create book");
    }
  },

  // UPDATE BOOK
  async updateBook(
    id: string,
    bookData: BookUpdateInput
  ): Promise<BookWithRelations> {
    try {
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
      } = bookData;

      const existingBook = await prisma.book.findUnique({
        where: { bookID: id },
      });

      if (!existingBook) {
        throw new Error("Book not found");
      }

      return await prisma.$transaction(async (tx) => {
        const book = await tx.book.update({
          where: { bookID: id },
          data: {
            ...(title !== undefined && { title }),
            ...(price !== undefined && { price }),
            ...(description !== undefined && { description }),
            ...(stockQuantity !== undefined && { stockQuantity }),
            ...(soldNumber !== undefined && { soldNumber }),
            ...(genreID !== undefined && { genreID }),
            ...(pubTime !== undefined && { pubTime: pubTime ?? null }),
          },
        });

        if (authorIDs !== undefined) {
          await tx.authorBook.deleteMany({ where: { bookID: id } });

          if (authorIDs.length > 0) {
            const existingAuthors = await tx.author.findMany({
              where: { authorID: { in: authorIDs } },
              select: { authorID: true },
            });

            const existingAuthorIDs = existingAuthors.map((a) => a.authorID);
            const invalidAuthors = authorIDs.filter(
              (id) => !existingAuthorIDs.includes(id)
            );

            if (invalidAuthors.length > 0) {
              throw new Error(
                `Invalid author IDs: ${invalidAuthors.join(", ")}`
              );
            }

            await tx.authorBook.createMany({
              data: authorIDs.map((authorID) => ({
                bookID: id,
                authorID,
              })),
            });
          }
        }

        if (images !== undefined) {
          await tx.bookImage.deleteMany({ where: { bookID: id } });

          if (images.length > 0) {
            await tx.bookImage.createMany({
              data: images.map((url) => ({
                bookImageID: uuidv4(),
                url,
                bookID: id,
              })),
            });
          }
        }

        const completeBook = await tx.book.findUnique({
          where: { bookID: id },
          include: {
            genre: true,
            images: true,
            authors: {
              include: { author: true },
            },
          },
        });

        if (!completeBook) {
          throw new Error("Failed to retrieve updated book");
        }

        return completeBook as BookWithRelations;
      });
    } catch (error) {
      console.error(`Error updating book ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Book with this title already exists");
        }
        if (error.code === "P2003") {
          throw new Error("Invalid genre ID provided");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update book");
    }
  },

  // DELETE BOOK
  async deleteBook(id: string): Promise<{ message: string }> {
    try {
      const existingBook = await prisma.book.findUnique({
        where: { bookID: id },
      });

      if (!existingBook) {
        throw new Error("Book not found");
      }

      await prisma.book.delete({
        where: { bookID: id },
      });

      return { message: "Book deleted successfully" };
    } catch (error) {
      console.error(`Error deleting book ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Cannot delete book due to existing references");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to delete book");
    }
  },
};
