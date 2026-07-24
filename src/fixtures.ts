import type { Meeting } from "./types";

export const initialMeetings: Meeting[] = [
  {
    id: 1,
    title: "新規サービス定例",
    heldAt: "2026-07-24T10:00",
    participants: "佐藤, 鈴木, 田中",
    content:
      "ベータ版の公開範囲、問い合わせ対応、次回レビューで確認する指標について話し合った。",
    decisions:
      "来週のレビューまでにベータ版の対象ユーザーを20名に絞る。問い合わせ窓口はチーム共通メールで受ける。",
    tags: ["定例", "新規サービス"],
    createdAt: "2026-07-24T10:45:00.000Z",
    updatedAt: "2026-07-24T10:45:00.000Z",
    actionItems: [
      {
        id: 101,
        meetingId: 1,
        content: "ベータ版の対象ユーザー候補をまとめる",
        assignee: "佐藤",
        dueDate: "2026-07-29",
        isCompleted: false,
      },
      {
        id: 102,
        meetingId: 1,
        content: "問い合わせメールのテンプレートを作成する",
        assignee: "鈴木",
        dueDate: "2026-07-30",
        isCompleted: true,
      },
    ],
  },
  {
    id: 2,
    title: "制作進行ミーティング",
    heldAt: "2026-07-23T15:30",
    participants: "山本, 高橋",
    content:
      "今週の制作状況を確認し、デザイン確認の順番とレビュー観点を整理した。",
    decisions: "画面一覧を先に確定し、細かい文言は次回レビューで調整する。",
    tags: ["制作", "レビュー"],
    createdAt: "2026-07-23T07:10:00.000Z",
    updatedAt: "2026-07-23T07:10:00.000Z",
    actionItems: [
      {
        id: 201,
        meetingId: 2,
        content: "一覧画面の確認観点をメモに追記する",
        assignee: "高橋",
        dueDate: "",
        isCompleted: false,
      },
    ],
  },
];
