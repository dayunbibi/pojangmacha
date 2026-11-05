export type MenuKey = "yeomtong" | "gimbap" | "tteokbokki" | "eomuk" | "gyeranppang";

export type Menu = {
  name: string;
  price: number; // won, written on the menu board
  how: string; // one line shown before the game starts
  control: string; // what your finger does
};

export const MENUS: Record<MenuKey, Menu> = {
  yeomtong: {
    name: "염통꼬치",
    price: 3000,
    how: "붓으로 문질러서 양념을 골고루 바르고, 뒤집어서 반대쪽도 발라요. 너무 오래 두면 타요.",
    control: "문지르기 · 뒤집기",
  },
  gimbap: {
    name: "김밥",
    price: 4000,
    how: "밥 먼저 깔고 재료를 다 올린 다음, 위로 천천히 밀어서 말고, 8조각으로 썰어요.",
    control: "탭 · 밀어 올리기 · 썰기",
  },
  tteokbokki: {
    name: "떡볶이",
    price: 5000,
    how: "빙글빙글 저어서 바닥에 눌어붙지 않게 하고, 국물이 딱 좋게 졸았을 때 불을 꺼요.",
    control: "원 그리기",
  },
  eomuk: {
    name: "어묵꼬치",
    price: 1000,
    how: "어묵이 지나갈 때 표시가 꼬치에 닿는 순간 탭해서 물결 모양으로 꽂아요.",
    control: "타이밍 탭",
  },
  gyeranppang: {
    name: "계란빵",
    price: 2000,
    how: "꾹 눌러서 반죽을 선까지 붓고, 움직이는 계란을 틀 가운데에 떨어뜨려요.",
    control: "꾹 누르기 · 타이밍",
  },
};

export const MENU_KEYS = Object.keys(MENUS) as MenuKey[];

// every finished dish is judged out of 100
export type Dish = { menu: MenuKey; score: number; note: string };

export function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}
