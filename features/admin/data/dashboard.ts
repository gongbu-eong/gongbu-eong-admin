export type NavItem = {
  label: string;
  icon: string;
  key: string;
  href: string;
  expandable?: boolean;
  children?: Array<{
    label: string;
    key: string;
    href: string;
  }>;
};

export type MetricItem = {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  trend: "up" | "down";
};

export type LinePoint = {
  label: string;
  value: number;
};

export type DashboardTrendSeries = {
  label: string;
  color: string;
  data: LinePoint[];
};

export type FunnelItem = {
  step: number;
  label: string;
  value: string;
  fill: number;
  href?: string;
  conversion?: string;
  drop?: string;
  dropHref?: string;
};

export type ChannelItem = {
  key: string;
  label: string;
  value: string;
  count: string;
  fill: number;
  icon?: string;
  emoji?: string;
  iconClass?: string;
  href: string;
};

export type BannerClickItem = {
  key: string;
  label: string;
  count: string;
  uniqueCount: string;
  fill: number;
  href?: string;
};

export type ScreenInflowItem = {
  key: string;
  label: string;
  count: string;
  fill: number;
  href?: string;
};

export type BehaviorPatternItem = {
  key: string;
  channelLabel: string;
  visitors: string;
  bounce: string;
  bounceRate: string;
  revisit: string;
  revisitRate: string;
  bookmark: string;
  bookmarkRate: string;
  apply: string;
  applyRate: string;
  pageMove: string;
  pageMoveRate: string;
  unknown: string;
  unknownRate: string;
  fill: number;
};

export type DashboardProductOption = {
  key: string;
  label: string;
};

export type WorkItem = {
  title: string;
  subtitle: string;
  value: string;
  valueTone?: "danger" | "default";
  icon: string;
};

export const navItems: NavItem[] = [
  {
    label: "대시보드",
    key: "dashboard",
    href: "/",
    icon: "/admin-assets/nav-dashboard.png",
  },
  {
    label: "방문·이벤트 로그",
    key: "activity-logs",
    href: "/activity-logs",
    icon: "/admin-assets/nav-traffic.png",
  },
  {
    label: "회원 관리",
    key: "members",
    href: "/members",
    icon: "/admin-assets/nav-user.png",
  },
];
