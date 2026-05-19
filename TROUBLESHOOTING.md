# TROUBLESHOOTING

이 문서는 PPT 내부 미리보기와 실제 PowerPoint 렌더링 차이를 줄이려다 시도한 것, 실패한 것, 다시 반복하면 안 되는 판단을 기록한다.

## 문제 요약

- 앱 내부 미리보기와 실제 PowerPoint/PPTX 렌더링이 다르게 보였다.
- 특히 `Deal_Summary_Template_1.0`의 발행 조건 슬라이드에서 다음 차이가 반복됐다.
  - 한글/영문 폰트가 PowerPoint와 다르게 보임.
  - `TIMEFOLIO Asset Management` 배경 텍스트의 굵기/색/위치가 달라짐.
  - 표 내부 row 높이와 텍스트 위치가 실제 PowerPoint보다 과하게 커 보임.
  - 일부 수정은 실제 PPTX 출력까지 과하게 건드려 색상과 배경 느낌을 퇴보시킴.

## 현재까지 확인한 사실

- macOS Quick Look으로 만든 PNG는 PowerPoint 자체 렌더링과 같지 않다.
- `preview_selected.pptx` 안의 표 row 높이는 PPTX XML 기준으로 올바르게 들어가도 Quick Look PNG에서는 표가 세로로 늘어날 수 있다.
  - 확인값: PPTX 기대 table bottom은 약 `1040px`.
  - Quick Look PNG에서 감지된 표 하단은 약 `1348px`.
  - 즉 표 margin 문제가 아니라 Quick Look renderer가 표 row layout을 다르게 계산한 것이다.
- `pptxviewjs` 기반 캔버스 렌더링도 PowerPoint와 다르다.
- Mac에 설치된 PowerPoint 앱에는 실제 `Malgun Gothic` 폰트 파일이 포함되어 있었다.
  - `/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts/malgun.ttf`
  - `/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts/malgunbd.ttf`
  - `/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts/malgunsl.ttf`
- 사용자 폰트 위치에 복사 후 FontConfig와 macOS font registry에서 인식되는 것은 확인했다.
  - `~/Library/Fonts/malgun.ttf`
  - `~/Library/Fonts/malgunbd.ttf`
  - `~/Library/Fonts/malgunsl.ttf`

## 시도 및 결과

### 1. `pptxviewjs` 내부 렌더링 사용

- 위치: `frontend/src/App.tsx`
- 접근:
  - 기존 앱 미리보기를 `pptxviewjs`로 캔버스에 렌더링.
- 실패:
  - PowerPoint 실제 렌더링과 폰트, 표, 강조 색상, layout fidelity가 다름.
  - 이 renderer 자체가 PowerPoint 호환 렌더러가 아니므로 미세한 서식 일치에 부적합.
- 반복 금지:
  - PowerPoint와 동일한 화면을 목표로 할 때 `pptxviewjs`만 조정해서 해결하려고 하지 말 것.

### 2. 폰트를 Apple 시스템 폰트로 우회

- 접근:
  - Apple 기본 폰트 또는 macOS에 있는 유사 폰트를 써서 한글 렌더링을 맞추려 함.
- 실패:
  - 사용자는 Windows에서도 쓸 수 있는 실제 폰트를 요구했다.
  - Apple 폰트는 원본 PowerPoint/Windows 환경과 맞지 않는다.
- 반복 금지:
  - “Apple SD Gothic Neo” 같은 macOS 전용 폰트로 대체하지 말 것.

### 3. MicrosoftGothicNeo 계열 임시 폰트 설치

- 접근:
  - 유사 Microsoft 계열 폰트를 별도 폴더에 설치해서 앱 렌더링에 사용하려 함.
- 실패:
  - 원본이 원하는 `맑은 고딕`/PowerPoint rendering과 일치하지 않았다.
  - 사용자가 명시적으로 “실제 폰트”를 요구했다.
