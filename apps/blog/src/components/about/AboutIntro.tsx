import * as stylex from '@stylexjs/stylex'
import Link from 'next/link'

import type {Locale} from '@/utils/postPaths'

import {openSourceProjects} from './openSourceProjects'
import {ProjectTags} from './ProjectTags'

import '@/styles/reading.css'
const sx = stylex.create({
  div: {
    '@layer utilities': {
      paddingTop: 'calc(var(--spacing) * 8)',
      paddingBottom: 'calc(var(--spacing) * 8)',
      gridColumn: {
        default: null,
        '@media (width >= 80rem)': 'span 2 / span 2',
      },
    },
  },
  div2: {
    '@layer utilities': {
      maxWidth: 'none',
    },
  },
})
function ProjectList({locale}: {locale: Locale}) {
  return (
    <ul>
      {openSourceProjects.map((project) => (
        <li key={project.href}>
          <a href={project.href}>{project.name}</a>
          {locale === 'en' ? ': ' : ' — '}
          {project.description[locale]}
          <ProjectTags tags={project.tags} locale={locale} />
        </li>
      ))}
    </ul>
  )
}

export function AboutIntro({locale = 'ko'}: {locale?: Locale}) {
  return (
    <div className={stylex.props(sx.div).className}>
      <div
        className={`markdown-body markdown-dark ${stylex.props(sx.div2).className}`}
      >
        {locale === 'en' ? <IntroEn /> : <IntroKo />}
      </div>
    </div>
  )
}

