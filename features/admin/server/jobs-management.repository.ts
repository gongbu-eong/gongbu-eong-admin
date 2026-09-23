import { db, query } from "@/features/admin/server/db";
import type { PoolClient } from "pg";

export type JobManagementFilters = {
  page?: number;
  keyword?: string;
  source?: "all" | "alio" | "manual";
  status?: "all" | "open" | "closing" | "closed" | "hidden";
};

export type ManagedJob = {
  id: string;
  title: string;
  institutionName: string;
  source: "alio" | "manual";
  region: string;
  employmentType: string;
  applicationStartAt: string | null;
  applicationEndAt: string | null;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  bookmarkCount: number;
  recruitmentStatus: "접수 전" | "접수 중" | "마감" | "일정 미정";
  updatedAt: string;
};

type JobListRow = {
  id: string;
  title: string;
  institution_name: string | null;
  source: "alio" | "manual";
  work_region: string | null;
  employment_type: string | null;
  application_start_at: Date | string | null;
  application_end_at: Date | string | null;
  is_active: boolean;
  is_featured: boolean;
  view_count: number | string;
  bookmark_count: number | string;
  updated_at: Date | string;
};

type JobDetailRow = JobListRow & {
  institution_id: string | null;
  ncs_category: string | null;
  job_category: string | null;
  hiring_count: number | null;
  education_requirement: string | null;
  career_requirement: string | null;
  announcement_at: Date | string | null;
  apply_url: string | null;
  email_apply_address: string | null;
  basic_info: string | null;
  qualification: string | null;
  disqualification: string | null;
  preference: string | null;
  screening_process: string | null;
  application_method: string | null;
  required_documents: string | null;
  additional_notice: string | null;
};

export type ManagedJobDetail = ManagedJob & {
  institutionId: string | null;
  ncsCategory: string;
  jobCategory: string;
  hiringCount: number | null;
  educationRequirement: string;
  careerRequirement: string;
  announcementAt: string | null;
  applyUrl: string;
  emailApplyAddress: string;
  basicInfo: string;
  qualification: string;
  disqualification: string;
  preference: string;
  screeningProcess: string;
  applicationMethod: string;
  requiredDocuments: string;
  additionalNotice: string;
  categoryIds: string[];
  files: Array<{ id: string; name: string; type: string; url: string; sortOrder: number }>;
  stages: Array<{
    id: string;
    name: string;
    order: number;
    startAt: string | null;
    endAt: string | null;
  }>;
};

const PAGE_SIZE = 20;

