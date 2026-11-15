export default function Footer() {
  return (
    <footer className="relative z-3 mx-6 mt-6 text-center">
      <p className="m-0 text-[13px] leading-relaxed text-dim">토론토에서 한국이 그리워서 만든 웹게임</p>
      <p className="m-0 mt-2 text-[13px] leading-none font-medium">
        <a href="https://homesick-games.vercel.app" className="text-muted underline underline-offset-4">
          향수병 게임즈
        </a>
        <span className="text-night-line"> · </span>
        <a href="https://www.threads.com/@anab.uilds" className="text-muted underline underline-offset-4">
          Threads
        </a>
      </p>
    </footer>
  );
}
