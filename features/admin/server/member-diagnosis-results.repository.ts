import { query } from "./db";
import {
  findDiagnosisResultForUser, findDiagnosisPercentile, countPreviousDiagnosisResults,
  findRecommendedInstitutions, findMonthlyHiringByPersonalityType,
} from "./service-diagnosis/diagnosis/diagnosis.repository";
import { toDiagnosisResultResponse, PERCENTILE_TRAIT_LABELS } from "./service-diagnosis/diagnosis/diagnosis.service";
import { findRecommendedJobPostings } from "./service-diagnosis/jobs/jobs.repository";
import { toJobPostingDto } from "./service-diagnosis/jobs/jobs.service";
import type { DiagnosisResultDetailResponseDto } from "./service-diagnosis/diagnosis/diagnosis.dto";

export async function getMemberDiagnosisResult(userId: string, resultId: string) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(userId) || !uuid.test(resultId)) return null;
  // Use the service ownership rules, including anonymous diagnoses linked after signup.
  const row = await findDiagnosisResultForUser(userId, resultId);
  if (!row) return null;
  const [result, percentile, previousResultCount, companies, monthlyHiring, postings, member] = await Promise.all([
    toDiagnosisResultResponse(row),
    findDiagnosisPercentile(resultId, row.type_code, userId),
    countPreviousDiagnosisResults(userId, resultId),
    findRecommendedInstitutions(row.type_code, 3),
    findMonthlyHiringByPersonalityType(row.type_code),
    findRecommendedJobPostings({ personalityCode: row.type_code, userId, monthlyRegularOnly: true, limit: 3, offset: 0 }),
    query<{ nickname: string | null; display_name: string | null }>("SELECT nickname, display_name FROM public.users WHERE id = $1::uuid", [userId]),
  ]);
  const detail: DiagnosisResultDetailResponseDto = {
    result,
    completedAt: new Date(row.completed_at).toISOString(),
    isOwner: true,
    percentile: { traitLabel: PERCENTILE_TRAIT_LABELS[row.type_code], ...percentile },
    previousResultCount,
    companies,
    recommendedPostings: postings.rows.map(toJobPostingDto),
    monthlyHiring: {
      month: new Date().getMonth() + 1,
      totalCount: monthlyHiring.totalCount,
      primaryCategory: result.jobCategories[0]?.name || monthlyHiring.categories[0]?.name || "",
      categories: monthlyHiring.categories,
    },
  };
  return { detail, nickname: member.rows[0]?.nickname || member.rows[0]?.display_name || "회원" };
}