export async function getManagedJobs(filters: JobManagementFilters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const keyword = String(filters.keyword || "").trim().slice(0, 100);
  const source = filters.source || "all";
  const status = filters.status || "all";
  const values: unknown[] = [];
  const where: string[] = [];

  if (keyword) {
    values.push(`%${keyword}%`);
    where.push(`(
      postings.title ILIKE $${values.length}
      OR institutions.name ILIKE $${values.length}
      OR postings.ncs_category ILIKE $${values.length}
    )`);
  }
  if (source !== "all") {
    values.push(source);
    where.push(`postings.source::text = $${values.length}`);
  }
  if (status === "hidden") where.push("postings.is_active = false");
  if (status === "open") {
    where.push("postings.is_active = true");
    where.push("(postings.application_start_at IS NULL OR postings.application_start_at <= NOW())");
    where.push("(postings.application_end_at IS NULL OR postings.application_end_at >= NOW())");
  }
  if (status === "closing") {
    where.push("postings.is_active = true");
    where.push("postings.application_end_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'");
  }
  if (status === "closed") {
    where.push("postings.application_end_at < NOW()");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countValues = [...values];
  values.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const [rowsResult, countResult, metricResult] = await Promise.all([
    query<JobListRow>(
      `
        SELECT
          postings.id,
          postings.title,
          institutions.name AS institution_name,
          postings.source,
          postings.work_region,
          postings.employment_type,
          postings.application_start_at,
          postings.application_end_at,
          postings.is_active,
          COALESCE(postings.is_featured, false) AS is_featured,
          COALESCE(postings.view_count, 0) AS view_count,
          COALESCE(bookmarks.bookmark_count, 0) AS bookmark_count,
          postings.updated_at
        FROM public.job_postings postings
        LEFT JOIN public.public_institutions institutions ON institutions.id = postings.institution_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::integer AS bookmark_count
          FROM public.user_job_bookmarks bookmarks
          WHERE bookmarks.job_posting_id = postings.id
        ) bookmarks ON true
        ${whereSql}
        ORDER BY
          postings.is_active DESC,
          COALESCE(postings.is_featured, false) DESC,
          postings.application_end_at ASC NULLS LAST,
          postings.updated_at DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    ),
    query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM public.job_postings postings
        LEFT JOIN public.public_institutions institutions ON institutions.id = postings.institution_id
        ${whereSql}
      `,
      countValues,
    ),
    query<{
      total: string;
      open_count: string;
      closing_count: string;
      hidden_count: string;
    }>(`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (
          WHERE is_active = true
            AND (application_start_at IS NULL OR application_start_at <= NOW())
            AND (application_end_at IS NULL OR application_end_at >= NOW())
        )::text AS open_count,
        COUNT(*) FILTER (
          WHERE is_active = true
            AND application_end_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
        )::text AS closing_count,
        COUNT(*) FILTER (WHERE is_active = false)::text AS hidden_count
      FROM public.job_postings
    `),
  ]);

  const total = Number(countResult.rows[0]?.total || 0);
  const metrics = metricResult.rows[0];

  return {
    jobs: rowsResult.rows.map(mapJob),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    filters: { keyword, source, status },
    metrics: [
      { label: "전체 공고", value: Number(metrics?.total || 0), note: "수집·수동 공고" },
      { label: "접수 중", value: Number(metrics?.open_count || 0), note: "현재 지원 가능" },
      { label: "3일 내 마감", value: Number(metrics?.closing_count || 0), note: "우선 확인 필요" },
      { label: "비공개", value: Number(metrics?.hidden_count || 0), note: "사용자 목록 제외" },
    ],
  };
}

export async function getManagedJob(jobId: string): Promise<ManagedJobDetail | null> {
  const [jobResult, categoryResult, filesResult, stagesResult] = await Promise.all([
    query<JobDetailRow>(
      `
        SELECT
          postings.*,
          institutions.name AS institution_name,
          COALESCE(bookmarks.bookmark_count, 0) AS bookmark_count,
          details.basic_info,
          details.qualification,
          details.disqualification,
          details.preference,
          details.screening_process,
          details.application_method,
          details.required_documents,
          details.additional_notice
        FROM public.job_postings postings
        LEFT JOIN public.public_institutions institutions ON institutions.id = postings.institution_id
        LEFT JOIN public.job_posting_details details ON details.job_posting_id = postings.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::integer AS bookmark_count
          FROM public.user_job_bookmarks bookmarks
          WHERE bookmarks.job_posting_id = postings.id
        ) bookmarks ON true
        WHERE postings.id = $1
        LIMIT 1
      `,
      [jobId],
    ),
    query<{ id: string }>(
      `SELECT job_category_id AS id FROM public.job_posting_categories WHERE job_posting_id = $1`,
      [jobId],
    ),
    query<{ id: string; file_name: string; file_type: string | null; file_url: string; sort_order: number }>(
      `
        SELECT id, file_name, file_type, file_url, sort_order
        FROM public.job_posting_files
        WHERE job_posting_id = $1
        ORDER BY sort_order, created_at
      `,
      [jobId],
    ),
    query<{ id: string; stage_name: string; stage_order: number; start_at: Date | string | null; end_at: Date | string | null }>(
      `
        SELECT id, stage_name, stage_order, start_at, end_at
        FROM public.job_posting_stages
        WHERE job_posting_id = $1
        ORDER BY stage_order
      `,
      [jobId],
    ),
  ]);

  const row = jobResult.rows[0];
  if (!row) return null;

  return {
    ...mapJob(row),
    institutionId: row.institution_id,
    ncsCategory: row.ncs_category || "",
    jobCategory: row.job_category || "",
    hiringCount: row.hiring_count,
    educationRequirement: row.education_requirement || "",
    careerRequirement: row.career_requirement || "",
    announcementAt: toIso(row.announcement_at),
    applyUrl: row.apply_url || "",
    emailApplyAddress: row.email_apply_address || "",
    basicInfo: row.basic_info || "",
    qualification: row.qualification || "",
    disqualification: row.disqualification || "",
    preference: row.preference || "",
    screeningProcess: row.screening_process || "",
    applicationMethod: row.application_method || "",
    requiredDocuments: row.required_documents || "",
    additionalNotice: row.additional_notice || "",
    categoryIds: categoryResult.rows.map((item) => item.id),
    files: filesResult.rows.map((file) => ({
      id: file.id,
      name: file.file_name,
      type: file.file_type || "",
      url: file.file_url,
      sortOrder: file.sort_order,
    })),
    stages: stagesResult.rows.map((stage) => ({
      id: stage.id,
      name: stage.stage_name,
      order: stage.stage_order,
      startAt: toIso(stage.start_at),
      endAt: toIso(stage.end_at),
    })),
  };
}

export async function listInstitutions() {
  const result = await query<{
    id: string;
    name: string;
    alio_institution_id: string | null;
    institution_type: string | null;
    region: string | null;
    homepage_url: string | null;
    job_count: string;
    active_job_count: string;
    updated_at: Date | string;
  }>(`
    SELECT
      institutions.*,
      COUNT(postings.id)::text AS job_count,
      COUNT(postings.id) FILTER (WHERE postings.is_active = true)::text AS active_job_count
    FROM public.public_institutions institutions
    LEFT JOIN public.job_postings postings ON postings.institution_id = institutions.id
    GROUP BY institutions.id
    ORDER BY institutions.name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    sourceId: row.alio_institution_id,
    type: row.institution_type || "",
    region: row.region || "",
    homepageUrl: row.homepage_url || "",
    jobCount: Number(row.job_count || 0),
    activeJobCount: Number(row.active_job_count || 0),
    updatedAt: toIso(row.updated_at)!,
  }));
}

export async function listJobCategories() {
  const result = await query<{
    id: string;
    source_code: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    job_count: string;
    mapping_count: string;
  }>(`
    SELECT
      categories.*,
      COUNT(DISTINCT posting_categories.job_posting_id)::text AS job_count,
      COUNT(DISTINCT mappings.personality_type_id)::text AS mapping_count
    FROM public.job_categories categories
    LEFT JOIN public.job_posting_categories posting_categories
      ON posting_categories.job_category_id = categories.id
    LEFT JOIN public.personality_job_category_mappings mappings
      ON mappings.job_category_id = categories.id
    GROUP BY categories.id
    ORDER BY categories.sort_order, categories.name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    sourceCode: row.source_code,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    jobCount: Number(row.job_count || 0),
    mappingCount: Number(row.mapping_count || 0),
  }));
}

