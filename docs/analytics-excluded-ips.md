# 분석 제외 IP 설정

테스트 방문자의 IP를 등록하면 대시보드와 방문·이벤트 로그에서 해당 IP의 페이지 방문, 유입, 버튼 이벤트, 가입자 추이가 제외됩니다.

```sql
CREATE TABLE IF NOT EXISTS public.analytics_excluded_ips (
  ip_address INET PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.analytics_excluded_ips IS '관리자 분석에서 제외할 테스트 IP 목록';

-- 등록
INSERT INTO public.analytics_excluded_ips (ip_address, reason)
VALUES ('203.0.113.10', '로컬 테스트');

-- 해제
DELETE FROM public.analytics_excluded_ips
WHERE ip_address = '203.0.113.10'::inet;
```

실제 테스트 IP로 `203.0.113.10` 부분을 바꿔 실행하면 됩니다.
