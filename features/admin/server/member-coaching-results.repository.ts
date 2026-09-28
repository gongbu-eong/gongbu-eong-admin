import { query } from "./db";
import type { CoachingFeedback, CoachingHistoryItem } from "../components/members/service-results/coaching/coaching.dto";
import type { InterviewCoachingSession, InterviewMessage } from "../components/members/service-results/interview-coaching/interview-coaching.dto";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function getMemberResumeResult(userId: string, resultId: string) {
  if (!isUuid(userId) || !isUuid(resultId)) return null;
  const result = await query<{
    id: string;
    input_type: "text" | "file";
    input_text: string | null;
    source_filename: string | null;
    job: CoachingHistoryItem["job"];
    feedback: CoachingFeedback | null;
  }>(`
    SELECT results.id, requests.input_type, requests.input_text,
      COALESCE(requests.source_filename, files.original_filename) AS source_filename,
      requests.job_posting_snapshot AS job, results.feedback
    FROM public.resume_coaching_results results
    JOIN public.resume_coaching_requests requests ON requests.id = results.request_id
    LEFT JOIN public.user_files files ON files.id = requests.source_file_id
    WHERE requests.user_id = $1::uuid AND results.id = $2::uuid
    LIMIT 1
  `, [userId, resultId]);
  const row = result.rows[0];
  if (!row?.feedback) return null;
  return {
    id: row.id,
    inputType: row.input_type,
    inputText: row.input_text || "",
    sourceFilename: row.source_filename,
    job: row.job,
    result: row.feedback,
    isLocked: false,
  };
}

type InterviewRow = {
  id: string;
  status: InterviewCoachingSession["status"];
  started_at: string | Date;
  completed_at: string | Date | null;
  last_error_message: string | null;
  company_name: string | null;
  position_name: string | null;
  duty_text: string | null;
  job_snapshot: InterviewCoachingSession["job"];
  analysis: InterviewCoachingSession["analysis"] | null;
  questions: InterviewCoachingSession["questions"] | null;
  result: InterviewCoachingSession["result"];
  messages: InterviewMessage[];
};

export async function getMemberInterviewResult(userId: string, sessionId: string): Promise<InterviewCoachingSession | null> {
  if (!isUuid(userId) || !isUuid(sessionId)) return null;
  const result = await query<InterviewRow>(`
    SELECT sessions.id, sessions.status, sessions.started_at, sessions.completed_at,
      sessions.last_error_message, sessions.company_name, sessions.position_name,
      sessions.duty_text, sessions.job_snapshot, sessions.analysis, sessions.questions, sessions.result,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', messages.id, 'questionId', messages.question_id, 'role', messages.role,
          'content', messages.content, 'followUpIndex', messages.follow_up_index,
          'feedback', messages.feedback, 'createdAt', messages.created_at
        ) ORDER BY messages.message_order, messages.created_at, messages.id)
        FROM public.interview_coaching_messages messages WHERE messages.session_id = sessions.id
      ), '[]'::jsonb) AS messages
    FROM public.interview_coaching_sessions sessions
    WHERE sessions.user_id = $1::uuid AND sessions.id = $2::uuid
    LIMIT 1
  `, [userId, sessionId]);
  const row = result.rows[0];
  if (!row) return null;
  const profile = row.analysis?.profile;
  // Match the service DTO, especially message IDs and follow-up ordering.
  return {
    id: row.id,
    status: row.status || (row.completed_at ? "completed" : "ready"),
    lastErrorMessage: row.last_error_message,
    createdAt: new Date(row.started_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    companyName: row.company_name || "",
    positionName: row.position_name || "",
    dutyText: row.duty_text || "",
    job: row.job_snapshot?.id ? row.job_snapshot : null,
    analysis: {
      profile: {
        companyName: profile?.companyName || row.company_name || "",
        positionName: profile?.positionName || row.position_name || "",
        dutyText: profile?.dutyText || row.duty_text || "",
        mainTasks: Array.isArray(profile?.mainTasks) ? profile.mainTasks : [],
        requiredKnowledge: Array.isArray(profile?.requiredKnowledge) ? profile.requiredKnowledge : [],
        preferredExperience: Array.isArray(profile?.preferredExperience) ? profile.preferredExperience : [],
        keywords: Array.isArray(profile?.keywords) ? profile.keywords : [],
      },
      ncsMappings: Array.isArray(row.analysis?.ncsMappings) ? row.analysis.ncsMappings : [],
      questionPlan: Array.isArray(row.analysis?.questionPlan) ? row.analysis.questionPlan : [],
    },
    questions: Array.isArray(row.questions) ? row.questions : [],
    messages: row.messages,
    result: row.result || null,
    isAnonymous: false,
  };
}
