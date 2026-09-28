export type ManagementDateInput = {
  period?: string;
  dateField?: string;
  startDate?: string;
  endDate?: string;
};

export const MANAGEMENT_DATES = {
  members: { joined: "가입일", login: "마지막 로그인일" },
  jobs: { announced: "공고일", start: "접수 시작일", end: "접수 마감일", created: "등록일" },
  institutions: { updated: "최종 수정일" },
  categories: { updated: "최종 수정일" },
  sync: { started: "수집 시작일" },
  posts: { created: "작성일", updated: "최종 수정일" },
  comments: { created: "작성일" },
  reports: { created: "신고 접수일", reviewed: "처리 완료일" },
} as const;

export type ManagementScreen = keyof typeof MANAGEMENT_DATES;
export type ManagementDateRange = Required<ManagementDateInput>;

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01";
}

export function resolveManagementDate(screen: ManagementScreen, input: ManagementDateInput = {}, now = new Date()): ManagementDateRange {
  const fields = MANAGEMENT_DATES[screen];
  const dateField = input.dateField && Object.hasOwn(fields, input.dateField) ? input.dateField : Object.keys(fields)[0];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
  if (["today", "7d", "30d"].includes(input.period || "")) {
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - (input.period === "7d" ? 6 : input.period === "30d" ? 29 : 0));
    return { dateField, period: input.period!, startDate: start.toISOString().slice(0, 10), endDate: today };
  }
  if (input.period !== "all" && validDate(input.startDate) && validDate(input.endDate)) {
    const [startDate, endDate] = [input.startDate, input.endDate].sort();
    return { dateField, period: "custom", startDate, endDate };
  }
  return { dateField, period: "all", startDate: "", endDate: "" };
}
