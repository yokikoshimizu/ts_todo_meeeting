import { useEffect, useMemo, useState } from "react";
import { MeetingDetail } from "./components/MeetingDetail";
import { MeetingForm } from "./components/MeetingForm";
import { MeetingList } from "./components/MeetingList";
import { initialMeetings } from "./fixtures";
import { loadMeetings, saveMeetings } from "./storage";
import type { ActionItem, Meeting, MeetingFormValues } from "./types";
import { parseTags, sortMeetingsByDate } from "./utils";

type View =
  | { name: "list" }
  | { name: "create" }
  | { name: "detail"; meetingId: number }
  | { name: "edit"; meetingId: number };

function createMeeting(values: MeetingFormValues, meetings: Meeting[]): Meeting {
  const now = new Date().toISOString();
  const meetingId = getNextId(meetings.map((meeting) => meeting.id));

  return {
    id: meetingId,
    title: values.title,
    heldAt: values.heldAt,
    participants: values.participants,
    content: values.content,
    decisions: values.decisions,
    tags: parseTags(values.tagsText),
    createdAt: now,
    updatedAt: now,
    actionItems: values.actionItems.map((item, index) => ({
      id: meetingId * 1000 + index + 1,
      meetingId,
      ...item,
    })),
  };
}

function updateMeetingValues(
  meeting: Meeting,
  values: MeetingFormValues,
): Meeting {
  return {
    ...meeting,
    title: values.title,
    heldAt: values.heldAt,
    participants: values.participants,
    content: values.content,
    decisions: values.decisions,
    tags: parseTags(values.tagsText),
    updatedAt: new Date().toISOString(),
    actionItems: values.actionItems.map((item, index) => ({
      id: meeting.actionItems[index]?.id ?? meeting.id * 1000 + index + 1,
      meetingId: meeting.id,
      ...item,
    })),
  };
}

function getNextId(ids: number[]) {
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

function matchMeeting(meeting: Meeting, query: string, tag: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesTag = tag ? meeting.tags.includes(tag) : true;

  if (!matchesTag) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    meeting.title,
    meeting.participants,
    meeting.content,
    meeting.decisions,
    meeting.tags.join(" "),
    meeting.actionItems.map((item) => item.content).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

export default function App() {
  const [meetings, setMeetings] = useState<Meeting[]>(() =>
    loadMeetings(initialMeetings),
  );
  const [view, setView] = useState<View>({ name: "list" });
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  useEffect(() => {
    saveMeetings(meetings);
  }, [meetings]);

  const sortedMeetings = useMemo(() => sortMeetingsByDate(meetings), [meetings]);
  const filteredMeetings = useMemo(
    () =>
      sortedMeetings.filter((meeting) =>
        matchMeeting(meeting, query, selectedTag),
      ),
    [query, selectedTag, sortedMeetings],
  );
  const tags = useMemo(
    () => Array.from(new Set(meetings.flatMap((meeting) => meeting.tags))).sort(),
    [meetings],
  );
  const selectedMeeting =
    "meetingId" in view
      ? meetings.find((meeting) => meeting.id === view.meetingId)
      : undefined;
  const remainingTodos = meetings.reduce(
    (count, meeting) =>
      count +
      meeting.actionItems.filter((item: ActionItem) => !item.isCompleted).length,
    0,
  );

  function handleCreate(values: MeetingFormValues) {
    const meeting = createMeeting(values, meetings);
    setMeetings((current) => sortMeetingsByDate([meeting, ...current]));
    setView({ name: "detail", meetingId: meeting.id });
  }

  function handleUpdate(values: MeetingFormValues) {
    if (!selectedMeeting) {
      return;
    }

    const updatedMeeting = updateMeetingValues(selectedMeeting, values);
    setMeetings((current) =>
      sortMeetingsByDate(
        current.map((meeting) =>
          meeting.id === updatedMeeting.id ? updatedMeeting : meeting,
        ),
      ),
    );
    setView({ name: "detail", meetingId: updatedMeeting.id });
  }

  function handleDelete(meetingId: number) {
    const target = meetings.find((meeting) => meeting.id === meetingId);

    if (!target) {
      return;
    }

    if (window.confirm(`「${target.title}」を削除しますか？`)) {
      setMeetings((current) =>
        current.filter((meeting) => meeting.id !== meetingId),
      );
      setView({ name: "list" });
    }
  }

  function toggleActionItem(actionItemId: number) {
    if (!selectedMeeting) {
      return;
    }

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.id === selectedMeeting.id
          ? {
              ...meeting,
              updatedAt: new Date().toISOString(),
              actionItems: meeting.actionItems.map((item) =>
                item.id === actionItemId
                  ? { ...item, isCompleted: !item.isCompleted }
                  : item,
              ),
            }
          : meeting,
      ),
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="アプリ概要">
        <div className="brand-block">
          <span className="brand-mark">MM</span>
          <div>
            <p>会議メモ整理</p>
            <strong>Decision Log</strong>
          </div>
        </div>
        <dl className="stats">
          <div>
            <dt>登録メモ</dt>
            <dd>{meetings.length}</dd>
          </div>
          <div>
            <dt>未完了TODO</dt>
            <dd>{remainingTodos}</dd>
          </div>
          <div>
            <dt>タグ</dt>
            <dd>{tags.length}</dd>
          </div>
        </dl>
      </aside>

      {view.name === "list" && (
        <MeetingList
          meetings={filteredMeetings}
          selectedTag={selectedTag}
          tags={tags}
          query={query}
          onQueryChange={setQuery}
          onTagChange={setSelectedTag}
          onCreate={() => setView({ name: "create" })}
          onOpen={(meetingId) => setView({ name: "detail", meetingId })}
          onEdit={(meetingId) => setView({ name: "edit", meetingId })}
          onDelete={handleDelete}
        />
      )}

      {view.name === "create" && (
        <MeetingForm
          mode="create"
          onCancel={() => setView({ name: "list" })}
          onSubmit={handleCreate}
        />
      )}

      {view.name === "detail" && selectedMeeting && (
        <MeetingDetail
          meeting={selectedMeeting}
          onBack={() => setView({ name: "list" })}
          onEdit={() => setView({ name: "edit", meetingId: selectedMeeting.id })}
          onToggleAction={toggleActionItem}
        />
      )}

      {view.name === "edit" && selectedMeeting && (
        <MeetingForm
          mode="edit"
          meeting={selectedMeeting}
          onCancel={() => setView({ name: "detail", meetingId: selectedMeeting.id })}
          onSubmit={handleUpdate}
        />
      )}
    </main>
  );
}
