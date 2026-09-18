/* BNSK LABS — Quiet Luxury Editorial interactions */
(() => {
  "use strict";

  /* ── scroll reveal (scroll-based, fail-open) ─────────────
     IntersectionObserver 대신 스크롤/리사이즈/로드 시 in-view 판정.
     느린 기기·임베디드 브라우저에서도 리빌이 누락되지 않도록
     초기 스윕 + 짧은 주기의 안전망 재확인을 둔다. */
  const els = Array.from(document.querySelectorAll(".reveal"));
  let remaining = els.length;

  const reveal = (el) => {
    if (el.classList.contains("is-in")) return;
    const sibs = Array.from(el.parentElement.children).filter((c) =>
      c.classList.contains("reveal")
    );
    el.style.transitionDelay = `${Math.min(sibs.indexOf(el) * 70, 420)}ms`;
    el.classList.add("is-in");
    remaining--;
  };

  const inView = () => {
    if (remaining <= 0) return;
    const vh = window.innerHeight;
    for (const el of els) {
      if (el.classList.contains("is-in")) continue;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.96 && r.bottom > 0) reveal(el);
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      inView();
    });
  };

  inView();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", inView);
  /* 안전망: 스크롤 이벤트를 놓쳐도 350ms 안에는 화면 안 요소가 반드시 리빌되도록 */
  const sweep = setInterval(() => {
    inView();
    if (remaining <= 0) clearInterval(sweep);
  }, 350);

  /* ── roster filter ─────────────────────────────────────── */
  const chips = document.querySelectorAll(".chip");
  const works = document.querySelectorAll(".work");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.toggle("is-on", c === chip));
      const f = chip.dataset.filter;
      works.forEach((w) => {
        const tags = w.dataset.tags.split(/\s+/);
        const show = f === "all" || tags.includes(f);
        w.classList.toggle("is-hidden", !show);
        if (show) {
          const link = w.querySelector(".reveal") || w;
          link.classList.remove("is-in");
          requestAnimationFrame(() =>
            requestAnimationFrame(() => link.classList.add("is-in"))
          );
        }
      });
    });
  });

  /* ── restrained film: autoplay fallback + reduced motion ─ */
  const film = document.querySelector(".film video");
  if (film) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      film.pause();
      film.removeAttribute("autoplay");
      film.removeAttribute("loop");
    } else {
      const tryPlay = () => film.play().catch(() => {});
      tryPlay();
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) tryPlay();
      });
    }
  }

  /* ── header hairline on scroll ─────────────────────────── */
  const bar = document.querySelector(".site-head");
  const onBarScroll = () => {
    bar.style.borderBottomColor =
      window.scrollY > 8 ? "var(--line-dark)" : "var(--line)";
  };
  window.addEventListener("scroll", onBarScroll, { passive: true });
  onBarScroll();
})();