- 후처리:
  - `~/Library/Fonts/FiniqPPTForger/`의 임시 폰트는 제거했다.
- 반복 금지:
  - 유사 폰트 설치로 해결했다고 판단하지 말 것.

### 4. PowerPoint 번들 내 `Malgun Gothic` 설치

- 접근:
  - PowerPoint 앱 번들에 포함된 실제 Malgun Gothic TTF를 사용자 폰트 폴더로 복사.
  - font cache 갱신 수행.
- 결과:
  - `fc-match '맑은 고딕'`에서 `malgun.ttf: "Malgun Gothic" "Regular"` 확인.
  - `system_profiler SPFontsDataType`에서도 enabled 확인.
- 한계:
  - 폰트 설치만으로 Quick Look/table layout 차이가 해결되지는 않았다.
- 반복 금지:
  - 폰트 인식 성공을 전체 preview fidelity 성공으로 간주하지 말 것.

### 5. 생성 PPTX 전체에 폰트/표 스타일 강제 적용

- 위치: `backend/engine/ppt_generator.py`
- 접근:
  - `_style_table()`에서 table style flags 제거, `tableStyleId` 제거, margin 강제 지정 등을 시도.
  - 폰트의 `latin`, `ea`, `cs`를 광범위하게 강제 적용.
- 실패:
  - 실제 PPTX 출력까지 변형되어 배경 텍스트 느낌과 색상이 퇴보했다.
  - 사용자가 “과대 적용”이라고 지적했다.
- 후처리:
  - 실제 출력 쪽 `_style_table()`은 원본 margin을 보존하도록 되돌렸다.
  - table style 제거 같은 전역 변형은 제거했다.
- 반복 금지:
  - preview 문제를 고치려고 실제 PPTX 생성물의 표 style/theme/color를 광범위하게 바꾸지 말 것.

### 6. Preview 전용 PPTX에서 선택 슬라이드를 앞으로 이동

- 위치:
  - `backend/engine/ppt_generator.py`: `move_slide_to_front`
  - `electron/main.ts`: `renderQuickLookPreview`
- 접근:
  - 선택된 슬라이드만 Quick Look 첫 페이지로 렌더링되도록 slide order를 preview 전용 파일에서만 바꿈.
- 결과:
  - 선택 슬라이드 미리보기에는 필요했고 동작했다.
- 주의:
  - 이 작업은 preview 전용 파일에만 해야 한다.
  - 실제 export/generate PPTX에 적용하면 안 된다.

### 7. Preview 전용 폰트 강제

- 위치: `backend/engine/ppt_generator.py`
- 접근:
  - 선택 슬라이드의 실제 shape에만 preview 전용으로 폰트 지정.
  - 한글은 `Malgun Gothic`, 영어는 `Calibri`를 기본으로 설정.
- 결과:
  - 일부 본문에는 개선이 있었지만 모든 문제를 해결하지 못했다.
- 한계:
  - master/layout placeholder나 Quick Look 자체 table layout 차이까지 해결하지 못한다.
- 반복 금지:
  - 폰트 지정만으로 표 row height 문제가 해결된다고 가정하지 말 것.

### 8. Preview 전용 표 row height 명시

- 위치: `backend/engine/ppt_generator.py`
- 접근:
  - `shape.height / row_count`로 각 row height를 명시.
  - 기존 버그: row height를 순차 지정하면 `shape.height`가 변하므로 처음에 `total_height`를 캡처해야 했다.
- 확인:
  - `preview_selected.pptx` 안에서는 row heights가 `[203640] * 13`로 들어간 것을 확인.
- 실패:
  - Quick Look PNG에서는 여전히 표가 세로로 늘어났다.
- 결론:
  - PPTX XML의 row height 문제가 아니라 Quick Look renderer 문제.
- 반복 금지:
  - Quick Look 표 높이 문제를 PPTX row height만 더 만져서 해결하려 하지 말 것.

### 9. Quick Look PNG의 회색 배경 제거

