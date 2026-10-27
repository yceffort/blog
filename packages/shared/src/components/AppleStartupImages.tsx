interface StartupImage {
  url: string
  media: string
}

// iOS 홈 화면 앱의 스플래시. images는 각 앱의 scripts/generate-splash.mjs가 만든 src/splash.json이다.
export function AppleStartupImages({images}: {images: StartupImage[]}) {
  return images.map(({url, media}) => (
    <link key={url} rel="apple-touch-startup-image" href={url} media={media} />
  ))
}
