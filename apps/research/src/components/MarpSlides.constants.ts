export type TransitionType = 'slide' | 'fade' | 'zoom' | 'glide' | 'none'

export const TRANSITION_TYPES: TransitionType[] = [
  'slide',
  'fade',
  'zoom',
  'glide',
  'none',
]

export function isTransitionType(value: unknown): value is TransitionType {
  return TRANSITION_TYPES.includes(value as TransitionType)
}

export function readTransition(): TransitionType {
  if (typeof document === 'undefined') {
    return 'slide'
  }
  const value = document.body.dataset.transition
  if (isTransitionType(value)) {
    return value
  }
  const match = document.cookie.match(/(?:^|; )tw-transition=([^;]+)/)
  const decoded = match ? decodeURIComponent(match[1]) : null
  return isTransitionType(decoded) ? decoded : 'slide'
}

export const SHORTCUT_GROUPS: {
  title: string
  items: {keys: string[]; desc: string}[]
}[] = [
  {
    title: '네비게이션',
    items: [
      {keys: ['←'], desc: '이전 슬라이드'},
      {keys: ['→'], desc: '다음 슬라이드'},
      {keys: ['Home'], desc: '첫 슬라이드'},
      {keys: ['End'], desc: '마지막 슬라이드'},
    ],
  },
  {
    title: '뷰 모드',
    items: [
      {keys: ['G'], desc: '슬라이드 오버뷰'},
      {keys: ['P'], desc: '발표자 모드'},
      {keys: ['F11'], desc: '전체화면'},
      {keys: ['L'], desc: '레이저 포인터'},
      {keys: ['D'], desc: '드로잉 모드'},
    ],
  },
  {
    title: '검색',
    items: [{keys: ['/'], desc: '슬라이드 검색'}],
  },
  {
    title: '공유',
    items: [{keys: ['Q'], desc: '현재 슬라이드 QR 코드'}],
  },
  {
    title: '기타',
    items: [
      {keys: ['?'], desc: '단축키 도움말'},
      {keys: ['Esc'], desc: '오버레이 닫기'},
    ],
  },
]
