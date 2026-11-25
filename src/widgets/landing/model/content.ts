export type LandingSection = {
  eyebrow: string;
  title: string;
  description: string;
};

type ProcessContent = LandingSection & {
  steps: readonly string[];
};

type PortfolioContent = LandingSection & {
  notice: string;
  cards: readonly { name: string; type: string }[];
};

type PricingContent = LandingSection & {
  isProvisional: boolean;
  items: readonly { title: string; description: string }[];
};

type FaqContent = LandingSection & {
  items: readonly { question: string; answer: string }[];
};

export const landingSections = {
  philosophy: {
    eyebrow: '제작 철학',
    title: '브랜드와 고객이 만나는 장면을 설계합니다.',
    description:
      '보기 좋은 화면을 넘어, 고객이 이해하고 믿고 행동할 수 있는 흐름을 만듭니다.',
  } satisfies LandingSection,
  process: {
    eyebrow: '제작 방식',
    title: '복잡한 생각을 선명한 웹 경험으로.',
    description:
      '상담부터 구조 설계, 제작, 검수까지 필요한 장면을 함께 정리합니다.',
    steps: ['상담', '구조 설계', '제작', '검수'],
  } satisfies ProcessContent,
  portfolio: {
    eyebrow: '포트폴리오',
    title: '가능성을 보여주는 가상의 작업들.',
    description:
      '아래 사례는 서비스 방향을 설명하기 위한 합성 포트폴리오입니다.',
    notice: '합성 포트폴리오 · 실제 공개 사례 아님',
    cards: [
      { name: '모노 스튜디오', type: '브랜드 소개 사이트' },
      { name: '오후의 상점', type: '작은 가게를 위한 웹 경험' },
      { name: '라운드 테이블', type: '커뮤니티 플랫폼 데모' },
    ],
  } satisfies PortfolioContent,
  pricing: {
    eyebrow: '가격 안내',
    title: '필요한 만큼, 목적에 맞게 상담합니다.',
    description:
      '구체적인 범위와 일정은 상담 후 안내하며, 아래 내용은 임시 안내입니다.',
    isProvisional: true,
    items: [
      {
        title: '기본 안내',
        description: '명확한 목적과 핵심 페이지를 중심으로 시작합니다.',
      },
      {
        title: '맞춤 제작',
        description: '브랜드와 고객 흐름에 맞춰 필요한 범위를 함께 설계합니다.',
      },
    ],
  } satisfies PricingContent,
  faq: {
    eyebrow: 'FAQ',
    title: '자주 묻는 질문',
    description: '시작하기 전 궁금한 내용을 먼저 확인해 보세요.',
    items: [
      {
        question: '어떤 웹사이트를 만들 수 있나요?',
        answer:
          '브랜드 소개, 서비스 안내, 소규모 비즈니스 사이트 등 목적에 맞는 웹 경험을 함께 설계합니다.',
      },
      {
        question: '제작 기간은 얼마나 걸리나요?',
        answer:
          '페이지 수와 필요한 기능을 확인한 뒤 상담을 통해 현실적인 일정을 안내합니다.',
      },
      {
        question: '문의 후 바로 계약해야 하나요?',
        answer:
          '아닙니다. 필요한 범위와 방향을 먼저 확인한 뒤 진행 여부를 결정할 수 있습니다.',
      },
    ],
  } satisfies FaqContent,
} as const;
