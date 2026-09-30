import express, { Express, Request, Response } from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";
import type { Server } from "http";

const app: Express = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

app.use("/api", apiRoutes);

const PORT: number = Number(process.env.PORT) || 8000;

app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).send("OK");
});

const server: Server = app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on http://127.0.0.1:${PORT}`)
);

// Node closes idle keep-alive sockets after 5s by default. Any proxy in
// front of us -- Vite's dev proxy, Render's load balancer -- pools
// connections and can reuse one at the exact moment Node is closing it,
// which surfaces as an intermittent ECONNRESET in dev and a 502 in
// production. Outliving the proxy's own idle timeout avoids the race.
// headersTimeout must stay above keepAliveTimeout.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

const shutdown = (): void => {
  server.close(() => {
    console.log("Server closed cleanly");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
