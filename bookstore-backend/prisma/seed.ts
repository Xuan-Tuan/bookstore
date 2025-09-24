import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning existing data...");

  // XÓA THEO THỨ TỰ ĐẢO NGƯỢC QUAN HỆ (QUAN TRỌNG!)
  await prisma.orderBook.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartBook.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.authorBook.deleteMany();
  await prisma.bookImage.deleteMany();
  await prisma.book.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.author.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.authentication.deleteMany();

  console.log("✅ Database cleaned successfully!");
  // 1. Authentication
  await prisma.authentication.createMany({
    data: [
      {
        authID: "auth-admin-001",
        email: "admin@bookstore.com",
        pass: "hashedpassword1",
        role: "admin",
      },
      {
        authID: "auth-user-001",
        email: "user1@mail.com",
        pass: "hashedpassword2",
        role: "user",
      },
      {
        authID: "auth-user-002",
        email: "user2@mail.com",
        pass: "hashedpassword3",
        role: "user",
      },
      {
        authID: "auth-user-003",
        email: "user3@mail.com",
        pass: "hashedpassword4",
        role: "user",
      },
      {
        authID: "auth-user-004",
        email: "user4@mail.com",
        pass: "hashedpassword5",
        role: "user",
      },
      {
        authID: "auth-user-005",
        email: "user5@mail.com",
        pass: "hashedpassword6",
        role: "user",
      },
      {
        authID: "auth-author-001",
        email: "author1@mail.com",
        pass: "hashedpassword7",
        role: "author",
      },
      {
        authID: "auth-author-002",
        email: "author2@mail.com",
        pass: "hashedpassword8",
        role: "author",
      },
      {
        authID: "auth-author-003",
        email: "author3@mail.com",
        pass: "hashedpassword9",
        role: "author",
      },
      {
        authID: "auth-author-004",
        email: "author4@mail.com",
        pass: "hashedpassword10",
        role: "author",
      },
      {
        authID: "auth-author-005",
        email: "author5@mail.com",
        pass: "hashedpassword11",
        role: "author",
      },
    ],
  });

  // 2. Admin
  await prisma.admin.create({
    data: { adminID: "admin-001", authID: "auth-admin-001" },
  });

  // 3. Users
  await prisma.user.createMany({
    data: [
      {
        userID: "user-001",
        name: "Nguyen Van A",
        phone: "0901111111",
        gender: "male",
        birthDate: new Date("1995-01-01"),
        registerDate: new Date("2025-01-01"),
        authID: "auth-user-001",
      },
      {
        userID: "user-002",
        name: "Tran Thi B",
        phone: "0902222222",
        gender: "female",
        birthDate: new Date("1996-02-02"),
        registerDate: new Date("2025-01-02"),
        authID: "auth-user-002",
      },
      {
        userID: "user-003",
        name: "Le Van C",
        phone: "0903333333",
        gender: "male",
        birthDate: new Date("1997-03-03"),
        registerDate: new Date("2025-01-03"),
        authID: "auth-user-003",
      },
      {
        userID: "user-004",
        name: "Pham Thi D",
        phone: "0904444444",
        gender: "female",
        birthDate: new Date("1998-04-04"),
        registerDate: new Date("2025-01-04"),
        authID: "auth-user-004",
      },
      {
        userID: "user-005",
        name: "Hoang Van E",
        phone: "0905555555",
        gender: "male",
        birthDate: new Date("1999-05-05"),
        registerDate: new Date("2025-01-05"),
        authID: "auth-user-005",
      },
    ],
  });

  // 4. Address
  await prisma.address.createMany({
    data: [
      {
        addressID: "addr-001",
        city: "Ha Noi",
        ward: "Dong Da",
        specificAddress: "123 Pho Hue",
        userID: "user-001",
      },
      {
        addressID: "addr-002",
        city: "Ha Noi",
        ward: "Cau Giay",
        specificAddress: "456 Lang Ha",
        userID: "user-002",
      },
      {
        addressID: "addr-003",
        city: "Da Nang",
        ward: "Hai Chau",
        specificAddress: "789 Tran Phu",
        userID: "user-003",
      },
      {
        addressID: "addr-004",
        city: "HCM",
        ward: "Quan 1",
        specificAddress: "12 Nguyen Hue",
        userID: "user-004",
      },
      {
        addressID: "addr-005",
        city: "HCM",
        ward: "Quan 3",
        specificAddress: "34 Vo Thi Sau",
        userID: "user-005",
      },
    ],
  });

  // 5. Authors
  await prisma.author.createMany({
    data: [
      { authorID: "author-001", name: "Author One", authID: "auth-author-001" },
      { authorID: "author-002", name: "Author Two", authID: "auth-author-002" },
      {
        authorID: "author-003",
        name: "Author Three",
        authID: "auth-author-003",
      },
      {
        authorID: "author-004",
        name: "Author Four",
        authID: "auth-author-004",
      },
      {
        authorID: "author-005",
        name: "Author Five",
        authID: "auth-author-005",
      },
    ],
  });

  // 6. Genres
  await prisma.genre.createMany({
    data: [
      { genreID: "genre-001", name: "Fiction" },
      { genreID: "genre-002", name: "Science" },
      { genreID: "genre-003", name: "History" },
      { genreID: "genre-004", name: "Technology" },
      { genreID: "genre-005", name: "Romance" },
    ],
  });

  // 7. Books
  await prisma.book.createMany({
    data: [
      {
        bookID: "book-001",
        title: "The First Book",
        price: 100000,
        description: "A great fiction book",
        stockQuantity: 50,
        soldNumber: 10,
        pubTime: new Date("2023-01-01"),
        genreID: "genre-001",
      },
      {
        bookID: "book-002",
        title: "Science Facts",
        price: 120000,
        description: "Educational science book",
        stockQuantity: 60,
        soldNumber: 15,
        pubTime: new Date("2023-02-01"),
        genreID: "genre-002",
      },
      {
        bookID: "book-003",
        title: "History of VN",
        price: 150000,
        description: "Vietnam history",
        stockQuantity: 40,
        soldNumber: 20,
        pubTime: new Date("2023-03-01"),
        genreID: "genre-003",
      },
      {
        bookID: "book-004",
        title: "Tech World",
        price: 200000,
        description: "Technology trends",
        stockQuantity: 70,
        soldNumber: 25,
        pubTime: new Date("2023-04-01"),
        genreID: "genre-004",
      },
      {
        bookID: "book-005",
        title: "Love Story",
        price: 90000,
        description: "Romantic novel",
        stockQuantity: 80,
        soldNumber: 30,
        pubTime: new Date("2023-05-01"),
        genreID: "genre-005",
      },
    ],
  });

  // 8. BookImage
  await prisma.bookImage.createMany({
    data: [
      {
        bookImageID: "img-001",
        url: "https://img.com/book1.jpg",
        bookID: "book-001",
      },
      {
        bookImageID: "img-002",
        url: "https://img.com/book2.jpg",
        bookID: "book-002",
      },
      {
        bookImageID: "img-003",
        url: "https://img.com/book3.jpg",
        bookID: "book-003",
      },
      {
        bookImageID: "img-004",
        url: "https://img.com/book4.jpg",
        bookID: "book-004",
      },
      {
        bookImageID: "img-005",
        url: "https://img.com/book5.jpg",
        bookID: "book-005",
      },
    ],
  });

  // 9. AuthorBook
  await prisma.authorBook.createMany({
    data: [
      { bookID: "book-001", authorID: "author-001" },
      { bookID: "book-002", authorID: "author-002" },
      { bookID: "book-003", authorID: "author-003" },
      { bookID: "book-004", authorID: "author-004" },
      { bookID: "book-005", authorID: "author-005" },
    ],
  });

  // 10. Wishlist
  await prisma.wishlist.createMany({
    data: [
      { wishListID: "wish-001", userID: "user-001", bookID: "book-002" },
      { wishListID: "wish-002", userID: "user-001", bookID: "book-003" },
      { wishListID: "wish-003", userID: "user-002", bookID: "book-001" },
      { wishListID: "wish-004", userID: "user-003", bookID: "book-004" },
      { wishListID: "wish-005", userID: "user-004", bookID: "book-005" },
      { wishListID: "wish-006", userID: "user-005", bookID: "book-001" },
    ],
  });

  // 11. Review
  await prisma.review.createMany({
    data: [
      {
        reviewID: "rev-001",
        rating: 5,
        cmt: "Rất hay!",
        createdAt: new Date("2025-01-10"),
        updatedAt: new Date("2025-01-10"),
        userID: "user-001",
        bookID: "book-001",
      },
      {
        reviewID: "rev-002",
        rating: 4,
        cmt: "Sách bổ ích",
        createdAt: new Date("2025-01-11"),
        updatedAt: new Date("2025-01-11"),
        userID: "user-002",
        bookID: "book-002",
      },
      {
        reviewID: "rev-003",
        rating: 3,
        cmt: "Khá ổn",
        createdAt: new Date("2025-01-12"),
        updatedAt: new Date("2025-01-12"),
        userID: "user-003",
        bookID: "book-003",
      },
      {
        reviewID: "rev-004",
        rating: 5,
        cmt: "Tuyệt vời",
        createdAt: new Date("2025-01-13"),
        updatedAt: new Date("2025-01-13"),
        userID: "user-004",
        bookID: "book-004",
      },
      {
        reviewID: "rev-005",
        rating: 4,
        cmt: "Đọc rất cuốn",
        createdAt: new Date("2025-01-14"),
        updatedAt: new Date("2025-01-14"),
        userID: "user-005",
        bookID: "book-005",
      },
    ],
  });

  // 12. Cart
  await prisma.cart.createMany({
    data: [
      { cartID: "cart-001", userID: "user-001" },
      { cartID: "cart-002", userID: "user-002" },
      { cartID: "cart-003", userID: "user-003" },
      { cartID: "cart-004", userID: "user-004" },
      { cartID: "cart-005", userID: "user-005" },
    ],
  });

  // 13. CartBook
  await prisma.cartBook.createMany({
    data: [
      {
        cartID: "cart-001",
        bookID: "book-001",
        quantity: 2,
        addedAt: new Date("2025-01-15"),
        isSelected: true,
      },
      {
        cartID: "cart-001",
        bookID: "book-002",
        quantity: 1,
        addedAt: new Date("2025-01-15"),
        isSelected: false,
      },
      {
        cartID: "cart-002",
        bookID: "book-003",
        quantity: 3,
        addedAt: new Date("2025-01-16"),
        isSelected: true,
      },
      {
        cartID: "cart-003",
        bookID: "book-004",
        quantity: 1,
        addedAt: new Date("2025-01-16"),
        isSelected: true,
      },
      {
        cartID: "cart-004",
        bookID: "book-005",
        quantity: 2,
        addedAt: new Date("2025-01-17"),
        isSelected: true,
      },
      {
        cartID: "cart-005",
        bookID: "book-001",
        quantity: 1,
        addedAt: new Date("2025-01-17"),
        isSelected: true,
      },
    ],
  });

  // 14. Orders
  await prisma.order.createMany({
    data: [
      {
        orderID: "order-001",
        status: "completed",
        totalAmount: 200000,
        createdAt: new Date("2025-01-18"),
        addressSnapshot: "123 Pho Hue, Ha Noi",
        phoneSnapshot: "0901111111",
        userID: "user-001",
      },
      {
        orderID: "order-002",
        status: "completed",
        totalAmount: 300000,
        createdAt: new Date("2025-01-18"),
        addressSnapshot: "456 Lang Ha, Ha Noi",
        phoneSnapshot: "0902222222",
        userID: "user-002",
      },
      {
        orderID: "order-003",
        status: "pending",
        totalAmount: 150000,
        createdAt: new Date("2025-01-19"),
        addressSnapshot: "789 Tran Phu, Da Nang",
        phoneSnapshot: "0903333333",
        userID: "user-003",
      },
    ],
  });

  // 15. Payment
  await prisma.payment.createMany({
    data: [
      {
        paymentID: "pay-001",
        orderID: "order-001",
        status: "paid",
        method: "credit_card",
        amount: 200000,
        paidAt: new Date("2025-01-18"),
      },
      {
        paymentID: "pay-002",
        orderID: "order-002",
        status: "paid",
        method: "qr_code",
        amount: 300000,
        paidAt: new Date("2025-01-18"),
      },
      {
        paymentID: "pay-003",
        orderID: "order-003",
        status: "processing",
        method: "cod",
        amount: 150000,
        paidAt: null,
      },
    ],
  });

  // 16. OrderBook
  await prisma.orderBook.createMany({
    data: [
      {
        orderID: "order-001",
        bookID: "book-001",
        priceAtTime: 100000,
        quantity: 2,
        subTotal: 200000,
      },
      {
        orderID: "order-002",
        bookID: "book-002",
        priceAtTime: 120000,
        quantity: 1,
        subTotal: 120000,
      },
      {
        orderID: "order-002",
        bookID: "book-003",
        priceAtTime: 150000,
        quantity: 1,
        subTotal: 150000,
      },
      {
        orderID: "order-003",
        bookID: "book-004",
        priceAtTime: 200000,
        quantity: 1,
        subTotal: 200000,
      },
    ],
  });
}

main()
  .then(() => console.log("✅ Seed dữ liệu thành công"))
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