export async function listJobSyncRuns() {
  const result = await query<{
    id: string;
    source: string;
    status: string;
    started_at: Date | string;
    completed_at: Date | string | null;
    heartbeat_at: Date | string;
    fetched_count: number;
    inserted_count: number;
    updated_count: number;
    deactivated_count: number;
    error_message: string | null;
  }>(`
    SELECT *
    FROM public.job_posting_sync_runs
    ORDER BY started_at DESC
    LIMIT 100
  `);

  return result.rows.map((row) => ({
    id: row.id,
    source: row.source,
    status: row.status,
    startedAt: toIso(row.started_at)!,
    completedAt: toIso(row.completed_at),
    heartbeatAt: toIso(row.heartbeat_at)!,
    fetchedCount: Number(row.fetched_count || 0),
    insertedCount: Number(row.inserted_count || 0),
    updatedCount: Number(row.updated_count || 0),
    deactivatedCount: Number(row.deactivated_count || 0),
    errorMessage: row.error_message,
  }));
}

export async function createManualJob(input: Record<string, unknown>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO public.job_postings (
          source, institution_id, title, ncs_category, job_category, work_region,
          employment_type, hiring_count, education_requirement, career_requirement,
          application_start_at, application_end_at, announcement_at, apply_url,
          email_apply_address, is_active, is_featured, raw_payload
        )
        VALUES (
          'manual'::public.job_source, $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, '{}'::jsonb
        )
        RETURNING id
      `,
      [
        nullableString(input.institutionId),
        requiredString(input.title, "공고 제목"),
        nullableString(input.ncsCategory),
        nullableString(input.jobCategory),
        nullableString(input.workRegion),
        nullableString(input.employmentType),
        nullableInteger(input.hiringCount),
        nullableString(input.educationRequirement),
        nullableString(input.careerRequirement),
        nullableDate(input.applicationStartAt),
        nullableDate(input.applicationEndAt),
        nullableDate(input.announcementAt),
        safeUrl(input.applyUrl),
        nullableString(input.emailApplyAddress),
        Boolean(input.isActive),
        Boolean(input.isFeatured),
      ],
    );
    const jobId = result.rows[0].id;
    await upsertJobDetails(client, jobId, input);
    await replaceJobCategories(client, jobId, input.categoryIds);
    await client.query("COMMIT");
    return jobId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateManagedJob(jobId: string, input: Record<string, unknown>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ source: "alio" | "manual" }>(
      `SELECT source FROM public.job_postings WHERE id = $1 FOR UPDATE`,
      [jobId],
    );
    const job = current.rows[0];
    if (!job) {
      await client.query("ROLLBACK");
      return null;
    }

    if (job.source === "manual") {
      await client.query(
        `
          UPDATE public.job_postings
          SET
            institution_id = $2,
            title = $3,
            ncs_category = $4,
            job_category = $5,
            work_region = $6,
            employment_type = $7,
            hiring_count = $8,
            education_requirement = $9,
            career_requirement = $10,
            application_start_at = $11,
            application_end_at = $12,
            announcement_at = $13,
            apply_url = $14,
            email_apply_address = $15,
            is_active = $16,
            is_featured = $17,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          jobId,
          nullableString(input.institutionId),
          requiredString(input.title, "공고 제목"),
          nullableString(input.ncsCategory),
          nullableString(input.jobCategory),
          nullableString(input.workRegion),
          nullableString(input.employmentType),
          nullableInteger(input.hiringCount),
          nullableString(input.educationRequirement),
          nullableString(input.careerRequirement),
          nullableDate(input.applicationStartAt),
          nullableDate(input.applicationEndAt),
          nullableDate(input.announcementAt),
          safeUrl(input.applyUrl),
          nullableString(input.emailApplyAddress),
          Boolean(input.isActive),
          Boolean(input.isFeatured),
        ],
      );
      await upsertJobDetails(client, jobId, input);
      await replaceJobCategories(client, jobId, input.categoryIds);
    } else {
      await client.query(
        `
          UPDATE public.job_postings
          SET is_active = $2, is_featured = $3, updated_at = NOW()
          WHERE id = $1
        `,
        [jobId, Boolean(input.isActive), Boolean(input.isFeatured)],
      );
      await replaceJobCategories(client, jobId, input.categoryIds);
    }
    await client.query("COMMIT");
    return job.source;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveManagedJob(jobId: string) {
  const result = await query(
    `UPDATE public.job_postings SET is_active = false, is_featured = false, updated_at = NOW() WHERE id = $1`,
    [jobId],
  );
  return Boolean(result.rowCount);
}

