import Link from 'next/link'

import * as resumeStyles from '@/components/about/Resume.styles'

import {openSourceProjects} from './openSourceProjects'
import {ProjectTags} from './ProjectTags'
const sections = [
  {
    id: 'experience',
    label: '경력',
  },
  {
    id: 'publications',
    label: '저술·번역',
  },
  {
    id: 'open-source',
    label: '오픈소스',
  },
  {
    id: 'activities',
    label: '발표·활동',
  },
  {
    id: 'education',
    label: '학력',
  },
]
const experience = [
  {
    company: '네이버 파이낸셜',
    role: 'Frontend Engineer · 카드FE 리더',
    period: '2020.09 — 2026.03',
    description: '금융 서비스 개발과 프론트엔드 조직의 공통 기반 구축',
    contributions: [
      '마이데이터, 회원 인증, 카드탭 등 모바일 금융 서비스 개발',
      'SPA에서 SSR로 전환하고, Next.js·Koa·쿠버네티스 기반 서비스 설계·배포·운영',
      '공통 ESLint 설정과 플러그인, 상태 관리 라이브러리, 디자인 시스템 개발·운영',
      '프로젝트 생성 도구와 Node.js CLI, 업무 생산성을 위한 MCP 제작',
      '팀의 코드 리뷰와 멘토링을 주도하고 공통 npm 패키지를 개발·공개',
    ],
    stack:
      'React · TypeScript · Next.js · Node.js · Kubernetes · pnpm · Turborepo',
    link: {
      href: 'https://github.com/orgs/NaverPayDev/repositories',
      label: '공개 패키지 보기',
    },
  },
  {
    company: '트리플',
    role: 'Frontend Engineer',
    period: '2019.05 — 2020.08',
    description: '여행의 탐색부터 예약·결제까지 이어지는 웹 서비스 개발',
    contributions: [
      '글로벌 도시 검색과 항공권 판매 서비스 개발·운영',
      '결제 서비스와 공통 컴포넌트를 JavaScript에서 TypeScript로 전환',
      '판매자와 사용자 간 1:1 문의 채팅 서비스 개발',
    ],
    stack: 'React · TypeScript · Next.js · Koa · Docker · Amazon ECS',
  },
  {
    company: '카카오',
    role: 'Software Engineer',
    period: '2016.09 — 2019.05',
    description: '카카오 같이가치의 프론트엔드와 서버 개발·운영',
    contributions: [
      'AngularJS 기반 레거시 애플리케이션을 Angular로 전환',
      '관리자 도구를 개발하고 Ruby on Rails 기반 서버를 함께 운영',
    ],
    stack: 'Angular · TypeScript · Ruby on Rails · MySQL · Redis',
  },
  {
    company: '삼성SDS',
    role: 'Software Engineer',
    period: '2014.03 — 2016.06',
    description: '글로벌 의료 솔루션 개발과 신기술 개념 검증',
    contributions: [
      '해외 병원용 EHR 솔루션과 간호 병동 서비스 개발',
      'iOS 비콘 기반 실내 내비게이션과 금융 고객사 블록체인 PoC 개발',
      'Python을 활용한 데이터 정합성·유효성 검증',
    ],
    stack: 'Delphi · Oracle DB · Spring · JavaScript · Python',
  },
]
const publications = [
  {
    title: '프런트엔드 성능 최적화 Deep Dive',
    role: '단독 저자',
    subject: '네트워크부터 브라우저와 프레임워크까지, 성능을 이해하는 원리',
    href: 'https://wikibook.co.kr/frontend-optimization/',
  },
  {
    title: 'npm Deep Dive',
    role: '공동 저자',
    subject: '모듈 시스템, 패키지 관리와 JavaScript 생태계',
    href: 'https://wikibook.co.kr/npm-deep-dive/',
  },
  {
    title: '모던 리액트 Deep Dive',
    role: '단독 저자',
    subject: 'React의 동작 원리와 웹 애플리케이션 개발',
    href: 'https://wikibook.co.kr/react-deep-dive/',
  },
  {
    title: '리액트 인터뷰 가이드',
    role: '번역',
    subject: '질문과 답으로 살펴보는 React 개발 지식',
    href: 'https://wikibook.co.kr/react-interview-guide/',
  },
]
export function Resume() {
  return (
    <div
      className={`resume-resume ${resumeStyles.resume_resume} ${resumeStyles.resume_resume}`}
    >
      <header
        className={`resume-summary ${resumeStyles.resume_summary} ${resumeStyles.resume_summary}`}
      >
        <p
          className={`resume-eyebrow ${resumeStyles.resume_eyebrow} ${resumeStyles.resume_eyebrow}`}
        >
          EXPERIENCE & CONTRIBUTIONS
        </p>
        <h2 className={resumeStyles.resume_summary_h2}>
          서비스 개발부터 팀이 일하는 기반까지.
        </h2>
        <p
          className={`resume-lead ${resumeStyles.resume_lead} ${resumeStyles.resume_lead}`}
        >
          2014년부터 다양한 도메인의 소프트웨어를 만들고 운영해 왔습니다.
          프론트엔드 팀을 이끌고, 여러 서비스가 함께 쓰는 라이브러리와 도구를
          만들었습니다. 그 과정에서 얻은 경험을 책과 글, 오픈소스로 나눕니다.
        </p>
        <p
          className={`resume-status ${resumeStyles.resume_status} ${resumeStyles.resume_status}`}
        >
          <span
            aria-hidden="true"
            className={resumeStyles.resume_status_span}
          />
          프론트엔드 엔지니어 · 재직 중
        </p>
        <dl
          className={`resume-expertise ${resumeStyles.resume_expertise} ${resumeStyles.resume_expertise}`}
        >
          <div>
            <dt className={resumeStyles.element_dt}>서비스 개발</dt>
            <dd className={resumeStyles.element_dd}>
              React · TypeScript · Next.js
            </dd>
          </div>
          <div>
            <dt className={resumeStyles.element_dt}>운영과 성능</dt>
            <dd className={resumeStyles.element_dd}>
              Node.js · Kubernetes · 웹 성능
            </dd>
          </div>
          <div>
            <dt className={resumeStyles.element_dt}>팀의 개발 기반</dt>
            <dd className={resumeStyles.element_dd}>
              공통 라이브러리 · CLI · 코드 리뷰
            </dd>
          </div>
        </dl>
      </header>

      <div
        className={`resume-layout ${resumeStyles.resume_layout} ${resumeStyles.resume_layout}`}
      >
        <nav
          className={`resume-nav ${resumeStyles.resume_nav} ${resumeStyles.resume_nav}`}
          aria-label="이력서 목차"
        >
          {sections.map(({id, label}, index) => (
            <a
              key={id}
              href={`#${id}`}
              className={resumeStyles.resume_nav_link}
            >
              <span aria-hidden="true" className={resumeStyles.resume_nav_span}>
                0{index + 1}
              </span>
              {label}
            </a>
          ))}
        </nav>

        <div
          className={`resume-content ${resumeStyles.resume_content} ${resumeStyles.resume_content}`}
        >
          <section
            id="experience"
            className={`resume-section ${resumeStyles.resume_section} ${resumeStyles.resume_section}`}
            aria-labelledby="experience-title"
          >
            <div
              className={`resume-sectionHeading ${resumeStyles.resume_sectionHeading} ${resumeStyles.resume_sectionHeading}`}
            >
              <h2
                id="experience-title"
                className={resumeStyles.resume_sectionHeading_h2}
              >
                경력
              </h2>
              <span className={resumeStyles.resume_sectionHeading_span}>
                Experience
              </span>
            </div>
            <p
              className={`resume-sectionNote ${resumeStyles.resume_sectionNote} ${resumeStyles.resume_sectionNote}`}
            >
              이전에 근무한 곳에서의 경험입니다.
            </p>
            <ol
              className={`resume-timeline ${resumeStyles.resume_timeline} ${resumeStyles.resume_timeline}`}
            >
              {experience.map((job) => (
                <li
                  key={job.company}
                  className={`resume-job ${resumeStyles.resume_job} ${resumeStyles.resume_job}`}
                >
                  <div
                    className={`resume-jobHeading ${resumeStyles.resume_jobHeading} ${resumeStyles.resume_jobHeading}`}
                  >
                    <h3 className={resumeStyles.element_h3}>{job.company}</h3>
                    <span
                      className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                    >
                      {job.period}
                    </span>
                  </div>
                  <p
                    className={`resume-role ${resumeStyles.resume_role} ${resumeStyles.resume_role}`}
                  >
                    {job.role}
                  </p>
                  <p
                    className={`resume-jobDescription ${resumeStyles.resume_jobDescription} ${resumeStyles.resume_jobDescription}`}
                  >
                    {job.description}
                  </p>
                  <ul
                    className={`resume-contributions ${resumeStyles.resume_contributions} ${resumeStyles.resume_contributions}`}
                  >
                    {job.contributions.map((contribution) => (
                      <li
                        key={contribution}
                        className={resumeStyles.resume_contributions_li}
                      >
                        {contribution}
                      </li>
                    ))}
                  </ul>
                  <p
                    className={`resume-stack ${resumeStyles.resume_stack} ${resumeStyles.resume_stack}`}
                  >
                    {job.stack}
                  </p>
                  {job.link ? (
                    <a
                      className={`resume-textLink ${resumeStyles.resume_textLink} ${resumeStyles.resume_textLink} ${resumeStyles.resume_link_hover}`}
                      href={job.link.href}
                    >
                      {job.link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section
            id="publications"
            className={`resume-section ${resumeStyles.resume_section} ${resumeStyles.resume_section}`}
            aria-labelledby="publications-title"
          >
            <div
              className={`resume-sectionHeading ${resumeStyles.resume_sectionHeading} ${resumeStyles.resume_sectionHeading}`}
            >
              <h2
                id="publications-title"
                className={resumeStyles.resume_sectionHeading_h2}
              >
                저술·번역
              </h2>
              <span className={resumeStyles.resume_sectionHeading_span}>
                Publications
              </span>
            </div>
            <ul
              className={`resume-books ${resumeStyles.resume_books} ${resumeStyles.resume_books}`}
            >
              {publications.map((book) => (
                <li key={book.href}>
                  <a
                    className={`resume-book ${resumeStyles.resume_book} ${resumeStyles.resume_book} ${resumeStyles.resume_link_hover}`}
                    href={book.href}
                  >
                    <span
                      className={`resume-bookRole ${resumeStyles.resume_bookRole} ${resumeStyles.resume_bookRole}`}
                    >
                      {book.role}
                    </span>
                    <h3 className={resumeStyles.element_h3}>{book.title}</h3>
                    <p className={resumeStyles.resume_book_p}>{book.subject}</p>
                    <span
                      className={`resume-bookLink ${resumeStyles.resume_bookLink} ${resumeStyles.resume_bookLink}`}
                    >
                      {'출판사에서 보기 '}
                      <span aria-hidden="true">↗</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p
              className={`resume-writing ${resumeStyles.resume_writing} ${resumeStyles.resume_writing}`}
            >
              <span
                className={`resume-eyebrow ${resumeStyles.resume_eyebrow} ${resumeStyles.resume_eyebrow}`}
              >
                WRITING NOW
              </span>
              <Link
                href="/2026/09/who-learns-to-judge-beta-reader"
                className={resumeStyles.resume_writing_link}
              >
                {'남은 판단은 누가 배우는가 '}
                <span aria-hidden="true">↗</span>
              </Link>
              <span className={resumeStyles.resume_writing_span}>
                AI 시대의 개발자, 판단과 학습에 관한 에세이 · 가제, 집필 중
              </span>
            </p>
          </section>

          <section
            id="open-source"
            className={`resume-section ${resumeStyles.resume_section} ${resumeStyles.resume_section}`}
            aria-labelledby="open-source-title"
          >
            <div
              className={`resume-sectionHeading ${resumeStyles.resume_sectionHeading} ${resumeStyles.resume_sectionHeading}`}
            >
              <h2
                id="open-source-title"
                className={resumeStyles.resume_sectionHeading_h2}
              >
                오픈소스
              </h2>
              <span className={resumeStyles.resume_sectionHeading_span}>
                Open source
              </span>
            </div>
            <ul className="resume-entries">
              {openSourceProjects.map((project) => (
                <li
                  key={project.href}
                  className={resumeStyles.resume_entries_li}
                >
                  <span
                    className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                  >
                    {project.category}
                  </span>
                  <div>
                    <h3 className={resumeStyles.element_h3}>
                      <a
                        href={project.href}
                        className={resumeStyles.resume_link_hover}
                      >
                        {project.name} <span aria-hidden="true">↗</span>
                      </a>
                    </h3>
                    <p className={resumeStyles.resume_entries_p}>
                      {project.description}
                    </p>
                    <ProjectTags tags={project.tags} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            id="activities"
            className={`resume-section ${resumeStyles.resume_section} ${resumeStyles.resume_section}`}
            aria-labelledby="activities-title"
          >
            <div
              className={`resume-sectionHeading ${resumeStyles.resume_sectionHeading} ${resumeStyles.resume_sectionHeading}`}
            >
              <h2
                id="activities-title"
                className={resumeStyles.resume_sectionHeading_h2}
              >
                발표·활동
              </h2>
              <span className={resumeStyles.resume_sectionHeading_span}>
                Beyond work
              </span>
            </div>
            <ul className="resume-entries">
              <li className={resumeStyles.resume_entries_li}>
                <span
                  className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                >
                  2024
                </span>
                <div>
                  <h3 className={resumeStyles.element_h3}>
                    DAN24 컨퍼런스 발표
                  </h3>
                  <p className={resumeStyles.resume_entries_p}>
                    웹 서비스 번들 사이즈 최적화를 주제로 발표했습니다.
                  </p>
                </div>
              </li>
              <li className={resumeStyles.resume_entries_li}>
                <span
                  className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                >
                  2021.01 — 2021.12
                </span>
                <div>
                  <h3 className={resumeStyles.element_h3}>SSAFY 멘토</h3>
                  <p className={resumeStyles.resume_entries_p}>
                    삼성 청년 소프트웨어 아카데미에서 프로그래밍 질의응답과 칼럼
                    작성으로 청년 개발자들의 학습을 도왔습니다.
                  </p>
                </div>
              </li>
              <li className={resumeStyles.resume_entries_li}>
                <span
                  className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                >
                  2018 — 현재
                </span>
                <div>
                  <h3 className={resumeStyles.element_h3}>
                    <Link href="/" className={resumeStyles.resume_link_hover}>
                      {'기술 블로그 yceffort.kr '}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </h3>
                  <p className={resumeStyles.resume_entries_p}>
                    블로그를 직접 개발·운영하며 프레임워크 내부 동작, 성능과
                    운영, 개발 도구, AI와 함께 일하는 경험을 기록합니다.
                  </p>
                </div>
              </li>
              <li className={resumeStyles.resume_entries_li}>
                <span
                  className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                >
                  2016.03 — 현재
                </span>
                <div>
                  <h3 className={resumeStyles.element_h3}>
                    <a
                      href="https://jumpsp.org/"
                      className={resumeStyles.resume_link_hover}
                    >
                      {'사단법인 점프 이사 '}
                      <span aria-hidden="true">↗</span>
                    </a>
                  </h3>
                  <p className={resumeStyles.resume_entries_p}>
                    Google Cloud Platform을 활용한 업무 자동화와 프로그래밍
                    교육에 참여하고 있습니다.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <section
            id="education"
            className={`resume-section ${resumeStyles.resume_section} ${resumeStyles.resume_section}`}
            aria-labelledby="education-title"
          >
            <div
              className={`resume-sectionHeading ${resumeStyles.resume_sectionHeading} ${resumeStyles.resume_sectionHeading}`}
            >
              <h2
                id="education-title"
                className={resumeStyles.resume_sectionHeading_h2}
              >
                학력
              </h2>
              <span className={resumeStyles.resume_sectionHeading_span}>
                Education
              </span>
            </div>
            <ul className="resume-entries">
              <li className={resumeStyles.resume_entries_li}>
                <span
                  className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                >
                  2018.03 — 2020.02
                </span>
                <div>
                  <h3 className={resumeStyles.element_h3}>
                    한국과학기술원 (KAIST)
                  </h3>
                  <p className={resumeStyles.resume_entries_p}>
                    기술경영전문대학원 석사
                  </p>
                  <p
                    className={`resume-honor ${resumeStyles.resume_honor} ${resumeStyles.resume_honor}`}
                  >
                    Highest Honor · GPA 4.23 / 4.3
                  </p>
                </div>
              </li>
              <li className={resumeStyles.resume_entries_li}>
                <span
                  className={`resume-period ${resumeStyles.resume_period} ${resumeStyles.resume_period}`}
                >
                  2007.03 — 2014.02
                </span>
                <div>
                  <h3 className={resumeStyles.element_h3}>동국대학교</h3>
                  <p className={resumeStyles.resume_entries_p}>
                    국제통상학 전공 · 영어통번역학 복수전공 학사
                  </p>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
