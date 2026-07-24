import type { Meeting } from "./types";

const STORAGE_KEY = "meeting-memo-organizer.meetings";

export function loadMeetings(fallback: Meeting[]): Meeting[] {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved) as Meeting[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveMeetings(meetings: Meeting[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
}
