'use client'

import {useSearchParams} from 'next/navigation'
import {Suspense} from 'react'

import SocialIcon from '#components/icons'
import ProfileImage from '#components/ProfileImage'
import {SiteConfig} from '#src/config'

function AboutContent() {
  return (
    <div className="pt-8 pb-8 xl:col-span-2">
      <div className="prose max-w-none dark:prose-dark">
        <p>
          한국에서 활동하는 프론트엔드 엔지니어입니다. 네이버 파이낸셜에서 14명
          규모의 프론트엔드 팀을 이끌며 금융 서비스 개발과 공통 인프라 구축을
          담당해왔습니다. 「모던 리액트 Deep Dive」, 「npm Deep Dive」를
          집필했고, 현재도 기술 서적을 쓰고 있습니다.
        </p>
        <p>
          확장 가능한 시스템, 공유 라이브러리, 개발자 도구처럼 팀의 생산성을
          높이는 일에 관심이 많습니다. 코드 바깥에서는 기술과 소프트웨어
          아키텍처에 대해 읽고 쓰며, 이 블로그도 그 과정의 일부입니다.
        </p>
        <p>
          화려함보다 본질을 중요하게 생각합니다. 빠르게 만드는 것보다 무엇을 왜
          만들어야 하는지 깊이 이해하는 일, 사용자와 개발자 모두에게 오래 도움이
          되는 결정을 내리는 일에 더 가치를 둡니다.
        </p>
      </div>
    </div>
  )
}

