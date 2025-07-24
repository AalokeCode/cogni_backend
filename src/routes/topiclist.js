import { Hono } from "hono";
import { PrismaClient } from "../generated/prisma";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";

const app = new Hono();
const prisma = new PrismaClient();

app.post("/", async (c) => {
  const { userToken, topicData } = await c.req.json();
  if (!userToken || !topicData) {
    throw new HTTPException(400, {
      message: "User Token and topic data are required",
    });
  }
  const userVal = await verify(userToken, process.env.JWT_SECRET);
  const userId = userVal?.userId;
  const parsedData = JSON.parse(topicData);

  try {
    const topicList = await prisma.topicList.create({
      data: {
        userId: userId,
        title: parsedData.title,
      },
    });

    for (const sections of parsedData.sections) {
      const section = await prisma.section.create({
        data: {
          topicListId: topicList.id,
          name: sections.name,
        },
      });

      for (const topic of sections.topics) {
        await prisma.topic.create({
          data: {
            sectionId: section.id,
            title: topic,
          },
        });
      }
    }

    return c.json({
      message: "Topic list created successfully",
      topicListId: topicList.id,
    });
  } catch (err) {
    console.error("Error creating topic list:", err);
    throw new HTTPException(500, {
      message: "Failed to create topic list",
    });
  }
});

app.get("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Authorization header is required",
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const topicLists = await prisma.topicList.findMany({
      where: { userId: userId },
      include: {
        sections: true,
      },
    });
    return c.json(topicLists);
  } catch (err) {
    console.error("Error fetching topic lists:", err);
    throw new HTTPException(500, { message: "Failed to fetch topic lists" });
  }
});

app.get("/:id", async (c) => {
  const topicListId = c.req.param("id");
  if (!topicListId) {
    throw new HTTPException(400, { message: "Topic list ID is required" });
  }
  const topicList = await prisma.topicList.findUnique({
    where: { id: topicListId },
    include: {
      sections: {
        include: {
          topics: {
            select: {
              id: true,
              title: true,
              completed: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });
  if (!topicList) {
    throw new HTTPException(404, { message: "Topic list not found" });
  }
  return c.json(topicList);
});

app.post("/complete/:id", async (c) => {
  const topicId = c.req.param("id");
  try {
    const checkTopic = await prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!checkTopic) {
      throw new HTTPException(404, { message: "Topic not found" });
    }
    const updatedTopic = await prisma.topic.update({
      where: { id: topicId },
      data: { completed: true },
    });
    return c.json({
      message: "Topic marked as complete",
      topic: {
        id: updatedTopic.id,
        title: updatedTopic.title,
        completed: updatedTopic.completed,
      },
    });
  } catch (err) {
    console.error("Error completing topic:", err);
    throw new HTTPException(500, { message: "Failed to complete topic" });
  }
});

app.delete("/:id", async (c) => {
  const topicListId = c.req.param("id");
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Authorization header is required",
    });
  }
  const token = authHeader.split(" ")[1];
  const decoded = await verify(token, process.env.JWT_SECRET);
  const userId = decoded?.userId;
  if (!userId) {
    throw new HTTPException(400, { message: "User ID is required" });
  }
  if (!topicListId) {
    throw new HTTPException(400, { message: "Topic list ID is required" });
  }
  try {
    const deletedTopicList = await prisma.topicList.delete({
      where: {
        id: topicListId,
        userId: userId,
      },
    });
    return c.json({
      message: "Topic list deleted successfully",
      topicListId: deletedTopicList.id,
    });
  } catch (err) {
    console.error("Error deleting topic list:", err);
    throw new HTTPException(500, { message: "Failed to delete topic list" });
  }
});

export default app;
