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
    label: "유입 · 트래픽",
    key: "traffic",
    href: "/traffic",
    icon: "/admin-assets/nav-traffic.png",
    expandable: true,
    children: [
      { label: "요약", key: "traffic-source", href: "/traffic" },
      { label: "전환 퍼널", key: "traffic-funnel", href: "/traffic/funnel" },
      { label: "유입 로그", key: "traffic-logs", href: "/traffic/logs" },
      {
        label: "배너/CTA 클릭",
        key: "traffic-banner-clicks",
        href: "/traffic/banner-clicks",
      },
    ],
  },
  {
    label: "회원 관리",
    key: "members",
    href: "/members",
    icon: "/admin-assets/nav-user.png",
  },
];
