'use client'

const COLORS = [
  {bg: 'rgb(99,102,241)', opacity: 0.4, darkOpacity: 0.6},  // indigo
  {bg: 'rgb(236,72,153)', opacity: 0.4, darkOpacity: 0.6},  // pink
  {bg: 'rgb(139,92,246)', opacity: 0.35, darkOpacity: 0.55}, // violet
  {bg: 'rgb(6,182,212)', opacity: 0.4, darkOpacity: 0.6},   // cyan
  {bg: 'rgb(168,85,247)', opacity: 0.35, darkOpacity: 0.55}, // purple
]

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49311
  return x - Math.floor(x)
}

const DOTS = Array.from({length: 50}, (_, i) => {
  const r = (n: number) => seededRandom(i * 7 + n)
  const color = COLORS[i % COLORS.length]
  const size = 2 + r(0) * 4 // 2~6px
  const x = r(1) * 100
  const y = r(2) * 100
  const duration = 6 + r(3) * 10 // 6~16s
  const delay = -(r(4) * 10) // stagger start
  return {size, x, y, duration, delay, color}
})

export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient blobs */}
      <div className="hero-aurora-1 absolute -left-[15%] -top-[20%] h-[60%] w-[50%] rounded-full bg-indigo-400/15 blur-[100px] dark:bg-indigo-600/20" />
      <div className="hero-aurora-2 absolute -right-[15%] top-[5%] h-[50%] w-[45%] rounded-full bg-pink-400/15 blur-[100px] dark:bg-pink-600/20" />
      <div className="hero-aurora-3 absolute bottom-[10%] left-[10%] h-[45%] w-[40%] rounded-full bg-violet-400/10 blur-[90px] dark:bg-violet-600/15" />
      <div className="hero-aurora-4 absolute bottom-[30%] right-[5%] h-[35%] w-[30%] rounded-full bg-cyan-400/8 blur-[80px] dark:bg-cyan-500/10" />

      {/* Orbiting rings */}
      <div className="hero-ring-1 absolute left-[8%] top-[12%] h-24 w-24 rounded-full border border-indigo-300/20 dark:border-indigo-500/15 sm:h-32 sm:w-32" />
      <div className="hero-ring-2 absolute right-[10%] top-[25%] h-20 w-20 rounded-full border border-pink-300/20 dark:border-pink-500/15 sm:h-28 sm:w-28" />
      <div className="hero-ring-3 absolute bottom-[20%] left-[25%] h-16 w-16 rounded-full border-2 border-dashed border-violet-300/15 dark:border-violet-500/10 sm:h-24 sm:w-24" />

      {/* Floating dots */}
      {DOTS.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full dark:!opacity-100"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color.bg,
            opacity: dot.color.opacity,
            boxShadow: `0 0 ${dot.size * 3}px ${dot.color.bg.replace(')', `,${dot.color.opacity})`).replace('rgb', 'rgba')}`,
            animation: `dot-float-${i % 5} ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
