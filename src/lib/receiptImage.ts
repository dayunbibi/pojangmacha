import { MENUS, won } from "./menus";
import { guestArt, MOODS, tierOf } from "./customers";
import { loadFonts } from "./fonts";
import type { Served } from "@/components/Pocha";

const W = 1080;
const H = 1920;

const PAPER = "#f5ecdb";
const INK = "#2b221a";
const MUTED = "#6b5e4e";

const DISPLAY = '"Gowun Batang", serif';
const SANS = '"IBM Plex Sans KR", sans-serif';
const BRUSH = '"Nanum Brush Script", cursive';
const MONO = '"Nanum Gothic Coding", monospace';

export function totalOf(served: Served[]) {
  return served.reduce((a, s) => a + s.paid + s.tip, 0);
}

// what the night was like, in one line
export function verdict(served: Served[]) {
  const avg = served.reduce((a, s) => a + s.score, 0) / Math.max(1, served.length);
  if (avg >= 85) return "줄 서는 포차";
  if (avg >= 65) return "동네 맛집";
  if (avg >= 40) return "그럭저럭 장사";
  return "내일은 문 닫을까…";
}

// the round stamp on the receipt: sold out unless something went out free
export function stampOf(served: Served[]) {
  return served.every((s) => s.paid > 0) ? "완판" : "마감";
}

// 2026.11.14 (토) 23:48
export function receiptDate(d = new Date()) {
  const day = "일월화수목금토"[d.getDay()];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} (${day}) ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

function dashed(c: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  c.save();
  c.strokeStyle = "#b9ab92";
  c.lineWidth = 2;
  c.setLineDash([6, 5]);
  c.beginPath();
  c.moveTo(x1, y);
  c.lineTo(x2, y);
  c.stroke();
  c.restore();
}

