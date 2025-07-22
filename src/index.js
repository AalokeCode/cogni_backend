import { Hono } from "hono";

import auth from "./routes/auth";
import chat from "./routes/chat";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/auth", auth);
app.route("/chat", chat);

export default app;