function ResumeContent() {
  return (
    <div className="w-full space-y-8 pb-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/50 md:p-10">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Profile
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300">
            <li>
              <span className="font-semibold">생년월일:</span> 1988.10.24
            </li>
            <li>
              <span className="font-semibold">이메일:</span>{' '}
              <a
                href="mailto:root@yceffort.kr"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                root@yceffort.kr
              </a>
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/50 md:p-10">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Key Expertise
          </h2>
          <div className="flex flex-wrap gap-2">
            {['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js'].map(
              (skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  {skill}
                </span>
              ),
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/50 md:p-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Summary
        </h2>
        <p className="leading-relaxed text-gray-600 dark:text-gray-300">
          10년 이상의 프론트엔드 개발 경험을 보유한 엔지니어로, React와
          TypeScript를 기반으로 네이버 파이낸셜에서 대규모 금융 서비스를
          설계·운영하며, 조직의 기술 표준과 공통 라이브러리를 구축하여 개발
          생산성 향상에 기여하고 있습니다. 또한 기술 서적 집필과 오픈소스 활동을
          통해 개발 커뮤니티에 적극적으로 기여하고 있습니다.
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/50 md:p-12">
        <h2 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Employment History
        </h2>
        <ol className="relative border-l border-gray-200 dark:border-gray-700">
          <li className="mb-10 ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 ring-8 ring-white dark:bg-primary-900 dark:ring-gray-800">
              <span className="h-3 w-3 rounded-full bg-primary-600 dark:bg-primary-400" />
            </span>
            <h3 className="mb-1 flex items-center text-lg font-semibold text-gray-900 dark:text-gray-100">
              Frontend Engineer, NAVER Financial Corp.
              <span className="ml-3 mr-2 rounded bg-primary-100 px-2.5 py-0.5 text-sm font-medium text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                Current
              </span>
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
              2020.09 ~ 현재
            </time>
            <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    카드FE 리더
                  </span>
                  <ul className="mt-1 list-circle space-y-1 pl-5 text-sm">
                    <li>
                      마이데이터(은행, 카드, 증권, 보험, 연금, PFMS) 및 회원
                      인증, 카드탭, 카드 관련 서비스 등 다양한 서비스 개발
                    </li>
                    <li>
                      React, Next.js, K8S, Koa를 기반으로 모바일 지향 서비스
                      개발
                    </li>
                    <li>SPA에서 SSR 전환, 마이크로 서비스 설계, 운영, 배포</li>
                    <li>Node.js(Koa) 기반 서버 개발</li>
                    <li>팀원들의 성장을 위한 멘토링과 코드 리뷰 주도</li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    프론트엔드 조직의 공통 라이브러리 개발
                  </span>
                  <ul className="mt-1 list-circle space-y-1 pl-5 text-sm">
                    <li>
                      `eslint-config`, `create-**-apps` 등 여러 마이크로
                      서비스에서 공통적으로 사용하는 패키지 개발
                    </li>
                    <li>커스텀 ESLint 설정 및 플러그인 제작, 배포</li>
                    <li>리액트 기반 상태 관리 라이브러리 개발 및 운영</li>
                    <li>개발에 필요한 Node.js 기반 CLI 개발 및 운영</li>
                    <li>디자인 시스템 구축 및 유지보수</li>
                    <li>
                      다양한 npm 패키지 개발{' '}
                      <a
                        href="https://github.com/orgs/NaverPayDev/repositories"
                        className="text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Link
                      </a>
                    </li>
                    <li>
                      내부 생산성 향상을 위한 MCP(Model Context Protocol) 제작
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Tech Stack:</span> React,
              TypeScript, JavaScript, MobX, Next.js, SCSS, react-query, SWR,
              styled-components, Koa, K8S, Rollup, esbuild, Vite, pnpm/npm
              workspaces, Turborepo
            </p>
          </li>
          <li className="mb-10 ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white dark:bg-gray-800 dark:ring-gray-800">
              <span className="h-3 w-3 rounded-full bg-gray-400 dark:bg-gray-500" />
            </span>
            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Frontend Engineer, Triple Corp.
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
              2019.05 ~ 2020.08
            </time>
            <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
              <ul className="list-disc space-y-1 pl-5">
                <li>트리플 애플리케이션 프론트엔드 서비스 개발</li>
                <li>
                  JavaScript로 작성된 결제 서비스 및 공통 컴포넌트를
                  TypeScript로 변환
                </li>
                <li>글로벌 도시 검색 서비스 개발</li>
                <li>항공권 판매 서비스 개발 및 관리</li>
                <li>판매자-사용자 간 1:1 문의 채팅 서비스 개발</li>
              </ul>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Tech Stack:</span> React,
              TypeScript, JavaScript, Next.js, styled-components, Lerna, Koa,
              Docker, Amazon ECS
            </p>
          </li>
          <li className="mb-10 ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white dark:bg-gray-800 dark:ring-gray-800">
              <span className="h-3 w-3 rounded-full bg-gray-400 dark:bg-gray-500" />
            </span>
            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Software Engineer, Kakao Corp.
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
              2016.09 ~ 2019.05
            </time>
            <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <a
                    href="https://together.kakao.com/"
                    className="text-primary-600 hover:underline dark:text-primary-400"
                  >
                    카카오 같이가치
                  </a>{' '}
                  서비스 개발
                </li>
                <li>
                  AngularJS로 작성된 레거시 애플리케이션을 Angular로 업그레이드
                </li>
                <li>AngularJS 기반 관리자 어드민 개발 및 운영</li>
                <li>서비스 전반을 풀스택으로 관리</li>
              </ul>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Tech Stack:</span> Angular,
              AngularJS, JavaScript, TypeScript, Ruby on Rails, MySQL, Redis
            </p>
          </li>
          <li className="ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white dark:bg-gray-800 dark:ring-gray-800">
              <span className="h-3 w-3 rounded-full bg-gray-400 dark:bg-gray-500" />
            </span>
            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Software Engineer, Samsung SDS
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
              2014.03 ~ 2016.06
            </time>
            <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
              <ul className="list-disc space-y-1 pl-5">
                <li>글로벌 EHR(Electronic Healthcare Record) 솔루션 개발</li>
                <li>해외 병원용 EHR 솔루션 및 간호 병동 서비스 개발</li>
                <li>
                  실내 내비게이션 시스템 POC - iOS 기반 비콘 위치 추적
                  애플리케이션 개발
                </li>
                <li>Python을 활용한 데이터 정합성 및 유효성 계산</li>
                <li>
                  블록체인 시스템 POC - 금융 고객사를 위한 블록체인 시스템 POC
                  개발
                </li>
              </ul>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Tech Stack:</span> Delphi, Oracle
              DB, Spring, Custom blockchain, JavaScript, HTML, CSS
            </p>
          </li>
        </ol>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/50 md:p-12">
        <h2 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Education
        </h2>
        <ol className="relative border-l border-gray-200 dark:border-gray-700">
          <li className="mb-10 ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white dark:bg-gray-800 dark:ring-gray-800">
              <span className="h-3 w-3 rounded-full bg-gray-400 dark:bg-gray-500" />
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              한국과학기술원 (KAIST) 대전캠퍼스
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
              2018.03 ~ 2020.02
            </time>
            <p className="text-gray-500 dark:text-gray-400">
              기술경영전문대학원 석사과정 졸업 (Highest Honor, GPA 4.23 / 4.3)
            </p>
          </li>
          <li className="ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white dark:bg-gray-800 dark:ring-gray-800">
              <span className="h-3 w-3 rounded-full bg-gray-400 dark:bg-gray-500" />
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              동국대학교 서울캠퍼스
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
              2007.03 ~ 2014.02
            </time>
            <p className="text-gray-500 dark:text-gray-400">
              국제통상학 전공, 영어통번역학 복수전공 학사과정 졸업
            </p>
          </li>
        </ol>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/50 md:p-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Extra-Curricular Activities
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Jump Board Member
            </h3>
            <time className="block text-sm text-gray-500 dark:text-gray-400">
              2016.03 ~ 현재
            </time>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              <a
                href="https://jumpsp.org/"
                className="text-primary-600 hover:underline dark:text-primary-400"
              >
                점프
              </a>{' '}
              이사로 활동하며 Google Cloud Platform을 활용해 업무 자동화 및
              프로그래밍 교육을 담당하고 있습니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              yceffort.kr
            </h3>
            <time className="block text-sm text-gray-500 dark:text-gray-400">
              2018 ~
            </time>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              개인 블로그를 통해 프로그래밍 인사이트와 고민을 공유합니다.
              블로그는 직접 개발하여 운영중입니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Samsung Software Academy For Youth (SSAFY) 멘토
            </h3>
            <time className="block text-sm text-gray-500 dark:text-gray-400">
              2021.01 ~ 2021.12
            </time>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              삼성 청년 소프트웨어 아카데미에서 청년들의 멘토로 참여해
              프로그래밍 관련 질의응답과 칼럼 작성을 진행했습니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              DAN24 컨퍼런스 발표
            </h3>
            <time className="block text-sm text-gray-500 dark:text-gray-400">
              2024
            </time>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              네이버 개발자 컨퍼런스 DAN24에서 &apos;웹 서비스 번들 사이즈
              최적화&apos; 세션을 발표했습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800/50 md:p-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Publishing
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-300">
          <li>
            모던 리액트 Deep Dive (단독 저자) -{' '}
            <a
              href="https://wikibook.co.kr/react-deep-dive/"
              className="text-primary-600 hover:underline dark:text-primary-400"
            >
              wikibook.co.kr
            </a>
          </li>
          <li>
            리액트 인터뷰 가이드 (번역) -{' '}
            <a
              href="https://wikibook.co.kr/react-interview-guide/"
              className="text-primary-600 hover:underline dark:text-primary-400"
            >
              wikibook.co.kr
            </a>
          </li>
          <li>
            npm deep dive (공동 저자) -{' '}
            <a
              href="https://wikibook.co.kr/npm-deep-dive/"
              className="text-primary-600 hover:underline dark:text-primary-400"
            >
              wikibook.co.kr
            </a>
          </li>
        </ul>
      </section>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-3 font-semibold transition-all ${
        active
          ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function AboutPageContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'about'

  const handleTabChange = (newTab: string) => {
    const url = new URL(window.location.href)
    if (newTab === 'about') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', newTab)
    }
    window.history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div>
      <div className="flex flex-col items-center pt-8">
        <ProfileImage size={192} />
        <h3 className="pt-4 pb-2 text-2xl font-bold leading-8 tracking-tight">
          {SiteConfig.author.name}
        </h3>
        <div className="text-gray-500 dark:text-gray-400">
          Frontend Engineer
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

      <div className="mt-8 flex justify-center border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={tab === 'about'}
          onClick={() => handleTabChange('about')}
        >
          About
        </TabButton>
        <TabButton
          active={tab === 'resume'}
          onClick={() => handleTabChange('resume')}
        >
          Resume
        </TabButton>
      </div>

      <div className="mt-8">
        {tab === 'about' ? <AboutContent /> : <ResumeContent />}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AboutPageContent />
    </Suspense>
  )
}
