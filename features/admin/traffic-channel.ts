// Match the referral host, not a substring in a URL or our own subdomain.
// Keep this pattern compatible with both JavaScript and PostgreSQL regexes.
export const careerSourcePattern = "^(career|커리어|((https?:)?//)?(www[.])?career[.]co[.]kr(:[0-9]+)?([/?#].*)?)$";

const careerSourceRegex = new RegExp(careerSourcePattern, "i");

export function isCareerSource(source: string | null | undefined) {
  return careerSourceRegex.test((source || "").trim());
}

export const trafficChannelOptions = [
  ["all", "전체"],
  ["instagram", "인스타그램"],
  ["blog", "블로그"],
  ["threads", "스레드"],
  ["search", "검색"],
  ["direct", "직접유입"],
] as const;
