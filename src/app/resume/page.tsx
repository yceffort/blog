import Image from 'next/image'

import SocialIcon from '#components/icons'
import profile from '#public/profile.jpeg'
import {SiteConfig} from '#src/config'

export const dynamic = 'error'

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
      <div className="prose max-w-none pt-8 pb-8 dark:prose-dark xl:col-span-2">
        <h2>Profile</h2>
        <ul className="list-disc pl-5">
          <li>생년월일: 1988.10.24</li>
          <li>
            이메일: <a href="mailto:root@yceffort.kr">root@yceffort.kr</a>
          </li>
        </ul>
        <h2>Summary</h2>
        <p>프론트엔드 개발자 김용찬입니다.</p>
        <h2>Key Expertise</h2>
        <ul className="list-disc pl-5">
          <li>JavaScript, TypeScript</li>
          <li>React, Next.js</li>
          <li>Node.js</li>
        </ul>
        <h2>Employment History</h2>
        <ol className="relative border-l border-gray-200 dark:border-gray-700">
          <li className="mb-10 ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Frontend Engineer, NAVER Financial Corp.
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2020.09 ~ 현재
            </time>
            <ul className="mb-2 list-disc space-y-1 pl-5">
              <li>유저dev 소속 프론트엔드 리더</li>
              <li>
                마이데이터(은행, 카드, 증권, 보험, 연금, PFMS) 및 회원 인증 등
                다양한 서비스 개발
              </li>
              <li>
                React, Next.js, K8S, Koa를 기반으로 모바일 지향 서비스 개발
              </li>
              <li>SPA에서 SSR 전환, 마이크로 서비스 설계, 운영, 배포</li>
              <li>Node.js(Koa) 기반 서버 개발</li>
            </ul>
            <ul className="mb-2 list-disc space-y-1 pl-5">
              <li>프론트엔드 조직의 공통 라이브러리 개발</li>
              <li>
                `eslint-config`, `create-**-apps` 등 여러 마이크로 서비스에서
                공통적으로 사용하는 패키지 개발
              </li>
              <li>커스텀 ESLint 설정 및 플러그인 제작, 배포</li>
              <li>리액트 기반 상태 관리 라이브러리 개발 및 운영</li>
              <li>개발에 필요한 Node.js 기반 CLI 개발 및 운영</li>
              <li>디자인 시스템 구축</li>
              <li>
                다양한 npm 패키지 개발{' '}
                <a href="https://github.com/orgs/NaverPayDev/repositories">
                  https://github.com/orgs/NaverPayDev/repositories
                </a>
              </li>
            </ul>
            <p className="text-gray-500 dark:text-gray-400">
              주요 언어 및 기술: React, TypeScript, JavaScript, MobX, Next.js,
              SCSS, react-query, SWR, styled-components, Koa, K8S, Rollup,
              esbuild, Vite, pnpm/npm workspaces, Turborepo
            </p>
          </li>
          <li className="mb-10 ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Frontend Engineer, Triple Corp.
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2019.05 ~ 2020.08
            </time>
            <ul className="mb-2 list-disc space-y-1 pl-5">
              <li>트리플 애플리케이션 프론트엔드 서비스 개발</li>
              <li>
                JavaScript로 작성된 결제 서비스 및 공통 컴포넌트를 TypeScript로
                변환
              </li>
              <li>글로벌 도시 검색 서비스 개발</li>
              <li>항공권 판매 서비스 개발 및 관리</li>
              <li>판매자-사용자 간 1:1 문의 채팅 서비스 개발</li>
            </ul>
            <p className="text-gray-500 dark:text-gray-400">
              주요 언어 및 기술: React, TypeScript, JavaScript, Next.js,
              styled-components, Lerna, Koa, Docker, Amazon ECS
            </p>
          </li>
          <li className="mb-10 ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Software Engineer, Kakao Corp.
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2016.09 ~ 2019.05
            </time>
            <ul className="mb-2 list-disc space-y-1 pl-5">
              <li>
                <a href="https://together.kakao.com/">카카오 같이가치</a> 서비스
                개발
              </li>
              <li>
                AngularJS로 작성된 레거시 애플리케이션을 Angular로 업그레이드
              </li>
              <li>AngularJS 기반 관리자 어드민 개발 및 운영</li>
              <li>서비스 전반을 풀스택으로 관리</li>
            </ul>
            <p className="text-gray-500 dark:text-gray-400">
              주요 언어 및 기술: Angular, AngularJS, JavaScript, TypeScript,
              Ruby on Rails, MySQL, Redis
            </p>
          </li>
          <li className="ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Software Engineer, Samsung SDS
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2014.03 ~ 2016.06
            </time>
            <ul className="mb-2 list-disc space-y-1 pl-5">
              <li>글로벌 EHR(Electronic Healthcare Record) 솔루션 개발</li>
              <li>해외 병원용 EHR 솔루션 및 간호 병동 서비스 개발</li>
              <li>Delphi, Oracle DB, Spring</li>
              <li>
                실내 내비게이션 시스템 POC - iOS 기반 비콘 위치 추적
                애플리케이션 개발
              </li>
              <li>Python을 활용한 데이터 정합성 및 유효성 계산</li>
              <li>
                블록체인 시스템 POC - 금융 고객사를 위한 블록체인 시스템 POC
                개발
              </li>
              <li>Custom blockchain, JavaScript, HTML, CSS</li>
            </ul>
          </li>
        </ol>
        <h2>Education</h2>
        <ol className="relative border-l border-gray-200 dark:border-gray-700">
          <li className="mb-10 ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              한국과학기술원 (KAIST) 대전캠퍼스
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2018.03 ~ 2020.02
            </time>
            <p className="text-gray-500 dark:text-gray-400">
              기술경영전문대학원 석사과정 졸업 (Highest Honor, GPA 4.23 / 4.3)
            </p>
          </li>
          <li className="ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              동국대학교 서울캠퍼스
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2007.03 ~ 2014.02
            </time>
            <p className="text-gray-500 dark:text-gray-400">
              국제통상학 전공, 영어통번역학 복수전공 학사과정 졸업
            </p>
          </li>
        </ol>
        <h2>Extra-Curricular Activities</h2>
        <ol className="relative border-l border-gray-200 dark:border-gray-700">
          <li className="mb-10 ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Jump Board Member
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2016.03 ~ 현재
            </time>
            <p>
              <a href="https://jumpsp.org/">점프</a> 이사로 활동하며 Google
              Cloud Platform을 활용해 업무 자동화 및 프로그래밍 교육을 담당하고
              있습니다.
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              주요 언어 및 기술: React, Next.js, Node.js, Vercel, Google
              Firebase, Google Cloud Platform, Python
            </p>
          </li>
          <li className="mb-10 ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              <a href="https://yceffort.kr/">yceffort.kr</a>
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2018 ~
            </time>
            <p>
              개인 블로그를 통해 프로그래밍 인사이트와 고민을 공유합니다.
              블로그는 직접 개발하여 운영중입니다.
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              주요 언어 및 기술: TypeScript, React, Next.js, Tailwind CSS, Node,
              Google Firebase
            </p>
          </li>
          <li className="ml-6">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-8 ring-white dark:bg-blue-500 dark:ring-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Samsung Software Academy For Youth (SSAFY) 멘토
            </h3>
            <time className="mb-2 block text-sm font-normal leading-none text-gray-500 dark:text-gray-400">
              2021.01 ~ 2021.12
            </time>
            <p>
              삼성 청년 소프트웨어 아카데미에서 청년들의 멘토로 참여해
              프로그래밍 관련 질의응답과 칼럼 작성을 진행했습니다.
            </p>
          </li>
        </ol>
        <h2>Publishing</h2>
        <ul>
          <li>
            모던 리액트 Deep Dive (단독 저자) -{' '}
            <a href="https://wikibook.co.kr/react-deep-dive/">wikibook.co.kr</a>
          </li>
          <li>
            리액트 인터뷰 가이드 (번역) -{' '}
            <a href="https://wikibook.co.kr/react-interview-guide/">
              wikibook.co.kr
            </a>
          </li>
          <li>
            npm deep dive (공동 저자) -{' '}
            <a href="https://wikibook.co.kr/npm-deep-dive/">wikibook.co.kr</a>
          </li>
        </ul>
        <h2>Links</h2>
        <p>
          <a href="https://yceffort.kr/">yceffort</a>
        </p>
        <p>
          <a href="https://github.com/yceffort">yceffort - Overview</a>
        </p>
      </div>
    </>
  )
}
