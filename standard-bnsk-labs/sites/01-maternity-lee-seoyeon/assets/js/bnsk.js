/* ============================================================
   BNSK LABS — 공통 인터랙션 (바닐라 JS, 의존성 0)
   <script src="assets/js/bnsk.js" defer></script> 한 줄이면 전부 동작.
   컴포넌트는 data-* 속성으로 구동되므로 HTML 복사/붙여넣기만으로 조립 가능.
   z-index 계층: 헤더(60) < 플로팅 CTA(70) < 모달(80)
   ============================================================ */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ----------------------------------------------------------
   * [1] 헤더 그림자 (스크롤 시 elevated 상태)
   * -------------------------------------------------------- */
  var header = qs('[data-header]');
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('shadow-lg', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ----------------------------------------------------------
   * [2] 스크롤 리빌 (IntersectionObserver)
   * -------------------------------------------------------- */
  if ('IntersectionObserver' in window && !reducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    qsa('[data-reveal]').forEach(function (el) { io.observe(el); });
  } else {
    qsa('[data-reveal]').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ----------------------------------------------------------
   * [3] 아코디언 — data-acc-container / data-acc
   *   data-single="true" 컨테이너는 하나만 열림 (FAQ 기본)
   * -------------------------------------------------------- */
  qsa('[data-acc]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('[data-acc-item]');
      if (!item) return;
      var container = item.closest('[data-acc-container]');
      var willOpen = !item.classList.contains('open');
      if (willOpen && container && container.getAttribute('data-single') === 'true') {
        qsa('[data-acc-item].open', container).forEach(function (other) {
          if (other !== item) {
            other.classList.remove('open');
            var ob = qs('[data-acc]', other);
            if (ob) ob.setAttribute('aria-expanded', 'false');
          }
        });
      }
      item.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });

  /* ----------------------------------------------------------
   * [4] 탭 — data-tabs 컨테이너 / [data-tab="키"] 버튼 / [data-panel="키"]
   *   패널은 tablist 바깥 형제로 두는 것이 올바른 ARIA 구조이므로
   *   래퍼 내부 → 부모 → 문서 순으로 스코프를 넓혀 탐색한다.
   * -------------------------------------------------------- */
  qsa('[data-tabs]').forEach(function (wrap) {
    var btns = qsa('[data-tab]', wrap);
    var panels = qsa('[data-panel]', wrap);
    if (!panels.length) panels = qsa('[data-panel]', wrap.parentElement);
    if (!panels.length) panels = qsa('[data-panel]');
    function activate(key) {
      btns.forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === key)); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { activate(b.getAttribute('data-tab')); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
          next.focus(); activate(next.getAttribute('data-tab'));
        }
      });
    });
  });

  /* ----------------------------------------------------------
   * [5] 모달 — data-modal-open="id" / data-modal-close / data-modal-id
   *   열림 시 body 스크롤 잠금 + 포커스 트랩 + Esc 닫기
   * -------------------------------------------------------- */
  var lastFocused = null;
  function openModal(id, trigger) {
    var modal = qs('[data-modal-id="' + id + '"]');
    if (!modal) return;
    lastFocused = document.activeElement;
    /* 재오픈 시 폼 화면으로 리셋 — 이전 제출의 성공 화면·검증 오류가 잔존하는 결함 방지 */
    var form = qs('[data-form]', modal);
    var done = form ? qs('[data-form-done]', form.parentElement) : null;
    if (form && done && form.hidden) {
      form.hidden = false;
      done.hidden = true;
      qsa('.field-error', form).forEach(function (el) { el.classList.remove('field-error'); });
      qsa('.form-msg.show', form).forEach(function (el) { el.classList.remove('show'); });
      form.reset();
    }
    /* 프로그램 카드의 data-prefill → 모달 select 자동 선택 */
    if (trigger) {
      var prefill = trigger.getAttribute('data-prefill');
      if (prefill) {
        var select = qs('select[name="program"]', modal);
        if (select) {
          var opt = qsa('option', select).some(function (o) { return o.value === prefill; });
          if (opt) select.value = prefill;
        }
      }
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var first = qs('input, select, textarea, button, [href]', modal);
    if (first) first.focus();
  }
  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  qsa('[data-modal-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { openModal(btn.getAttribute('data-modal-open'), btn); });
  });
  qsa('[data-modal-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModal(btn.closest('.modal')); });
  });
  qsa('.modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) { if (e.target.classList.contains('modal-backdrop')) closeModal(modal); });
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = qsa('input, select, textarea, button, [href]', modal).filter(function (el) { return !el.disabled; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') qsa('.modal.open').forEach(closeModal);
  });

  /* ----------------------------------------------------------
   * [6] 전후 비교 슬라이더 — data-ba 컨테이너 안의 input[type=range]
   * -------------------------------------------------------- */
  qsa('[data-ba]').forEach(function (box) {
    var range = qs('input[type="range"]', box);
    if (!range) return;
    function apply() { box.style.setProperty('--ba', range.value + '%'); }
    range.addEventListener('input', apply);
    apply();
  });

  /* ----------------------------------------------------------
   * [7] 플로팅 카카오톡 CTA — data-float
   *   히어로(또는 300px) 이상 스크롤에서 표시, 푸터에서는 숨김
   * -------------------------------------------------------- */
  var float = qs('[data-float]');
  var footer = qs('footer');
  function onScrollFloat() {
    if (!float) return;
    var show = window.scrollY > 280;
    if (footer) {
      var fr = footer.getBoundingClientRect();
      if (fr.top < window.innerHeight) show = false;
    }
    float.classList.toggle('show', show);
  }
  window.addEventListener('scroll', onScrollFloat, { passive: true });
  onScrollFloat();

  /* ----------------------------------------------------------
   * [8] 신뢰 배지 카운트업 — data-count="3000"
   *   값의 숫자 부분만 애니메이션, 나머지는 그대로 유지
   * -------------------------------------------------------- */
  qsa('[data-count]').forEach(function (el) {
    var raw = el.getAttribute('data-count');
    var match = raw.match(/([\d,]+)/);
    if (!match) return;
    var target = parseInt(match[1].replace(/,/g, ''), 10);
    if (isNaN(target) || reducedMotion || !('IntersectionObserver' in window)) return;
    var prefix = raw.slice(0, match.index);
    var suffix = raw.slice(match.index + match[1].length);
    var started = false;
    var cio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || started) return;
      started = true;
      cio.disconnect();
      var t0 = null, dur = 1200;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased).toLocaleString('ko-KR') + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    cio.observe(el);
  });

  /* ----------------------------------------------------------
   * [9] 상담 폼 — data-form
   *   - 빈 값/연락처 형식 검증 후 성공 상태 표시
   *   - data-webhook이 있으면 실제 전송 (no-cors POST)
   * -------------------------------------------------------- */
  qsa('[data-form]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var firstBad = null;
      qsa('[required]', form).forEach(function (input) {
        var msg = qs('.form-msg', input.closest('[data-field]') || input.parentElement);
        var valid = input.value.trim().length > 0;
        if (valid && input.getAttribute('data-type') === 'phone') {
          valid = /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(input.value.replace(/\s/g, ''));
        }
        input.classList.toggle('field-error', !valid);
        if (msg) msg.classList.toggle('show', !valid);
        if (!valid && !firstBad) firstBad = input;
        ok = ok && valid;
      });
      if (!ok) { if (firstBad) firstBad.focus(); return; }

      var done = qs('[data-form-done]', form.parentElement);
      var webhook = form.getAttribute('data-webhook');
      if (webhook) {
        var payload = {};
        qsa('input, select, textarea', form).forEach(function (el) {
          if (el.name) payload[el.name] = el.value;
        });
        try { fetch(webhook, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) }); } catch (err) { /* 전송 실패는 무음 처리 */ }
      }
      if (done) {
        form.hidden = true;
        done.hidden = false;
        done.focus();
      } else {
        form.reset();
      }
    });
  });

  /* ----------------------------------------------------------
   * [10] 푸터 연도 자동 갱신 — <span data-year></span>
   * -------------------------------------------------------- */
  qsa('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
