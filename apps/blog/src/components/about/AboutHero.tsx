'use client'

import dynamic from 'next/dynamic'

import * as tagsStyles from '@/app/tags/tags.styles'
import * as aboutStyles from '@/components/about/about.styles'
import LoadTraceShell from '@/components/about/LoadTraceShell'
import * as heroStyles from '@/components/home/hero.styles'
import {SiteConfig} from '@/config'

// WebGL과 Performance API는 브라우저에서만 쓸 수 있다. 그 전까지 같은 크기의 셸로 자리를 잡는다.
const LoadTrace = dynamic(() => import('@/components/about/LoadTrace'), {
  ssr: false,
  loading: LoadTraceShell,
})
export function AboutHero() {
  return (
    <section className={`about-hero ${aboutStyles.about_hero}`}>
      <div>
        <div className={`hero-eyebrow ${heroStyles.hero_eyebrow}`}>
          <span className={`dot ${heroStyles.dot}`} />
          FRONTEND ENGINEER · SEOUL
        </div>
        <h1 className={aboutStyles.about_title}>yceffort.</h1>
        <p className={`page-sub ${tagsStyles.page_sub}`}>
          웹이 동작하는 원리를 파고들고, 직접 만들고 측정한 경험을 글과 도구로
          나눕니다. 요즘은 AI와 함께 일하는 개발자의 판단과 학습을 고민합니다.
        </p>
        <div className={`about-socials ${aboutStyles.about_socials}`}>
          <a
            href={`mailto:${SiteConfig.author.contacts.email}`}
            className={aboutStyles.about_social_link}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16v16H4z" />
              <path d="m4 4 8 8 8-8" />
            </svg>
            {SiteConfig.author.contacts.email}
          </a>
          <a
            href={SiteConfig.author.contacts.github}
            target="_blank"
            rel="noopener noreferrer"
            className={aboutStyles.about_social_link}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            yceffort
          </a>
          <a
            href={SiteConfig.author.contacts.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className={aboutStyles.about_social_link}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 5.8a8.49 8.49 0 0 1-2.36.64 4.13 4.13 0 0 0 1.81-2.27 8.21 8.21 0 0 1-2.61 1 4.1 4.1 0 0 0-7 3.74A11.64 11.64 0 0 1 3.39 4.62a4.16 4.16 0 0 0-.55 2.07 4.09 4.09 0 0 0 1.82 3.41 4.05 4.05 0 0 1-1.86-.51v.05a4.1 4.1 0 0 0 3.3 4 3.93 3.93 0 0 1-1.1.17 4.9 4.9 0 0 1-.77-.07 4.11 4.11 0 0 0 3.83 2.84A8.22 8.22 0 0 1 3 18.34a11.57 11.57 0 0 0 6.29 1.85A11.59 11.59 0 0 0 21 8.45v-.53a8.43 8.43 0 0 0 2-2.12z" />
            </svg>
            yceffort_dev
          </a>
        </div>
      </div>
      <LoadTrace />
    </section>
  )
}
