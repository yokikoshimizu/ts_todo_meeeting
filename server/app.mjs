import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import {
  createMeeting,
  deleteMeeting,
  getMeeting,
  listMeetings,
  openDatabase,
  updateActionItem,
  updateMeeting,
} from "./database.mjs";

const maxRequestSize = 1024 * 1024;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export function createMeetingServer({
  databasePath,
  publicDirectory,
  seed = true,
}) {
  const database = openDatabase(databasePath, { seed });
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const handled = await handleApiRequest(database, request, response, url);

      if (!handled) {
        serveStaticFile(request, response, url, publicDirectory);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        sendJson(response, error.status, {
          message: error.message,
          errors: error.errors,
        });
        return;
      }

      console.error(error);
      sendJson(response, 500, {
        message: "サーバーで予期しないエラーが発生しました。",
      });
    }
  });

  return {
    database,
    server,
    close() {
      return new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          database.close();
          if (error) {
            rejectClose(error);
          } else {
            resolveClose();
          }
        });
      });
    },
  };
}

async function handleApiRequest(database, request, response, url) {
  if (!url.pathname.startsWith("/api/")) {
    return false;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/meetings") {
    sendJson(response, 200, listMeetings(database));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/meetings") {
    const input = validateMeetingInput(await readJsonBody(request));
    sendJson(response, 201, createMeeting(database, input));
    return true;
  }

  const meetingMatch = url.pathname.match(/^\/api\/meetings\/(\d+)$/);
  if (meetingMatch) {
    const meetingId = Number(meetingMatch[1]);

    if (request.method === "GET") {
      const meeting = getMeeting(database, meetingId);
      if (!meeting) {
        throw new ApiError(404, "会議メモが見つかりません。"
        );
      }
      sendJson(response, 200, meeting);
      return true;
    }

    if (request.method === "PUT") {
      const input = validateMeetingInput(await readJsonBody(request));
      const meeting = updateMeeting(database, meetingId, input);
      if (!meeting) {
        throw new ApiError(404, "会議メモが見つかりません。");
      }
      sendJson(response, 200, meeting);
      return true;
    }

    if (request.method === "DELETE") {
      if (!deleteMeeting(database, meetingId)) {
        throw new ApiError(404, "会議メモが見つかりません。");
      }
      response.writeHead(204);
      response.end();
      return true;
    }
  }

  const actionItemMatch = url.pathname.match(
    /^\/api\/meetings\/(\d+)\/action-items\/(\d+)$/,
  );
  if (request.method === "PATCH" && actionItemMatch) {
    const body = await readJsonBody(request);
    if (typeof body.isCompleted !== "boolean") {
      throw new ApiError(400, "完了状態を正しく指定してください。", {
        isCompleted: "true または false を指定してください。",
      });
    }

    const meeting = updateActionItem(
      database,
      Number(actionItemMatch[1]),
      Number(actionItemMatch[2]),
      body.isCompleted,
    );
    if (!meeting) {
      throw new ApiError(404, "TODOが見つかりません。");
    }
    sendJson(response, 200, meeting);
    return true;
  }

  throw new ApiError(404, "APIが見つかりません。");
}

function validateMeetingInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "入力内容を確認してください。");
  }

  const errors = {};
  const title = readString(value.title).trim();
  const heldAt = readString(value.heldAt).trim();

  if (!title) {
    errors.title = "会議タイトルを入力してください。";
  }
  if (!heldAt) {
    errors.heldAt = "開催日時を入力してください。";
  }
  if (value.tags !== undefined && !Array.isArray(value.tags)) {
    errors.tags = "タグは配列で指定してください。";
  }
  if (value.actionItems !== undefined && !Array.isArray(value.actionItems)) {
    errors.actionItems = "TODOは配列で指定してください。";
  }

  const actionItems = Array.isArray(value.actionItems)
    ? value.actionItems.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          errors.actionItems = `TODO ${index + 1} の入力内容を確認してください。`;
          return null;
        }

        const content = readString(item.content).trim();
        if (!content) {
          errors.actionItems = `TODO ${index + 1} の対応内容を入力してください。`;
        }

        return {
          content,
          assignee: readString(item.assignee).trim(),
          dueDate: readString(item.dueDate).trim(),
          isCompleted: item.isCompleted === true,
        };
      })
    : [];

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "入力内容を確認してください。", errors);
  }

  return {
    title,
    heldAt,
    participants: readString(value.participants).trim(),
    content: readString(value.content).trim(),
    decisions: readString(value.decisions).trim(),
    tags: Array.from(
      new Set(
        (Array.isArray(value.tags) ? value.tags : [])
          .map((tag) => readString(tag).trim())
          .filter(Boolean),
      ),
    ),
    actionItems: actionItems.filter(Boolean),
  };
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxRequestSize) {
      throw new ApiError(413, "送信できるデータ量を超えています。");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    throw new ApiError(400, "入力内容がありません。");
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "JSON形式が正しくありません。");
  }
}

function readString(value) {
  return typeof value === "string" ? value : "";
}

function sendJson(response, status, body) {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  response.end(json);
}

function serveStaticFile(request, response, url, publicDirectory) {
  if (!publicDirectory || (request.method !== "GET" && request.method !== "HEAD")) {
    sendJson(response, 404, { message: "ページが見つかりません。" });
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname);
  const candidatePath = resolve(
    publicDirectory,
    requestedPath === "/" ? "index.html" : `.${requestedPath}`,
  );
  const publicRoot = resolve(publicDirectory);
  const isInsidePublicDirectory =
    candidatePath === publicRoot || candidatePath.startsWith(`${publicRoot}${sep}`);
  const filePath =
    isInsidePublicDirectory &&
    existsSync(candidatePath) &&
    statSync(candidatePath).isFile()
      ? candidatePath
      : resolve(publicDirectory, "index.html");

  if (!existsSync(filePath)) {
    sendJson(response, 404, {
      message: "フロントエンドが未ビルドです。先に pnpm build を実行してください。",
    });
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
