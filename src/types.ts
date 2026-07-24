export type ActionItem = {
  id: number;
  meetingId: number;
  content: string;
  assignee: string;
  dueDate: string;
  isCompleted: boolean;
};

export type Meeting = {
  id: number;
  title: string;
  heldAt: string;
  participants: string;
  content: string;
  decisions: string;
  tags: string[];
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
};

export type MeetingFormValues = {
  title: string;
  heldAt: string;
  participants: string;
  content: string;
  decisions: string;
  tagsText: string;
  actionItems: Omit<ActionItem, "id" | "meetingId">[];
};
