# Finiq PPT Forger

LLM(Gemini)을 활용하여 구조화된 데이터를 생성하고, 이를 바탕으로 PowerPoint 템플릿의 플레이스홀더(`{{key}}`)를 자동으로 채워주는 데스크톱 애플리케이션입니다.
기존 파이썬 기반 워크플로우에서 Node.js + Electron 기반의 데스크톱 앱으로 완벽하게 리팩토링 및 고도화되었습니다.

## 주요 기능
- **AI 기반 콘텐츠 생성**: Gemini API를 이용해 PPT에 들어갈 내용을 구조화된 형태로 자동 생성.
- **PowerPoint 자동화**: 템플릿(`.pptx`) 내 텍스트 박스, 표(Table) 등의 플레이스홀더 자동 치환 (`docxtemplater`, `pizzip` 활용).
- **데이터 임포트**: 엑셀 데이터 파일 등을 읽어와서 일괄 처리 가능.
- **Modern UI**: React와 TailwindCSS를 기반으로 한 직관적이고 세련된 사용자 인터페이스.
- **단독 실행 가능**: Windows 및 macOS용 실행 파일로 빌드 및 배포 지원 (Electron Builder).

## 기술 스택
- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Node.js, TypeScript, Electron (Main Process)
- **문서/데이터 처리**: `docxtemplater`, `pizzip` (PPTX 처리), `exceljs` (XLSX 처리)

## 설치 및 개발 환경 세팅

### 1. 사전 요구사항
- [Node.js](https://nodejs.org/) (버전 18 이상 권장)
- npm (Node.js 설치 시 포함)

### 2. 저장소 클론 및 패키지 설치
```bash
# 디렉토리 이동
cd finiq-pptforger

# 의존성 패키지 설치
npm install
```

### 3. 개발 모드 실행
Vite 개발 서버와 Electron 환경을 동시에 실행하여 앱을 띄웁니다.
```bash
npm run dev
```

## 애플리케이션 빌드 및 패키징

운영체제 환경에 맞춰 데스크톱 실행 파일(`.exe`, `.dmg` 등)을 생성할 수 있습니다.

```bash
# 1. 전체 코드 빌드 (TypeScript 컴파일 & Vite 빌드)
npm run build

# 2. 운영체제별 패키징 실행 (electron-builder)
# Windows 환경의 경우:
npm run dist:win

# macOS 환경의 경우:
npm run dist:mac
```
> **참고**: 패키징된 최종 결과물 파일은 `release/` 디렉토리에 생성됩니다.

## 사용 가이드 (앱 화면)
1. **API 키 설정**: 애플리케이션 초기 화면 또는 설정 탭에서 Gemini API Key를 등록합니다.
2. **템플릿 로드**: 플레이스홀더(`{{key}}`)가 포함된 PPTX 템플릿 파일을 선택합니다.
3. **콘텐츠 편집 및 생성**: 엑셀 파일 등으로 데이터를 임포트하거나 LLM 생성 버튼을 눌러 슬라이드에 삽입될 텍스트를 완성합니다.
4. **PPT 내보내기**: 완성된 내용으로 최종 PPTX 파일을 저장합니다.