export async function saveInstitution(input: Record<string, unknown>, institutionId?: string) {
  const name = requiredString(input.name, "기관명");
  const homepageUrl = safeUrl(input.homepageUrl);
  if (institutionId) {
    const result = await query<{ id: string }>(
      `
        UPDATE public.public_institutions
        SET name = $2, institution_type = $3, region = $4, homepage_url = $5, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [institutionId, name, nullableString(input.type), nullableString(input.region), homepageUrl],
    );
    return result.rows[0]?.id || null;
  }
  const result = await query<{ id: string }>(
    `
      INSERT INTO public.public_institutions (name, institution_type, region, homepage_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [name, nullableString(input.type), nullableString(input.region), homepageUrl],
  );
  return result.rows[0].id;
}

export async function deleteInstitution(institutionId: string) {
  const result = await query(
    `
      DELETE FROM public.public_institutions institutions
      WHERE institutions.id = $1
        AND NOT EXISTS (
          SELECT 1 FROM public.job_postings postings WHERE postings.institution_id = institutions.id
        )
    `,
    [institutionId],
  );
  return Boolean(result.rowCount);
}

export async function saveJobCategory(input: Record<string, unknown>, categoryId?: string) {
  const name = requiredString(input.name, "직무명");
  const code = requiredString(input.sourceCode, "직무 코드");
  const sortOrder = nullableInteger(input.sortOrder) || 0;
  if (categoryId) {
    const result = await query<{ id: string }>(
      `
        UPDATE public.job_categories
        SET source_code = $2, name = $3, sort_order = $4, is_active = $5, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [categoryId, code, name, sortOrder, Boolean(input.isActive)],
    );
    return result.rows[0]?.id || null;
  }
  const result = await query<{ id: string }>(
    `
      INSERT INTO public.job_categories (source_code, name, sort_order, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [code, name, sortOrder, Boolean(input.isActive)],
  );
  return result.rows[0].id;
}

export async function deleteJobCategory(categoryId: string) {
  const result = await query(
    `
      DELETE FROM public.job_categories categories
      WHERE categories.id = $1
        AND NOT EXISTS (
          SELECT 1 FROM public.job_posting_categories links WHERE links.job_category_id = categories.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.personality_job_category_mappings mappings WHERE mappings.job_category_id = categories.id
        )
    `,
    [categoryId],
  );
  return Boolean(result.rowCount);
}

function mapJob(row: JobListRow): ManagedJob {
  return {
    id: row.id,
    title: row.title,
    institutionName: row.institution_name || "기관 미지정",
    source: row.source,
    region: row.work_region || "-",
    employmentType: row.employment_type || "-",
    applicationStartAt: toIso(row.application_start_at),
    applicationEndAt: toIso(row.application_end_at),
    isActive: row.is_active,
    isFeatured: Boolean(row.is_featured),
    viewCount: Number(row.view_count || 0),
    bookmarkCount: Number(row.bookmark_count || 0),
    recruitmentStatus: getRecruitmentStatus(row),
    updatedAt: toIso(row.updated_at)!,
  };
}

function getRecruitmentStatus(row: Pick<JobListRow, "application_start_at" | "application_end_at">) {
  const now = Date.now();
  const start = row.application_start_at ? new Date(row.application_start_at).getTime() : null;
  const end = row.application_end_at ? new Date(row.application_end_at).getTime() : null;
  if (start && start > now) return "접수 전" as const;
  if (end && end < now) return "마감" as const;
  if (!start && !end) return "일정 미정" as const;
  return "접수 중" as const;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function requiredString(value: unknown, label: string) {
  const normalized = nullableString(value);
  if (!normalized) throw new Error(`${label}을(를) 입력해 주세요.`);
  return normalized;
}

function nullableInteger(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error("숫자 형식이 올바르지 않습니다.");
  return number;
}

function nullableDate(value: unknown) {
  const normalized = nullableString(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error("날짜 형식이 올바르지 않습니다.");
  return date.toISOString();
}

function safeUrl(value: unknown) {
  const normalized = nullableString(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("주소는 http 또는 https 형식이어야 합니다.");
  }
  return url.toString();
}

async function upsertJobDetails(
  client: PoolClient,
  jobId: string,
  input: Record<string, unknown>,
) {
  await client.query(
    `
      INSERT INTO public.job_posting_details (
        job_posting_id, basic_info, qualification, disqualification, preference,
        screening_process, application_method, required_documents, additional_notice
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (job_posting_id) DO UPDATE SET
        basic_info = EXCLUDED.basic_info,
        qualification = EXCLUDED.qualification,
        disqualification = EXCLUDED.disqualification,
        preference = EXCLUDED.preference,
        screening_process = EXCLUDED.screening_process,
        application_method = EXCLUDED.application_method,
        required_documents = EXCLUDED.required_documents,
        additional_notice = EXCLUDED.additional_notice,
        updated_at = NOW()
    `,
    [
      jobId,
      nullableString(input.basicInfo),
      nullableString(input.qualification),
      nullableString(input.disqualification),
      nullableString(input.preference),
      nullableString(input.screeningProcess),
      nullableString(input.applicationMethod),
      nullableString(input.requiredDocuments),
      nullableString(input.additionalNotice),
    ],
  );
}

async function replaceJobCategories(
  client: PoolClient,
  jobId: string,
  rawCategoryIds: unknown,
) {
  const categoryIds = Array.isArray(rawCategoryIds)
    ? rawCategoryIds.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  await client.query(`DELETE FROM public.job_posting_categories WHERE job_posting_id = $1`, [jobId]);
  if (!categoryIds.length) return;
  await client.query(
    `
      INSERT INTO public.job_posting_categories (job_posting_id, job_category_id)
      SELECT $1, id
      FROM public.job_categories
      WHERE id = ANY($2::uuid[])
    `,
    [jobId, categoryIds],
  );
}
