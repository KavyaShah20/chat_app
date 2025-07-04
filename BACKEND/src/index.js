import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();
import { connect } from '../lib/db.js';
import cookieParser from 'cookie-parser';
import authRoutes from '../routes/auth.route.js';
import messageRoutes from '../routes/message.route.js';
import geminiRoutes from '../routes/gemini.route.js';
import cors from 'cors';
import { app, server } from '../lib/socket.js';

// ✅ Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS Setup
app.use(cors({
  origin: "http://localhost:5173", // Update this before production deploy
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", geminiRoutes);

// ✅ Static serving in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../FRONTEND/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../FRONTEND", "dist", "index.html"));
  });
}

// ✅ Start server
const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`Server is running at ${port}`);
  connect();
});
