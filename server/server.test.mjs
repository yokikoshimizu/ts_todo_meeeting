import assert from "node:assert/strict";
import test from "node:test";
import { createMeetingServer } from "./app.mjs";

test("meeting API supports CRUD and TODO status updates", async () => {
  const application = createMeetingServer({
    databasePath: ":memory:",
    publicDirectory: null,
    seed: false,
  });
  await new Promise((resolveListen) => {
    application.server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = application.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const input = {
    title: "API動作確認会議",
    heldAt: "2026-08-04T10:00",
    participants: "佐藤, 鈴木",
    content: "API経由で保存できることを確認する。",
    decisions: "SQLiteを利用する。",
    tags: ["API", "確認"],
    actionItems: [
      {
        content: "CRUDテストを実行する",
        assignee: "佐藤",
        dueDate: "2026-08-05",
        isCompleted: false,
      },
    ],
  };

  try {
    const emptyResponse = await fetch(`${baseUrl}/api/meetings`);
    assert.equal(emptyResponse.status, 200);
    assert.deepEqual(await emptyResponse.json(), []);

    const invalidResponse = await fetch(`${baseUrl}/api/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, title: "" }),
    });
    assert.equal(invalidResponse.status, 400);
    assert.equal((await invalidResponse.json()).errors.title, "会議タイトルを入力してください。");

    const createResponse = await fetch(`${baseUrl}/api/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    assert.equal(createResponse.status, 201);
    const createdMeeting = await createResponse.json();
    assert.equal(createdMeeting.title, input.title);
    assert.deepEqual(createdMeeting.tags, input.tags);
    assert.equal(createdMeeting.actionItems.length, 1);

    const detailResponse = await fetch(
      `${baseUrl}/api/meetings/${createdMeeting.id}`,
    );
    assert.equal(detailResponse.status, 200);
    assert.equal((await detailResponse.json()).participants, input.participants);

    const updateResponse = await fetch(
      `${baseUrl}/api/meetings/${createdMeeting.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          title: "更新後の会議",
          tags: ["更新"],
        }),
      },
    );
    assert.equal(updateResponse.status, 200);
    const updatedMeeting = await updateResponse.json();
    assert.equal(updatedMeeting.title, "更新後の会議");
    assert.deepEqual(updatedMeeting.tags, ["更新"]);

    const actionItemId = updatedMeeting.actionItems[0].id;
    const toggleResponse = await fetch(
      `${baseUrl}/api/meetings/${createdMeeting.id}/action-items/${actionItemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      },
    );
    assert.equal(toggleResponse.status, 200);
    assert.equal((await toggleResponse.json()).actionItems[0].isCompleted, true);

    const deleteResponse = await fetch(
      `${baseUrl}/api/meetings/${createdMeeting.id}`,
      { method: "DELETE" },
    );
    assert.equal(deleteResponse.status, 204);

    const missingResponse = await fetch(
      `${baseUrl}/api/meetings/${createdMeeting.id}`,
    );
    assert.equal(missingResponse.status, 404);
  } finally {
    await application.close();
  }
});
