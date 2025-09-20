import prisma from "../config/db";

export const adminService = {
  async getAdminProfile(adminID: string): Promise<any> {
    try {
      const admin = await prisma.admin.findUnique({
        where: { adminID },
        include: {
          authentication: true,
        },
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      return {
        id: admin.adminID,
        email: admin.authentication.email,
        role: admin.authentication.role,
        name: "Administrator",
      };
    } catch (error) {
      console.error("Error getting admin profile:", error);
      throw new Error("Failed to get admin profile");
    }
  },
};
