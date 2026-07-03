import { Router } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";

const router = Router();

const VALID_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);

// POST /tts — generate speech audio from text using OpenAI gpt-audio
router.post("/tts", async (req, res) => {
  const { text, voice = "shimmer" } = req.body ?? {};

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  if (!VALID_VOICES.has(voice)) {
    return res.status(400).json({ error: "invalid voice" });
  }

  try {
    const buffer = await textToSpeech(text.trim(), voice as any, "mp3");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "TTS generation failed");
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
