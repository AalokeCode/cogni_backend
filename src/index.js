import { Hono } from "hono";

import auth from "./routes/auth";
// import { chat } from "./routes/chat";
// import { tasklist } from "./routes/tasklist";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/auth", auth);
// app.use("/chat/*", chat);
// app.use("/tasklist/*", tasklist);

export default app;
