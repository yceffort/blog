import {AboutHero} from '@/components/about/AboutHero'
import {AboutTabs} from '@/components/about/AboutTabs'
import {Resume} from '@/components/about/Resume'

export default function Page() {
  return (
    <div className="page-view">
      <AboutHero />

      <AboutTabs active="resume" />

      <div className="mt-4">
        <Resume />
      </div>
    </div>
  )
}
