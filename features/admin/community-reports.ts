export const REPORT_REASONS = [
  "스팸·홍보/도배", "욕설·비방·혐오 표현", "음란물·부적절한 콘텐츠",
  "개인정보 노출", "허위사실·사기", "게시판 성격에 맞지 않음", "기타",
] as const;

export const REPORT_STATUSES: Record<string, string> = {
  pending: "처리 대기", reviewing: "검토 중", resolved: "처리 완료", rejected: "위반 없음",
};

export const REPORT_DECISIONS = {
  review: { label: "검토 시작 · 공개 상태 유지", status: "reviewing", action: "none" },
  hide: { label: "위반 확인 · 숨김 후 종결", status: "resolved", action: "hide" },
  reject: { label: "위반 없음 · 공개 상태 유지 후 종결", status: "rejected", action: "none" },
  restore: { label: "위반 없음 · 원문 복구 후 종결", status: "rejected", action: "restore" },
  close: { label: "이미 숨김·삭제된 대상 · 종결", status: "resolved", action: "none" },
  reopen: { label: "재검토 요청 · 처리 대기로 변경", status: "pending", action: "none" },
} as const;

export type ReportDecision = keyof typeof REPORT_DECISIONS;

export function availableReportDecisions(status: string, targetStatus: string): ReportDecision[] {
  if (status === "resolved" || status === "rejected") return ["reopen"];
  return [
    ...(status === "pending" ? ["review" as const] : []),
    ...(targetStatus === "active" ? ["hide" as const] : []),
    "reject",
    ...(targetStatus === "deleted" ? ["restore" as const] : []),
    ...(targetStatus === "deleted" || targetStatus === "missing" ? ["close" as const] : []),
  ];
}

export type ReportHistoryEntry = {
  at: string;
  adminUserId: string;
  adminName: string;
  decision: ReportDecision;
  fromStatus: string;
  toStatus: string;
  fromTargetStatus: string;
  toTargetStatus: string;
  note: string;
  previousReviewNote?: string;
  previousReviewedAt?: string | null;
};
