// Google Fonts splits Korean fonts into small chunks and only downloads the ones the
// page shows. Text drawn only on a canvas never triggers a download, so load it on purpose.
export const FONTS = ['"Do Hyeon"', '"Nanum Pen Script"', '"Nanum Gothic Coding"', '"Nanum Gothic"'];

// every string the cooking games draw on their canvas
export const CANVAS_TEXT =
  "↑ 천천히 위로 밀어요 탭해서 썰기 썰기 끝! ↻ 냄비 위에서 빙글빙글 딱! 좋아요 삐끗 놓쳤어요 빨간 표시가 꼬치에 닿을 때 탭 " +
  "꾹 누르고 있으면 반죽이 나와요 계란이 가운데 올 때 탭! 굽는 중… 지금이에요! 노릇노릇 타고 있어요!! 0123456789/";

export async function loadFonts(text: string) {
  try {
    await Promise.all(FONTS.flatMap((f) => [document.fonts.load(`20px ${f}`, text), document.fonts.load(`bold 20px ${f}`, text)]));
  } catch {
    // a fallback font is fine
  }
}
