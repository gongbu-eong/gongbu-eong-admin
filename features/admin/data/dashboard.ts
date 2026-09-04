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
  conversion?: string;
  drop?: string;
};

export type ChannelItem = {
  label: string;
  value: string;
  count: string;
  fill: number;
  icon: string;
  iconClass?: string;
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
  },
  {
    label: "회원 관리",
    key: "members",
    href: "/members",
    icon: "/admin-assets/nav-user.png",
  },
  {
    label: "커뮤니티 관리",
    key: "community",
    href: "#",
    icon: "/admin-assets/nav-community.png",
    expandable: true,
  },
  {
    label: "공지·알림",
    key: "notices",
    href: "#",
    icon: "/admin-assets/nav-notice.png",
    expandable: true,
  },
  {
    label: "설정",
    key: "settings",
    href: "#",
    icon: "/admin-assets/nav-setting.png",
  },
];
