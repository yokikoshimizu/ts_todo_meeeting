import { useState, type FormEvent } from "react";
import type { Meeting, MeetingFormValues } from "../types";
import { getLocalDateTimeInputValue, parseTags } from "../utils";

type Props = {
  mode: "create" | "edit";
  meeting?: Meeting;
  onCancel: () => void;
  onSubmit: (values: MeetingFormValues) => void;
};

type FormErrors = Partial<Record<keyof MeetingFormValues, string>> & {
  actionItems?: string;
};

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
      actionItems: [{ ...emptyActionItem }],
    };
  }

  return {
    title: meeting.title,
    heldAt: meeting.heldAt,
    participants: meeting.participants,
    content: meeting.content,
    decisions: meeting.decisions,
    tagsText: meeting.tags.join(", "),
    actionItems:
      meeting.actionItems.length > 0
        ? meeting.actionItems.map(({ content, assignee, dueDate, isCompleted }) => ({
            content,
            assignee,
            dueDate,
            isCompleted,
          }))
        : [{ ...emptyActionItem }],
  };
}

function validate(values: MeetingFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) {
    errors.title = "タイトルを入力してください。";
  }

  if (!values.heldAt) {
    errors.heldAt = "開催日時を入力してください。";
  }

  if (!values.content.trim()) {
    errors.content = "会議内容を入力してください。";
  }

  const incompleteAction = values.actionItems.some(
    (item) => !item.content.trim() && (item.assignee.trim() || item.dueDate),
  );

  if (incompleteAction) {
    errors.actionItems = "担当者や期限を入れた TODO は、対応内容も入力してください。";
  }

  return errors;
}

export function MeetingForm({ mode, meeting, onCancel, onSubmit }: Props) {
  const [values, setValues] = useMeetingFormState(meeting);
  const [errors, setErrors] = useState<FormErrors>({});

  function updateField<K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
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
      actionItems:
        current.actionItems.length === 1
          ? [{ ...emptyActionItem }]
          : current.actionItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

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
  }

  return (
    <section className="workspace" aria-labelledby="meeting-form-title">
      <div className="toolbar">
        <div>
          <p className="eyebrow">
            {mode === "create" ? "New Meeting" : "Edit Meeting"}
          </p>
          <h1 id="meeting-form-title">
            {mode === "create" ? "会議メモ登録" : "会議メモ編集"}
          </h1>
        </div>
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
      </div>

      <form className="memo-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <label className="field">
            <span>会議タイトル</span>
            <input
              type="text"
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <strong className="error-text" id="title-error">
                {errors.title}
              </strong>
            )}
          </label>

          <label className="field">
            <span>開催日時</span>
            <input
              type="datetime-local"
              value={values.heldAt}
              onChange={(event) => updateField("heldAt", event.target.value)}
              aria-invalid={Boolean(errors.heldAt)}
              aria-describedby={errors.heldAt ? "held-at-error" : undefined}
            />
            {errors.heldAt && (
              <strong className="error-text" id="held-at-error">
                {errors.heldAt}
              </strong>
            )}
          </label>
        </div>

        <label className="field">
          <span>参加者</span>
          <input
            type="text"
            value={values.participants}
            onChange={(event) => updateField("participants", event.target.value)}
          />
        </label>

        <label className="field">
          <span>会議内容</span>
          <textarea
            value={values.content}
            onChange={(event) => updateField("content", event.target.value)}
            rows={7}
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? "content-error" : undefined}
          />
          {errors.content && (
            <strong className="error-text" id="content-error">
              {errors.content}
            </strong>
          )}
        </label>

        <label className="field">
          <span>決定事項</span>
          <textarea
            value={values.decisions}
            onChange={(event) => updateField("decisions", event.target.value)}
            rows={4}
          />
        </label>

        <label className="field">
          <span>タグ</span>
          <input
            type="text"
            value={values.tagsText}
            onChange={(event) => updateField("tagsText", event.target.value)}
            placeholder="定例, プロジェクトA"
          />
        </label>

        <section className="todo-editor" aria-labelledby="todo-editor-title">
          <div className="section-heading">
            <h2 id="todo-editor-title">TODO</h2>
            <button type="button" onClick={addActionItem}>
              TODO 追加
            </button>
          </div>

          {errors.actionItems && (
            <strong className="error-text">{errors.actionItems}</strong>
          )}

          <div className="todo-rows">
            {values.actionItems.map((item, index) => (
              <div className="todo-row" key={index}>
                <label className="field">
                  <span>対応内容</span>
                  <input
                    type="text"
                    value={item.content}
                    onChange={(event) =>
                      updateActionItem(index, "content", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>担当者</span>
                  <input
                    type="text"
                    value={item.assignee}
                    onChange={(event) =>
                      updateActionItem(index, "assignee", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>期限</span>
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(event) =>
                      updateActionItem(index, "dueDate", event.target.value)
                    }
                  />
                </label>
                <label className="check-row todo-check">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={(event) =>
                      updateActionItem(index, "isCompleted", event.target.checked)
                    }
                  />
                  <span>完了</span>
                </label>
                <button type="button" onClick={() => removeActionItem(index)}>
                  削除
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button className="primary-button" type="submit">
            {mode === "create" ? "登録" : "更新"}
          </button>
        </div>
      </form>
    </section>
  );
}

function useMeetingFormState(meeting?: Meeting) {
  return useState<MeetingFormValues>(() => createInitialValues(meeting));
}
