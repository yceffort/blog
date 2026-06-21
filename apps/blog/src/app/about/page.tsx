import {AboutHero} from '@/components/about/AboutHero'
import {AboutIntro} from '@/components/about/AboutIntro'
import {AboutTabs} from '@/components/about/AboutTabs'

export default function Page() {
  return (
    <div className="page-view">
      <AboutHero />

      <AboutTabs active="about" />

      <div className="mt-4">
        <AboutIntro />
      </div>
    </div>
  )
}
