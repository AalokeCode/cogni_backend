import { Hono } from "hono";
import { verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { PrismaClient } from "../generated/prisma";

const authMiddleware = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Authorization header is required",
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await verify(token, process.env.JWT_SECRET);
    c.set("userId", decoded.userId);
    return next();
  } catch {
    throw new HTTPException(401, { message: "Invalid token" });
  }
};

export default authMiddleware;
