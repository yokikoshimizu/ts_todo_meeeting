import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Meeting, MeetingFormValues } from "../types";
import { getLocalDateTimeInputValue, parseTags } from "../utils";

type Props = {
  mode: "create" | "edit";
  meeting?: Meeting;
  onCancel: () => void;
  onDirtyChange: (isDirty: boolean) => void;
  onSubmit: (values: MeetingFormValues) => void;
};

type FormErrors = Partial<
  Record<"title" | "heldAt" | "actionItems", string>
>;

const emptyActionItem = {
  content: "",
  assignee: "",
  dueDate: "",
  isCompleted: false,
};

function createInitialValues(meeting?: Meeting): MeetingFormValues {
  if (!meeting) {
    return {
      title: "",
      heldAt: getLocalDateTimeInputValue(),
      participants: "",
      content: "",
      decisions: "",
      tagsText: "",
      actionItems: [],
    };
  }

  return {
    title: meeting.title,
    heldAt: meeting.heldAt,
    participants: meeting.participants,
    content: meeting.content,
    decisions: meeting.decisions,
    tagsText: meeting.tags.join(", "),
    actionItems: meeting.actionItems.map(
      ({ content, assignee, dueDate, isCompleted }) => ({
        content,
        assignee,
        dueDate,
        isCompleted,
      }),
    ),
  };
}

function validate(values: MeetingFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) {
    errors.title = "会議タイトルを入力してください。";
  }

  if (!values.heldAt) {
    errors.heldAt = "開催日時を入力してください。";
  }

  const incompleteAction = values.actionItems.some(
    (item) => !item.content.trim() && (item.assignee.trim() || item.dueDate),
  );

  if (incompleteAction) {
    errors.actionItems =
      "担当者や期限を入力したTODOには、対応内容も入力してください。";
  }

  return errors;
}

