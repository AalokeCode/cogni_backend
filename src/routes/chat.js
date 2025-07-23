import { Hono } from "hono";
import { PrismaClient } from "../generated/prisma";
import { GoogleGenAI } from "@google/genai";
import { verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";

const app = new Hono();
const prisma = new PrismaClient();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/session", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.split(" ")[1];
  const decoded = await verify(token, process.env.JWT_SECRET);
  const userId = decoded?.userId;
  if (!userId) {
    throw new HTTPException(400, { message: "User ID is required" });
  }
  const session = await prisma.chatSession.create({
    data: { userId },
  });
  return c.json({
    message: "Chat session created successfully",
    sessionId: session.id,
  });
});

app.get("/session/:id", async (c) => {
  const sessionId = c.req.param("id");
  if (!sessionId) {
    throw new HTTPException(400, { message: "Session ID is required" });
  }
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: true },
  });
  if (!session) {
    throw new HTTPException(404, { message: "Chat session not found" });
  }
  return c.json(session);
});

app.post("/", async (c) => {
  const { sessionId, message } = await c.req.json();
  if (!sessionId || !message) {
    throw new HTTPException(400, {
      message: "Session ID and message are required",
    });
  }
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    throw new HTTPException(404, { message: "Chat session not found" });
  }

  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: message,
    },
  });

  const prompt = `User wants to learn: ${message} Generate a topiclist with this JSON structure:
    {
    "title": "string",
    "sections": [
        {
        "name": "string",
        "topics": ["string", "string", ...]
        }
    ]
    }

        Return only the JSON object, no markdown, no code blocks, no extra text. Only return valid JSON.
    `;
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    maxOutputTokens: 1000,
    temperature: 0.5,
  });

  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const jsonData = JSON.parse(jsonMatch[0]);
    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ai",
        content: JSON.stringify(jsonData),
      },
    });

    return c.json({
      message: "Response generated successfully",
      userMessage,
      aiMessage: JSON.stringify(jsonData),
    });
  } else {
    throw new HTTPException(500, {
      message: "Failed to parse AI response",
    });
  }
});

export default app;