- 위치:
  - `frontend/src/App.tsx`
  - 이후 `backend/engine/ppt_generator.py`
- 접근:
  - Quick Look이 만든 주변 회색 배경 `(172,178,187)` 계열 픽셀을 흰색으로 변경.
- 결과:
  - 회색 바깥 배경 제거에는 효과가 있었다.
- 한계:
  - 슬라이드 내부 layout/표 렌더링 문제는 해결하지 못한다.
- 반복 금지:
  - 배경색 제거를 layout fidelity 개선으로 착각하지 말 것.

### 10. Quick Look PNG에서 표 영역을 세로 압축

- 위치: `backend/engine/ppt_generator.py`
- 접근:
  - Quick Look이 늘린 표 영역을 감지해 PPTX 좌표상 기대 높이로 이미지 리사이즈.
- 확인:
  - 감지값 기준으로 표 높이는 `954px`에서 `646px`로 줄었다.
- 실패:
  - 표 안의 텍스트와 선까지 같이 눌려 시각적으로 망가졌다.
  - 사용자가 즉시 “괜찮아 보이냐”고 지적한 결과가 이것이다.
- 반복 금지:
  - 표 이미지를 통째로 세로 압축하지 말 것.
  - 텍스트가 포함된 raster region을 리사이즈하는 방식은 사용할 수 없다.

### 11. PowerPoint AppleScript PDF/PNG export 시도

- 접근:
  - 설치된 `/Applications/Microsoft PowerPoint.app`을 AppleScript로 열고 `save as PDF` 또는 `save as PNG` 시도.
- 결과:
  - `save as PDF`는 `-9074` 오류 발생.
  - `save as PNG`는 오류 없이 끝나도 파일이 생성되지 않는 케이스가 있었다.
- 한계:
  - 이 경로는 아직 신뢰 가능한 자동 렌더러로 검증되지 않았다.
- 반복 금지:
  - AppleScript export가 된다고 가정하고 앱 경로에 바로 넣지 말 것.
  - 먼저 단독 명령으로 파일 생성과 이미지 품질을 확인해야 한다.

## 현재 상태

- “표 이미지를 세로 압축하는” 실패한 후처리 코드는 제거했다.
- 현재 접근은 Quick Look PNG의 왜곡된 표 영역을 제거하고, PPTX의 table model을 이용해 preview PNG에 표를 다시 그리는 방식이다.
- 이 방식은 텍스트가 포함된 raster 영역을 압축하지 않는다.
- 실제 PPTX 출력물은 이 preview 후처리의 영향을 받지 않는다.

## 다음에 해야 할 일

1. 실제 PPTX 생성물에는 preview 보정을 적용하지 않는다.
2. 선택지는 둘 중 하나로 좁힌다.
   - PowerPoint 자체 renderer를 자동화해서 PNG/PDF를 안정적으로 얻는다.
   - Quick Look PNG 위에서 표 영역만 PPTX table model로 다시 벡터/raster 재작성한다. 이때 텍스트 영역을 통째로 압축하지 않는다.
3. 어떤 접근이든 `preview_selected.pptx`와 최종 PNG를 파일로 남기고, 실제 눈으로 비교한 뒤에만 앱 경로에 연결한다.

## 절대 반복하지 말 것

- 실제 출력 PPTX의 theme/style/color/font를 preview 문제 해결용으로 광범위하게 바꾸지 말 것.
- “폰트가 로딩됐다”를 “렌더링이 맞다”로 판단하지 말 것.
- Quick Look의 표 row height 오차를 PPTX row height만 수정해서 해결하려 하지 말 것.
- 텍스트가 포함된 표 PNG를 통째로 세로 압축하지 말 것.
- 앱에 붙이기 전에 `/tmp`나 app userData 산출물로 실제 PNG를 열어 확인하지 않고 완료했다고 말하지 말 것.
- 사용자가 제공한 실제 PowerPoint 스크린샷과 나란히 비교하지 않고 “비슷하다”고 판단하지 말 것.
