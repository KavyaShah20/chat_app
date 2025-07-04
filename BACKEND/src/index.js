import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { connect } from '../lib/db.js';
import cookieParser from 'cookie-parser';
import authRoutes from '../routes/auth.route.js';
import messageRoutes from '../routes/message.route.js';
import geminiRoutes from '../routes/gemini.route.js';
import cors from 'cors';
import { app, server } from '../lib/socket.js';
import path from 'path';


app.use(cors({
    origin: "http://localhost:5173",
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", geminiRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../FRONTEND/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../FRONTEND", "dist", "index.html"));
  });
}
const port = process.env.PORT || 5001;
const __dirname=path.resolve();

server.listen(port, () => {
    console.log(`Server is running at ${port}`);
    connect();
})