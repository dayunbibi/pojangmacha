import Pocha from "@/components/Pocha";
import Bulbs from "@/components/Bulbs";

export default function Home() {
  return (
    <>
      <header className="tarp px-4 pt-5 pb-3 text-center">
        <p className="m-0 text-xs font-bold tracking-[0.2em] text-white/80">향수병 게임즈 · 포장마차 편</p>
        <h1 className="m-0 mt-1 font-sign text-[44px] leading-none font-normal text-white [text-shadow:0_2px_0_var(--color-tarp-dark),0_0_24px_rgb(255_210_122/0.6)]">
          향수병 포차
        </h1>
      </header>
      <div className="hem" aria-hidden="true" />
      <Bulbs />

      <main className="mx-auto flex max-w-[440px] flex-col gap-5 px-4 pt-4 pb-10">
        <Pocha />

        <footer className="mt-6 flex flex-col gap-1 border-t border-white/10 pt-4 text-center text-sm text-ink-dim">
          <p className="m-0">토론토에서 한국 그리워서 만드는 웹게임</p>
          <p className="m-0">
            <a href="https://homesick-games.vercel.app" className="font-bold text-ink underline decoration-tarp decoration-2 underline-offset-4">
              향수병 게임즈
            </a>{" "}
            ·{" "}
            <a href="https://www.threads.com/@anab.uilds" className="font-bold text-ink underline decoration-tarp decoration-2 underline-offset-4">
              Threads
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
