/* ============================================================
   BNSK conversion.js — STANDARD ENGINE v2 · 컨버전 테마 런타임
   - 스크롤 리빌(.rv): body.anim 부여 후 등장 (reduced-motion·JS 불가 시 정적)
   - 모바일 메뉴 토글
   - 상담 다이얼로그(<dialog>): 열기/닫기·포커스 복귀·레슨 사전 선택
   - 데모 폼: 선택 결과만 표시 (저장·전송 없음)
   - 실서비스 폼: webhook 설정 시에만 전송, 미설정 시 안내 후 종료
   - 플로팅 상담 바: 280px 스크롤 후 표시, 푸터 진입 시 숨김
   - 신뢰 배지 카운트업: 숫자+단위 값만 애니메이션 (콤마 포맷 유지)
   ============================================================ */
'use strict';
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* [1] 스크롤 리빌 — .anim을 붙인 뒤에만 CSS가 숨긴다(무 JS 폴백) */
  document.body.classList.add('anim');
  var revealEls = qsa('.rv');
  if (REDUCED || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        obs.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  }

  /* [2] 모바일 메뉴 */
  var toggle = qs('[data-menu-toggle]');
  var nav = qs('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.hasAttribute('data-open');
      if (open) { nav.removeAttribute('data-open'); toggle.setAttribute('aria-expanded', 'false'); }
      else { nav.setAttribute('data-open', ''); toggle.setAttribute('aria-expanded', 'true'); }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nav.removeAttribute('data-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* [3] 상담 다이얼로그 — 데모/실서비스 공통 열기·닫기 */
  var dialog = qs('#consult-dialog');
  if (dialog) {
    var form = qs('#consult-form', dialog);
    var result = qs('#consult-result', dialog);
    var resetBtn = qs('.demo-reset', dialog);
    var isDemo = form && form.hasAttribute('data-demo-form');
    var opener = null;

    var openDialog = function (btn) {
      opener = btn;
      if (form) form.reset();
      if (result) { result.hidden = true; result.replaceChildren(); }
      if (resetBtn) resetBtn.hidden = true;
      if (form) form.hidden = false;
      var lesson = btn && btn.getAttribute('data-lesson');
      if (lesson) {
        qsa('input[name="lesson"]', dialog).forEach(function (input) {
          input.checked = input.value === lesson;
        });
        var sel = qs('select[name="lesson"]', dialog);
        if (sel) sel.value = lesson;
      }
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    };

    qsa('[data-consult]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDialog(btn); });
    });

    qsa('[data-dialog-close]', dialog).forEach(function (btn) {
      btn.addEventListener('click', function () { dialog.close(); });
    });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) {
        var r = dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
      }
    });
    dialog.addEventListener('close', function () { if (opener) opener.focus(); });

    /* [3-1] 데모 폼 — 결과 표시만 하고 어디에도 전송하지 않는다 */
    if (isDemo) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var choice = new FormData(form);
        var lesson = choice.get('lesson');
        var time = choice.get('time');
        var title = document.createElement('h3');
        var line = document.createElement('p');
        var note = document.createElement('p');
        note.className = 'result-note';
        /* 미선택 제출 가드 — 빈 결과 화면으로 넘어가지 않게 폼을 유지한 채 안내 */
        var missing = [];
        if (!lesson) missing.push('관심 있는 수업');
        if (!time) missing.push('편안한 시간대');
        if (missing.length) {
          title.textContent = '아직 선택하지 않은 항목이 있어요.';
          line.textContent = missing.join(' · ') + '을 선택해 주세요.';
          note.textContent = '두 항목을 모두 선택한 뒤 다시 눌러 주세요.';
          result.replaceChildren(title, line, note);
          result.hidden = false;
          result.focus();
          return;
        }
        title.textContent = '선택한 수업을 확인해 보세요.';
        line.textContent = lesson + ' · ' + time;
        note.textContent = '여기까지가 상담 흐름 체험이에요. 실제 예약은 접수되지 않았으며, 선택 내용은 저장·전송되지 않아요. 운영 사이트에서는 이 단계에 실제 강사의 상담 채널을 연결해요.';
        result.replaceChildren(title, line, note);
        form.hidden = true;
        result.hidden = false;
        resetBtn.hidden = false;
        result.focus();
      });
      if (resetBtn) resetBtn.addEventListener('click', function () {
        result.hidden = true;
        resetBtn.hidden = true;
        form.hidden = false;
        form.reset();
      });
    } else if (form) {
      /* [3-2] 실서비스 폼 — webhook(data-webhook) 있을 때만 전송 */
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var url = form.getAttribute('data-webhook');
        var done = function () {
          var title = document.createElement('h3');
          title.textContent = '상담 신청이 접수되었어요.';
          var note = document.createElement('p');
          note.className = 'result-note';
          note.textContent = '영업일 기준 하루 안에 연락드릴게요. 입력 정보는 상담 목적으로만 사용해요.';
          result.replaceChildren(title, note);
          form.hidden = true;
          result.hidden = false;
          result.focus();
        };
        if (url) {
          fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(new FormData(form))) }).then(done, done);
        } else {
          done();
        }
      });
    }
  }

  /* [4] 플로팅 상담 바 — 280px 스크롤 후 표시, 푸터 진입 시 숨김 (데스크톱 전용 CSS) */
  var floatCta = qs('[data-float-cta]');
  var footerEl = qs('.site-footer');
  if (floatCta) {
    var footerNear = false;
    var applyFloat = function () {
      floatCta.hidden = false;
      var past = (window.scrollY || 0) > 280;
      floatCta.classList.toggle('is-visible', past && !footerNear);
    };
    window.addEventListener('scroll', applyFloat, { passive: true });
    if (footerEl && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        footerNear = entries[0].isIntersecting;
        floatCta.classList.toggle('is-visible', (window.scrollY || 0) > 280 && !footerNear);
      }, { threshold: 0.04 }).observe(footerEl);
    }
    applyFloat();
  }

  /* [5] 신뢰 배지 카운트업 — "8,000시간+" 같은 숫자+접미사만 애니메이션
     (reduced-motion·비숫자 값은 즉시 표시, 콤마 포맷 유지) */
  var runCount = function (el) {
    var raw = el.textContent;
    var m = raw.match(/^([\d,]+)([^0-9:]*)$/);
    if (!m || /[0-9]/.test(m[2]) || REDUCED) return;
    var target = parseInt(m[1].replace(/,/g, ''), 10);
    if (!target) return;
    var suffix = m[2];
    var DUR = 1100, t0 = null;
    var step = function (now) {
      if (t0 === null) t0 = now;
      var k = Math.min((now - t0) / DUR, 1);
      k = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(target * k).toLocaleString('ko-KR') + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  var facts = qsa('.trust-grid .trust-value');
  if (facts.length && 'IntersectionObserver' in window) {
    var factObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        runCount(en.target);
      });
    }, { threshold: 0.35 });
    facts.forEach(function (el) { factObs.observe(el); });
  }
})();
