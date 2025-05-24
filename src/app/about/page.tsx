import Image from 'next/image'
import Link from 'next/link'

import SocialIcon from '#components/icons'
import profile from '#public/profile.jpeg'
import {SiteConfig} from '#src/config'

export default function Page() {
  return (
    <>
      <div className="flex flex-col items-center space-x-2 pt-8">
        <Image
          src={profile}
          placeholder="blur"
          alt="avatar"
          width={192}
          height={192}
          className="h-48 w-48 rounded-full"
        />
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
          I'm a frontend-focused full stack engineer based in Korea, with deep
          experience in building scalable systems, shared UI libraries, and
          developer tooling for large-scale teams.
        </p>
        <p>
          At NAVER Financial, I lead the development of core frontend
          infrastructure, focusing on reusability, performance, and long-term
          maintainability.
        </p>
        <p>
          Outside of work, I spend time reading and writing about technology,
          software architecture, and the deeper questions behind how we build
          things. I believe thoughtful engineering is rooted in clarity,
          curiosity, and a strong sense of context — and I try to reflect that
          not only in code, but in the way I communicate and write.
        </p>
        <p>
          I value substance over spectacle. I believe good engineering is not
          just about writing code, but about making thoughtful decisions that
          serve both users and developers over time. In the era of AI, I think
          engineers matter more than ever — not for how fast we ship, but for
          how well we understand what should be built, and why.
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
