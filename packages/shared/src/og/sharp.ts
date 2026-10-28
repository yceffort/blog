import sharp from 'sharp'

// Next 이미지 옵티마이저는 첫 사용 시 sharp.block으로 프로세스 전역 vips 로더를 차단하고
// 비트맵 포맷만 다시 허용한다(next/dist/server/image-optimizer.js의 getSharp). SVG 로더가
// 허용 목록에 없어, 같은 프로세스에서 도는 next/og의 satori SVG 래스터라이즈가
// "Input buffer contains unsupported image format"로 실패한다. OG 렌더링 전에 SVG 로더만
// 다시 허용한다. 옵티마이저는 dangerouslyAllowSVG 없이는 SVG 입력을 HTTP 레벨에서
// 거부하므로 이 unblock이 옵티마이저를 SVG에 노출시키지는 않는다.
export function unblockSvgLoader() {
  sharp.unblock({operation: ['VipsForeignLoadSvg']})
}
