import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const seedMeetings = [
  {
    id: 1,
    title: "新規サービス定例",
    heldAt: "2026-07-24T10:00",
    participants: "佐藤, 鈴木, 田中",
    content:
      "ベータ版の公開範囲、問い合わせ対応、次回レビューで確認する指標について話し合った。",
    decisions:
      "来週のレビューまでにベータ版の対象ユーザーを20名に絞る。問い合わせ窓口はチーム共通メールで受ける。",
    tags: ["定例", "新規サービス"],
    createdAt: "2026-07-24T10:45:00.000Z",
    updatedAt: "2026-07-24T10:45:00.000Z",
    actionItems: [
      {
        id: 101,
        content: "ベータ版の対象ユーザー候補をまとめる",
        assignee: "佐藤",
        dueDate: "2026-07-29",
        isCompleted: false,
      },
      {
        id: 102,
        content: "問い合わせメールのテンプレートを作成する",
        assignee: "鈴木",
        dueDate: "2026-07-30",
        isCompleted: true,
      },
    ],
  },
  {
    id: 2,
    title: "制作進行ミーティング",
    heldAt: "2026-07-23T15:30",
    participants: "山本, 高橋",
    content:
      "今週の制作状況を確認し、デザイン確認の順番とレビュー観点を整理した。",
    decisions: "画面一覧を先に確定し、細かい文言は次回レビューで調整する。",
    tags: ["制作", "レビュー"],
    createdAt: "2026-07-23T07:10:00.000Z",
    updatedAt: "2026-07-23T07:10:00.000Z",
    actionItems: [
      {
        id: 201,
        content: "一覧画面の確認観点をメモに追記する",
        assignee: "高橋",
        dueDate: "",
        isCompleted: false,
      },
    ],
  },
];

export function openDatabase(databasePath, { seed = true } = {}) {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  createSchema(database);

  if (seed) {
    seedDatabase(database);
  }

  return database;
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      held_at TEXT NOT NULL,
      participants TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      decisions TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      assignee TEXT NOT NULL DEFAULT '',
      due_date TEXT NOT NULL DEFAULT '',
      is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS meeting_tags (
      meeting_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (meeting_id, tag_id),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id
      ON action_items(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_meeting_tags_meeting_id
      ON meeting_tags(meeting_id);
  `);
}

function seedDatabase(database) {
  const seedState = database
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("initial_seed");

  if (seedState) {
    return;
  }

  withTransaction(database, () => {
    const meetingCount = database
      .prepare("SELECT COUNT(*) AS count FROM meetings")
      .get().count;

    if (meetingCount === 0) {
      for (const meeting of seedMeetings) {
        insertMeeting(database, meeting, { preserveIds: true });
      }
    }

    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run("initial_seed", "1");
  });
}

export function listMeetings(database) {
  const meetingRows = database
    .prepare(`
      SELECT
        id,
        title,
        held_at AS heldAt,
        participants,
        content,
        decisions,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM meetings
      ORDER BY held_at DESC, id DESC
    `)
    .all();

  const actionRows = database
    .prepare(`
      SELECT
        id,
        meeting_id AS meetingId,
        content,
        assignee,
        due_date AS dueDate,
        is_completed AS isCompleted
      FROM action_items
      ORDER BY meeting_id, position, id
    `)
    .all();
  const tagRows = database
    .prepare(`
      SELECT meeting_tags.meeting_id AS meetingId, tags.name
      FROM meeting_tags
      JOIN tags ON tags.id = meeting_tags.tag_id
      ORDER BY meeting_tags.meeting_id, meeting_tags.position, tags.id
    `)
    .all();

  return meetingRows.map((meeting) => ({
    ...meeting,
    tags: tagRows
      .filter((tag) => tag.meetingId === meeting.id)
      .map((tag) => tag.name),
    actionItems: actionRows
      .filter((item) => item.meetingId === meeting.id)
      .map(mapActionItem),
  }));
}

export function getMeeting(database, meetingId) {
  const meeting = database
    .prepare(`
      SELECT
        id,
        title,
        held_at AS heldAt,
        participants,
        content,
        decisions,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM meetings
      WHERE id = ?
    `)
    .get(meetingId);

  if (!meeting) {
    return null;
  }

  const actionItems = database
    .prepare(`
      SELECT
        id,
        meeting_id AS meetingId,
        content,
        assignee,
        due_date AS dueDate,
        is_completed AS isCompleted
      FROM action_items
      WHERE meeting_id = ?
      ORDER BY position, id
    `)
    .all(meetingId)
    .map(mapActionItem);
  const tags = database
    .prepare(`
      SELECT tags.name
      FROM meeting_tags
      JOIN tags ON tags.id = meeting_tags.tag_id
      WHERE meeting_tags.meeting_id = ?
      ORDER BY meeting_tags.position, tags.id
    `)
    .all(meetingId)
    .map((tag) => tag.name);

  return { ...meeting, tags, actionItems };
}

export function createMeeting(database, input) {
  const now = new Date().toISOString();
  let meetingId;

  withTransaction(database, () => {
    const result = database
      .prepare(`
        INSERT INTO meetings (
          title, held_at, participants, content, decisions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.title,
        input.heldAt,
        input.participants,
        input.content,
        input.decisions,
        now,
        now,
      );
    meetingId = Number(result.lastInsertRowid);
    replaceMeetingRelations(database, meetingId, input);
  });

  return getMeeting(database, meetingId);
}

