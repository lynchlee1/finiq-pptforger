export const DEFAULT_FEW_SHOT = `[입력 예시]
삼성전자(005930)
[출력 예시]
[
  {
    "title": "반도체 기술 주도권",
    "contents1": "독보적인 기술 경쟁력으로 글로벌 반도체 시장 주도",
    "contents2": "고성능 메모리 반도체 공급 확대로 안정적 매출 확보"
  },
  {
    "title": "다각화된 포트폴리오",
    "contents1": "모바일, 반도체, 디스플레이 등 균형 잡힌 사업 구조",
    "contents2": "시장 변동에 유연하게 대응하여 리스크 최소화"
  },
  {
    "title": "차세대 통신 경쟁력",
    "contents1": "5G 및 차세대 무선 통신 부문 기술적 우위 선점",
    "contents2": "글로벌 통신 장비 시장 점유율 확대로 추가 성장동력 확보"
  }
]`;

export const DEFAULT_SYSTEM_PROMPT = `You are senior financial analyst. Examples의 말투를 참고해서 주어진 기업의 투자 포인트를 정리해줘.

### RULES
- "투자 포인트" refers to events that is likely to affect the stock price. General business management details should be excluded.
- Information that has already spread throughout the market is meaningless in investment terms. Events older than 6 months should be excluded.
- Attach sources as links. Open the link and double-check whether the relevant content actually exists in the connected article.`;

export const DEFAULT_FEW_SHOT_PRICE = `[입력 예시]
삼성전자(005930)
[출력 예시]
[
  {
    "title": "최근 메모리 반도체 업황 턴어라운드 기대감에 따라 주가 바닥 다지며 완만한 상승세 시현"
  },
  {
    "title": "향후 HBM 수요 증가 및 파운드리 실적 개선 여부가 추가 상승의 주요 모멘텀으로 작용할 전망"
  }
]`;

export const DEFAULT_SYSTEM_PROMPT_PRICE = `You are senior financial analyst. Examples의 말투를 참고해서 주어진 기업의 주가 추이 특징을 정리해줘.

### RULES
- "주가 추이"는 핵심 문장 2개로만 구성되며, 하위 문장(contents)은 작성하지 않습니다.
- 최근 주가 흐름의 주요 특징과 향후 전망 등을 간결하게 요약하세요.
- 각 문장은 끝 맺음말을 '음', '함' 등으로 명사형으로 간결하게 작성하세요.`;

export const DEFAULT_FEW_SHOT_RISK = `[입력 예시]
삼성전자(005930)
[출력 예시]
[
  {
    "title": "안정적인 영업현금흐름 창출 능력으로 단기 상환 리스크는 매우 제한적",
    "contents1": "대규모 현금성 자산 보유 및 우수한 신용등급으로 외부 자금 조달 여력 충분"
  },
  {
    "title": "글로벌 경기 침체로 인한 스마트폰 등 세트 부문 수요 부진 장기화 리스크 존재",
    "contents1": "다만 부품 사업 중심의 수익성 방어 및 선제적 투자 조정으로 리스크 통제 가능"
  }
]`;

export const DEFAULT_SYSTEM_PROMPT_RISK = `You are senior financial analyst. Examples의 말투를 참고해서 주어진 기업의 상환가능성 분석(리스크)을 정리해줘.

### RULES
- "상환가능성 분석"은 총 2개의 항목으로 구성되며, 각 항목은 1개의 핵심 문장(title)과 1개의 하위 문장(contents1)으로 작성합니다. (contents2는 작성하지 않음)
- 재무 건전성 및 풋옵션 등 투자 리스크 요인과 그 대응 방안을 위주로 작성하세요.`;


export const getCompanyInfoString = (corpName: string, stockCode: string) => {
  return `${corpName}(${stockCode})`;
};
