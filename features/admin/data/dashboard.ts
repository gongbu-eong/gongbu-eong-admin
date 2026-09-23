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
  valueSuffix?: string;
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
  visitorHref?: string;
  apply: string;
  applyHref?: string;
  applyRate: string;
  move: string;
  moveHref?: string;
  moveRate: string;
  exit: string;
  exitHref?: string;
  exitRate: string;
  pending: string;
  pendingHref?: string;
  pendingRate: string;
  revisit: string;
  revisitHref?: string;
  revisitRate: string;
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
    expandable: true,
    children: [
      { label: "방문·가입 흐름", key: "visit-signup", href: "/#visit-signup" },
      { label: "전환 분석", key: "conversion", href: "/#conversion" },
      { label: "유입 채널 순 방문자", key: "channel-visitors", href: "/#channel-visitors" },
      { label: "유입·행동 흐름", key: "traffic-flow", href: "/#traffic-flow" },
      { label: "배너·버튼 클릭 추이", key: "banner-clicks", href: "/#banner-clicks" },
      { label: "공고 상세 시작 후 행동", key: "job-entry-behavior", href: "/#job-entry-behavior" },
    ],
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
  {
    label: "공고 관리",
    key: "jobs",
    href: "/jobs",
    icon: "/admin-assets/nav-job.png",
    expandable: true,
    children: [
      { label: "공고 목록", key: "job-list", href: "/jobs" },
      { label: "기관 관리", key: "job-institutions", href: "/jobs/institutions" },
      { label: "직무 분류", key: "job-categories", href: "/jobs/categories" },
      { label: "수집 이력", key: "job-sync", href: "/jobs/sync" },
    ],
  },
  {
    label: "커뮤니티 관리",
    key: "community",
    href: "/community/posts",
    icon: "/admin-assets/nav-community.png",
    expandable: true,
    children: [
      { label: "게시글", key: "community-posts", href: "/community/posts" },
      { label: "댓글·답글", key: "community-comments", href: "/community/comments" },
      { label: "신고 처리", key: "community-reports", href: "/community/reports" },
    ],
  },
];
