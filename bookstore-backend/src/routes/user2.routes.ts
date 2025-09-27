import { Router } from "express";
import UserController from "../controllers/user.controller";
import { middlewareGroups } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserResponse:
 *       type: object
 *       properties:
 *         userID:
 *           type: string
 *           example: "abc123"
 *         authID:
 *           type: string
 *           example: "def456"
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           example: "0123456789"
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *         registerDate:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *         role:
 *           type: string
 *           enum: [admin, user, author]
 *         addressesCount:
 *           type: number
 *           example: 2
 *         ordersCount:
 *           type: number
 *           example: 5
 *         reviewsCount:
 *           type: number
 *           example: 3
 *
 *     UserProfileResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/UserResponse'
 *         - type: object
 *           properties:
 *             addresses:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   addressID:
 *                     type: string
 *                   city:
 *                     type: string
 *                   ward:
 *                     type: string
 *                   specificAddress:
 *                     type: string
 *                   userID:
 *                     type: string
 *             recentOrders:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   orderID:
 *                     type: string
 *                   status:
 *                     type: string
 *                   totalAmount:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   bookCount:
 *                     type: number
 *             wishlistCount:
 *               type: number
 *
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe Updated"
 *         phone:
 *           type: string
 *           example: "0987654321"
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *
 *     CreateAddressRequest:
 *       type: object
 *       required:
 *         - city
 *         - ward
 *       properties:
 *         city:
 *           type: string
 *           example: "Hà Nội"
 *         ward:
 *           type: string
 *           example: "Phường Trung Hòa"
 *         specificAddress:
 *           type: string
 *           example: "Số 123, Ngõ 456"
 */

// ==================== PUBLIC ROUTES ====================

/**
 * Public routes - không cần authentication
 */
const publicRoutes = Router();

/**
 * @swagger
 * /api/users/health:
 *   get:
 *     summary: User service health check
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
publicRoutes.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "User management service is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ==================== PROTECTED ROUTES (All authenticated users) ====================

/**
 * Protected routes - cần authentication
 */
const protectedRoutes = Router();

// Áp dụng middleware authentication cho tất cả protected routes
protectedRoutes.use(middlewareGroups.protected);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
protectedRoutes.get("/profile", UserController.getCurrentUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
protectedRoutes.put("/profile", UserController.updateCurrentUserProfile);

// ==================== ADDRESS MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /api/users/addresses:
 *   get:
 *     summary: Get user addresses
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
protectedRoutes.get("/addresses", UserController.getUserAddresses);

/**
 * @swagger
 * /api/users/addresses:
 *   post:
 *     summary: Create new address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAddressRequest'
 *     responses:
 *       201:
 *         description: Address created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
protectedRoutes.post("/addresses", UserController.createUserAddress);

/**
 * @swagger
 * /api/users/addresses/{addressID}:
 *   put:
 *     summary: Update user address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressID
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
protectedRoutes.put("/addresses/:addressID", UserController.updateUserAddress);

/**
 * @swagger
 * /api/users/addresses/{addressID}:
 *   delete:
 *     summary: Delete user address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressID
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
protectedRoutes.delete(
  "/addresses/:addressID",
  UserController.deleteUserAddress
);

// ==================== ADMIN ONLY ROUTES ====================

/**
 * Admin routes - cần admin role
 */
const adminRoutes = Router();
adminRoutes.use(middlewareGroups.adminOnly);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user, author]
 *         description: Filter by role
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, other]
 *         description: Filter by gender
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, registerDate, role]
 *           default: registerDate
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin access required)
 *       500:
 *         description: Internal server error
 */
adminRoutes.get("/", UserController.getAllUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "Password123"
 *               name:
 *                 type: string
 *                 example: "New User"
 *               phone:
 *                 type: string
 *                 example: "0123456789"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               role:
 *                 type: string
 *                 enum: [admin, user, author]
 *                 example: "user"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin access required)
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */
adminRoutes.post("/", UserController.createUser);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin access required)
 *       500:
 *         description: Internal server error
 */
adminRoutes.get("/stats", UserController.getUserStats);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (name or email)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Search query is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin access required)
 *       500:
 *         description: Internal server error
 */
adminRoutes.get("/search", UserController.searchUsers);

/**
 * @swagger
 * /api/users/{userID}:
 *   get:
 *     summary: Get user by ID (Admin only or own profile)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Cannot access other users' data)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
adminRoutes.get("/:userID", UserController.getUserById);

/**
 * @swagger
 * /api/users/{userID}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, user, author]
 *                 example: "author"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin access required or cannot change own role)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
adminRoutes.put("/:userID/role", UserController.updateUserRole);

/**
 * @swagger
 * /api/users/{userID}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userID
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin access required or cannot delete own account)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
adminRoutes.delete("/:userID", UserController.deleteUser);

// ==================== KẾT HỢP TẤT CẢ ROUTES ====================

// Public routes không cần auth - ĐẶT ĐẦU TIÊN
router.use(publicRoutes);

// Protected routes cho user thông thường
router.use(protectedRoutes);

// Admin routes
router.use(adminRoutes);

export default router;
