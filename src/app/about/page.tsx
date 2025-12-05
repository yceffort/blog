import Link from 'next/link'

import SocialIcon from '#components/icons'
import ProfileImage from '#components/ProfileImage'
import {SiteConfig} from '#src/config'

export default function Page() {
  return (
    <>
      <div className="flex flex-col items-center space-x-2 pt-8">
        <ProfileImage size={192} />
        <h3 className="pt-4 pb-2 text-2xl font-bold leading-8 tracking-tight">
          {SiteConfig.author.name}
        </h3>
        <div className="text-gray-500 dark:text-gray-400">
          Fullstack Engineer
        </div>
        <div className="text-gray-500 dark:text-gray-400">Seoul, Korea</div>
        <div className="flex space-x-3 pt-6">
          <SocialIcon
            kind="mail"
            href={`mailto:${SiteConfig.author.contacts.email}`}
          />
          <SocialIcon kind="github" href={SiteConfig.author.contacts.github} />
          <SocialIcon
            kind="twitter"
            href={SiteConfig.author.contacts.twitter}
          />
        </div>
      </div>
      <div className="prose max-w-none pt-8 pb-8 dark:prose-dark xl:col-span-2">
        <p>
          I'm a frontend-focused full stack engineer based in Korea, with
          extensive experience in building scalable systems, shared UI
          libraries, and developer tooling for large-scale teams.
        </p>
        <p>
          At NAVER Financial, I lead the development of core frontend
          infrastructure, with an emphasis on reusability, performance, and
          long-term maintainability.
        </p>
        <p>
          Outside of work, I read and write about technology, software
          architecture, and the deeper questions that shape how we build. I
          believe thoughtful engineering is grounded in clarity, curiosity, and
          context — principles I aim to reflect not just in code, but also in
          how I communicate and write.
        </p>
        <p>
          I value substance over spectacle. To me, good engineering isn't just
          about writing code, but about making intentional decisions that serve
          both users and developers over time. In the era of AI, I believe
          engineers matter more than ever — not for how fast we ship, but for
          how deeply we understand what should be built, and why.
        </p>

        <p>
          <Link href="https://yceffort.notion.site/9fc4262c01744a63a849cdccdde5c85f">
            Detailed Resume (Notion)
          </Link>
        </p>
      </div>
    </>
  )
}
