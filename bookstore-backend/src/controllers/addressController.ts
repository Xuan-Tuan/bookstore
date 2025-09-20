import { Request, Response } from "express";
import { addressService } from "../services/addressService";

export const getAllAddresses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, city, ward } = req.query;

    const filters = {
      userID: userID as string,
      city: city as string,
      ward: ward as string,
    };

    const addresses = await addressService.getAllAddresses(filters);

    res.status(200).json({
      success: true,
      data: addresses,
      filters: {
        ...(userID && { userID }),
        ...(city && { city }),
        ...(ward && { ward }),
      },
      message: "Addresses retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving addresses:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving addresses",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getAddressById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await addressService.getAddressById(id);

    res.status(200).json({
      success: true,
      data: address,
      message: "Address retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving address:", error);

    if (error instanceof Error) {
      if (error.message === "Address not found") {
        res.status(404).json({
          success: false,
          message: "Address not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving address details",
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
      message: "Error retrieving address",
      error: "Internal server error",
    });
  }
};

export const getUserAddresses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID } = req.params;
    const addresses = await addressService.getUserAddresses(userID);

    res.status(200).json({
      success: true,
      data: addresses,
      message: "User addresses retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving user addresses:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving user addresses",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const createAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, city, ward, specificAddress } = req.body;

    if (!userID || !city || !ward) {
      res.status(400).json({
        success: false,
        message: "UserID, City, and Ward are required",
      });
      return;
    }

    const newAddress = await addressService.createAddress({
      userID: userID.trim(),
      city: city.trim(),
      ward: ward.trim(),
      specificAddress: specificAddress?.trim(),
    });

    res.status(201).json({
      success: true,
      data: newAddress,
      message: "Address created successfully",
    });
  } catch (error) {
    console.error("Error creating address:", error);

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
      message: "Error creating address",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updateAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { city, ward, specificAddress } = req.body;

    const updateData: any = {};

    if (city !== undefined) updateData.city = city.trim();
    if (ward !== undefined) updateData.ward = ward.trim();
    if (specificAddress !== undefined)
      updateData.specificAddress = specificAddress?.trim();

    const updatedAddress = await addressService.updateAddress(id, updateData);

    res.status(200).json({
      success: true,
      data: updatedAddress,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error updating address:", error);

    if (error instanceof Error) {
      if (error.message === "Address not found") {
        res.status(404).json({
          success: false,
          message: "Address not found",
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
      message: "Error updating address",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const deleteAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await addressService.deleteAddress(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting address:", error);

    if (error instanceof Error) {
      if (error.message === "Address not found") {
        res.status(404).json({
          success: false,
          message: "Address not found",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error deleting address",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const setDefaultAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, addressID } = req.body;

    if (!userID || !addressID) {
      res.status(400).json({
        success: false,
        message: "UserID and AddressID are required",
      });
      return;
    }

    const result = await addressService.setDefaultAddress(
      userID.trim(),
      addressID.trim()
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error setting default address:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("does not belong")
      ) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error setting default address",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
