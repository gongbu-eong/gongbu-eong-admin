import { NextResponse } from "next/server";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import { query } from "@/features/admin/server/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string; sessionId: string }> },
) {
  await requireAdminSession();
  const { userId, sessionId } = await context.params;
  const result = await query<{
    material_filename: string | null;
    material_file_content_type: string | null;
    material_file_data: Buffer | null;
  }>(
    `
      SELECT material_filename, material_file_content_type, material_file_data
      FROM public.interview_coaching_sessions
      WHERE id = $1::uuid
        AND user_id = $2::uuid
        AND material_input_type = 'file'
        AND material_file_data IS NOT NULL
      LIMIT 1
    `,
    [sessionId, userId],
  );
  const file = result.rows[0];

  if (!file?.material_file_data) {
    return NextResponse.json({ message: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const filename = file.material_filename || "interview-material";
  return new NextResponse(new Uint8Array(file.material_file_data), {
    headers: {
      "Content-Type": file.material_file_content_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
