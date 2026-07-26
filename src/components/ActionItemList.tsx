import type { ActionItem, Meeting } from "../types";
import { formatDate, formatDateTime } from "../utils";

type ActionItemWithMeeting = ActionItem & {
  meetingTitle: string;
  heldAt: string;
};

type Props = {
  actionItems: ActionItemWithMeeting[];
  assignees: string[];
  query: string;
  statusFilter: string;
  assigneeFilter: string;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onAssigneeFilterChange: (value: string) => void;
  onBack: () => void;
  onOpenMeeting: (meetingId: number) => void;
  onToggleAction: (meetingId: number, actionItemId: number) => void;
};

export function getActionItemsFromMeetings(
  meetings: Meeting[],
): ActionItemWithMeeting[] {
  return meetings
    .flatMap((meeting) =>
      meeting.actionItems.map((item) => ({
        ...item,
        meetingTitle: meeting.title,
        heldAt: meeting.heldAt,
      })),
    )
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) {
        return new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime();
      }

      if (!a.dueDate) {
        return 1;
      }

      if (!b.dueDate) {
        return -1;
      }

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
}

export function ActionItemList({
  actionItems,
  assignees,
  query,
  statusFilter,
  assigneeFilter,
  onQueryChange,
  onStatusFilterChange,
  onAssigneeFilterChange,
  onBack,
  onOpenMeeting,
  onToggleAction,
}: Props) {
  return (
    <section className="workspace" aria-labelledby="action-list-title">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Action Items</p>
          <h1 id="action-list-title">TODO 一覧</h1>
        </div>
        <button className="back-link-button" type="button" onClick={onBack}>
          <span aria-hidden="true">&larr;</span>
          会議メモ一覧
        </button>
      </div>

      <div className="filters action-filters" aria-label="TODO の絞り込み">
        <label className="field compact-field">
          <span>検索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="TODO・担当者・会議名"
          />
        </label>
        <label className="field compact-field">
          <span>状態</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
          >
            <option value="open">未完了</option>
            <option value="all">すべて</option>
            <option value="done">完了済み</option>
          </select>
        </label>
        <label className="field compact-field">
          <span>担当者</span>
          <select
            value={assigneeFilter}
            onChange={(event) => onAssigneeFilterChange(event.target.value)}
          >
            <option value="">すべて</option>
            {assignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionItems.length === 0 ? (
        <div className="empty-state">
          <p>条件に一致する TODO はありません。</p>
        </div>
      ) : (
        <ul className="todo-board">
          {actionItems.map((item) => (
            <li
              className={`todo-card ${item.isCompleted ? "done" : ""}`}
              key={item.id}
            >
              <div className="todo-card-main">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => onToggleAction(item.meetingId, item.id)}
                  />
                  <span>{item.content}</span>
                </label>
                <p>{item.meetingTitle}</p>
              </div>
              <div className="todo-card-meta">
                <span>担当: {item.assignee || "未設定"}</span>
                <span>期限: {formatDate(item.dueDate)}</span>
                <span>会議日: {formatDateTime(item.heldAt)}</span>
              </div>
              <div className="todo-card-actions">
                <span className={getDueBadgeClass(item)}>{getDueLabel(item)}</span>
                <button type="button" onClick={() => onOpenMeeting(item.meetingId)}>
                  会議詳細
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function getDueLabel(item: ActionItemWithMeeting) {
  if (item.isCompleted) {
    return "完了";
  }

  if (!item.dueDate) {
    return "期限なし";
  }

  return isOverdue(item.dueDate) ? "期限超過" : "対応中";
}

function getDueBadgeClass(item: ActionItemWithMeeting) {
  if (item.isCompleted) {
    return "status-badge done-badge";
  }

  if (item.dueDate && isOverdue(item.dueDate)) {
    return "status-badge overdue-badge";
  }

  return "status-badge open-badge";
}

function isOverdue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`).getTime() < today.getTime();
}
