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
    label: "유입 ·트래픽",
    key: "traffic",
    href: "/traffic",
    icon: "/admin-assets/nav-traffic.png",
    expandable: true,
    children: [
      {
        label: "유입 경로 분석",
        key: "traffic-source",
        href: "/traffic",
      },
      {
        label: "캠페인·링크별 성과",
        key: "traffic-campaigns",
        href: "/traffic/campaigns",
      },
    ],
  },
  {
    label: "회원 관리",
    key: "members",
    href: "/members",
    icon: "/admin-assets/nav-user.png",
  },
  {
    label: "진단권 결제",
    key: "credits",
    href: "#",
    icon: "/admin-assets/nav-credit.png",
    expandable: true,
  },
  {
    label: "공고 관리",
    key: "jobs",
    href: "#",
    icon: "/admin-assets/nav-job.png",
    expandable: true,
  },
  {
    label: "커뮤니티 관리",
    key: "community",
    href: "#",
    icon: "/admin-assets/nav-community.png",
    expandable: true,
  },
  {
    label: "콘텐츠 관리",
    key: "contents",
    href: "#",
    icon: "/admin-assets/nav-content.png",
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
