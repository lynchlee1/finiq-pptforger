# PPT Forger

LLM이 생성한 구조화된 JSON을 입력받아 PowerPoint 템플릿의 플레이스홀더(`{{key}}`)를 자동으로 채워주는 파이썬 워크플로우입니다.

## 주요 기능
- JSON 스키마 검증 (`jsonschema` 사용)
- PowerPoint 템플릿 (`.pptx`) 내 텍스트 박스, 표(Table), 그룹화된 도형 내의 플레이스홀더 치환
- 결과 파일 저장 및 에러 핸들링

## 설치 방법
1. 저장소를 클론합니다.
2. 필요한 패키지를 설치합니다.
```bash
pip install .
```

## 사용 방법
### 1. JSON 입력 파일 준비
다음과 같은 형식의 JSON 파일을 작성합니다.
```json
{
    "json_version": "1.0.0",
    "template": "template_ppt.pptx",
    "slides": [
        {
            "slide_index": 0,
            "title_key": "실제 타이틀 내용",
            "content_key": "실제 본문 내용"
        }
    ]
}
```

### 2. 실행
설치 후 `ppt-forge` 명령어를 직접 사용하거나 파이썬 모듈로 실행할 수 있습니다.
```bash
# 명령어 직접 사용
ppt-forge input.json [output.pptx]

# 또는 기존 방식대로 실행
python src/ppt_generator.py input.json [output.pptx]
```

## 테스트 실행
제공된 테스트 스크립트를 통해 기능을 확인할 수 있습니다.
```bash
# 테스트 템플릿 생성
python tests/create_test_template.py

# PPT 생성 실행
python src/ppt_generator.py tests/test_data.json output.pptx

# 결과 확인 (텍스트 출력)
python tests/inspect_pptx.py
```

