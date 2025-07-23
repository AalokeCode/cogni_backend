import { Hono } from "hono";
import { cors } from "hono/cors";

import auth from "./routes/auth";
import chat from "./routes/chat";
import topicList from "./routes/topiclist";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/auth", auth);
app.route("/api/chat", chat);
app.route("/api/topiclist", topicList);

export default app;
