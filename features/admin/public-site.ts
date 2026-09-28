const DEFAULT_PUBLIC_SITE_URL = "https://gongbueong.career.co.kr";

export function getPublicSiteUrl(configured = process.env.NEXT_PUBLIC_SITE_URL, production = process.env.NODE_ENV === "production") {
  try {
    const url = new URL(configured?.trim() || DEFAULT_PUBLIC_SITE_URL);
    const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "[::1]" || /^127\./.test(url.hostname) || url.hostname === "0.0.0.0";
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (production && local)) return DEFAULT_PUBLIC_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}

export function publicSiteHref(path: string) {
  const url = new URL(getPublicSiteUrl());
  const relative = new URL(path, url);
  return `${url.origin}${relative.pathname}${relative.search}${relative.hash}`;
}
