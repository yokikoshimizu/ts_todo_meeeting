import { useEffect, useMemo, useState } from "react";
import {
  ActionItemList,
  getActionItemsFromMeetings,
} from "./components/ActionItemList";
import { MeetingDetail } from "./components/MeetingDetail";
import { MeetingForm } from "./components/MeetingForm";
import { MeetingList } from "./components/MeetingList";
import { initialMeetings } from "./fixtures";
import { loadMeetings, saveMeetings } from "./storage";
import type { ActionItem, Meeting, MeetingFormValues } from "./types";
import { parseTags, sortMeetingsByDate } from "./utils";

type View =
  | { name: "list" }
  | { name: "actions" }
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [actionQuery, setActionQuery] = useState("");
  const [actionStatusFilter, setActionStatusFilter] = useState("open");
  const [actionAssigneeFilter, setActionAssigneeFilter] = useState("");
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    saveMeetings(meetings);
  }, [meetings]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!isFormDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

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
  const actionItems = useMemo(
    () => getActionItemsFromMeetings(meetings),
    [meetings],
  );
  const actionAssignees = useMemo(
    () =>
      Array.from(
        new Set(
          actionItems
            .map((item) => item.assignee.trim())
            .filter((assignee) => assignee.length > 0),
        ),
      ).sort(),
    [actionItems],
  );
  const filteredActionItems = useMemo(
    () =>
      actionItems.filter((item) =>
        matchActionItem(
          item,
          actionQuery,
          actionStatusFilter,
          actionAssigneeFilter,
        ),
      ),
    [actionAssigneeFilter, actionItems, actionQuery, actionStatusFilter],
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
  const isMeetingSection = view.name !== "actions";

  function handleCreate(values: MeetingFormValues) {
    const meeting = createMeeting(values, meetings);
    setIsFormDirty(false);
    setNotice("会議メモを保存しました。");
    setMeetings((current) => sortMeetingsByDate([meeting, ...current]));
    setView({ name: "detail", meetingId: meeting.id });
  }

  function handleUpdate(values: MeetingFormValues) {
    if (!selectedMeeting) {
      return;
    }

    const updatedMeeting = updateMeetingValues(selectedMeeting, values);
    setIsFormDirty(false);
    setNotice("会議メモを更新しました。");
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
      setNotice(`「${target.title}」を削除しました。`);
      setView({ name: "list" });
    }
  }

  function toggleActionItem(meetingId: number, actionItemId: number) {
    const targetItem = meetings
      .find((meeting) => meeting.id === meetingId)
      ?.actionItems.find((item) => item.id === actionItemId);

    if (targetItem) {
      setNotice(
        targetItem.isCompleted
          ? "TODOを未完了に戻しました。"
          : "TODOを完了にしました。",
      );
    }

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.id === meetingId
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

  function navigate(nextView: View) {
    const isSameView =
      view.name === nextView.name &&
      (!("meetingId" in view) ||
        !("meetingId" in nextView) ||
        view.meetingId === nextView.meetingId);

    if (isSameView) {
      setIsMobileMenuOpen(false);
      return;
    }

    if (
      isFormDirty &&
      (view.name === "create" || view.name === "edit") &&
      !window.confirm("入力中の内容を破棄して移動しますか？")
    ) {
      return;
    }

    setIsFormDirty(false);
    setView(nextView);
    setIsMobileMenuOpen(false);
  }

  return (
    <main className={`app-shell ${isMobileMenuOpen ? "mobile-menu-open" : ""}`}>
      <header className="mobile-topbar">
        <div className="mobile-brand">
          <span className="brand-mark">MM</span>
          <div>
            <p>会議メモ整理</p>
            <strong>Decision Log</strong>
          </div>
        </div>
        <button
          className="menu-toggle"
          type="button"
          aria-label={isMobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-controls="app-navigation"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <button
        className="menu-backdrop"
        type="button"
        aria-label="メニューを閉じる"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {notice && (
        <div className="save-notice" role="status">
          <span aria-hidden="true">&#10003;</span>
          <p>{notice}</p>
          <button
            className="icon-button"
            type="button"
            aria-label="通知を閉じる"
            onClick={() => setNotice("")}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      <aside className="sidebar" id="app-navigation" aria-label="アプリ概要">
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
        <div className="sidebar-actions">
          <button
            type="button"
            className="menu-create-button"
            onClick={() => navigate({ name: "create" })}
          >
            新規登録
          </button>
          <button
            type="button"
            className={isMeetingSection ? "active-nav" : ""}
            aria-current={isMeetingSection ? "page" : undefined}
            onClick={() => navigate({ name: "list" })}
          >
            会議メモ
          </button>
          <button
            type="button"
            className={view.name === "actions" ? "active-nav" : ""}
            aria-current={view.name === "actions" ? "page" : undefined}
            onClick={() => navigate({ name: "actions" })}
          >
            TODO 一覧
          </button>
        </div>
      </aside>

      {view.name === "list" && (
        <MeetingList
          meetings={filteredMeetings}
          selectedTag={selectedTag}
          tags={tags}
          query={query}
          onQueryChange={setQuery}
          onTagChange={setSelectedTag}
          onCreate={() => navigate({ name: "create" })}
          onOpen={(meetingId) => navigate({ name: "detail", meetingId })}
          onEdit={(meetingId) => navigate({ name: "edit", meetingId })}
          onDelete={handleDelete}
        />
      )}

      {view.name === "actions" && (
        <ActionItemList
          actionItems={filteredActionItems}
          assignees={actionAssignees}
          query={actionQuery}
          statusFilter={actionStatusFilter}
          assigneeFilter={actionAssigneeFilter}
          onQueryChange={setActionQuery}
          onStatusFilterChange={setActionStatusFilter}
          onAssigneeFilterChange={setActionAssigneeFilter}
          onBack={() => navigate({ name: "list" })}
          onOpenMeeting={(meetingId) => navigate({ name: "detail", meetingId })}
          onToggleAction={toggleActionItem}
        />
      )}

      {view.name === "create" && (
        <MeetingForm
          mode="create"
          onCancel={() => navigate({ name: "list" })}
          onDirtyChange={setIsFormDirty}
          onSubmit={handleCreate}
        />
      )}

      {view.name === "detail" && selectedMeeting && (
        <MeetingDetail
          meeting={selectedMeeting}
          onBack={() => navigate({ name: "list" })}
          onDelete={() => handleDelete(selectedMeeting.id)}
          onEdit={() => navigate({ name: "edit", meetingId: selectedMeeting.id })}
          onToggleAction={(actionItemId) =>
            toggleActionItem(selectedMeeting.id, actionItemId)
          }
        />
      )}

      {view.name === "edit" && selectedMeeting && (
        <MeetingForm
          mode="edit"
          meeting={selectedMeeting}
          onCancel={() =>
            navigate({ name: "detail", meetingId: selectedMeeting.id })
          }
          onDirtyChange={setIsFormDirty}
          onSubmit={handleUpdate}
        />
      )}
    </main>
  );
}

function matchActionItem(
  item: ActionItem & { meetingTitle: string },
  query: string,
  status: string,
  assignee: string,
) {
  if (status === "open" && item.isCompleted) {
    return false;
  }

  if (status === "done" && !item.isCompleted) {
    return false;
  }

  if (assignee && item.assignee !== assignee) {
    return false;
  }

  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [item.content, item.assignee, item.meetingTitle]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}
