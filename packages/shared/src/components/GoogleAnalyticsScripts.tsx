import Script from 'next/script'

// 로컬에서 프로덕션 빌드를 띄우면(next start) NODE_ENV가 production이라 앱의 가드를
// 통과하고, 개발 중 조회가 운영 GA4에 그대로 섞인다. 실제 서비스 호스트에서만 켠다.
export function GoogleAnalyticsScripts({
  measurementId,
  siteUrl,
}: {
  measurementId: string
  siteUrl: string
}) {
  const host = new URL(siteUrl).hostname
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          if (window.location.hostname === '${host}') {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function gtag(){window.dataLayer.push(arguments);};
            window.gtag('js', new Date());
            window.gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          }
        `,
        }}
      />
    </>
  )
}
