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
  if (atIndex <= 0) return maskIdentifier(normalized);

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const visibleLength = Math.min(2, local.length);
  return `${local.slice(0, visibleLength)}***@${domain}`;
}

export function maskDisplayName(value: string | null | undefined): string {
  const normalized = value?.trim() || "";
  if (!normalized) return "이름 없음";
  if (isEmptyValue(normalized)) return normalized;
  if (normalized.includes("@")) return maskEmail(normalized);

  const characters = Array.from(normalized);
  if (characters.length === 1) return "*";
  if (characters.length === 2) return `${characters[0]}*`;

  return `${characters[0]}${"*".repeat(Math.min(3, characters.length - 2))}${characters.at(-1)}`;
}

export function maskPhoneNumber(value: string | null | undefined): string {
  const normalized = value?.trim() || "";
  if (!normalized) return "없음";
  if (isEmptyValue(normalized)) return normalized;

  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 7) return maskIdentifier(normalized);

  const prefixLength = digits.startsWith("02") ? 2 : Math.min(3, digits.length - 4);
  return `${digits.slice(0, prefixLength)}-${"*".repeat(Math.max(3, digits.length - prefixLength - 4))}-${digits.slice(-4)}`;
}

export function maskIpAddress(value: string | null | undefined): string {
  const normalized = value?.trim() || "";
  if (!normalized) return "-";
  if (isEmptyValue(normalized)) return normalized;

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.***.***`;

  if (normalized.includes(":")) {
    const segments = normalized.split(":");
    return `${segments.slice(0, 2).join(":")}:****:****`;
  }

  return maskIdentifier(normalized);
}

export function maskIdentifier(value: string | null | undefined): string {
  const normalized = value?.trim() || "";
  if (!normalized) return "-";
  if (isEmptyValue(normalized)) return normalized;
  if (normalized.includes("@")) return maskEmail(normalized);
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized) || normalized.includes(":")) {
    return maskIpAddress(normalized);
  }

  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(normalized)) {
    return `${normalized.slice(0, 8)}-****-****-****-****${normalized.slice(-4)}`;
  }

  const characters = Array.from(normalized);
  if (characters.length <= 4) return `${characters[0] || ""}${"*".repeat(Math.max(1, characters.length - 1))}`;
  return `${characters.slice(0, 3).join("")}***${characters.slice(-3).join("")}`;
}

export function maskPersonalText(value: string | null | undefined): string {
  if (!value) return value || "";

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => maskEmail(email))
    .replace(/(?<!\d)(?:\+?82[-.\s]?)?0?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g, (phone) => maskPhoneNumber(phone))
    .replace(/(?<!\d)\d{6}-\d{7}(?!\d)/g, (residentNumber) => `${residentNumber.slice(0, 6)}-*******`)
    .replace(/(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)/g, (ip) => maskIpAddress(ip));
}

export function maskPersonalData<T>(value: T): T {
  if (typeof value === "string") return maskPersonalText(value) as T;
  if (Array.isArray(value)) return value.map((item) => maskPersonalData(item)) as T;
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, maskPersonalData(item)]),
  ) as T;
}
