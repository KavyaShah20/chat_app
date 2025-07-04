// import express from 'express';
// const router = express.Router();

// import { getGeminiResponse } from '../controllers/gemini.controller.js';

// router.get("/get-results", getGeminiResponse);

// export default router;

import express from "express";
import { getGeminiResponse } from "../lib/gemini.js";

const router = express.Router();

router.get("/get-results", async (req, res) => {
  try {
    const userPrompt = req.query.message;
    if (!userPrompt) {
      return res.status(400).json({ error: "Missing 'message' query parameter" });
    }

    const aiReply = await getGeminiResponse(userPrompt);
    res.json({ reply: aiReply });
  } catch (err) {
    res.status(500).json({ error: "Gemini API error", details: err.message });
  }
});

export default router;

