import { LinePoint, MetricItem } from "@/features/admin/data/dashboard";

export type TrafficChannel = {
  label: string;
  color: string;
  count: number;
  percent: number;
  deltaPercent: number;
};

export type TrafficTrendSeries = {
  label: string;
  color: string;
  data: LinePoint[];
};

export type TrafficDailyChannelRow = {
  date: string;
  counts: Record<string, number>;
  total: number;
};

export type TrafficScreenInflow = {
  key: string;
  label: string;
};

export type TrafficDailyScreenInflowRow = {
  date: string;
  counts: Record<string, number>;
  total: number;
};

export type TrafficBannerClick = {
  key: string;
  label: string;
  clicks: number;
  uniqueClicks: number;
};

export type TrafficDailyBannerClickRow = {
  date: string;
  counts: Record<string, number>;
  total: number;
};

export type TrafficData = {
  metrics: MetricItem[];
  periodLabel: string;
  periodValue: string;
  preset: TrafficPeriodPreset;
  startDate: string;
  endDate: string;
  channels: TrafficChannel[];
  trendSeries: TrafficTrendSeries[];
  dailyRows: TrafficDailyChannelRow[];
  screenInflows: TrafficScreenInflow[];
  dailyScreenRows: TrafficDailyScreenInflowRow[];
  bannerClicks: TrafficBannerClick[];
  dailyBannerClickRows: TrafficDailyBannerClickRow[];
  yLabels: string[];
  maxValue: number;
  totalVisitors: number;
};

export type TrafficPeriodPreset = "today" | "7d" | "30d" | "custom";
export type TrafficLogChannelFilter =
  | "all"
  | "instagram"
  | "blog"
  | "threads"
  | "search"
  | "page_move"
  | "direct";

export type TrafficQuery = {
  preset?: TrafficPeriodPreset | string | null;
  period?: TrafficPeriodPreset | string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type TrafficLogQuery = {
  startDate?: string | null;
  endDate?: string | null;
  channel?: TrafficLogChannelFilter | string | null;
  screen?: string | null;
  keyword?: string | null;
  page?: string | number | null;
  from?: string | null;
};

export type TrafficLogItem = {
  id: string;
  visitedAt: string;
  channel: string;
  userName: string;
  userEmail: string;
  provider: "kakao" | "naver" | "unknown";
  providerLabel: string;
  ipAddress: string;
  path: string;
  referrer: string;
  device: "모바일" | "웹";
};

export type TrafficLogData = {
  rows: TrafficLogItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  channel: TrafficLogChannelFilter;
  screen: string;
  keyword: string;
};

export type BannerClickLogQuery = {
  startDate?: string | null;
  endDate?: string | null;
  bannerKey?: string | null;
  keyword?: string | null;
  page?: string | number | null;
  from?: string | null;
};

export type BannerClickLogItem = {
  id: string;
  clickedAt: string;
  bannerKey: string;
  bannerName: string;
  placement: string;
  targetPath: string;
  sourcePath: string;
  userName: string;
  userEmail: string;
  provider: "kakao" | "naver" | "unknown";
  providerLabel: string;
  anonymousId: string;
  ipAddress: string;
  device: "모바일" | "웹" | "알 수 없음";
};

export type BannerClickLogData = {
  rows: BannerClickLogItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  bannerKey: string;
  keyword: string;
};

export type FunnelProductFilter =
  | "diagnosis"
  | "resume_coaching"
  | "interview_coaching";

export type FunnelStepFilter =
  | "visit"
  | "start"
  | "complete"
  | "visit_drop"
  | "start_drop";

export type FunnelLogQuery = {
  product?: FunnelProductFilter | string | null;
  step?: FunnelStepFilter | string | null;
  startDate?: string | null;
  endDate?: string | null;
  keyword?: string | null;
  page?: string | number | null;
};

export type FunnelLogItem = {
  id: string;
  eventAt: string;
  userName: string;
  userEmail: string;
  provider: "kakao" | "naver" | "unknown";
  providerLabel: string;
  anonymousId: string;
  ipAddress: string;
  device: "모바일" | "웹" | "알 수 없음";
  channel: string;
  path: string;
  referrer: string;
  lastAction: string;
};

export type FunnelLogData = {
  rows: FunnelLogItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  product: FunnelProductFilter;
  productLabel: string;
  step: FunnelStepFilter;
  stepLabel: string;
  startDate: string;
  endDate: string;
  keyword: string;
};

export type CampaignPerformanceRow = {
  id: string;
  campaign: string;
  link: string;
  source: string;
  medium: string;
  visitors: number;
  diagnosisStarts: number;
  diagnosisCompletes: number;
  signups: number;
  conversionRate: number;
  lastSeenAt: string;
};

export type CampaignPerformanceData = {
  metrics: MetricItem[];
  periodLabel: string;
  periodValue: string;
  preset: TrafficPeriodPreset;
  startDate: string;
  endDate: string;
  rows: CampaignPerformanceRow[];
  totalVisitors: number;
};

export const trafficChannelColors: Record<string, string> = {
  "인스타그램": "#2f7ff0",
  "블로그": "#1fb573",
  "스레드": "#a54de8",
  "검색": "#f5b91e",
  "페이지 이동": "#23a6d5",
  "직접유입": "#5a6580",
};

export const trafficChannelOrder = [
  "인스타그램",
  "블로그",
  "스레드",
  "검색",
  "페이지 이동",
  "직접유입",
];
