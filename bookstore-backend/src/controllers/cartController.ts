import { Request, Response } from "express";
import { cartService } from "../services/cartService";

export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;

    if (!userID) {
      res.status(400).json({
        success: false,
        message: "UserID is required",
      });
      return;
    }

    const cart = await cartService.getCartByUserId(userID);

    res.status(200).json({
      success: true,
      data: cart,
      message: "Cart retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving cart:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving cart",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;
    const { bookID, quantity, isSelected } = req.body;

    if (!userID || !bookID || !quantity) {
      res.status(400).json({
        success: false,
        message: "UserID, BookID, and Quantity are required",
      });
      return;
    }

    if (quantity <= 0) {
      res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
      return;
    }

    const cart = await cartService.addItemToCart(userID, {
      bookID: bookID.trim(),
      quantity: parseInt(quantity),
      isSelected,
    });

    res.status(200).json({
      success: true,
      data: cart,
      message: "Item added to cart successfully",
    });
  } catch (error) {
    console.error("Error adding to cart:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Not enough stock")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error adding to cart",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updateCartItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, bookID } = req.params;
    const { quantity, isSelected } = req.body;

    if (!userID || !bookID) {
      res.status(400).json({
        success: false,
        message: "UserID and BookID are required",
      });
      return;
    }

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (isSelected !== undefined) updateData.isSelected = isSelected;

    const cart = await cartService.updateCartItem(userID, bookID, updateData);

    res.status(200).json({
      success: true,
      data: cart,
      message: "Cart item updated successfully",
    });
  } catch (error) {
    console.error("Error updating cart item:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Not enough stock")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const removeFromCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, bookID } = req.params;

    if (!userID || !bookID) {
      res.status(400).json({
        success: false,
        message: "UserID and BookID are required",
      });
      return;
    }

    const cart = await cartService.removeItemFromCart(userID, bookID);

    res.status(200).json({
      success: true,
      data: cart,
      message: "Item removed from cart successfully",
    });
  } catch (error) {
    console.error("Error removing from cart:", error);

    if (error instanceof Error) {
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
      message: "Error removing from cart",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userID } = req.params;

    if (!userID) {
      res.status(400).json({
        success: false,
        message: "UserID is required",
      });
      return;
    }

    const result = await cartService.clearCart(userID);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error clearing cart:", error);

    if (error instanceof Error) {
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
      message: "Error clearing cart",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
