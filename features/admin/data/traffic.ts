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

export type TrafficBannerClick = {
  key: string;
  label: string;
  clicks: number;
  uniqueClicks: number;
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
  bannerClicks: TrafficBannerClick[];
  yLabels: string[];
  maxValue: number;
  totalVisitors: number;
};

export type TrafficPeriodPreset = "today" | "7d" | "30d" | "custom";

export type TrafficQuery = {
  preset?: TrafficPeriodPreset | string | null;
  period?: TrafficPeriodPreset | string | null;
  startDate?: string | null;
  endDate?: string | null;
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
  "직접유입": "#5a6580",
};

export const trafficChannelOrder = [
  "인스타그램",
  "블로그",
  "스레드",
  "검색",
  "직접유입",
];
