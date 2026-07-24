import type { Meeting } from "../types";
import { formatDate, formatDateTime } from "../utils";

type Props = {
  meeting: Meeting;
  onBack: () => void;
  onEdit: () => void;
  onToggleAction: (actionItemId: number) => void;
};

export function MeetingDetail({
  meeting,
  onBack,
  onEdit,
  onToggleAction,
}: Props) {
  return (
    <section className="workspace" aria-labelledby="meeting-detail-title">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Meeting Detail</p>
          <h1 id="meeting-detail-title">{meeting.title}</h1>
        </div>
        <div className="button-row toolbar-actions">
          <button type="button" onClick={onBack}>
            一覧へ戻る
          </button>
          <button className="primary-button" type="button" onClick={onEdit}>
            編集
          </button>
        </div>
      </div>

      <div className="detail-layout">
        <section className="detail-section">
          <h2>基本情報</h2>
          <dl className="meta-list">
            <div>
              <dt>開催日時</dt>
              <dd>{formatDateTime(meeting.heldAt)}</dd>
            </div>
            <div>
              <dt>参加者</dt>
              <dd>{meeting.participants || "未設定"}</dd>
            </div>
            <div>
              <dt>タグ</dt>
              <dd>
                {meeting.tags.length > 0 ? meeting.tags.join(", ") : "未設定"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="detail-section">
          <h2>会議内容</h2>
          <p className="pre-line">{meeting.content}</p>
        </section>

        <section className="detail-section">
          <h2>決定事項</h2>
          <p className="pre-line">{meeting.decisions || "決定事項は未登録です。"}</p>
        </section>

        <section className="detail-section">
          <h2>TODO</h2>
          {meeting.actionItems.length === 0 ? (
            <p>TODO は未登録です。</p>
          ) : (
            <ul className="action-list">
              {meeting.actionItems.map((item) => (
                <li key={item.id} className={item.isCompleted ? "done" : ""}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => onToggleAction(item.id)}
                    />
                    <span>{item.content}</span>
                  </label>
                  <div className="action-meta">
                    <span>担当: {item.assignee || "未設定"}</span>
                    <span>期限: {formatDate(item.dueDate)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
