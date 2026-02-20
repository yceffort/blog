---
title: '🥧 Pie Bot: @pie @naverpay 코드 전문가 만들기'
marp: true
paginate: true
theme: default
tags:
  - AI
  - Gemini
  - VSCode
  - NaverPayDev
date: 2025-05-26
description: 'Naver Pay 개발자를 위한 AI 코드 어시스턴트 Pie Bot 개발에 함께해주세요!'
published: false
---

## 🤔 Naver Pay 개발, 이런 점들이 궁금하거나 어렵지 않으셨나요?

<style scoped>section { font-size: 22px; }</style>

- 방대한 내부 라이브러리와 수많은 코드들, 원하는 정보를 찾거나 사용법을 파악하는 데 시간이 걸리셨나요? 😩
- 특정 기능을 구현하거나 문제를 해결하기 위해 어떤 코드를 참고해야 할지 막막했던 경험은요? 🗺️
- 새로운 동료가 합류했을 때, 내부 코드와 개발 문화에 빠르게 적응하도록 도울 방법은 없을까요? 🤝
- 결국 우리 코드를 잘 팔아서 생산성을 올리려면 더이상 문서로는 안된다!
- 근데 그거 다 떠나서, 그냥 AI 한번 써서 개발해보고 싶잖아!!

---

## ✨ Pie bot 만들기

- **목표:** 네이버 파이낸셜 개발자들의 생산성을 향상시키고, 방대한 내부 코드와 기술 자산에 대한 접근성을 강화하는 VSCode 확장 프로그램 개발
- **핵심:** Google Gemini AI의 강력한 언어 이해/생성 능력과 `@naverpay/*` 패키지에 대한 방대한 지식을 학습시키기
- **현재:** 주요 기능 구현 및 핵심 아키텍처 구축 완료! 이제 여러분의 아이디어와 참여로 함께 성장시켜나갈 베타버전!

---

## 🗺️ 전체 시스템 개요도

사용자 질문 (`// @pie`) ➔ VSCode 확장 (컨텍스트 수집) ➔ RAG (관련 코드 검색) ➔ 프롬프트 구성 ➔ Gemini API 호출 ➔ 답변 생성 ➔ 웹뷰 채팅창 표시

<https://github.com/NaverPayDev/bot/issues/10>

> 근데 이게 최선이라고 생각하진 않기 때문에, 같이 개선하시죠!

---

## 🛠️ Pie Bot 아키텍처: VSCode 확장 프로그램

<style scoped>section { font-size: 20px; }</style>

- **역할:** 사용자 인터페이스 제공, 명령어 처리, 에디터 컨텍스트 수집, 서비스 모듈 오케스트레이션.
- **개발 환경:** `TypeScript`, `Node.js`
- **주요 VSCode API:**
  - `Commands API`: `// @pie` 명령어 등록 및 실행 로직 연결.
  - `Webview API`: "Pie Bot Chat" 패널 UI (HTML/CSS/JS) 렌더링 및 확장 <-> 웹뷰 양방향 메시지 통신.
  - `SecretStorage API`: Gemini API 키 등 민감 정보의 안전한 저장 및 로드.
  - `TextEditor/Document API`: 현재 활성화된 파일 경로, 내용, 선택 영역, 커서 주변 코드 등 에디터 정보 실시간 접근.
  - `Window API`: 정보/오류/경고 메시지 표시, 진행 상태 알림(`withProgress`) 기능.
- **주요 자체 모듈 (`src/` 디렉토리):**
  - `extension.ts`: 확장 프로그램의 메인 진입점, 명령어 등록, 전체 기능 흐름 제어.
  - `services/webviewService.ts`: 웹뷰 패널의 생명주기 관리, 웹뷰와 확장 간 메시지 처리 로직 담당.
  - `services/apiKeyManager.ts`: API 키 설정 및 로드 유틸리티.
  - `services/chatSessionManager.ts`: 대화 이력 및 현재 `@pie` 세션의 컨텍스트(최초 질문, RAG 결과 등) 관리.

> vscode 가 electron 기반이라 가능했다. 마소야 고맙다...! 시카고 방향으로 큰 절🙇🏻‍♂️

---

## 🧠 Pie Bot의 지식: 지식 베이스 구축 및 RAG

<style scoped>section { font-size: 20px; }</style>