export function updateMeeting(database, meetingId, input) {
  const currentMeeting = getMeeting(database, meetingId);

  if (!currentMeeting) {
    return null;
  }

  const now = new Date().toISOString();
  withTransaction(database, () => {
    database
      .prepare(`
        UPDATE meetings
        SET title = ?, held_at = ?, participants = ?, content = ?,
            decisions = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(
        input.title,
        input.heldAt,
        input.participants,
        input.content,
        input.decisions,
        now,
        meetingId,
      );
    replaceMeetingRelations(database, meetingId, input);
  });

  return getMeeting(database, meetingId);
}

export function deleteMeeting(database, meetingId) {
  const result = database
    .prepare("DELETE FROM meetings WHERE id = ?")
    .run(meetingId);
  return result.changes > 0;
}

export function updateActionItem(database, meetingId, actionItemId, isCompleted) {
  const now = new Date().toISOString();
  let wasUpdated = false;

  withTransaction(database, () => {
    const result = database
      .prepare(`
        UPDATE action_items
        SET is_completed = ?
        WHERE id = ? AND meeting_id = ?
      `)
      .run(isCompleted ? 1 : 0, actionItemId, meetingId);

    if (result.changes === 0) {
      return;
    }

    wasUpdated = true;
    database
      .prepare("UPDATE meetings SET updated_at = ? WHERE id = ?")
      .run(now, meetingId);
  });

  return wasUpdated ? getMeeting(database, meetingId) : null;
}

function insertMeeting(database, meeting, { preserveIds = false } = {}) {
  if (preserveIds) {
    database
      .prepare(`
        INSERT INTO meetings (
          id, title, held_at, participants, content, decisions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        meeting.id,
        meeting.title,
        meeting.heldAt,
        meeting.participants,
        meeting.content,
        meeting.decisions,
        meeting.createdAt,
        meeting.updatedAt,
      );
  } else {
    database
      .prepare(`
        INSERT INTO meetings (
          title, held_at, participants, content, decisions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        meeting.title,
        meeting.heldAt,
        meeting.participants,
        meeting.content,
        meeting.decisions,
        meeting.createdAt,
        meeting.updatedAt,
      );
  }

  const meetingId = preserveIds ? meeting.id : Number(database.prepare("SELECT last_insert_rowid() AS id").get().id);
  replaceMeetingRelations(database, meetingId, meeting, { preserveIds });
}

function replaceMeetingRelations(
  database,
  meetingId,
  input,
  { preserveIds = false } = {},
) {
  database
    .prepare("DELETE FROM action_items WHERE meeting_id = ?")
    .run(meetingId);
  database
    .prepare("DELETE FROM meeting_tags WHERE meeting_id = ?")
    .run(meetingId);

  const insertAction = preserveIds
    ? database.prepare(`
        INSERT INTO action_items (
          id, meeting_id, content, assignee, due_date, is_completed, position
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
    : database.prepare(`
        INSERT INTO action_items (
          meeting_id, content, assignee, due_date, is_completed, position
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

  input.actionItems.forEach((item, index) => {
    const values = [
      meetingId,
      item.content,
      item.assignee,
      item.dueDate,
      item.isCompleted ? 1 : 0,
      index,
    ];

    if (preserveIds) {
      insertAction.run(item.id, ...values);
    } else {
      insertAction.run(...values);
    }
  });

  const insertTag = database.prepare(
    "INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING",
  );
  const findTag = database.prepare("SELECT id FROM tags WHERE name = ?");
  const linkTag = database.prepare(`
    INSERT INTO meeting_tags (meeting_id, tag_id, position)
    VALUES (?, ?, ?)
  `);

  input.tags.forEach((tag, index) => {
    insertTag.run(tag);
    const tagRow = findTag.get(tag);
    linkTag.run(meetingId, tagRow.id, index);
  });
}

function mapActionItem(item) {
  return { ...item, isCompleted: Boolean(item.isCompleted) };
}

function withTransaction(database, operation) {
  database.exec("BEGIN IMMEDIATE");

  try {
    const result = operation();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
