/* ============================================================
   BNSK movement.js — STANDARD ENGINE v2 · 무브먼트 테마 런타임
   - 헤더 스크롤 상태(블러 배경) 전환
   - 모바일 메뉴 토글
   - 상담 다이얼로그(<dialog>): 열기/닫기·포커스 복귀·레슨 사전 선택
   - 데모 폼: 선택 결과만 표시 (저장·전송 없음) — 미선택 그룹은 1번 항목 기본 선택
   - 실서비스 폼: webhook 설정 시에만 전송, 미설정 시 안내 후 종료
   - 플로팅 상담 바: 280px 스크롤 후 표시, 푸터 진입 시 숨김 (데스크톱 전용 CSS)
   - 스크롤 리빌(.rv): 모션 최소화 선호·미지원 브라우저는 정적 표시
   안전장치: 기능별 safe() 격리 — 한 기능 오류가 나머지를 멈추지 않는다.
   ============================================================ */
'use strict';
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function safe(fn) {
    try { fn(); } catch (e) { /* 기능 단위 격리 — 실패는 해당 기능에만 머문다 */ }
  }

  /* [1] 헤더 스크롤 상태 — 상단에서는 투명, 스크롤 후 블러 배경 */
  safe(function () {
    var hd = qs('[data-header]');
    if (!hd) return;
    var apply = function () { hd.classList.toggle('is-scrolled', (window.scrollY || 0) > 40); };
    window.addEventListener('scroll', apply, { passive: true });
    apply();
  });

  /* [2] 모바일 메뉴 */
  safe(function () {
    var toggle = qs('[data-menu-toggle]');
    var nav = qs('#site-nav');
    if (!toggle || !nav) return;
    var close = function () {
      nav.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', function () {
      if (nav.hasAttribute('data-open')) close();
      else { nav.setAttribute('data-open', ''); toggle.setAttribute('aria-expanded', 'true'); }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });
  });

  /* [3] 상담 다이얼로그 + 폼(데모/실서비스) */
  safe(function () {
    var dialog = qs('#consult-dialog');
    if (!dialog) return;
    var form = qs('#consult-form', dialog);
    var result = qs('#consult-result', dialog);
    var resetBtn = qs('.demo-reset', dialog);
    var isDemo = !!(form && form.hasAttribute('data-demo-form'));
    var opener = null;

    /* 라디오 그룹에 아무것도 선택돼 있지 않으면 첫 항목을 기본 선택한다
       (엔진의 {{#if @index}}는 0을 참으로 판정해 기본 checked를 심을 수 없다) */
    function ensureDefault(name) {
      var group = qsa('input[name="' + name + '"]', dialog);
      if (!group.length) return;
      var any = group.some(function (input) { return input.checked; });
      if (!any) group[0].checked = true;
    }

    function openDialog(btn) {
      opener = btn;
      if (form) form.reset();
      if (result) { result.hidden = true; result.replaceChildren(); }
      if (resetBtn) resetBtn.hidden = true;
      if (form) form.hidden = false;
      if (isDemo) { ensureDefault('lesson'); ensureDefault('time'); }
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
    }

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

    /* [3-a] 데모 폼 — 결과 표시만 하고 어디에도 전송하지 않는다 */
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
        note.textContent = '여기까지가 상담 흐름 체험입니다. 실제 예약은 접수되지 않았으며, 선택 내용은 저장·전송되지 않습니다. 운영 사이트에서는 이 단계에 실제 강사의 상담 채널을 연결합니다.';
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
        ensureDefault('lesson');
        ensureDefault('time');
      });
      return; /* 데모 폼 여기까지 — 아래 실서비스 폼은 건너뛴다 */
    }

    /* [3-b] 실서비스 폼 — 미연결·전송 실패를 접수 성공으로 표시하지 않는다 */
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var url = form.getAttribute('data-webhook');
        var kakao = form.getAttribute('data-kakao');
        var tel = form.getAttribute('data-tel');
        var altLink = kakao || (tel ? 'tel:' + tel : null);
        var altLabel = kakao ? '카카오톡으로 문의하기' : '전화 문의하기';
        var render = function (titleText, noteText, link, linkLabel, hideForm) {
          var title = document.createElement('h3');
          title.textContent = titleText;
          var note = document.createElement('p');
          note.className = 'result-note';
          note.textContent = noteText;
          result.replaceChildren(title, note);
          if (link) {
            var a = document.createElement('a');
            a.className = 'demo-submit';
            a.href = link;
            if (/^tel:/.test(link)) { /* 전화는 같은 창 */ }
            else { a.target = '_blank'; a.rel = 'noopener'; }
            a.textContent = linkLabel;
            result.appendChild(a);
          }
          form.hidden = !!hideForm;
          result.hidden = false;
          result.focus();
        };
        if (!url) {
          render('상담 접수가 아직 연결되지 않았습니다.',
            '이 사이트는 접수창구가 준비 중입니다. 아래 채널로 바로 문의해 주세요.',
            altLink, altLabel, !!altLink);
          return;
        }
        var payload = JSON.stringify(Object.fromEntries(new FormData(form)));
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: payload })
          .then(function (res) {
            if (res.ok) render('상담 신청이 접수되었습니다.', '영업일 기준 하루 안에 연락드립니다. 입력 정보는 상담 목적으로만 사용됩니다.', null, null, true);
            else render('전송되지 않았습니다.', '잠시 후 다시 시도해 주세요. 계속 어려우면 아래 채널로 문의해 주세요.', altLink, altLabel, false);
          })
          .catch(function () {
            render('전송되지 않았습니다.', '네트워크 문제로 전송에 실패했습니다. 다시 시도해 주세요. 계속 어려우면 아래 채널로 문의해 주세요.', altLink, altLabel, false);
          });
      });
    }
  });

  /* [4] 플로팅 상담 바 — 280px 스크롤 후 표시, 푸터 진입 시 숨김 (데스크톱 전용 CSS) */
  safe(function () {
    var floatCta = qs('[data-float-cta]');
    if (!floatCta) return;
    var footerEl = qs('.site-footer');
    var footerNear = false;
    var applyFloat = function () {
      floatCta.hidden = false;
      floatCta.classList.toggle('is-visible', (window.scrollY || 0) > 280 && !footerNear);
    };
    window.addEventListener('scroll', applyFloat, { passive: true });
    if (footerEl && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        footerNear = entries[0].isIntersecting;
        applyFloat();
      }, { threshold: 0.04 }).observe(footerEl);
    }
    applyFloat();
  });

  /* [5] 스크롤 리빌 — reduced-motion이거나 IO 미지원이면 CSS 기본 상태(정적 표시) 유지 */
  safe(function () {
    var els = qsa('.rv');
    if (!els.length || REDUCED || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  });
})();