- **역할:** Naver Pay Dev 코드를 AI가 이해하고 참고할 수 있는 "지식 창고"로 만들고, 사용자 질문 시 이 창고에서 관련 정보를 효과적으로 찾아 AI에게 제공.
- **1. 데이터 전처리/임베딩 (`scripts/embed_naverpay_code.js`):**
  - **소스 코드 수집:** `NAVERPAY_REPOS`에 정의된 Naver Pay Dev GitHub 저장소들을 로컬로 클론하여 사용 (경로 설정 필요).
  - **파일 필터링:** `RELEVANT_EXTENSIONS`, `IGNORE_PATTERNS` 설정을 통해 분석 대상 파일 선정.
  - **청킹 (Chunking):** 현재 파일 단위로 코드 분할.
  - **텍스트 임베딩:** 각 코드 청크(파일 내용 + 경로 등 메타데이터)를 Gemini `embedding-001` 모델을 사용하여 의미론적 정보를 담은 고차원 벡터로 변환.
  - **저장:** 생성된 벡터와 메타데이터를 `data/naverpay_embeddings.json` 파일에 저장.
- **2. 실시간 정보 검색 및 증강 (`src/services/ragService.ts`):**
  - **질문 임베딩:** 사용자 질문도 동일 임베딩 모델로 벡터 변환.
  - **벡터 검색:** 질문 벡터와 "지식 창고"의 모든 코드 벡터 간 **코사인 유사도**를 계산하여 의미적으로 유사한 코드 조각 검색.
  - **Reranking (순위 재조정):** 1차 검색 결과에 키워드 일치도, 파일 유형(index/test), 경로의 중요도 등 휴리스틱 규칙을 적용하여 점수를 재계산하고, 최종적으로 AI에게 제공할 Top-K 참고자료 선정.

---

## 🤖 Pie Bot의 두뇌: AI 엔진 연동 및 답변 생성 (1)

<style scoped>section { font-size: 22px; }</style>

- **역할:** 수집된 모든 컨텍스트(사용자 질문, 에디터 정보, RAG 결과, 대화 이력)를 종합
- **1. 프롬프트 엔지니어링 (`src/prompts.ts`):**
  - **시스템 역할 명확화:** 프롬포트 깎는 노인
  - **상세하고 구조화된 지침 제공:** 답변 생성 형식, 코드 스타일(ESM), 정보 인용 규칙, 환각 방지 지침 등 을 명시적으로 제공.
  - **동적 컨텍스트 주입:**
    - 현재 사용자 작업 환경 (파일 경로, 커서 주변 코드).
    - 사용자가 `@pie` 주석으로 지목한 "타겟 코드"와 실제 질문 내용.
    - RAG를 통해 검색된 참고 코드를 제안하기
    - 이전 대화 이력 흐름을 잘 쫓아가기 (후속 질문 시)

---

## 🤖 Pie Bot의 두뇌: AI 엔진 연동 및 답변 생성 (2)

<style scoped>section { font-size: 22px; }</style>

- **역할:** 최종 답변 및 코드 예시 생성.
- **2. API 호출 및 답변 처리 (`src/services/geminiApiService.ts`):**
  - `@google/generative-ai` Node.js SDK 활용.
  - 선택된 Gemini 생성 모델 (예: `gemini-1.5-pro-latest`) API 호출.
  - `startChat` 및 `sendMessage` API를 활용한 대화형 상호작용.
  - Google AI의 기본 안전 설정(Safety Settings) 적용.
  - 생성된 텍스트 기반 답변을 웹뷰(`webviewService`)로 전달하여 사용자에게 표시.

---

## 🙌 Pie Bot, 함께 만들어요! (1/5)

AI 가 미래의 대세라는데.. 한번 해보고 싶지 않으신가요!

- <https://github.com/NaverPayDev/bot>
- <https://github.com/NaverPayDev/bot/issues>

---

## 🙌 Pie Bot, 함께 만들고 싶어요! (2/5)

<style scoped>section { font-size: 18px; }</style>

### 기여 분야 1: Pie Bot의 "지식"과 "이해력" 강화 (RAG & Context)

- **목표:** Pie Bot이 Naver Pay 코드와 문서를 더 깊이, 더 정확하게 이해하고, 필요한 정보를 효과적으로 찾아 활용하도록 RAG 파이프라인과 컨텍스트 관리 기능을 고도화
- **관련 GitHub 이슈:**
  - `#3 [RAG] Vector DB 도입 검토`
    - **내용:** 대용량 임베딩 데이터의 효율적 저장, 빠른 검색, 고급 필터링 기능 도입을 위해 JSON 파일 대신 Vector DB(ChromaDB, FAISS, Vertex AI Vector Search 등) 사용을 검토하고 적용
    - **필요 역량/관심사:** 데이터베이스, 검색 시스템, Vector DB 경험, 대용량 데이터 처리.
  - `#4 [RAG] 코드 의미 단위(함수/클래스) 기반 청킹 도입으로 RAG 정확도 향상`
    - **내용:** 파일 단위 청킹에서 함수/클래스 등 더 작은 의미 단위로 코드를 분할하여 임베딩함으로써 검색 정밀도를 높이고, LLM에 더 집중된 컨텍스트를 제공
    - **필요 역량/관심사:** 코드 파서(AST, tree-sitter 등) 도입해본 경험 필요.
  - `#7 [Context] 후속 질문 내용에 따른 RAG 컨텍스트 동적 재검색 또는 확장 기능 구현`
    - **내용:** 대화의 맥락이 바뀌거나 사용자가 새로운 주제로 질문할 경우, 기존 RAG 참고 정보 외에 새로운 정보를 동적으로 검색/추가하여 후속 질문의 답변 품질을 향상
    - **필요 역량/관심사:** LLM 컨텍스트 관리, 대화형 AI, 자연어 이해(NLU) 기본.

