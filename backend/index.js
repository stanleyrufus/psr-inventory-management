// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import inventoryRoutes from "./routes/inventory.js";
import usersRoutes from "./routes/users.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect DB
connectDB();

// Mount routes
app.use("/api/parts", inventoryRoutes);
app.use("/api/users", usersRoutes);

app.get("/", (req, res) => {
  res.send("PSR Inventory Management API is running...");
});

app.listen(PORT, () =>
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
);
