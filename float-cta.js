/* BNSK LABS — 플로팅 카톡 버튼(.float-cta)의 표시 규칙 (공용)
   1) 첫 화면(표지)에서는 숨김 — 히어로 문구·보조 버튼을 가리지 않는다.
   2) 버튼이 놓인 자리에 링크·버튼처럼 누를 것이 있거나, 같은 카톡 링크를
      크게 다시 보여 주는 문의 섹션·푸터가 걸치면 물러난다.
      샘플 카드의 '샘플 사이트 열기'를 덮어 누르지 못하게 하거나 푸터 법정
      표기를 가리는 일을 막는다.
   판정은 스크롤이 멈춘 뒤 한 번만 한다(스크롤 중 깜빡임 방지).
   CSS는 html.js가 있을 때만 감춤 상태를 적용하므로, 스크립트가 없거나
   실패하면 버튼은 그대로 보인다(fail-open). */
(() => {
  "use strict";

  const fab = document.querySelector(".float-cta");
  if (!fab) return;

  const HOLD_BAND = 120; /* 표지 하단에서 이만큼 떨어지면 노출 */
  const cover = document.querySelector(".cover, .page-cover");
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

  let ticking = false;
  let settleTimer = null;

  const syncHold = () => {
    const hold = holdAtTop();
    fab.classList.toggle("is-hold", hold);
    if (hold) fab.classList.remove("is-avoid");
  };

  const syncAvoid = () => {
    if (fab.classList.contains("is-hold")) return;
    fab.classList.toggle("is-avoid", coversSomething());
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      syncHold();
    });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(syncAvoid, 150);
  };

  syncHold();
  syncAvoid();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", onScroll);
})();