---

## 🙌 Pie Bot, 이렇게 함께 만들고 싶어요! (3/5)

<style scoped>section { font-size: 20px; }</style>

### 기여 분야 2: Pie Bot의 "지식 범위" 확장 및 "최신성" 유지 (Data Pipeline)

- **목표:** Pie Bot이 코드뿐만 아니라 다양한 내부 정보 자산을 학습하고, 항상 최신 정보를 사용자에게 제공할 수 있도록 강력한 데이터 파이프라인을 구축
- **관련 GitHub 이슈:**
  - `#6 내부 pie 도 학습할 수 있도록 구현`
    - **내용:** 현재 코드베이스 외에, `@pie/*` 관련 문서나 데이터도 RAG 지식 베이스에 통합하여 Pie Bot의 답변 범위를 확장. (위키, 문서 등도 포함)
    - **필요 역량/관심사:** 데이터 파이프라인 구축, 다양한 데이터 소스(API, DB, 파일 시스템, Wiki/Confluence API) 연동
  - `#8 [RAG] 임베딩 데이터 자동 업데이트 및 버전 관리 시스템 구축`
    - **내용:** 코드/문서 변경 시 임베딩 데이터를 자동으로 업데이트하고, 필요시 특정 시점의 임베딩 버전으로 롤백하거나 관리할 수 있는 견고한 시스템을 구축
    - **필요 역량/관심사:** CI/CD, DevOps/MLOps, 데이터 버전 관리(DVC 등), 스크립팅 및 자동화.

---

## 🙌 Pie Bot, 이렇게 함께 만들고 싶어요! (4/5)

<style scoped>section { font-size: 20px; }</style>

### 기여 분야 3: 사용자 경험(UX) 및 핵심 기능 강화 (Extension & Webview)

- **목표:** 개발자들이 Pie Bot을 더 쉽고, 편리하며, 다양한 방식으로 활용할 수 있도록 인터페이스와 핵심 기능을 개선하고 확장.
- **관련 GitHub 이슈:**
  - `#5 채팅 패널 기능 디자인 및 기능 개선`
    - **내용:** 웹뷰 기반 채팅창의 UI 디자인(색상, 폰트, 레이아웃) 개선, Markdown 완전 렌더링, 코드 블록 구문 강조 및 복사 버튼, 입력 편의 기능, 메시지 스트리밍 등 사용자 경험 전반을 향상. (웹뷰 깎기)
    - **필요 역량/관심사:** HTML, CSS, JavaScript, 웹 프론트엔드 개발, UI/UX 디자인, VSCode 웹뷰 API.
  - `#9 [Feature] 명령어 팔레트를 통한 Pie Bot 주요 기능 접근`
    - **내용:** `// @pie` 주석 외에도 VSCode 명령어 팔레트(Cmd+Shift+P)에서 Pie Bot의 주요 기능(예: 특정 라이브러리 정보 검색, 설정 변경, 최근 질문 다시보기 등)을 직접 실행할 수 있도록 지원
    - **필요 역량/관심사:** VSCode 확장 API (Commands, Quick Pick 등), 사용자 인터페이스 설계.

> vscode 기반 채팅봇 ? works? 꼭 vscode 는 아니어도 좋을듯?

---

## 🙌 Pie Bot, 이렇게 함께 만들고 싶어요! (5/5)

<style scoped>section { font-size: 20px; }</style>

- `#1 개발환경 설정하기`: 새로운 참여자를 위한 쉽고 일관된 개발 환경 설정 가이드 개선.
- `#2 gemini ai 키 회사돈으로 받아오기`: 안정적인 API 사용을 위한 지원 확보. 돈줘!

---

## Q&A

- 왜 A 기술이 아니고 B를 썼나요: 나도 잘 몰라! 같이 공부해용!
- 지금은 누구 돈으로 하고 있나요: 내 돈입니다. (벌써 5만원 씀) 일단 돈부터 구해와야함. (같이 하고 싶은 분이 있다면 자금 조달 해보겠습니다)
- @pie 는 어떻게 하나요?: 일단 빠른 POC를 위해서 외부에서 하는 것을 제안 드립니다. (오픈소스라서 이게 더 좋긴함)

---

## 🙏 감사합니다
