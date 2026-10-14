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

export function maskPhoneNumber(value: string | null | undefined): string {
  const normalized = value?.trim() || "";
  if (!normalized) return "없음";

  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 7) return normalized;

  const prefixLength = digits.startsWith("02") ? 2 : Math.min(3, digits.length - 4);
  return `${digits.slice(0, prefixLength)}-${"*".repeat(Math.max(3, digits.length - prefixLength - 4))}-${digits.slice(-4)}`;
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
