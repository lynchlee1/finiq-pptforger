# PPT Forger App Architecture & Design

## 1. 개요
LLM 기반 JSON 데이터를 바탕으로 PPT를 생성하고 관리하는 데스크톱 애플리케이션입니다.

## 2. 기술 스택
- **Framework**: Electron
- **Frontend**: React, TypeScript, TailwindCSS, Lucide React (Icons)
- **Backend**: Node.js, TypeScript (Electron Main Process)
- **Generator**: Python (Existing `ppt_generator.py`)
- **State Management**: Zustand or React Context

## 3. 화면 설계 (UI Screens)
1. **Dashboard (홈)**
   - 최근 작업 프로젝트 목록
   - 새 프로젝트 시작 (템플릿 선택 또는 JSON 임포트)
   - 설정 (Python 경로, 기본 저장 위치 등)

2. **Workspace (편집기)**
   - **좌측 사이드바**: 슬라이드 썸네일 리스트 (순서 변경, 추가/삭제)
   - **중앙 캔버스**: 현재 슬라이드 실시간 프리뷰 (또는 구조화된 데이터 뷰)
   - **우측 패널**: 슬라이드별 속성 및 데이터 편집 (JSON 필드 매핑)
   - **상단 툴바**: 프로젝트 이름, 생성/내보내기 버튼

3. **Export Modal**
   - 파일명 설정, 출력 경로 선택
   - 진행 상태 표시 (Progress Bar)

## 4. 확장 가능성을 위한 설계 (Extensibility)
- **Plugin System**: 새로운 슬라이드 타입(차트, 이미지 중심 등)을 모듈화하여 추가 가능하게 설계.
- **Theme Engine**: 사용자 정의 테마 및 스타일 가이드 적용 가능.
- **IPC Interface**: Electron 메인 프로세스와 렌더러 프로세스 간의 통신을 API 형태로 정형화.

## 5. 디자인 컨셉 (Aesthetic)
- **Modern Light Mode**: 밝고 깨끗한 배경(Slate-50)에 명확한 계층 구조를 제공하는 화이트 패널 사용.
- **Glassmorphism & Depth**: 부드러운 그림자(Soft Drop Shadows)와 투명도를 활용해 깊이감과 세련미 강조.
- **Vibrant Accent**: 신뢰감을 주면서도 트렌디한 Electric Blue(Primary)를 포인트 컬러로 활용.
- **Sleek Typography**: Inter 폰트를 사용하여 텍스트의 가독성을 높이고 깔끔한 UI 구성.

## 6. 프로젝트 구조
```text
/
├── main/               # Electron Main Process (TS)
│   ├── index.ts
│   └── bridge/         # IPC Handlers, Python Runner
├── renderer/           # React Frontend (TS)
│   ├── src/
│   │   ├── components/ 
│   │   ├── hooks/
│   │   ├── pages/      
│   │   └── store/      
├── src/                # Shared Python Core (Existing)
└── package.json
```