// 9:16 story card, same layout as the design's ShareCard
export async function makeReceiptImage(served: Served[], host: string): Promise<Blob> {
  const total = totalOf(served);
  const date = receiptDate();
  const sold = served.reduce((a, s) => a + s.paid, 0);
  const tips = served.reduce((a, s) => a + s.tip, 0);
  const avg = Math.round(served.reduce((a, s) => a + s.score, 0) / Math.max(1, served.length));
  const words = served.map((s) => `${MENUS[s.menu].name} · ${s.customer.short} ${s.score} ${s.paid.toLocaleString("ko-KR")}`);
  const [, tent, bulbs, ...faces] = await Promise.all([
    loadFonts(
      ["오늘 장사 끝! 향수병 포차 마감 영수증 # 메뉴 · 손님 점수 금액 서비스 판매 팁 평균 합계 원점+ 오늘도 수고했어요 또 오세요 완판",
        "토론토에서 한국이 그리워서 만든 웹게임", stampOf(served), date, host, won(total), ...words].join(" "),
    ),
    loadImage("/art/bg/bg-tent-interior.svg"),
    loadImage("/art/bg/bg-bulb-string.svg"),
    ...served.map((s) => loadImage(guestArt(s.customer, MOODS[tierOf(s.score)]))),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  const k = W / 440; // the tent and bulb art are drawn for a 440px wide phone

  c.fillStyle = "#12151d";
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.5;
  c.drawImage(tent, 0, 0, W, 560 * k);
  c.globalAlpha = 1;
  const fade = c.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, "rgba(18,21,29,0.2)");
  fade.addColorStop(0.4, "rgba(18,21,29,0.75)");
  fade.addColorStop(0.7, "#12151d");
  c.fillStyle = fade;
  c.fillRect(0, 0, W, H);
  c.drawImage(bulbs, 0, 40, W, 120 * k);

  // title
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = "#f7a066";
  c.font = `72px ${BRUSH}`;
  c.fillText("오늘 장사 끝!", W / 2, 330);
  c.save();
  c.shadowColor = "rgba(255,210,122,0.55)";
  c.shadowBlur = 60;
  c.fillStyle = "#fff3d6";
  c.font = `700 132px ${DISPLAY}`;
  c.fillText("향수병 포차", W / 2, 478);
  c.restore();

  // tonight's five guests
  const R = 75;
  const gap = 28;
  let x0 = (W - (faces.length * R * 2 + (faces.length - 1) * gap)) / 2;
  for (const face of faces) {
    const cx = x0 + R;
    const cy = 546 + R;
    c.save();
    c.shadowColor = "rgba(0,0,0,0.5)";
    c.shadowBlur = 30;
    c.shadowOffsetY = 10;
    c.fillStyle = "#1a1e29";
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.save();
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.clip();
    c.drawImage(face, x0 - 75, 546 - 68, 300, 375);
    c.restore();
    c.strokeStyle = "#ffd27a";
    c.lineWidth = 8; // half sits outside, like the design's 4px ring at 1x
    c.beginPath();
    c.arc(cx, cy, R + 2, 0, Math.PI * 2);
    c.stroke();
    x0 += R * 2 + gap;
  }

  // receipt paper
  const RX = 160;
  const RW = 760;
  const RY = 748;
  const L = RX + 52;
  const R2 = RX + RW - 52;
  const bottom = 1630;
  c.save();
  c.shadowColor = "rgba(0,0,0,0.55)";
  c.shadowBlur = 50;
  c.shadowOffsetY = 30;
  c.fillStyle = PAPER;
  c.beginPath();
  c.moveTo(RX, RY);
  c.lineTo(RX + RW, RY);
  c.lineTo(RX + RW, bottom);
  for (let x = RX + RW; x > RX; x -= 20) {
    c.lineTo(x - 10, bottom + 14);
    c.lineTo(x - 20, bottom);
  }
  c.closePath();
  c.fill();
  c.restore();

  c.fillStyle = INK;
  c.font = `700 46px ${DISPLAY}`;
  c.fillText("향수병 포차", W / 2, RY + 88);
  c.fillStyle = MUTED;
  c.font = `23px ${MONO}`;
  c.fillText(`마감 영수증 · ${date}`, W / 2, RY + 126);
  dashed(c, L, R2, RY + 148);

  // table: # | menu · guest | score | amount
  const colScore = R2 - 206;
  c.font = `21px ${MONO}`;
  c.textAlign = "left";
  c.fillText("#", L, RY + 186);
  c.fillText("메뉴 · 손님", L + 46, RY + 186);
  c.textAlign = "right";
  c.fillText("점수", colScore, RY + 186);
  c.fillText("금액", R2, RY + 186);

  let y = RY + 236;
  for (const [i, s] of served.entries()) {
    c.textAlign = "left";
    c.fillStyle = MUTED;
    c.font = `24px ${MONO}`;
    c.fillText(String(i + 1).padStart(2, "0"), L, y);
    c.fillStyle = INK;
    c.font = `500 24px ${SANS}`;
    const name = MENUS[s.menu].name;
    c.fillText(name, L + 46, y);
    const nw = c.measureText(`${name} `).width;
    c.fillStyle = MUTED;
    c.font = `24px ${SANS}`;
    c.fillText(`· ${s.customer.short}`, L + 46 + nw, y);

    c.textAlign = "right";
    c.fillStyle = INK;
    c.font = `24px ${MONO}`;
    c.fillText(String(s.score), colScore, y);
    if (s.paid === 0) {
      c.fillStyle = "#c4362a";
      c.font = `600 24px ${SANS}`;
      c.fillText("서비스", R2, y);
      const sw = c.measureText("서비스 ").width;
      c.fillStyle = MUTED;
      c.font = `24px ${MONO}`;
      const price = MENUS[s.menu].price.toLocaleString("ko-KR");
      c.fillText(price, R2 - sw, y);
      const pw = c.measureText(price).width;
      c.fillRect(R2 - sw - pw, y - 8, pw, 2);
    } else {
      c.fillText(s.paid.toLocaleString("ko-KR"), R2, y);
    }
    y += 55;
  }

  dashed(c, L, R2, y - 18);
  y += 30;
  for (const [label, value] of [
    ["판매", won(sold)],
    ["팁", `+${won(tips)}`],
    ["평균 점수", `${avg}점`],
  ]) {
    c.fillStyle = INK;
    c.textAlign = "left";
    c.font = `24px ${SANS}`;
    c.fillText(label, L, y);
    c.textAlign = "right";
    c.font = `24px ${MONO}`;
    c.fillText(value, R2, y);
    y += 45;
  }
  dashed(c, L, R2, y - 18);
  y += 42;
  c.textAlign = "left";
  c.font = `700 38px ${SANS}`;
  c.fillText("합계", L, y);
  c.textAlign = "right";
  c.font = `700 38px ${MONO}`;
  c.fillText(won(total), R2, y);

  // barcode
  y += 32;
  for (let x = L; x < R2; x += 16) {
    c.fillRect(x, y, 4, 60);
    c.fillRect(x + 7, y, 5, 60);
  }
  c.fillStyle = MUTED;
  c.textAlign = "center";
  c.font = `21px ${MONO}`;
  c.fillText("오늘도 수고했어요 · 또 오세요", W / 2, y + 100);

  // stamp hanging off the corner
  c.save();
  c.translate(RX + RW + 40 - 85, RY - 70 + 85);
  c.rotate((-14 * Math.PI) / 180);
  c.globalAlpha = 0.9;
  c.strokeStyle = "#ff5a47";
  c.lineWidth = 7;
  c.beginPath();
  c.arc(0, 0, 81, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "#ff5a47";
  c.font = `72px ${BRUSH}`;
  c.textBaseline = "middle";
  c.fillText(stampOf(served), 0, 4);
  c.restore();

  // footer
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = "#b8ab95";
  c.font = `500 30px ${SANS}`;
  c.fillText("토론토에서 한국이 그리워서 만든 웹게임", W / 2, 1790);
  c.fillStyle = "#ffd27a";
  c.font = `700 34px ${MONO}`;
  c.fillText(host, W / 2, 1846);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
