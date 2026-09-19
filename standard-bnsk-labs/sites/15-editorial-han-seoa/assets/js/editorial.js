/* ============================================================
   BNSK editorial.js — STANDARD ENGINE v2 · 에디토리얼 테마 런타임
   - 모바일 메뉴 토글
   - 상담 다이얼로그(<dialog>): 열기/닫기·포커스 복귀·레슨 사전 선택
   - 데모 폼: 선택 결과만 표시 (저장·전송 없음)
   - 실서비스 폼: webhook 설정 시에만 전송, 미설정 시 안내 후 종료
   ============================================================ */
'use strict';
(function () {
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* [1] 모바일 메뉴 */
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

  /* [2] 상담 다이얼로그 */
  var dialog = qs('#consult-dialog');
  if (!dialog) return;
  var form = qs('#consult-form', dialog);
  var result = qs('#consult-result', dialog);
  var resetBtn = qs('.demo-reset', dialog);
  var isDemo = form && form.hasAttribute('data-demo-form');
  var opener = null;

  function openDialog(btn) {
    opener = btn;
    if (form) form.reset();
    if (result) { result.hidden = true; result.replaceChildren(); }
    if (resetBtn) resetBtn.hidden = true;
    if (form) form.hidden = false;
    var lesson = btn && btn.getAttribute('data-lesson');
    if (lesson) qsa('input[name="lesson"]', dialog).forEach(function (input) {
      input.checked = input.value === lesson;
    });
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

  /* [3] 데모 폼 — 결과 표시만 하고 어디에도 전송하지 않는다 */
  if (isDemo) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var choice = new FormData(form);
      var title = document.createElement('h3');
      title.textContent = '선택한 수업을 확인해 보세요.';
      var line = document.createElement('p');
      line.textContent = (choice.get('lesson') || '') + ' · ' + (choice.get('time') || '');
      var note = document.createElement('p');
      note.className = 'result-note';
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
    });
    return;
  }

  /* [4] 실서비스 폼 — webhook(data-webhook) 있을 때만 전송 */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var url = form.getAttribute('data-webhook');
      var done = function () {
        var title = document.createElement('h3');
        title.textContent = '상담 신청이 접수되었습니다.';
        var note = document.createElement('p');
        note.className = 'result-note';
        note.textContent = '영업일 기준 하루 안에 연락드립니다. 입력 정보는 상담 목적으로만 사용됩니다.';
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
})();
