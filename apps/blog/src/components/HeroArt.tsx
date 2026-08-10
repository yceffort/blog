import Image from 'next/image'

import {buildArtThumbnail} from '@/utils/Post'

export default function HeroArt({seed}: {seed: string}) {
  return (
    <aside className="hero-art" aria-label="오늘의 코드 생성 아트">
      <div className="hero-art-head">
        <span className="series-nav-kicker">DAILY ARTIFACT</span>
        <span className="series-nav-progress">SEED {seed}</span>
      </div>
      <div className="hero-art-frame">
        <Image
          src={buildArtThumbnail(`hero/${seed}`)}
          alt=""
          fill
          sizes="(min-width: 1100px) 42vw, 100vw"
          unoptimized
        />
      </div>
      <p className="hero-art-caption">code-generated · deterministic by date</p>
    </aside>
  )
}
