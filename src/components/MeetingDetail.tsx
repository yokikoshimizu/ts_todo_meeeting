import type { ActionItem, Meeting } from "../types";
import { formatDate, formatDateTime } from "../utils";

type Props = {
  meeting: Meeting;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleAction: (actionItemId: number) => void;
};

export function MeetingDetail({
  meeting,
  onBack,
  onDelete,
  onEdit,
  onToggleAction,
}: Props) {
  const completedTodos = meeting.actionItems.filter(
    (item) => item.isCompleted,
  ).length;
  const participantCount = meeting.participants
    .split(/[、,\n]/)
    .map((participant) => participant.trim())
    .filter(Boolean).length;

  return (
    <section
      className="workspace detail-workspace"
      aria-labelledby="meeting-detail-title"
    >
      <div className="detail-shell">
        <header className="detail-header">
          <button className="back-link-button" type="button" onClick={onBack}>
            <span aria-hidden="true">&larr;</span>
            会議メモ一覧
          </button>

          <div className="detail-title-row">
            <div className="detail-title-block">
              <p className="eyebrow">Meeting Detail</p>
              <h1 id="meeting-detail-title">{meeting.title}</h1>
              <div className="tag-row detail-tags" aria-label="タグ">
                {meeting.tags.length > 0 ? (
                  meeting.tags.map((tag) => <span key={tag}>{tag}</span>)
                ) : (
                  <span className="plain-tag">タグなし</span>
                )}
              </div>
            </div>

            <div className="detail-actions">
              <button className="primary-button" type="button" onClick={onEdit}>
                編集する
              </button>
              <button className="danger-button" type="button" onClick={onDelete}>
                削除
              </button>
            </div>
          </div>
        </header>

        <section className="detail-summary" aria-label="会議概要">
          <dl className="detail-summary-grid">
            <div>
              <dt>開催日時</dt>
              <dd>{formatDateTime(meeting.heldAt)}</dd>
            </div>
            <div>
              <dt>参加者</dt>
              <dd>{participantCount > 0 ? `${participantCount}名` : "未設定"}</dd>
              {meeting.participants && <small>{meeting.participants}</small>}
            </div>
            <div>
              <dt>TODO進捗</dt>
              <dd>
                {meeting.actionItems.length > 0
                  ? `${completedTodos} / ${meeting.actionItems.length} 完了`
                  : "登録なし"}
              </dd>
            </div>
            <div>
              <dt>最終更新</dt>
              <dd>{formatDateTime(meeting.updatedAt)}</dd>
            </div>
          </dl>
        </section>

        <div className="detail-layout">
          <div className="detail-content-grid">
            <section className="detail-section">
              <div className="detail-section-heading">
                <div>
                  <p className="section-kicker">Notes</p>
                  <h2>会議内容</h2>
                </div>
              </div>
              <p className={`pre-line ${meeting.content ? "" : "empty-copy"}`}>
                {meeting.content || "会議内容は未登録です。"}
              </p>
            </section>

            <section className="detail-section decision-section">
              <div className="detail-section-heading">
                <div>
                  <p className="section-kicker">Decisions</p>
                  <h2>決定事項</h2>
                </div>
              </div>
              <p className={`pre-line ${meeting.decisions ? "" : "empty-copy"}`}>
                {meeting.decisions || "決定事項は未登録です。"}
              </p>
            </section>
          </div>

          <section className="detail-section todo-detail-section">
            <div className="detail-section-heading">
              <div>
                <p className="section-kicker">Action Items</p>
                <h2>TODO</h2>
              </div>
              <span className="detail-progress">
                {meeting.actionItems.length > 0
                  ? `${completedTodos} / ${meeting.actionItems.length} 完了`
                  : "0件"}
              </span>
            </div>

            {meeting.actionItems.length === 0 ? (
              <p className="detail-empty-state">TODOは登録されていません。</p>
            ) : (
              <ul className="action-list detail-action-list">
                {meeting.actionItems.map((item) => (
                  <li key={item.id} className={item.isCompleted ? "done" : ""}>
                    <div className="action-item-primary">
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => onToggleAction(item.id)}
                        />
                        <span>{item.content}</span>
                      </label>
                      <span className={getTodoStatusClass(item)}>
                        {getTodoStatusLabel(item)}
                      </span>
                    </div>
                    <div className="action-meta">
                      <span>
                        <strong>担当</strong>
                        {item.assignee || "未設定"}
                      </span>
                      <span>
                        <strong>期限</strong>
                        {formatDate(item.dueDate)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function getTodoStatusLabel(item: ActionItem) {
  if (item.isCompleted) {
    return "完了";
  }

  if (!item.dueDate) {
    return "期限なし";
  }

  return isOverdue(item.dueDate) ? "期限超過" : "対応中";
}

function getTodoStatusClass(item: ActionItem) {
  if (item.isCompleted) {
    return "status-badge done-badge";
  }

  if (item.dueDate && isOverdue(item.dueDate)) {
    return "status-badge overdue-badge";
  }

  return item.dueDate
    ? "status-badge open-badge"
    : "status-badge neutral-badge";
}

function isOverdue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`).getTime() < today.getTime();
}
