import type { Meeting } from "../types";
import { formatDateTime } from "../utils";

type Props = {
  meetings: Meeting[];
  selectedTag: string;
  tags: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onCreate: () => void;
  onOpen: (meetingId: number) => void;
  onEdit: (meetingId: number) => void;
  onDelete: (meetingId: number) => void;
};

export function MeetingList({
  meetings,
  selectedTag,
  tags,
  query,
  onQueryChange,
  onTagChange,
  onCreate,
  onOpen,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section className="workspace" aria-labelledby="meeting-list-title">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Meeting Notes</p>
          <h1 id="meeting-list-title">会議メモ一覧</h1>
        </div>
        <button
          className="primary-button desktop-create-button"
          type="button"
          onClick={onCreate}
        >
          新規登録
        </button>
      </div>

      <div className="filters" aria-label="検索と絞り込み">
        <label className="field compact-field">
          <span>検索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="タイトル・参加者・本文"
          />
        </label>
        <label className="field compact-field">
          <span>タグ</span>
          <select
            value={selectedTag}
            onChange={(event) => onTagChange(event.target.value)}
          >
            <option value="">すべて</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="meeting-grid">
        {meetings.length === 0 ? (
          <div className="empty-state">
            <p>条件に一致する会議メモはありません。</p>
          </div>
        ) : (
          meetings.map((meeting) => {
            const todoCount = meeting.actionItems.length;
            const completedCount = meeting.actionItems.filter(
              (item) => item.isCompleted,
            ).length;

            return (
              <article className="meeting-card" key={meeting.id}>
                <div className="meeting-card-header">
                  <div>
                    <time dateTime={meeting.heldAt}>
                      {formatDateTime(meeting.heldAt)}
                    </time>
                    <h2>{meeting.title}</h2>
                  </div>
                  <span className="todo-count">
                    TODO {completedCount}/{todoCount}
                  </span>
                </div>

                <p className="participants">{meeting.participants || "参加者未設定"}</p>
                <p className="summary">{meeting.decisions || meeting.content}</p>

                <div className="tag-row" aria-label="タグ">
                  {meeting.tags.length === 0 ? (
                    <span className="plain-tag">タグなし</span>
                  ) : (
                    meeting.tags.map((tag) => <span key={tag}>{tag}</span>)
                  )}
                </div>

                <div className="button-row">
                  <button type="button" onClick={() => onOpen(meeting.id)}>
                    詳細
                  </button>
                  <button type="button" onClick={() => onEdit(meeting.id)}>
                    編集
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => onDelete(meeting.id)}
                  >
                    削除
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
