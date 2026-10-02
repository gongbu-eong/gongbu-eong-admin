import { query } from "@/features/admin/server/db";

export type NotificationAgeFilter =
  | "all"
  | "10s"
  | "20s"
  | "30s"
  | "40s"
  | "50plus";

export type NotificationEligibilityFilter = "all" | "eligible" | "unavailable";

export type NotificationRecipient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  statusLabel: string;
  ageGroup: string;
  templateGroup: string;
  marketingAgreed: boolean;
  eligible: boolean;
  unavailableReason: string;
};

export type NotificationRecipientData = {
  recipients: NotificationRecipient[];
  page: number;
  totalPages: number;
  total: number;
  eligible: number;
  unavailable: number;
  keyword: string;
  age: NotificationAgeFilter;
  eligibility: NotificationEligibilityFilter;
};

type RecipientRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  signup_at: Date | string;
  age_group: string | null;
  template_group: string | null;
  marketing_agreed: boolean;
  eligible: boolean;
  total_filtered: string | number;
  eligible_filtered: string | number;
};

const PAGE_SIZE = 40;

export async function getNotificationRecipientData(args: {
  page?: number;
  keyword?: string;
  age?: string;
  eligibility?: string;
}): Promise<NotificationRecipientData> {
  const page = Math.max(1, Math.floor(Number(args.page || 1)));
  const keyword = String(args.keyword || "").trim();
  const age = normalizeAgeFilter(args.age);
  const eligibility = normalizeEligibilityFilter(args.eligibility);
  const offset = (page - 1) * PAGE_SIZE;
  const result = await query<RecipientRow>(
    `
      WITH recipient_base AS (
        SELECT
          users.id,
          COALESCE(users.nickname, users.display_name, users.community_nickname, '이름 없음') AS name,
          users.email::text AS email,
          users.phone,
          users.status::text AS status,
          COALESCE(users.signup_completed_at, users.created_at) AS signup_at,
          users.age_group,
          CASE
            WHEN users.age_group IN ('10-19', 'teens') THEN '10s'
            WHEN users.age_group IN ('20-29', 'early_20s', 'late_20s') THEN '20s'
            WHEN users.age_group IN ('30-39', 'early_30s', 'late_30s') THEN '30s'
            WHEN users.age_group = '40-49' THEN '40s'
            WHEN users.age_group IN ('50-59', '60-69', '70-79', '80-89', '90+') THEN '50plus'
            ELSE NULL
          END AS template_group,
          COALESCE(marketing_consent.agreed, preferences.marketing_enabled, false) AS marketing_agreed
        FROM public.users users
        LEFT JOIN public.notification_preferences preferences
          ON preferences.user_id = users.id
        LEFT JOIN LATERAL (
          SELECT consents.agreed
          FROM public.user_consents consents
          WHERE consents.user_id = users.id
            AND consents.terms_key = 'marketing_notifications'
          ORDER BY consents.updated_at DESC, consents.created_at DESC, consents.id DESC
          LIMIT 1
        ) marketing_consent ON TRUE
        WHERE NULLIF(BTRIM(users.phone), '') IS NOT NULL
      ), recipients AS (
        SELECT
          recipient_base.*,
          (
            NULLIF(BTRIM(recipient_base.phone), '') IS NOT NULL
            AND recipient_base.status = 'active'
            AND recipient_base.template_group IS NOT NULL
            AND recipient_base.marketing_agreed
          ) AS eligible
        FROM recipient_base
      ), filtered AS (
        SELECT *
        FROM recipients
        WHERE (
          $1::text = ''
          OR name ILIKE $1
          OR COALESCE(email, '') ILIKE $1
          OR COALESCE(phone, '') ILIKE $1
          OR (
            $4::text <> ''
            AND REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE $4
          )
        )
          AND ($2::text = 'all' OR template_group = $2)
          AND (
            $3::text = 'all'
            OR ($3::text = 'eligible' AND eligible)
            OR ($3::text = 'unavailable' AND NOT eligible)
          )
      )
      SELECT
        filtered.*,
        COUNT(*) OVER() AS total_filtered,
        COUNT(*) FILTER (WHERE eligible) OVER() AS eligible_filtered
      FROM filtered
      ORDER BY signup_at DESC, id DESC
      LIMIT $5 OFFSET $6
    `,
    [
      keyword ? `%${keyword}%` : "",
      age,
      eligibility,
      phoneSearchPattern(keyword),
      PAGE_SIZE,
      offset,
    ],
  );

  const total = Number(result.rows[0]?.total_filtered || 0);
  const eligible = Number(result.rows[0]?.eligible_filtered || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    recipients: result.rows.map(toRecipient),
    page: Math.min(page, totalPages),
    totalPages,
    total,
    eligible,
    unavailable: Math.max(0, total - eligible),
    keyword,
    age,
    eligibility,
  };
}

function toRecipient(row: RecipientRow): NotificationRecipient {
  const phone = row.phone?.trim() || "";
  const templateGroup = row.template_group || "";
  let unavailableReason = "";
  if (row.status !== "active") unavailableReason = `${formatStatus(row.status)} 회원`;
  else if (!phone) unavailableReason = "휴대폰번호 없음";
  else if (!templateGroup) unavailableReason = "지원 연령대 없음";
  else if (!row.marketing_agreed) unavailableReason = "광고성 정보 수신 미동의";

  return {
    id: row.id,
    name: row.name || "이름 없음",
    email: row.email || "없음",
    phone: phone || "없음",
    status: row.status,
    statusLabel: formatStatus(row.status),
    ageGroup: formatAgeGroup(row.age_group),
    templateGroup: formatTemplateGroup(templateGroup),
    marketingAgreed: Boolean(row.marketing_agreed),
    eligible: Boolean(row.eligible),
    unavailableReason,
  };
}

function phoneSearchPattern(keyword: string) {
  const digits = keyword.replace(/\D/g, "");
  return digits.length >= 3 ? `%${digits}%` : "";
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    active: "정상",
    pending_signup: "가입 대기",
    blocked: "이용 제한",
    withdrawn: "탈퇴",
    forced_withdrawn: "강제 탈퇴",
  };
  return labels[value] || value;
}

function normalizeAgeFilter(value?: string): NotificationAgeFilter {
  return ["10s", "20s", "30s", "40s", "50plus"].includes(value || "")
    ? (value as NotificationAgeFilter)
    : "all";
}

function normalizeEligibilityFilter(value?: string): NotificationEligibilityFilter {
  return value === "eligible" || value === "unavailable" ? value : "all";
}

function formatTemplateGroup(value: string) {
  return ({
    "10s": "10대 템플릿",
    "20s": "20대 템플릿",
    "30s": "30대 템플릿",
    "40s": "40대 템플릿",
    "50plus": "50대 이상 템플릿",
  } as Record<string, string>)[value] || "매칭 안 됨";
}

function formatAgeGroup(value: string | null) {
  if (!value) return "없음";
  const labels: Record<string, string> = {
    "0-9": "10세 미만",
    "10-19": "10대",
    teens: "10대",
    "20-29": "20대",
    early_20s: "20대",
    late_20s: "20대",
    "30-39": "30대",
    early_30s: "30대",
    late_30s: "30대",
    "40-49": "40대",
    over_40: "40대 이상(기존값)",
    "50-59": "50대",
    "60-69": "60대",
    "70-79": "70대",
    "80-89": "80대",
    "90+": "90대 이상",
  };
  return labels[value] || value;
}
