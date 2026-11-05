import { MENUS, type MenuKey } from "./menus";

export type Customer = {
  who: string; // shown on the order slip
  color: string; // stool-side silhouette color
  order: (menu: string) => string;
  // what they say after eating, best to worst
  reactions: [string, string, string, string];
};

export const CUSTOMERS: Customer[] = [
  {
    who: "퇴근한 김 대리",
    color: "#5b6b8c",
    order: (m) => `사장님, ${m} 하나요. 오늘 진짜 길었어요…`,
    reactions: ["와… 이거 먹으려고 버틴 거네요.", "괜찮네요. 내일도 출근하겠습니다.", "음… 배는 차네요.", "사장님도 오늘 힘드셨구나…"],
  },
  {
    who: "단골 할머니",
    color: "#8c6b5b",
    order: (m) => `${m} 하나 줘 봐. 요즘 젊은 사람이 잘하나 보자.`,
    reactions: ["아이고, 내가 하던 맛이랑 똑같네!", "제법이네. 또 올게.", "손이 아직 덜 익었구먼.", "에헤이, 이리 줘 봐. 내가 할게."],
  },
  {
    who: "택시 기사님",
    color: "#6b8c5b",
    order: (m) => `${m} 빨리 되는 걸로 하나만. 차 세워놨어요.`,
    reactions: ["이야, 빠르고 맛있고! 손님한테 소개할게요.", "좋네요. 잘 먹었습니다.", "급하게 먹어서 그런가… 그냥 그래요.", "다음엔 편의점 갈게요."],
  },
  {
    who: "야근한 개발자",
    color: "#4f5a63",
    order: (m) => `${m} 하나요. 배포 끝나고 왔어요. 버그 없게 부탁드려요.`,
    reactions: ["이건 프로덕션 레벨이네요.", "테스트 통과. 머지할게요.", "작동은 하는데 리팩토링이 필요해요.", "이거 롤백 가능한가요…?"],
  },
  {
    who: "대학생 커플",
    color: "#a0607a",
    order: (m) => `저희 ${m} 하나 나눠 먹을게요!`,
    reactions: ["사진 찍어도 돼요? 인스타 올릴게요!", "맛있다~ 다음에 또 오자.", "음… 2차 가자.", "우리 그냥 집에 가자…"],
  },
  {
    who: "여행 온 외국인",
    color: "#c08a3e",
    order: (m) => `안녕하세요! ${m}… 주세요? 드라마에서 봤어요!`,
    reactions: ["Daebak! 이거 진짜 드라마 맛이에요!", "맛있어요! 감사합니다!", "Hmm… 맵다? 아니 그냥… 오케이.", "드라마랑… 달라요."],
  },
  {
    who: "동네 사장님",
    color: "#7a5ba0",
    order: (m) => `옆 가게예요. ${m} 하나 주세요. 장사 잘되나 보러 왔어요.`,
    reactions: ["이러다 우리 가게 손님 다 뺏기겠네.", "괜찮네요. 서로 잘해봐요.", "음, 우리 집이 낫네.", "걱정 안 해도 되겠네요 ㅎㅎ"],
  },
];

export function tierOf(score: number) {
  if (score >= 85) return 0;
  if (score >= 60) return 1;
  if (score >= 35) return 2;
  return 3;
}

export const TIER_LABEL = ["대박", "맛있음", "그럭저럭", "망함"];

// what the customer actually pays: full price for good food, a tip for great food
export function payFor(menu: MenuKey, score: number) {
  const price = MENUS[menu].price;
  const tier = tierOf(score);
  if (tier === 0) return { paid: price, tip: Math.round(price * 0.5 / 500) * 500 || 500 };
  if (tier === 1) return { paid: price, tip: 0 };
  if (tier === 2) return { paid: Math.round(price * 0.7 / 100) * 100, tip: 0 };
  return { paid: 0, tip: 0 }; // "서비스로 드릴게요…"
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// one night = 5 customers, every menu ordered exactly once
export function makeNight(menus: MenuKey[]) {
  const people = shuffle(CUSTOMERS).slice(0, menus.length);
  return shuffle(menus).map((menu, i) => ({ menu, customer: people[i] }));
}
