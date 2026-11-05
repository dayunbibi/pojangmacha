import { MENUS, won } from "./menus";
import { TIER_LABEL, tierOf } from "./customers";
import { loadFonts } from "./fonts";
import type { Served } from "@/components/Pocha";

const W = 1080;
const H = 1920;

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

// 9:16 closing receipt: thermal paper on the tarp, ready for a story
export async function makeReceiptImage(served: Served[], host: string): Promise<Blob> {
  const total = totalOf(served);
  const bestDish = [...served].sort((a, b) => b.score - a.score)[0];
  const date = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  const lines = served.map((s) => `${MENUS[s.menu].name} ${s.score}점 ${TIER_LABEL[tierOf(s.score)]} ${won(s.paid)} ${won(s.tip)}`);
  await loadFonts(["향수병 포차 영수증 마감 합계 팁 손님 한줄평 오늘의 평가 서비스 너도 오늘 장사해봐", verdict(served), date, host, bestDish.reaction, bestDish.customer.who, ...lines].join(" "));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;

  // night + tarp
  c.fillStyle = "#12151d";
  c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W / 2, 0, 50, W / 2, 0, 1100);
  glow.addColorStop(0, "rgba(236,106,31,0.45)");
  glow.addColorStop(1, "rgba(236,106,31,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#ec6a1f";
  c.fillRect(0, 0, W, 210);
  for (let x = 0; x < W; x += 60) {
    c.beginPath();
    c.arc(x + 30, 210, 30, 0, Math.PI);
    c.fill();
  }
  c.fillStyle = "rgba(255,255,255,0.14)";
  for (let x = 0; x < W; x += 150) c.fillRect(x, 0, 4, 210);
  c.textAlign = "center";
  c.fillStyle = "#fff";
  c.font = '110px "Do Hyeon"';
  c.shadowColor = "rgba(255,210,122,0.8)";
  c.shadowBlur = 30;
  c.fillText("향수병 포차", W / 2, 150);
  c.shadowBlur = 0;

  // receipt paper, slightly tilted, with a torn bottom edge
  const px = 130;
  const pw = W - px * 2;
  // paper height follows the content, then it's centered under the tarp
  c.font = '64px "Nanum Pen Script"';
  const review = wrapLines(c, `"${bestDish.reaction}"`, pw - 120);
  const ph = 486 + served.length * 116 + (review.length - 1) * 66 + 330; // room for the stamp at the bottom
  const py = 270 + Math.max(0, (H - 250 - 270 - ph) / 2);
  c.save();
  c.translate(W / 2, py + ph / 2);
  c.rotate(-0.015);
  c.translate(-W / 2, -(py + ph / 2));
  c.fillStyle = "rgba(0,0,0,0.35)";
  c.fillRect(px + 16, py + 20, pw, ph);
  c.fillStyle = "#fff8ea";
  c.beginPath();
  c.moveTo(px, py);
  c.lineTo(px + pw, py);
  c.lineTo(px + pw, py + ph);
  for (let x = px + pw; x > px; x -= 40) {
    c.lineTo(x - 20, py + ph - 18);
    c.lineTo(x - 40, py + ph);
  }
  c.closePath();
  c.fill();

  const ink = "#2a2420";
  const left = px + 60;
  const right = px + pw - 60;
  let y = py + 110;
  c.fillStyle = ink;
  c.font = 'bold 54px "Nanum Gothic Coding"';
  c.fillText("마감 영수증", W / 2, y);
  y += 56;
  c.font = '32px "Nanum Gothic Coding"';
  c.fillText(date, W / 2, y);

  const dashed = (yy: number) => {
    c.save();
    c.setLineDash([14, 10]);
    c.strokeStyle = "rgba(42,36,32,0.6)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(left, yy);
    c.lineTo(right, yy);
    c.stroke();
    c.restore();
  };
  y += 50;
  dashed(y);
  y += 70;

  for (const s of served) {
    c.textAlign = "left";
    c.font = 'bold 42px "Nanum Gothic Coding"';
    c.fillStyle = ink;
    c.fillText(MENUS[s.menu].name, left, y);
    c.textAlign = "right";
    c.fillText(s.paid === 0 ? "서비스" : won(s.paid), right, y);
    y += 46;
    c.textAlign = "left";
    c.font = '32px "Nanum Gothic Coding"';
    c.fillStyle = "rgba(42,36,32,0.7)";
    c.fillText(`  ${s.score}점 · ${TIER_LABEL[tierOf(s.score)]}`, left, y);
    if (s.tip > 0) {
      c.textAlign = "right";
      c.fillStyle = "#b84b10";
      c.fillText(`팁 +${won(s.tip)}`, right, y);
    }
    y += 70;
  }

  dashed(y - 20);
  y += 50;
  c.fillStyle = ink;
  c.textAlign = "left";
  c.font = 'bold 56px "Nanum Gothic Coding"';
  c.fillText("합계", left, y);
  c.textAlign = "right";
  c.fillText(won(total), right, y);
  y += 60;
  dashed(y);

  // best review in handwriting
  y += 80;
  c.textAlign = "left";
  c.font = '32px "Nanum Gothic Coding"';
  c.fillStyle = "rgba(42,36,32,0.7)";
  c.fillText(`손님 한줄평 · ${bestDish.customer.who}`, left, y);
  y += 70;
  c.font = '64px "Nanum Pen Script"';
  c.fillStyle = ink;
  review.forEach((line, i) => c.fillText(line, left, y + i * 66));

  // stamp under the review, sized to the verdict
  const stampText = verdict(served);
  c.font = '54px "Do Hyeon"';
  const sw = Math.max(300, c.measureText(stampText).width + 70);
  c.save();
  c.translate(right - sw / 2 + 10, y + (review.length - 1) * 66 + 150);
  c.rotate(-0.12);
  c.strokeStyle = "#d7261e";
  c.fillStyle = "#d7261e";
  c.lineWidth = 8;
  c.beginPath();
  c.roundRect(-sw / 2, -70, sw, 140, 16);
  c.stroke();
  c.textAlign = "center";
  c.font = '30px "Do Hyeon"';
  c.fillText("오늘의 평가", 0, -18);
  c.font = '54px "Do Hyeon"';
  c.fillText(stampText, 0, 44);
  c.restore();
  c.restore();

  // footer
  c.textAlign = "center";
  c.fillStyle = "#ffd27a";
  c.font = '52px "Do Hyeon"';
  c.fillText("너도 오늘 장사해봐", W / 2, H - 140);
  c.fillStyle = "#b9b0a3";
  c.font = '36px "Nanum Gothic Coding"';
  c.fillText(host, W / 2, H - 80);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

function wrapLines(c: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > maxW && line) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out.slice(0, 3);
}
