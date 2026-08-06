import type { Meeting, MeetingFormValues } from "./types";
import { parseTags } from "./utils";

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string>;
};

export class ApiRequestError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errors = errors;
  }
}

export function fetchMeetings(signal?: AbortSignal) {
  return request<Meeting[]>("/api/meetings", { signal });
}

export function createMeeting(values: MeetingFormValues) {
  return request<Meeting>("/api/meetings", {
    method: "POST",
    body: JSON.stringify(toMeetingPayload(values)),
  });
}

export function updateMeeting(meetingId: number, values: MeetingFormValues) {
  return request<Meeting>(`/api/meetings/${meetingId}`, {
    method: "PUT",
    body: JSON.stringify(toMeetingPayload(values)),
  });
}

export function deleteMeeting(meetingId: number) {
  return request<void>(`/api/meetings/${meetingId}`, {
    method: "DELETE",
  });
}

export function setActionItemCompleted(
  meetingId: number,
  actionItemId: number,
  isCompleted: boolean,
) {
  return request<Meeting>(
    `/api/meetings/${meetingId}/action-items/${actionItemId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isCompleted }),
    },
  );
}

function toMeetingPayload(values: MeetingFormValues) {
  return {
    title: values.title,
    heldAt: values.heldAt,
    participants: values.participants,
    content: values.content,
    decisions: values.decisions,
    tags: parseTags(values.tagsText),
    actionItems: values.actionItems,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiRequestError(
      0,
      "サーバーに接続できません。時間をおいてもう一度お試しください。",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody | T;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiRequestError(
      response.status,
      errorBody.message ?? "処理を完了できませんでした。",
      errorBody.errors,
    );
  }

  return body as T;
}