export function MeetingForm({
  mode,
  meeting,
  onCancel,
  onDirtyChange,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<MeetingFormValues>(() =>
    createInitialValues(meeting),
  );
  const initialValues = useRef(values);
  const formRef = useRef<HTMLFormElement>(null);
  const submitGuard = useRef(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues.current);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(
    () => () => {
      onDirtyChange(false);
    },
    [onDirtyChange],
  );

  function clearError(key: keyof FormErrors) {
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateField<K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));

    if (key === "title" || key === "heldAt") {
      clearError(key);
    }
  }

  function updateActionItem(
    index: number,
    key: keyof MeetingFormValues["actionItems"][number],
    value: string | boolean,
  ) {
    setValues((current) => ({
      ...current,
      actionItems: current.actionItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
    clearError("actionItems");
  }

  function addActionItem() {
    setValues((current) => ({
      ...current,
      actionItems: [...current.actionItems, { ...emptyActionItem }],
    }));
  }

  function removeActionItem(index: number) {
    setValues((current) => ({
      ...current,
      actionItems: current.actionItems.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
    clearError("actionItems");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitGuard.current) {
      return;
    }

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
      return;
    }

    submitGuard.current = true;
    setIsSubmitting(true);
    onDirtyChange(false);

    try {
      onSubmit({
        ...values,
        title: values.title.trim(),
        participants: values.participants.trim(),
        content: values.content.trim(),
        decisions: values.decisions.trim(),
        tagsText: parseTags(values.tagsText).join(", "),
        actionItems: values.actionItems
          .filter((item) => item.content.trim())
          .map((item) => ({
            content: item.content.trim(),
            assignee: item.assignee.trim(),
            dueDate: item.dueDate,
            isCompleted: item.isCompleted,
          })),
      });
    } catch (error) {
      submitGuard.current = false;
      setIsSubmitting(false);
      onDirtyChange(true);
      throw error;
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <section
      className="workspace form-workspace"
      aria-labelledby="meeting-form-title"
    >
      <div className="toolbar form-toolbar">
        <div>
          <p className="eyebrow">
            {mode === "create" ? "New Meeting" : "Edit Meeting"}
          </p>
          <h1 id="meeting-form-title">
            {mode === "create" ? "会議メモを新規登録" : "会議メモを編集"}
          </h1>
        </div>
        <button
          className="back-link-button"
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          <span aria-hidden="true">&larr;</span>
          {mode === "create" ? "一覧へ戻る" : "詳細へ戻る"}
        </button>
      </div>

      <form
        ref={formRef}
        className="memo-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {hasErrors && (
          <div className="form-error-summary" role="alert">
            入力内容を確認してください。エラーのある項目へ移動しました。
          </div>
        )}

        <section className="form-section" aria-labelledby="basic-section-title">
          <div className="form-section-heading">
            <div>
              <p className="section-kicker">基本情報</p>
              <h2 id="basic-section-title">会議を特定する情報</h2>
            </div>
            <p className="section-description">必須項目は2つです</p>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">
                会議タイトル
                <small className="field-badge required-badge">必須</small>
              </span>
              <input
                type="text"
                name="title"
                value={values.title}
                placeholder="例：新規サービス定例"
                onChange={(event) => updateField("title", event.target.value)}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={
                  errors.title ? "title-help title-error" : "title-help"
                }
              />
              <small className="helper-text" id="title-help">
                一覧で会議を見分けやすい名前を入力します
              </small>
              {errors.title && (
                <strong className="error-text" id="title-error">
                  {errors.title}
                </strong>
              )}
            </label>

            <label className="field">
              <span className="field-label">
                開催日時
                <small className="field-badge required-badge">必須</small>
              </span>
              <input
                type="datetime-local"
                name="heldAt"
                value={values.heldAt}
                onChange={(event) => updateField("heldAt", event.target.value)}
                aria-invalid={Boolean(errors.heldAt)}
                aria-describedby={
                  errors.heldAt ? "held-at-help held-at-error" : "held-at-help"
                }
              />
              <small className="helper-text" id="held-at-help">
                現在日時を入力済みです
              </small>
              {errors.heldAt && (
                <strong className="error-text" id="held-at-error">
                  {errors.heldAt}
                </strong>
              )}
            </label>
          </div>

          <label className="field">
            <span className="field-label">
              参加者
              <small className="field-badge optional-badge">任意</small>
            </span>
            <input
              type="text"
              name="participants"
              value={values.participants}
              placeholder="例：佐藤、鈴木、田中"
              onChange={(event) =>
                updateField("participants", event.target.value)
              }
              aria-describedby="participants-help"
            />
            <small className="helper-text" id="participants-help">
              複数名は「、」またはカンマで区切ります
            </small>
          </label>
        </section>

        <section
          className="form-section"
          aria-labelledby="meeting-content-section-title"
        >
          <div className="form-section-heading">
            <div>
              <p className="section-kicker">会議内容</p>
              <h2 id="meeting-content-section-title">内容と決定事項</h2>
            </div>
            <p className="section-description">どちらも任意です</p>
          </div>

          <label className="field">
            <span className="field-label">
              会議内容
              <small className="field-badge optional-badge">任意</small>
            </span>
            <textarea
              name="content"
              value={values.content}
              placeholder="議題、共有事項、検討した内容など"
              onChange={(event) => updateField("content", event.target.value)}
              rows={6}
            />
          </label>

          <label className="field">
            <span className="field-label">
              決定事項
              <small className="field-badge optional-badge">任意</small>
            </span>
            <textarea
              name="decisions"
              value={values.decisions}
              placeholder="例：ベータ版の対象ユーザーを20名に絞る"
              onChange={(event) => updateField("decisions", event.target.value)}
              rows={4}
            />
          </label>
        </section>

        <section
          className="form-section todo-editor"
          aria-labelledby="todo-editor-title"
          aria-describedby={errors.actionItems ? "todo-error" : undefined}
        >
          <div className="form-section-heading todo-editor-heading">
            <div>
              <p className="section-kicker">アクション</p>
              <h2 id="todo-editor-title">TODO</h2>
            </div>
            <button
              className="todo-add-button"
              type="button"
              onClick={addActionItem}
            >
              <span aria-hidden="true">＋</span>
              TODOを追加
            </button>
          </div>

          {errors.actionItems && (
            <strong className="error-text" id="todo-error" role="alert">
              {errors.actionItems}
            </strong>
          )}

          {values.actionItems.length === 0 ? (
            <p className="todo-empty-state">TODOはまだありません</p>
          ) : (
            <div className="todo-rows">
              {values.actionItems.map((item, index) => {
                const hasIncompleteAction = Boolean(
                  errors.actionItems &&
                    !item.content.trim() &&
                    (item.assignee.trim() || item.dueDate),
                );

                return (
                  <div className="todo-row" key={index}>
                    <div className="todo-row-heading">
                      <strong>TODO {index + 1}</strong>
                      <button
                        className="icon-button remove-todo-button"
                        type="button"
                        aria-label={`TODO ${index + 1}を削除`}
                        title="削除"
                        onClick={() => removeActionItem(index)}
                      >
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>

                    <div className="todo-row-fields">
                      <label className="field todo-content-field">
                        <span className="field-label">対応内容</span>
                        <input
                          type="text"
                          value={item.content}
                          placeholder="例：対象ユーザー候補を整理する"
                          onChange={(event) =>
                            updateActionItem(index, "content", event.target.value)
                          }
                          aria-invalid={hasIncompleteAction}
                          aria-describedby={
                            hasIncompleteAction ? "todo-error" : undefined
                          }
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">
                          担当者
                          <small className="field-badge optional-badge">
                            任意
                          </small>
                        </span>
                        <input
                          type="text"
                          value={item.assignee}
                          placeholder="例：佐藤"
                          onChange={(event) =>
                            updateActionItem(index, "assignee", event.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">
                          期限
                          <small className="field-badge optional-badge">
                            任意
                          </small>
                        </span>
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(event) =>
                            updateActionItem(index, "dueDate", event.target.value)
                          }
                        />
                      </label>
                    </div>

                    {mode === "edit" && (
                      <label className="check-row todo-check">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={(event) =>
                            updateActionItem(
                              index,
                              "isCompleted",
                              event.target.checked,
                            )
                          }
                        />
                        <span>完了済みにする</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="form-section" aria-labelledby="tag-section-title">
          <div className="form-section-heading">
            <div>
              <p className="section-kicker">整理</p>
              <h2 id="tag-section-title">タグ</h2>
            </div>
            <p className="section-description">任意</p>
          </div>

          <label className="field">
            <span className="field-label">タグ</span>
            <input
              type="text"
              name="tags"
              value={values.tagsText}
              placeholder="例：定例, 新規サービス"
              onChange={(event) => updateField("tagsText", event.target.value)}
              aria-describedby="tags-help"
            />
            <small className="helper-text" id="tags-help">
              複数のタグはカンマで区切ります
            </small>
          </label>
        </section>

        <div className="form-actions">
          <button type="button" disabled={isSubmitting} onClick={onCancel}>
            キャンセル
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting
              ? "保存中..."
              : mode === "create"
                ? "会議メモを保存"
                : "変更を保存"}
          </button>
        </div>
      </form>
    </section>
  );
}