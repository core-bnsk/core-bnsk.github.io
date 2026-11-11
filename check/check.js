/* BNSK LABS — /check/ 5분 자가진단표
   체크 개수 실시간 카운트 → 세 단계 자동 판정. 저장·전송 없음. */
(() => {
  "use strict";

  /* ── scroll reveal (styles.css의 .reveal) ──────────────── */
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
  const sweep = setInterval(() => {
    inView();
    if (remaining <= 0) clearInterval(sweep);
  }, 350);

  /* ── 자가진단 ────────────────────────────────────────── */
  const inputs = Array.from(document.querySelectorAll(".item-input"));
  const tally = document.getElementById("tally");
  const tallyNum = document.getElementById("tallyNum");
  const tallyFill = document.getElementById("tallyFill");
  const card = document.getElementById("resultCard");
  const resNum = document.getElementById("resNum");
  const resBand = document.getElementById("resBand");
  const resTitle = document.getElementById("resTitle");
  const resDesc = document.getElementById("resDesc");
  const resNextWrap = document.getElementById("resNextWrap");
  const resNext = document.getElementById("resNext");
  const resetBtn = document.getElementById("resetBtn");

  const BANDS = {
    top: {
      key: "top",
      label: "상위 5%",
      title: "지금 방식대로, 회원과의 라포에 집중하셔도 좋습니다",
      desc: "프로필이 이미 실력을 잘 담고 있습니다. 다만 원장이 보는 자리 — 채용과 출강 — 는 기준이 조금 다르니, 지원용으로 링크 하나만 건네면 끝나는 페이지가 있는지만 확인해 보세요.",
      next: [
        "지원·출강용 링크가 하나로 정리돼 있는지 확인하기",
        "최근 1년 수업 사례를 회원의 말로 한 줄씩 쌓아 두기",
        "프로필에서 문의까지 두 번의 터치로 끝나는지 점검하기"
      ]
    },
    warn: {
      key: "warn",
      label: "주의",
      title: "실력은 충분한데, 프로필이 그 실력을 반도 담지 못합니다",
      desc: "원장이나 회원이 볼 때 '흔한 프리랜서 강사' 중 한 명으로 보이기 쉬운 상태입니다. 두세 군데만 손보면 같은 경력이 다르게 읽힙니다.",
      next: [
        "프로필 첫 화면에서 가장 강한 한 줄을 뽑아 맨 앞으로 옮기기",
        "걸려 있는 링크를 소개·연락·작업물 세 갈래로만 정리하기",
        "문의 첫 문장을 '링크만 남겨도 된다'로 낮추기"
      ]
    },
    risk: {
      key: "risk",
      label: "위험",
      title: "수업에 쓴 10,000시간이 첫인상에서 깎이고 있습니다",
      desc: "수업 준비에 쏟은 시간의 가치가 프로필 첫인상에서 깎여나가고 있습니다. 디자인을 바꾸기 전에 '원장과 회원이 혹하는 언어로 재구성'하는 작업이 시급합니다.",
      next: [
        "이력서의 '수료' 한 줄을, 어떤 회원을 어떻게 호전시켰는지의 한 문장으로 바꾸기",
        "'어떤 분을 가장 잘 돕는지'를 한 줄로 정하고 나머지는 덜어내기",
        "링크트리를 하나의 소개 페이지로 모아 문의까지 한 번에 이어지게 만들기"
      ]
    }
  };

  const bandOf = (n) => (n >= 6 ? BANDS.risk : n >= 3 ? BANDS.warn : BANDS.top);
  let started = false;

  const render = () => {
    const n = inputs.filter((i) => i.checked).length;

    tallyNum.textContent = String(n);
    tallyFill.style.width = `${(n / inputs.length) * 100}%`;
    resNum.textContent = String(n);
    if (started) tally.classList.add("is-started");

    card.classList.remove("is-swap");
    void card.offsetWidth; /* 애니메이션 재시작 */

    if (!started) {
      card.dataset.band = "none";
      resBand.textContent = "진단 전";
      resTitle.textContent = "10문항을 체크하면 결과가 나옵니다";
      resDesc.textContent =
        "위 목록에서 지금의 나에게 해당하는 항목을 눌러 주세요. 체크한 개수에 따라 프로필의 상태를 세 단계로 나눠, 가장 먼저 손볼 곳까지 짚어 드립니다.";
      resNextWrap.hidden = true;
      resNext.innerHTML = "";
      return;
    }

    const b = bandOf(n);
    card.dataset.band = b.key;
    resBand.textContent = b.label;
    resTitle.textContent = b.title;
    resDesc.textContent = b.desc;
    resNextWrap.hidden = false;
    resNext.innerHTML = b.next
      .map(
        (t, i) =>
          `<li><span class="rn">0${i + 1}</span><span>${t}</span></li>`
      )
      .join("");
    card.classList.add("is-swap");
  };

  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!started) started = true;
      input.closest(".item").classList.toggle("is-checked", input.checked);
      render();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      inputs.forEach((input) => {
        input.checked = false;
        input.closest(".item").classList.remove("is-checked");
      });
      started = false;
      tally.classList.remove("is-started");
      tallyFill.style.width = "0";
      render();
    });
  }

  render();

  /* ── 맨 위로 ─────────────────────────────────────────── */
  document.querySelectorAll('a[href="#top"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ── header hairline on scroll ───────────────────────── */
  const bar = document.querySelector(".site-head");
  const onBarScroll = () => {
    if (!bar) return;
    bar.style.borderBottomColor =
      window.scrollY > 8 ? "var(--line-dark)" : "var(--line)";
  };
  window.addEventListener("scroll", onBarScroll, { passive: true });
  onBarScroll();
})();
