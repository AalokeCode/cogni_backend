import { Hono } from "hono";

// routes
import { auth } from "./routes/auth";
import { chat } from "./routes/chat";
import { tasklist } from "./routes/tasklist";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.use("/auth/*", auth);
app.use("/chat/*", chat);
app.use("/tasklist/*", tasklist);

export default app;
