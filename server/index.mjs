import { resolve } from "node:path";
import { createMeetingServer } from "./app.mjs";

const host = process.env.API_HOST ?? "127.0.0.1";
const port = Number(process.env.API_PORT ?? 3001);
const databasePath = resolve(
  process.env.DATABASE_PATH ?? "data/meeting-memos.db",
);
const publicDirectory = resolve("dist");
const application = createMeetingServer({ databasePath, publicDirectory });

application.server.listen(port, host, () => {
  console.log(`Meeting Memo API: http://${host}:${port}`);
});

async function shutdown() {
  await application.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
