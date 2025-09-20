import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import {
  CartWithRelations,
  CartItemInput,
  UpdateCartItemInput,
  CartResponse,
  CartItemResponse,
} from "../types/cart";

export const cartService = {
  // GET CART BY USER ID
  async getCartByUserId(userID: string): Promise<CartResponse> {
    try {
      // Tìm hoặc tạo giỏ hàng cho user
      let cart = await prisma.cart.findUnique({
        where: { userID },
        include: {
          books: {
            include: {
              book: {
                include: {
                  images: true,
                },
              },
            },
          },
        },
      });

      // Nếu chưa có cart, tạo mới
      if (!cart) {
        cart = await prisma.cart.create({
          data: {
            cartID: uuidv4(),
            userID,
          },
          include: {
            books: {
              include: {
                book: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        });
      }

      return this.formatCartResponse(cart);
    } catch (error) {
      console.error(`Error retrieving cart for user ${userID}:`, error);
      throw new Error("Failed to retrieve cart");
    }
  },

  // ADD ITEM TO CART
  async addItemToCart(
    userID: string,
    itemData: CartItemInput
  ): Promise<CartResponse> {
    try {
      const { bookID, quantity, isSelected = true } = itemData;

      return await prisma.$transaction(async (tx) => {
        // Tìm hoặc tạo giỏ hàng
        let cart = await tx.cart.findUnique({
          where: { userID },
        });

        if (!cart) {
          cart = await tx.cart.create({
            data: {
              cartID: uuidv4(),
              userID,
            },
          });
        }

        // Kiểm tra book tồn tại
        const book = await tx.book.findUnique({
          where: { bookID },
        });

        if (!book) {
          throw new Error("Book not found");
        }

        // Kiểm tra số lượng tồn kho
        if (quantity > book.stockQuantity) {
          throw new Error(`Not enough stock. Available: ${book.stockQuantity}`);
        }

        // Kiểm tra item đã tồn tại trong giỏ hàng chưa
        const existingItem = await tx.cartBook.findUnique({
          where: {
            cartID_bookID: {
              cartID: cart.cartID,
              bookID,
            },
          },
        });

        if (existingItem) {
          // Cập nhật số lượng nếu đã tồn tại
          await tx.cartBook.update({
            where: {
              cartID_bookID: {
                cartID: cart.cartID,
                bookID,
              },
            },
            data: {
              quantity: existingItem.quantity + quantity,
              isSelected,
            },
          });
        } else {
          // Thêm mới item
          await tx.cartBook.create({
            data: {
              cartID: cart.cartID,
              bookID,
              quantity,
              isSelected,
              addedAt: new Date(),
            },
          });
        }

        // Lấy lại giỏ hàng với thông tin đầy đủ
        const updatedCart = await tx.cart.findUnique({
          where: { cartID: cart.cartID },
          include: {
            books: {
              include: {
                book: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        });

        if (!updatedCart) {
          throw new Error("Failed to retrieve updated cart");
        }

        return this.formatCartResponse(updatedCart);
      });
    } catch (error) {
      console.error(`Error adding item to cart for user ${userID}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Invalid bookID");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to add item to cart");
    }
  },

  // UPDATE CART ITEM
  async updateCartItem(
    userID: string,
    bookID: string,
    updateData: UpdateCartItemInput
  ): Promise<CartResponse> {
    try {
      const { quantity, isSelected } = updateData;

      return await prisma.$transaction(async (tx) => {
        // Tìm giỏ hàng của user
        const cart = await tx.cart.findUnique({
          where: { userID },
        });

        if (!cart) {
          throw new Error("Cart not found");
        }

        // Kiểm tra item tồn tại
        const existingItem = await tx.cartBook.findUnique({
          where: {
            cartID_bookID: {
              cartID: cart.cartID,
              bookID,
            },
          },
          include: {
            book: true,
          },
        });

        if (!existingItem) {
          throw new Error("Item not found in cart");
        }

        // Kiểm tra số lượng tồn kho nếu cập nhật quantity
        if (quantity !== undefined) {
          if (quantity > existingItem.book.stockQuantity) {
            throw new Error(
              `Not enough stock. Available: ${existingItem.book.stockQuantity}`
            );
          }
          if (quantity <= 0) {
            // Xóa item nếu quantity <= 0
            await tx.cartBook.delete({
              where: {
                cartID_bookID: {
                  cartID: cart.cartID,
                  bookID,
                },
              },
            });
          } else {
            // Cập nhật quantity
            await tx.cartBook.update({
              where: {
                cartID_bookID: {
                  cartID: cart.cartID,
                  bookID,
                },
              },
              data: {
                quantity,
                ...(isSelected !== undefined && { isSelected }),
              },
            });
          }
        } else if (isSelected !== undefined) {
          // Chỉ cập nhật isSelected
          await tx.cartBook.update({
            where: {
              cartID_bookID: {
                cartID: cart.cartID,
                bookID,
              },
            },
            data: { isSelected },
          });
        }

        // Lấy lại giỏ hàng với thông tin đầy đủ
        const updatedCart = await tx.cart.findUnique({
          where: { cartID: cart.cartID },
          include: {
            books: {
              include: {
                book: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        });

        if (!updatedCart) {
          throw new Error("Failed to retrieve updated cart");
        }

        return this.formatCartResponse(updatedCart);
      });
    } catch (error) {
      console.error(`Error updating cart item for user ${userID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update cart item");
    }
  },

  // REMOVE ITEM FROM CART
  async removeItemFromCart(
    userID: string,
    bookID: string
  ): Promise<CartResponse> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Tìm giỏ hàng của user
        const cart = await tx.cart.findUnique({
          where: { userID },
        });

        if (!cart) {
          throw new Error("Cart not found");
        }

        // Xóa item
        await tx.cartBook.delete({
          where: {
            cartID_bookID: {
              cartID: cart.cartID,
              bookID,
            },
          },
        });

        // Lấy lại giỏ hàng với thông tin đầy đủ
        const updatedCart = await tx.cart.findUnique({
          where: { cartID: cart.cartID },
          include: {
            books: {
              include: {
                book: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        });

        if (!updatedCart) {
          throw new Error("Failed to retrieve updated cart");
        }

        return this.formatCartResponse(updatedCart);
      });
    } catch (error) {
      console.error(`Error removing item from cart for user ${userID}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Item not found in cart");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to remove item from cart");
    }
  },

  // CLEAR CART
  async clearCart(userID: string): Promise<{ message: string }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Tìm giỏ hàng của user
        const cart = await tx.cart.findUnique({
          where: { userID },
        });

        if (!cart) {
          throw new Error("Cart not found");
        }

        // Xóa tất cả items trong giỏ hàng
        await tx.cartBook.deleteMany({
          where: { cartID: cart.cartID },
        });

        return { message: "Cart cleared successfully" };
      });
    } catch (error) {
      console.error(`Error clearing cart for user ${userID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to clear cart");
    }
  },

  // FORMAT CART RESPONSE
  formatCartResponse(cart: any): CartResponse {
    const items: CartItemResponse[] = cart.books.map((cartBook: any) => ({
      cartID: cartBook.cartID,
      bookID: cartBook.bookID,
      bookTitle: cartBook.book.title,
      bookPrice: Number(cartBook.book.price),
      bookImage: cartBook.book.images[0]?.url,
      quantity: cartBook.quantity,
      isSelected: cartBook.isSelected,
      addedAt: cartBook.addedAt,
      subTotal: Number(cartBook.book.price) * cartBook.quantity,
    }));

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.subTotal, 0);

    return {
      cartID: cart.cartID,
      userID: cart.userID,
      items,
      totalItems,
      totalPrice,
    };
  },
};
