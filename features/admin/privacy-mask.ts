const EMPTY_VALUES = new Set([
  "",
  "-",
  "없음",
  "비회원",
  "회원",
  "회원 식별됨",
  "식별 정보 없음",
  "이메일 없음",
  "이름 없음",
]);

function isEmptyValue(value: string): boolean {
  return EMPTY_VALUES.has(value.trim());
}

export function maskEmail(value: string | null | undefined): string {
  const normalized = value?.trim() || "";
  if (!normalized) return "-";
  if (isEmptyValue(normalized)) return normalized;

  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) return normalized;

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const visibleLength = Math.min(2, local.length);
  return `${local.slice(0, visibleLength)}***@${domain}`;
}

export function maskPersonalText(value: string | null | undefined): string {
  if (!value) return value || "";

  return value.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    (email) => maskEmail(email),
  );
}

export function maskPersonalData<T>(value: T): T {
  if (typeof value === "string") return maskPersonalText(value) as T;
  if (Array.isArray(value)) return value.map((item) => maskPersonalData(item)) as T;
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, maskPersonalData(item)]),
  ) as T;
}
