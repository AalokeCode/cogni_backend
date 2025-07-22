import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "hono/jwt";
import { PrismaClient } from "../generated/prisma";
import Bun from "bun";

const app = new Hono();
const prisma = new PrismaClient();

app.post("/register", async (c) => {
  const { displayName, email, password } = await c.req.json();
  if (!displayName || !email || !password) {
    throw new HTTPException(400, {
      message: "Email and password are required",
    });
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new HTTPException(400, { message: "User already exists" });
  }
  const hashedPassword = await Bun.password.hash(password, "bcrypt");
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, displayName },
  });
  return c.json({ message: "User registered successfully", userId: user.id });
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    throw new HTTPException(400, {
      message: "Email and password are required",
    });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    !(await Bun.password.verify(password, user.password, "bcrypt"))
  ) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
  const token = await sign(
    { userId: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 },
    process.env.JWT_SECRET,
    "HS256"
  );
  return c.json({ message: "Login successful", token });
});

app.get("/profile", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Authorization header is required",
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new HTTPException(404, { message: "User not found" });
    }
    return c.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch {
    throw new HTTPException(401, { message: "Invalid token" });
  }
});

app.put("/profile", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Authorization header is required",
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      throw new HTTPException(404, { message: "User not found" });
    }
    const { displayName, email, profilePicture } = await c.req.json();
    if (!displayName || !email) {
      throw new HTTPException(400, {
        message: "Display name and email are required",
      });
    }

    const updateData = { displayName, email };
    if (profilePicture !== undefined) {
      updateData.profilePicture = profilePicture;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
    return c.json({
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      profilePicture: updatedUser.profilePicture,
    });
  } catch {
    throw new HTTPException(401, { message: "Invalid token" });
  }
});

export default app;
