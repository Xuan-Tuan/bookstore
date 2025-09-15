import express, { Application } from "express";
import bookRoutes from "./routes/bookRoutes";
import userRoutes from "./routes/userRoutes";

const app: Application = express();
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.json());
app.use("/api/books", bookRoutes);
app.use("/api/users", userRoutes);

export default app;