function IntroKo() {
  return (
    <>
      <p>
        안녕하세요. 프론트엔드 엔지니어 yceffort입니다. 2014년부터 소프트웨어를
        개발해 왔고, 현재도 프론트엔드 엔지니어로 일하고 있습니다. 의료, 기부,
        여행, 금융 서비스를 거치며 사용자 화면부터 서버와 배포 환경까지
        다뤘습니다. 프론트엔드 팀을 이끌며 공통 라이브러리와 개발 도구를 만들고,
        코드 리뷰와 멘토링을 통해 동료들과 함께 일하는 방법을 고민해 왔습니다.
      </p>
      <p>
        잘 동작하던 코드가 왜 깨졌는지, 빨라졌다는 숫자를 어디까지 믿어도 되는지
        궁금해합니다. 문서만으로 설명되지 않으면 소스 코드와 빌드 결과물을 읽고,
        직접 재현하고 측정해 봅니다. 이 블로그에는 그 과정에서 알게 된 것과 잘못
        짚었던 것, 아직 답하지 못한 질문을 함께 남깁니다.
      </p>

      <h2>관심을 두고 있는 것들</h2>
      <ul>
        <li>
          <strong>프레임워크 아래에서 일어나는 일.</strong>
          {
            ' React의 렌더링과 Next.js의 캐시, JavaScript 모듈과 번들러의 동작을 살펴봅니다.'
          }{' '}
          <Link href="/2026/08/turbopack-scope-hoisting-singleton-split">
            소스에서는 하나였던 싱글톤이 빌드 뒤에 두 개가 된 문제
          </Link>
          {'처럼, 추상화 아래로 내려가야 설명되는 현상에 관심이 많습니다.'}
        </li>
        <li>
          <strong>측정으로 확인하는 성능과 운영.</strong>
          {
            ' 브라우저와 네트워크의 병목부터 Node.js 서버와 쿠버네티스의 배포 문제까지 따라갑니다. 이 블로그도 직접 개발하고 운영하며,'
          }{' '}
          <Link href="/2026/08/service-worker-caching-3">
            서비스 워커의 비용을 실사용자 데이터와 실험으로 비교
          </Link>
          {'하는 등 개선 효과와 측정의 한계를 함께 확인합니다.'}
        </li>
        <li>
          <strong>오래 믿고 쓸 수 있는 개발 도구.</strong>
          {
            ' 공통 라이브러리와 CLI, 패키지 관리와 공급망 보안에 관심이 있습니다. 기능과 속도만큼 호환성과 유지보수 비용을 중요하게 생각합니다. 최근에는'
          }{' '}
          <Link href="/2026/09/porting-markdownlint-cli2-to-rust">
            매일 쓰는 마크다운 린터를 Rust로 옮기며
          </Link>
          {', 기존 도구와 같은 결과를 내는 데 필요한 일을 기록했습니다.'}
        </li>
        <li>
          <strong>AI와 함께 일하는 개발자의 판단과 학습.</strong>
          {
            ' 코딩 에이전트를 일상적으로 사용하면서, 생성된 코드를 무엇으로 검증할지, 코드를 덜 읽게 된 환경에서 개발자는 어떻게 판단을 배울지 고민합니다. 도구를 쓰는 제 경험과 다른 개발자들의 이야기를 글로 옮기고 있습니다.'
          }
        </li>
      </ul>

      <h2>쓰고 나누는 일</h2>
      <p>
        2018년부터 블로그에 배운 것과 시행착오를 기록하고 있습니다. 기술을
        이해하고 설명하는 일을 책으로도 이어 왔습니다.
      </p>
      <ul>
        <li>
          <a href="https://wikibook.co.kr/react-deep-dive/">
            『모던 리액트 Deep Dive』
          </a>{' '}
          집필
        </li>
        <li>
          <a href="https://wikibook.co.kr/npm-deep-dive/">『npm Deep Dive』</a>{' '}
          공동 집필
        </li>
        <li>
          <a href="https://wikibook.co.kr/frontend-optimization/">
            『프런트엔드 성능 최적화 Deep Dive』
          </a>{' '}
          집필
        </li>
        <li>
          <a href="https://wikibook.co.kr/react-interview-guide/">
            『리액트 인터뷰 가이드』
          </a>{' '}
          번역
        </li>
      </ul>
      <p>
        지금은 AI가 코드를 쓰는 시대에 개발자의 판단이 어디서 길러지는지를 묻는
        에세이{' '}
        <Link href="/2026/09/who-learns-to-judge-beta-reader">
          『남은 판단은 누가 배우는가』(가제)
        </Link>
        를 쓰고 있습니다. 제 경험을 돌아보고 다른 개발자들의 이야기를 들으며
        원고를 다듬고 있습니다.
      </p>
      <p>
        DAN24에서는 웹 서비스 번들 사이즈 최적화를 주제로 발표했습니다. 책과
        블로그에서 다룬 내용을 강연으로도 나누고 있습니다.
      </p>

      <h2>오픈소스로 만드는 도구</h2>
      <p>
        직접 쓰다가 불편했던 것을 도구로 만들고, 기존 라이브러리를 필요한 환경에
        맞게 확장합니다. 브라우저 호환성과 웹뷰 디버깅부터 개발 도구와 일상적인
        작업을 돕는 데스크톱 앱까지 관심을 넓혀 가고 있습니다.
      </p>
      <ProjectList locale="ko" />
      <h2>코드로 돕는 일</h2>
      <p>
        {'2016년부터 사단법인 '}
        <a href="https://jumpsp.org/">점프</a>
        {
          '의 이사로 활동하며 업무 자동화와 프로그래밍 교육에 참여하고 있습니다. 2021년에는 삼성 청년 소프트웨어 아카데미(SSAFY)에서 멘토로 활동했습니다. 함께 일하는 사람의 반복 작업을 줄이고, 누군가가 스스로 문제를 풀 수 있도록 돕는 일에도 시간을 쓰고 있습니다.'
        }
      </p>
    </>
  )
}

