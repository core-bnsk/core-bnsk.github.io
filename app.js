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

  /* ── roster: 분야 필터 + 대표 4종/모두 보기 ──────────────
     기본은 대표 4종만 노출(.is-extra 숨김). 분야 필터를 고르면
     해당 분야는 경험 연차와 관계없이 전부 보여 준다. */
  const chips = document.querySelectorAll(".chip[data-filter]");
  const works = document.querySelectorAll(".roster .work");
  const roster = document.getElementById("roster");
  const moreBtn = document.getElementById("moreToggle");

  /* 보조기술에도 선택 상태 전달 (09-30 검수) */
  const syncPressed = () => {
    chips.forEach((c) =>
      c.setAttribute("aria-pressed", c.classList.contains("is-on") ? "true" : "false")
    );
  };
  syncPressed();

  const applyVisibility = () => {
    const active = document.querySelector(".chip[data-filter].is-on");
    const f = active ? active.dataset.filter : "all";
    if (roster) roster.classList.toggle("is-filtered", f !== "all");
    works.forEach((w) => {
      const tags = w.dataset.tags.split(/\s+/);
      const show = f === "all" || tags.includes(f);
      w.classList.toggle("is-hidden", !show);
      if (show) {
        w.classList.remove("is-in");
        requestAnimationFrame(() =>
          requestAnimationFrame(() => w.classList.add("is-in"))
        );
      }
    });
  };

  const resetToAll = () => {
    const allChip = document.querySelector('.chip[data-filter="all"]');
    chips.forEach((c) => c.classList.toggle("is-on", c === allChip));
    syncPressed();
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.toggle("is-on", c === chip));
      syncPressed();
      applyVisibility();
    });
  });

  if (moreBtn && roster) {
    moreBtn.addEventListener("click", () => {
      const open = roster.classList.toggle("is-open");
      /* '모두 보기'는 분야 필터도 '전체'로 되돌려야 문구와 결과가 일치한다 (09-30 검수) */
      if (open) resetToAll();
      moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
      moreBtn.textContent = open ? "대표 샘플만 보기" : "샘플 18개 모두 보기";
      applyVisibility();
    });
  }

  /* ── 맨 위로: sticky 헤더에 id="top"이 있으면 현재 위치로 해석돼 스크롤이 멈춘다
     (09-30 검수 재현) — #top 링크는 항상 문서 최상단으로 보낸다 ── */
  document.querySelectorAll('a[href="#top"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ── header hairline on scroll ─────────────────────────── */
  const bar = document.querySelector(".site-head");
  const onBarScroll = () => {
    bar.style.borderBottomColor =
      window.scrollY > 8 ? "var(--line-dark)" : "var(--line)";
  };
  window.addEventListener("scroll", onBarScroll, { passive: true });
  onBarScroll();

  /* ── 플로팅 카톡 버튼: 가릴 것이 있으면 물러난다 ───────────
     1) 첫 화면(표지): 표지 하단이 버튼이 떠 있는 화면 아래쪽 밴드 위로
        올라온 뒤에만 버튼을 보여 준다. 히어로 문구·보조 버튼과 겹치지 않는다.
     2) 그 밖의 구간: 버튼이 놓인 자리에 링크·버튼처럼 '누를 것'이 있거나,
        같은 카톡 링크를 크게 다시 보여 주는 문의 섹션·푸터가 걸치면 물러난다.
        샘플 카드의 '샘플 사이트 열기'를 덮어 누르지 못하게 하거나 푸터 법정
        표기를 가리는 일을 막는다.
     판정은 스크롤 중 매 프레임이 아니라 스크롤이 멈춘 뒤 한 번만 한다
     (스크롤하는 동안 버튼이 깜빡이지 않게). 스크롤·리사이즈 판정은 rAF에서. */
  const fab = document.querySelector(".float-cta");
  if (fab) {
    const HOLD_BAND = 120; /* 버튼 위 120px 여유 — 이 선을 넘으면 노출 */
    const cover = document.querySelector(".cover");
    const AVOID_TARGETS = "a, button, summary, input, textarea, select, label, [role='button']";
    /* 같은 카톡 링크를 이미 크게 보여 주는 곳 — 여기서는 떠 있는 버튼이 중복이다 */
    const avoidZones = Array.prototype.slice.call(
      document.querySelectorAll(".section.contact, .site-foot")
    );

    /* 버튼은 translateY로 움직이므로 getBoundingClientRect는 감춰진 상태에서
       10px 아래를 가리킨다 — 판정이 흔들리지 않도록 레이아웃 위치로 계산한다. */
    const fabBox = () => {
      const cs = getComputedStyle(fab);
      const w = fab.offsetWidth;
      const h = fab.offsetHeight;
      const right = window.innerWidth - (parseFloat(cs.right) || 0);
      const bottom = window.innerHeight - (parseFloat(cs.bottom) || 0);
      return { left: right - w, top: bottom - h, width: w, height: h };
    };

    const coversSomething = () => {
      const r = fabBox();
      if (!r.width || !r.height) return false;
      const pts = [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.82]];
      for (let i = 0; i < pts.length; i += 1) {
        const stack = document.elementsFromPoint(
          r.left + r.width * pts[i][0],
          r.top + r.height * pts[i][1]
        );
        let under = null;
        for (let j = 0; j < stack.length; j += 1) {
          const el = stack[j];
          if (el === fab || fab.contains(el) || el.closest(".float-cta")) continue;
          under = el;
          break;
        }
        if (!under) continue;
        for (let k = 0; k < avoidZones.length; k += 1) {
          if (avoidZones[k].contains(under)) return true;
        }
        if (under.closest(AVOID_TARGETS)) return true;
      }
      return false;
    };

    const holdAtTop = () => {
      if (!cover) return false;
      const bottom = cover.getBoundingClientRect().bottom;
      return window.scrollY < 8 || bottom > window.innerHeight - HOLD_BAND;
    };

    let fabTicking = false;
    let settleTimer = null;

    const syncFab = () => {
      const hold = holdAtTop();
      fab.classList.toggle("is-hold", hold);
      if (hold) fab.classList.remove("is-avoid");
    };

    const syncAvoid = () => {
      if (fab.classList.contains("is-hold")) return;
      fab.classList.toggle("is-avoid", coversSomething());
    };

    const onFabScroll = () => {
      if (fabTicking) return;
      fabTicking = true;
      requestAnimationFrame(() => {
        fabTicking = false;
        syncFab();
      });
      clearTimeout(settleTimer);
      settleTimer = setTimeout(syncAvoid, 150);
    };

    syncFab();
    syncAvoid();
    window.addEventListener("scroll", onFabScroll, { passive: true });
    window.addEventListener("resize", onFabScroll, { passive: true });
    window.addEventListener("load", onFabScroll);
  }

  /* ── contact: 페이지 링크 복사 (오픈 전 웨이브리스트 대체 액션) ──
     클립보드를 못 쓰는 환경(file://·구형 웹뷰)에서는 토스트에 주소를
     그대로 보여줘서 수동 복사라도 가능하게 한다. 가짜 접수 완료는 보내지 않는다. */
  const copyBtn = document.getElementById("copyLink");
  const toast = document.getElementById("copyToast");
  if (copyBtn && toast) {
    const DEFAULT_MSG = toast.textContent;
    let toastTimer = null;
    const showToast = (msg, ms) => {
      if (msg) toast.textContent = msg;
      toast.classList.add("is-on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("is-on"), ms || 2800);
    };
    copyBtn.addEventListener("click", () => {
      const url = location.href.split("#")[0];
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(() => showToast(DEFAULT_MSG))
          .catch(() => showToast("주소: " + url, 6000));
      } else {
        showToast("주소: " + url, 6000);
      }
    });
  }
})();