function IntroEn() {
  return (
    <>
      <p>
        Hi, I&apos;m yceffort, a frontend engineer. I have been building
        software since 2014 and still work as a frontend engineer today. Across
        healthcare, donation, travel, and financial services, I have worked on
        everything from user interfaces to servers and deployment environments.
        While leading a frontend team, I built shared libraries and developer
        tools, and thought about how people work well together through code
        review and mentoring.
      </p>
      <p>
        I want to know why code that used to work broke, and how far to trust a
        number that says something got faster. When the documentation does not
        explain it, I read the source code and the build output, then reproduce
        and measure it myself. On this blog I leave what I learned along the
        way, where I got it wrong, and the questions I still cannot answer.
      </p>

      <h2>What I pay attention to</h2>
      <ul>
        <li>
          <strong>What happens beneath the framework.</strong>
          {
            ' I look into React rendering, the Next.js cache, JavaScript modules, and how bundlers behave. I am drawn to problems that only make sense below the abstraction, like '
          }
          <Link href="/en/2026/08/turbopack-scope-hoisting-singleton-split">
            a singleton that was one module in the source but became two after
            the build
          </Link>
          .
        </li>
        <li>
          <strong>Performance and operations, confirmed by measurement.</strong>
          {
            ' I follow bottlenecks from the browser and the network all the way to Node.js servers and Kubernetes deployments. I also build and run this blog myself, and check both the improvement and the limits of measurement, for example by '
          }
          <Link href="/en/2026/08/service-worker-caching-3">
            comparing the cost of a service worker with real user data and
            experiments
          </Link>
          .
        </li>
        <li>
          <strong>Developer tools you can trust for years.</strong>
          {
            ' I care about shared libraries, CLIs, package management, and supply chain security, and I weigh compatibility and maintenance cost as much as features and speed. Recently I wrote down what it took to match the original tool’s results while '
          }
          <Link href="/en/2026/09/porting-markdownlint-cli2-to-rust">
            porting the Markdown linter I use every day to Rust
          </Link>
          .
        </li>
        <li>
          <strong>
            How developers who work with AI build judgment and learn.
          </strong>
          {
            ' I use coding agents every day. I think about what to verify generated code with, and how developers learn judgment when they read less code. I write about my own experience with these tools and about what other developers tell me.'
          }
        </li>
      </ul>

      <h2>Writing and sharing</h2>
      <p>
        I have been recording what I learn and the mistakes I make on this blog
        since 2018, and I have carried the work of understanding and explaining
        technology into books as well. The books are published in Korean.
      </p>
      <ul>
        <li>
          <a href="https://wikibook.co.kr/react-deep-dive/">
            Modern React Deep Dive
          </a>
          , author
        </li>
        <li>
          <a href="https://wikibook.co.kr/npm-deep-dive/">npm Deep Dive</a>,
          co-author
        </li>
        <li>
          <a href="https://wikibook.co.kr/frontend-optimization/">
            Frontend Performance Optimization Deep Dive
          </a>
          , author
        </li>
        <li>
          <a href="https://wikibook.co.kr/react-interview-guide/">
            React Interview Guide
          </a>
          , Korean translation
        </li>
      </ul>
      <p>
        I am now writing an essay,{' '}
        <Link href="/2026/09/who-learns-to-judge-beta-reader">
          Who Learns the Judgment That Remains (working title, in Korean)
        </Link>
        , about where developers build their judgment when AI writes the code. I
        am refining the manuscript by looking back on my own experience and
        listening to other developers.
      </p>
      <p>
        At DAN24, I gave a talk on optimizing the bundle size of web services. I
        also share what I covered in the books and on the blog through talks.
      </p>

      <h2>Tools I build as open source</h2>
      <p>
        I turn what bothered me in daily work into tools, and extend existing
        libraries for the environments I need them in. My interest is growing
        from browser compatibility and webview debugging to developer tools and
        desktop apps that help with everyday work.
      </p>
      <ProjectList locale="en" />
      <h2>Helping with code</h2>
      <p>
        {'Since 2016 I have served on the board of the nonprofit '}
        <a href="https://jumpsp.org/">JUMP</a>
        {
          ', helping with work automation and programming education. In 2021 I was a mentor at the Samsung Software Academy For Youth (SSAFY). I also spend time reducing repetitive work for the people I work with and helping others solve problems on their own.'
        }
      </p>
    </>
  )
}
