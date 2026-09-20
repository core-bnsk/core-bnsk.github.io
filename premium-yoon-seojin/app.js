/* ═══════════════════════════════════════════════════════════════════════
   ProProfile Pilates — app.js
   data.js 를 읽어 화면에 렌더링하고, 체류 시간을 높이는 마이크로 인터랙션을
   제어하는 애플리케이션 모듈 (외부 라이브러리 없는 순수 Vanilla JS / ES Module)

   ◆ 실행 조건
     - http(s) 환경에서 실행할 것 (ES Module 은 file:// 에서 동작하지 않음)
     - index.html 과 data.js 는 같은 폴더에 위치

   ◆ 파일 구조 (모듈 인덱스)
     [0] 공용 유틸           — 셀렉터, HTML 이스케이프, 안전 실행 래퍼
     [1] 데이터 정규화       — data.js 의 값 검증·기본값 처리 (방어적 프로그래밍)
     [2] 렌더러              — profile/stats/philosophy/programs/curriculum/faq
                               (요구사항 1: 템플릿 리터럴 동적 렌더링)
     [3] SEO 바인딩          — 타이틀·메타·JSON-LD 구조화 데이터
     [4] 인터랙션 이니셜라이저 — 요구사항 2의 4가지 + 헤더/메뉴/폼/푸터
         · initScrollReveal    스크롤 페이드업 (IntersectionObserver)
         · initCounters        스탯 카운트업 애니메이션
         · initAccordions      단일 오픈 부드러운 아코디언
         · initFloatingCta     모바일 플로팅 상담 버튼 제어
     [5] 부트스트랩          — 순서 보장 + 단계별 예외 격리 (한 기능 실패가
                               전체 페이지를 죽이지 않도록 safeRun 으로 감쌈)

   ◆ 예외 처리 설계
     1. data.js 로딩 실패     → 동적 import + try/catch 로 감지, 화면에 안내문 표시
     2. 데이터 누락/형식 불일치 → normalizeData 가 기본값으로 대체하고 콘솔에 경고
     3. 렌더러 개별 실패      → safeRun 이 에러를 격리(다른 섹션은 계속 렌더링)
     4. 컨테이너 요소 부재    → 각 렌더러가 스스로 확인 후 조용히 건너뜀
     5. IntersectionObserver  → 미지원 브라우저에서는 즉시 표시(기능 저하 없음)
     6. 영상 로드 실패        → CSS 폴백 그라디언트 노출 (.video-failed)
     7. 문의 이메일 누락      → mailto 대신 대체 안내 메시지 표시
     8. 모든 주입 텍스트      → escapeHtml 로 이스케이프 (스크립트 삽입 차단)
════════════════════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────────────────────────
   [0] 공용 유틸
   ───────────────────────────────────────────────────────────────────── */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/** 모션 최소화(OS 설정) 사용자 여부 — 애니메이션 전면 생략에 사용 */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 템플릿 리터럴로 주입하는 모든 데이터에 적용하는 HTML 이스케이프 */
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/** 컨테이너 존재 여부를 확인해 없으면 경고를 남기고 건너뛰게 하는 가드 */
const requireEl = (selector, name) => {
  const el = $(selector);
  if (!el) console.warn(`[app.js] 컨테이너를 찾을 수 없어 건너뜁니다: ${name} (${selector})`);
  return el;
};

/** 기능 단위 예외 격리 래퍼 — 하나의 실패가 부트스트랩 전체를 중단하지 않게 함 */
const safeRun = (label, fn) => {
  try {
    fn();
  } catch (err) {
    console.error(`[app.js] ${label} 처리 중 오류 — 이 기능만 건너뜁니다:`, err);
  }
};

/** 이메일 문자열 간단 검증 (문의 폼·링크 주입에 사용) */
const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/* ─────────────────────────────────────────────────────────────────────
   [1] 데이터 정규화 — data.js 형식이 바뀌어도 페이지가 죽지 않게 방어
   ───────────────────────────────────────────────────────────────────── */
const normalizeData = (mod) => {
  const asArray = (value, label) => {
    if (Array.isArray(value)) return value;
    if (value) console.warn(`[app.js] data.${label} 이(가) 배열이 아닙니다 — 빈 배열로 대체합니다.`);
    return [];
  };
  const profile = (mod.profile && typeof mod.profile === 'object') ? mod.profile : {};
  if (!profile.name) console.warn('[app.js] data.profile.name 이 비어 있습니다. data.js 를 확인하세요.');

  return {
    // 요구사항의 'curriculum' 은 data.js 에서 curriculumAccordion 키로 제공됨 (별칭 허용)
    profile,
    stats:      asArray(mod.stats, 'stats'),
    philosophy: asArray(mod.philosophy, 'philosophy'),
    programs:   asArray(mod.programs, 'programs'),
    gallery:    asArray(mod.gallery, 'gallery'),
    curriculum: asArray(mod.curriculumAccordion ?? mod.curriculum, 'curriculumAccordion'),
    reviews:    (mod.reviews && typeof mod.reviews === 'object')
                  ? { summary: mod.reviews.summary ?? {}, items: Array.isArray(mod.reviews.items) ? mod.reviews.items : [] }
                  : { summary: {}, items: [] },
    faq:        asArray(mod.faq, 'faq'),
    hiring:     (mod.hiring && typeof mod.hiring === 'object') ? mod.hiring : null,
  };
};

/* ─────────────────────────────────────────────────────────────────────
   [2] 렌더러 — 템플릿 리터럴 + escapeHtml 로 동적 렌더링
   ───────────────────────────────────────────────────────────────────── */

/** profile → 히어로 카피·메타·직접 참조 텍스트 (값이 없으면 기존 마크업 유지) */
const renderProfile = (data) => {
  const p = data.profile;
  textBindAll([
    ['#hero-eyebrow', p.title],
    ['#hero-slogan', p.slogan],
    ['#hero-slogan-sub', p.sloganSub],
    ['#hero-meta-brand', p.heroMeta?.[0]],      // 예: "강서연 — 서울 강남 · 청담"
    ['#hero-meta-hours', p.heroMeta?.[1]],      // 예: "누적 티칭 12,000시간 · 재등록률 94%"
    ['#header-logo .logo__brand', p.nameEn],             // 퍼스널 헤더: 영문 이름
    ['#header-logo .logo__sub', p.specialtyEn],          // 퍼스널 헤더: 영문 전문분야
    ['#footer-brand', p.brandName],
    ['#footer-instructor', p.name && p.title ? `${p.name} · ${p.title}` : ''],
  ]);
};

/** profile(나이·지역·경력·자격증·소개) → 강사 소개(About) 섹션
    (경쟁 강점 ②: 강사 신뢰의 시각화) */
const renderAbout = (data) => {
  const p = data.profile;
  const photo = $('#about-photo');
  const media = $('.about__media');
  if (p.photoUrl && photo) {
    photo.src = p.photoUrl;
    photo.alt = `${p.name ?? '강사'} 프로필 사진`;
  } else if (media) {
    media.remove();                              // 사진 경로가 없으면 프레임째 숨김
  }
  textBindAll([
    ['#about-tagline', p.tagline],
    ['#about-plate-name', p.name],
    ['#about-plate-en', p.nameEn],
    ['#about-specialty', p.specialty],          // 전문분야 칩 (나이 대신 제공된 정보만 표시)
    ['#about-region', p.region],
    ['#about-years', p.years ? `${p.years}년` : ''],
  ]);
  const intro = $('#about-intro');
  if (intro) {
    intro.innerHTML = (p.selfIntro ?? [])
      .filter((s) => typeof s === 'string')
      .map((s) => `<p>${escapeHtml(s)}</p>`).join('');
  }
  const career = $('#career-list');
  if (career) {
    career.innerHTML = (p.career ?? []).map((c) => `
      <li>
        <span class="period">${escapeHtml(c.period)}</span>
        <span class="role">${escapeHtml(c.role)}</span>
        <span class="desc">${escapeHtml(c.desc)}</span>
      </li>`).join('');
  }
  const certs = $('#cert-list');
  if (certs) {
    certs.innerHTML = (p.certifications ?? []).map((c) => `<li>${escapeHtml(c)}</li>`).join('');
  }
};

/** stats[] → 카운트업 카드 (템플릿 리터럴) */
const renderStats = (data) => {
  const grid = requireEl('#stats-grid', '스탯 그리드');
  if (!grid) return;
  grid.innerHTML = data.stats.map((s, i) => `
    <li class="stat" data-reveal data-reveal-delay="${(i % 4) + 1}">
      <strong class="stat__value">
        <span data-counter="${Number(s.value) || 0}">0</span><span class="stat__suffix">${escapeHtml(s.suffix)}</span>
      </strong>
      <span class="stat__label">${escapeHtml(s.label)}</span>
      <span class="stat__desc">${escapeHtml(s.description)}</span>
    </li>`).join('');
};

/** profile.intro + philosophy[] → 무브먼트 & 철학 벤토 그리드
    ※ 인트로는 profile.intro 우선, 없으면 selfIntro 앞 문단으로 폴백
    ※ 갤러리 이미지는 data.gallery[] (없으면 엔진 기본값) */
const renderPhilosophy = (data) => {
  const intro = requireEl('#philosophy-intro', '철학 인트로');
  const introSrc = (Array.isArray(data.profile.intro) && data.profile.intro.length)
    ? data.profile.intro
    : (data.profile.selfIntro ?? []);
  if (intro) intro.innerHTML = introSrc
    ?.filter((p) => typeof p === 'string')
    .slice(0, 2)
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('') ?? '';

  const grid = requireEl('#movement-grid', '철학 그리드');
  if (!grid) return;
  const gallery = (Array.isArray(data.gallery) && data.gallery.length >= 2)
    ? data.gallery
    : [
      { src: 'assets/img/activity-reformer.jpg', alt: '리포머 레슨 룸', cap: 'Reformer Room' },
      { src: 'assets/img/studio-bright.jpg', alt: '필라테스 스튜디오 전경', cap: 'Studio' },
    ];
  const fig = (g, cls) => `
    <figure class="m-img ${cls}" data-reveal>
      <img src="${escapeHtml(g.src)}" alt="${escapeHtml(g.alt ?? '')}" loading="lazy" decoding="async">
      <figcaption class="m-img__cap">${escapeHtml(g.cap ?? '')}</figcaption>
    </figure>`;
  grid.innerHTML = `
    ${fig(gallery[0], 'm-img--w7')}
    <article class="phil-tile phil-tile--w5 m-tile-0" data-reveal data-reveal-delay="1"></article>
    <article class="phil-tile phil-tile--w5 m-tile-1" data-reveal data-reveal-delay="1"></article>
    ${fig(gallery[1], 'm-img--w7')}
    <article class="phil-tile phil-tile--wide" data-reveal></article>`;
  // 철학 텍스트는 textContent 로 주입해 이중 방어(이스케이프 + DOM API)를 적용
  const slots = [$('.m-tile-0'), $('.m-tile-1'), $('.phil-tile--wide')];
  data.philosophy.forEach((item, i) => {
    const slot = slots[i];
    if (!slot) return;
    const num  = document.createElement('span'); num.className = 'phil-tile__num';  num.textContent = item.num ?? String(i + 1).padStart(2, '0');
    const h3   = document.createElement('h3');   h3.className  = 'phil-tile__title'; h3.textContent  = item.title ?? '';
    const body = document.createElement('p');    body.className = 'phil-tile__body'; body.textContent = item.body ?? '';
    slot.append(num, h3, body);
  });
};

/** gallery[] → 스튜디오 masonry 갤러리 (비면 섹션째로 제거)
    · 각 카드는 <button> — 클릭 시 initLightbox 로 확대된다 */
const renderGallery = (data) => {
  const grid = $('#gallery-grid');
  const section = $('#studio');
  if (!grid || !section) return;
  const items = (data.gallery ?? []).filter((g) => g && g.src);
  if (!items.length) { section.remove(); return; }
  grid.innerHTML = items.map((g, i) => `
    <button class="g-card" type="button" data-lb-index="${i}"
            aria-label="${escapeHtml(g.alt ?? `스튜디오 사진 ${i + 1}`)} 확대해서 보기">
      <img src="${escapeHtml(g.src)}" alt="${escapeHtml(g.alt ?? '')}" loading="lazy" decoding="async">
      <span class="g-card__scrim" aria-hidden="true"></span>
      ${g.cap ? `<span class="g-card__cap">${escapeHtml(g.cap)}</span>` : ''}
      <span class="g-card__zoom" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
      </span>
    </button>`).join('');
};

/** reviews → 평점 요약 + 후기 카드 (경쟁 강점 ①: 실제 후기로 신뢰 전환) */
const renderReviews = (data) => {
  const r = data.reviews ?? { summary: {}, items: [] };
  const summary = r.summary ?? {};
  const score = $('#review-score');
  if (score) score.textContent = (Number(summary.score) || 0).toFixed(1);
  const stars = $('#review-stars');
  if (stars) {
    const n = Math.round(Number(summary.score) || 0);
    stars.textContent = '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 5 - n));
  }
  textBindAll([
    ['#review-count', summary.count ? `${Number(summary.count).toLocaleString('ko-KR')}건` : ''],
    ['#review-source', summary.source],
  ]);
  const grid = requireEl('#reviews-grid', '리뷰 그리드');
  if (!grid) return;
  const items = r.items ?? [];
  // 3의 배수가 아니면 2열 그리드 — 마지막 행 구멍(들쭉날쭉) 방지
  if (items.length && items.length % 3 !== 0) grid.dataset.cols = '2';
  grid.innerHTML = items.map((rv, i) => {
    const rating = Math.max(0, Math.min(5, Number(rv.rating) || 0));
    return `
      <article class="review-card" data-reveal data-reveal-delay="${(i % 3) + 1}">
        <p class="review-card__stars" aria-label="평점 ${rating}점 (5점 만점)">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
        <p class="review-card__text">${escapeHtml(rv.text)}</p>
        <footer class="review-card__foot">
          <p class="review-card__name">${escapeHtml(rv.name)}</p>
          <span class="review-card__tag">${escapeHtml(rv.tag)}</span>
        </footer>
      </article>`;
  }).join('');
};

/** programs[] → 프리미엄 레슨 카드 (템플릿 리터럴) */
const renderPrograms = (data) => {
  const grid = requireEl('#programs-grid', '프로그램 그리드');
  if (!grid) return;
  grid.innerHTML = data.programs.map((p, i) => `
    <article class="program-card" data-reveal data-reveal-delay="${(i % 2) + 1}">
      <span class="program-card__num" aria-hidden="true">0${i + 1}</span>
      <p class="program-card__en">${escapeHtml(p.nameEn)}</p>
      <h3 class="program-card__name">${escapeHtml(p.name)}</h3>
      <dl class="program-card__spec">
        <div><dt>대상</dt><dd>${escapeHtml(p.target)}</dd></div>
        <div><dt>시간</dt><dd>${escapeHtml(p.duration)}</dd></div>
      </dl>
      <p class="program-card__desc">${escapeHtml(p.description)}</p>
      <ul class="program-card__features">
        ${(p.features ?? []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
    </article>`).join('');
};

/** curriculumAccordion[] → 단계별 과정 아코디언 (첫 단계 기본 펼침) */
const renderCurriculum = (data) => {
  const wrap = requireEl('#curriculum-accordion', '과정 아코디언');
  if (!wrap) return;
  wrap.innerHTML = data.curriculum.map((c, i) => `
    <article class="accordion__item ${i === 0 ? 'is-open' : ''}">
      <h3 class="accordion__heading">
        <button class="accordion__trigger" type="button" id="proc-t${i}"
                aria-expanded="${i === 0}" aria-controls="proc-p${i}">
          <span class="accordion__step">${escapeHtml(c.step)}</span>
          <span class="accordion__title">${escapeHtml(c.title)}</span>
          <span class="accordion__icon" aria-hidden="true"><i></i><i></i></span>
        </button>
      </h3>
      <div class="accordion__panel" id="proc-p${i}" role="region" aria-labelledby="proc-t${i}">
        <div class="accordion__panel-inner">
          <div class="accordion__body">
            <p>${escapeHtml(c.body)}</p>
            <ul class="tag-list">
              ${(c.tags ?? []).map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </article>`).join('');
};

/** hiring → 채용·협업 섹션 (#partners — 센터 원장님 · 기업 담당자용)
    · 강사 사이트의 '두 번째 언어': 채용자가 30초 안에 보는 팩트·조건 정보
    · 값이 비면 해당 행·카드가 숨겨지고, 모두 비면 섹션과 내비 링크를 제거해
      회원 모집용 흐름을 유지한다 (빈 섹션 방지) */
const renderHiring = (data) => {
  const section = $('#partners');
  if (!section) return;
  const h = data.hiring ?? {};
  const owner = (h.owner && typeof h.owner === 'object') ? h.owner : {};
  const corp  = (h.corporate && typeof h.corporate === 'object') ? h.corporate : {};
  const ownerRows  = (Array.isArray(owner.conditions) ? owner.conditions : []).filter((r) => r && r.label && r.value);
  const corpExp    = (Array.isArray(corp.experience) ? corp.experience : []).filter(Boolean);
  const corpOffers = (Array.isArray(corp.offerings) ? corp.offerings : []).filter(Boolean);
  const corpFacts  = (Array.isArray(corp.facts) ? corp.facts : []).filter((f) => f && f.label && f.value);
  const hasOwner = !!(ownerRows.length || owner.note);
  const hasCorp  = !!(corpExp.length || corpOffers.length || corpFacts.length || corp.note);

  // 데이터 없음 → 섹션·내비 링크 완전 제거 (모바일 메뉴는 li 째 제거)
  if (!hasOwner && !hasCorp) {
    section.remove();
    $$('a[href="#partners"]').forEach((a) => (a.closest('li') || a).remove());
    return;
  }

  const title = $('#hiring-title');
  if (title && h.title) title.innerHTML = escapeHtml(h.title).replace(/\n/g, '<br>');
  textBindAll([
    ['#hiring-lede', h.lede],
    ['#hiring-owner-note', owner.note],
    ['#hiring-corporate-note', corp.note],
    ['#hiring-contact', h.contactNote],
  ]);
  if (!h.contactNote) $('#hiring-contact')?.remove();

  // (1) 센터 · 원장님용 조건표
  const ownerCard = $('#hiring-owner');
  if (ownerCard) {
    if (!hasOwner) { ownerCard.remove(); }
    else {
      const list = $('#hiring-owner-list');
      if (list) list.innerHTML = ownerRows.map((r) => `
        <div class="hiring-row">
          <dt>${escapeHtml(r.label)}</dt>
          <dd>${escapeHtml(r.value)}</dd>
        </div>`).join('');
    }
  }

  // (2) 기업 · 오피스 출강용 소개서
  const corpCard = $('#hiring-corporate');
  if (corpCard) {
    if (!hasCorp) { corpCard.remove(); }
    else {
      const body = $('#hiring-corporate-body');
      if (body) body.innerHTML = `
        ${corpExp.length ? `
          <h4 class="hiring-sub">출강 경험</h4>
          <ul class="hiring-exp">${corpExp.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
        ${corpOffers.length ? `
          <h4 class="hiring-sub">운영 가능 프로그램</h4>
          <ul class="hiring-offers">${corpOffers.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
        ${corpFacts.length ? `
          <h4 class="hiring-sub">계약 · 운영 정보</h4>
          <dl class="hiring-conditions">${corpFacts.map((f) => `
            <div class="hiring-row">
              <dt>${escapeHtml(f.label)}</dt>
              <dd>${escapeHtml(f.value)}</dd>
            </div>`).join('')}</dl>` : ''}`;
    }
  }
};

/** faq[] → 토글 아코디언 */
const renderFaq = (data) => {
  const wrap = requireEl('#faq-list', 'FAQ 아코디언');
  if (!wrap) return;
  wrap.innerHTML = data.faq.map((f, i) => `
    <article class="accordion__item">
      <h3 class="accordion__heading">
        <button class="accordion__trigger" type="button" id="faq-t${i}"
                aria-expanded="false" aria-controls="faq-p${i}">
          <span class="accordion__title">${escapeHtml(f.question)}</span>
          <span class="accordion__icon" aria-hidden="true"><i></i><i></i></span>
        </button>
      </h3>
      <div class="accordion__panel" id="faq-p${i}" role="region" aria-labelledby="faq-t${i}">
        <div class="accordion__panel-inner">
          <div class="accordion__body"><p>${escapeHtml(f.answer)}</p></div>
        </div>
      </div>
    </article>`).join('');
};

/** profile.links → [data-link] 요소에 URL 주입, 빈 값이면 요소 자동 제거 */
const renderLinks = (data) => {
  const links = data.profile.links ?? {};
  $$('[data-link]').forEach((el) => {
    const key = el.getAttribute('data-link');
    const url = links[key];
    if (!url) { (el.closest('[data-link-item]') || el).remove(); return; }
    el.setAttribute('href', url);
    if (/^https?:/.test(url)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
  });
  // 스튜디오 메타 · 메일 · 모바일 메뉴 하단 · 푸터 소셜 · 오시는 길
  textBindAll([
    ['#contact-studio-name', data.profile.studio?.name],
    ['#contact-studio-address', data.profile.studio?.address],
    ['#contact-studio-hours', data.profile.studio?.hours],
    ['#mobile-menu-foot', data.profile.links?.email ? `상담 · 예약 — ${data.profile.links.email}` : '상담 및 예약은 카카오톡 채널에서'],
  ]);
  // 오시는 길 — 카카오맵 링크 (studio.mapUrl 없으면 링크 제거)
  const mapEl = $('#contact-map-link');
  if (mapEl) {
    const mapUrl = data.profile.studio?.mapUrl;
    if (mapUrl) mapEl.href = mapUrl;
    else mapEl.remove();
  }
  // 값이 채워지지 않은 스튜디오 메타 행(주소·운영시간 등)은 줄째로 숨김
  ['#contact-studio-address', '#contact-studio-hours'].forEach((sel) => {
    const node = $(sel);
    if (node && !node.textContent.trim()) node.closest('li')?.remove();
  });
  const mailEl = $('#contact-email');
  if (mailEl) {
    if (isEmail(data.profile.links?.email)) {
      mailEl.textContent = data.profile.links.email;
      mailEl.href = 'mailto:' + data.profile.links.email;
    } else {
      console.warn('[app.js] 유효한 문의 이메일이 없어 메일 링크를 숨깁니다.');
      mailEl.remove();
    }
  }
  const footerLinks = $('#footer-links');
  if (footerLinks) {
    [['kakaoOpenChat', '카카오톡'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['naverBlog', 'Blog']]
      .forEach(([key, label]) => {
        const url = links[key];
        if (!url) return;
        const a = document.createElement('a');
        a.textContent = label; a.href = url; a.target = '_blank'; a.rel = 'noopener';
        footerLinks.appendChild(a);
      });
  }
};

/** 텍스트 일괄 바인딩 헬퍼 — [셀렉터, 값] 쌍을 textContent 로 주입 */
const textBindAll = (pairs) => {
  pairs.forEach(([sel, value]) => {
    if (value == null || value === '') return;
    const node = $(sel);
    if (node) node.textContent = String(value);
  });
};

/** 관심 프로그램 <select> 옵션을 programs[] 로 채움 */
const renderProgramOptions = (data) => {
  const select = $('#f-program');
  if (!select) return;
  const options = data.programs.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`);
  select.innerHTML = '<option value="">선택해 주세요</option>' + options.join('')
    + '<option value="상담 후 결정">아직 모르겠어요 · 상담에서 결정</option>';
};

/* ─────────────────────────────────────────────────────────────────────
   [3] SEO 바인딩 — 동적 콘텐츠를 검색엔진·SNS 카드에 반영
   ───────────────────────────────────────────────────────────────────── */
const updateSeo = (data) => {
  const p = data.profile;
  document.title = p.siteTitle || document.title;
  const setMeta = (selector, value) => {
    const el = $(selector);
    if (el && value) el.setAttribute('content', value);
  };
  setMeta('meta[name="description"]', `${p.title ?? ''} ${p.slogan ?? ''}`.trim());
  setMeta('meta[property="og:title"]', p.siteTitle);
  setMeta('meta[property="og:description"]', p.slogan);

  // 배포 도메인(siteUrl)이 설정되면 SNS 공유 카드의 절대 URL을 완성합니다.
  // · og:url        → 사이트 대표 주소 (중복 페이지 판정 방지)
  // · og:image      → 절대경로 (상대경로는 카톡/인스타 공유 카드에서 누락될 수 있음)
  // · link[canonical] → 없으면 새로 만들어 대표 주소 지정
  const siteUrl = (p.siteUrl || '').replace(/\/+$/, '');
  if (siteUrl) {
    setMeta('meta[property="og:url"]', `${siteUrl}/`);
    const img = $('meta[property="og:image"]');
    if (img && img.getAttribute('content') && !/^https?:/.test(img.getAttribute('content'))) {
      img.setAttribute('content', `${siteUrl}/${img.getAttribute('content').replace(/^\.\//, '')}`);
    }
    let canonical = $('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${siteUrl}/`);
  }

  // 구조화 데이터(리치 결과용) —ExerciseGym + Person
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ExerciseGym',
    name: p.brandName,
    description: [p.title, p.slogan].filter(Boolean).join(' — '),
    address: p.studio?.address,
    openingHours: p.studio?.hours,
    email: isEmail(p.links?.email) ? p.links.email : undefined,
    founder: { '@type': 'Person', name: p.name, alternateName: p.nameEn, jobTitle: p.title },
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
};

/* ─────────────────────────────────────────────────────────────────────
   [4] 인터랙션 이니셜라이저
   ───────────────────────────────────────────────────────────────────── */

/** 히어로 비디오: data.js 의 영상 주입 + 로드 실패 시 CSS 폴백 전환 */
const initHeroVideo = (data) => {
  const video = $('#hero-video');
  const hero = $('#hero');
  if (!video || !hero) return;
  const cfg = data.profile.heroVideo ?? {};
  const singleUrl = data.profile.heroVideoUrl;
  if (!cfg.desktop && !singleUrl) { hero.classList.add('video-failed'); return; }

  // 화면별 최적 소스 — 뷰포트 경계를 넘나들 때 영상·포스터를 교체한다
  const mqMobile = window.matchMedia('(max-width: 767px)');
  const pick = () => (mqMobile.matches
    ? { src: cfg.mobile ?? singleUrl, poster: cfg.posterMobile ?? data.profile.posterImgUrl }
    : { src: cfg.desktop ?? singleUrl, poster: cfg.posterDesktop ?? data.profile.posterImgUrl });

  const apply = (first) => {
    const { src, poster } = pick();
    if (!src) { hero.classList.add('video-failed'); return; }
    if (poster) video.setAttribute('poster', poster);
    if (video.dataset.activeSrc === src) return;          // 같은 소스면 재생 유지
    video.dataset.activeSrc = src;
    video.src = src;                                       // <source> 대신 src 직접 교체
    if (reducedMotion && first) video.removeAttribute('autoplay');  // 모션 최소화 배려
    video.load();
    video.play?.().catch(() => {/* 자동재생 차단 시 포스터 유지 */});
  };

  video.querySelector('source')?.remove();
  video.addEventListener('error', () => {
    console.warn('[app.js] 히어로 영상 로드 실패 — CSS 폴백 그라디언트로 전환합니다.');
    hero.classList.add('video-failed');
  }, true);                                                // 캡처 단계 — source 오류도 잡힘
  apply(true);
  mqMobile.addEventListener?.('change', () => apply(false));
};

/** ★ 요구사항 2-1 Scroll Reveal — [data-reveal] 페이드업 (IO 기반) */
const initScrollReveal = () => {
  const targets = $$('[data-reveal]');
  if (!targets.length) return;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));  // 미지원·모션 최소화: 즉시 표시
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);                            // 1회성 애니메이션
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  targets.forEach((el) => observer.observe(el));
};

/** ★ 요구사항 2-2 Animated Counter — 뷰포트 진입 시 0 → 목표값 카운트업 */
const initCounters = () => {
  const counters = $$('[data-counter]');
  if (!counters.length) return;
  const DURATION = 2000;
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
  const format = (n) => Math.round(n).toLocaleString('ko-KR');

  const animate = (el) => {
    const target = Number(el.getAttribute('data-counter')) || 0;
    if (reducedMotion) { el.textContent = format(target); return; }
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / DURATION, 1);
      el.textContent = format(target * easeOutQuart(progress));
      if (progress < 1) requestAnimationFrame(step);          // 취소 콜백 없이 1회 종료 보장
    };
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) { counters.forEach(animate); return; }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      obs.unobserve(entry.target);                            // 재실행 방지
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => observer.observe(el));
};

/** ★ 요구사항 2-3 Smooth Accordion — 그룹 내 단일 오픈 토글
    (열림/닫힘 애니메이션 자체는 styles.css 의 grid-template-rows 전환 담당) */
const initAccordions = () => {
  $$('[data-accordion]').forEach((group) => {
    const items = $$('.accordion__item', group);
    const setOpen = (item, open) => {
      item.classList.toggle('is-open', open);
      const trigger = $('.accordion__trigger', item);
      if (trigger) trigger.setAttribute('aria-expanded', String(open));
    };
    items.forEach((item) => {
      const trigger = $('.accordion__trigger', item);
      if (!trigger) return;
      trigger.addEventListener('click', () => {
        const wasOpen = item.classList.contains('is-open');
        if (group.getAttribute('data-accordion') === 'single') {
          items.forEach((other) => setOpen(other, false));   // 다른 항목 자동 닫힘
        }
        setOpen(item, !wasOpen);
      });
    });
  });
};

/** ★ 요구사항 2-4 Floating CTA — 히어로 이탈 시 표시, 컨택트 중복 노출 방지 */
const initFloatingCta = () => {
  const cta = $('#mobile-cta');
  const hero = $('#hero');
  const contact = $('#contact');
  if (!cta) return;
  // IO 미지원 환경: 항상 표시(기능 저하 없는 폴백)
  if (!hero || !('IntersectionObserver' in window)) { cta.classList.add('is-visible'); return; }

  let pastHero = false;
  let contactVisible = false;
  const apply = () => cta.classList.toggle('is-visible', pastHero && !contactVisible);

  new IntersectionObserver(([entry]) => {
    pastHero = !entry.isIntersecting;                          // 히어로를 벗어나면 true
    apply();
  }, { rootMargin: '-12% 0px 0px 0px' }).observe(hero);

  if (contact) {
    new IntersectionObserver(([entry]) => {
      contactVisible = entry.isIntersecting;                   // 문의 섹션이 보이면 중복 숨김
      apply();
    }, { threshold: 0.15 }).observe(contact);
  }
};

/** 라이트박스 — 갤러리 카드 클릭 시 확대 보기 (←/→ 이동 · Esc/백드롭 닫기) */
const initLightbox = (data) => {
  const box = $('#lightbox');
  if (!box) return;
  const items = (data.gallery ?? []).filter((g) => g && g.src);
  if (!items.length) { box.remove(); return; }
  const img = $('#lb-img'), cap = $('#lb-caption'), count = $('#lb-count');
  let index = 0;
  let lastFocus = null;

  const render = () => {
    const g = items[index];
    if (!g) return;
    img.src = g.src;
    img.alt = g.alt ?? '';
    cap.textContent = g.cap ?? g.alt ?? '';
    count.textContent = `${index + 1} / ${items.length}`;
    $('#lb-prev')?.toggleAttribute('disabled', items.length < 2);
    $('#lb-next')?.toggleAttribute('disabled', items.length < 2);
  };
  const open = (i) => {
    index = i; render();
    lastFocus = document.activeElement;
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('menu-open');   // 배경 스크롤 잠금 재사용
    $('#lb-close')?.focus();
  };
  const close = () => {
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('menu-open');
    lastFocus?.focus?.();
  };
  const move = (d) => { index = (index + d + items.length) % items.length; render(); };

  $$('#gallery-grid .g-card').forEach((card) => {
    card.addEventListener('click', () => open(Number(card.dataset.lbIndex) || 0));
  });
  $('#lb-close')?.addEventListener('click', close);
  $('#lb-prev')?.addEventListener('click', () => move(-1));
  $('#lb-next')?.addEventListener('click', () => move(1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  window.addEventListener('keydown', (e) => {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });
};

/** 도트 내비 — data-dot 섹션에서 생성, 스크롤 위치에 따라 활성 도트 이동 (≥1024px) */
const initDotNav = () => {
  const nav = $('#dot-nav');
  if (!nav) return;
  const sections = $$('main section[data-dot]');
  if (!sections.length || !('IntersectionObserver' in window)) { nav.remove(); return; }
  const links = sections.map((sec, i) => {
    const a = document.createElement('a');
    a.href = `#${sec.id}`;
    a.setAttribute('aria-label', sec.dataset.dot);
    a.innerHTML = `<i aria-hidden="true"></i><span>${escapeHtml(sec.dataset.dot)}</span>`;
    nav.appendChild(a);
    a.addEventListener('click', (e) => {                    // 스무스 스크롤 (scroll-padding 준수)
      e.preventDefault();
      document.querySelector(`#${CSS.escape(sec.id)}`)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    });
    return a;
  });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((l) => l.classList.remove('is-active'));
      const i = sections.indexOf(entry.target);
      links[i]?.classList.add('is-active');
    });
  }, { rootMargin: '-42% 0px -52% 0px' });
  sections.forEach((sec) => spy.observe(sec));
};

/** 프리로더 — 로드 완료(또는 최대 1.4s) 후 브랜드 페이드아웃. 실패해도 사이트는 그대로 노출 */
const initPreloader = () => {
  const pre = $('#preloader');
  if (!pre) return;
  const done = () => {
    pre.classList.add('is-done');
    window.setTimeout(() => pre.remove(), 900);
  };
  if (reducedMotion) { pre.remove(); return; }
  if (document.readyState === 'complete') window.setTimeout(done, 450);
  else window.addEventListener('load', () => window.setTimeout(done, 450), { once: true });
  window.setTimeout(done, 1400);                            // 안전 밸브 — 어떤 일이 있어도 해제
};

/** 히어로 헤드라인 단어 스태거 — #hero-slogan 을 단어 단위 <span> 으로 쪼개 순차 등장 */
const splitHeroHeadline = () => {
  const el = $('#hero-slogan');
  if (!el || reducedMotion) return;
  const words = (el.textContent ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return;
  el.innerHTML = words.map((w, i) => {
    const s = document.createElement('span');
    s.className = 'hero__word';
    s.textContent = w;
    s.style.setProperty('--wd', `${(i * 0.09).toFixed(2)}s`);
    return s.outerHTML;
  }).join(' ');
  el.closest('.hero__line')?.classList.add('hero__line--split');
};

/** 마그네틱 버튼 — 정밀 포인터(데스크톱 마우스)에서 CTA 가 커서를 살짝 따라온다 */
const initMagneticButtons = () => {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
  $$('.hero__actions .btn, .header-cta').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      btn.style.transform = `translate(${x * 7}px, ${y * 5}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
};

/** 헤더 글래스 상태 · 스크롤 진행 바 · 히어로 패럴랙스 (rAF 스로틀) */
const initHeaderScroll = () => {
  const header = $('#site-header');
  const bar = $('#progress-bar');
  const heroInner = $('#hero-inner');
  let ticking = false;
  const update = () => {
    const y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    if (heroInner && !reducedMotion && y < window.innerHeight) {
      heroInner.style.transform = 'translateY(' + (y * 0.22) + 'px)';
      heroInner.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.9)).toFixed(3);
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;                                       // 프레임당 1회만 계산
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
};

/** 스크롤스파이 — 현재 섹션을 GNB 링크에 반영 */
const initScrollSpy = () => {
  if (!('IntersectionObserver' in window)) return;
  const links = $$('[data-nav-link]');
  const map = new Map();
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.charAt(0) === '#') {
      const section = $(href);
      if (section) map.set(section, link);
    }
  });
  if (!map.size) return;
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((l) => l.classList.remove('is-active'));
      const active = map.get(entry.target);
      if (active) active.classList.add('is-active');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  map.forEach((_link, section) => spy.observe(section));
};

/** 모바일 풀스크린 메뉴 — 토글 · 링크 클릭 · Esc 닫기 */
const initMobileMenu = () => {
  const toggle = $('#nav-toggle');
  const menu = $('#mobile-menu');
  if (!toggle || !menu) return;
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.documentElement.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
};

/** 문의 폼 — Formspree 설정 시 서버 전송, 미설정 시 mailto 전송 (모두 클라이언트 검증 우선) */
const initContactForm = (data) => {
  const form = $('#contact-form');
  if (!form) return;
  const status = $('#form-status');
  const note = form.querySelector('.form-note');
  const showStatus = (message) => {
    if (!status) return;
    status.textContent = message;
    status.classList.add('is-visible');
  };
  // links.formspreeId 에 Formspree 폼 ID(https://formspree.io/f/ ← 의 마지막 조각)를
  // 넣으면 메일 앱 없이 서버로 직접 전송됩니다. 빈 값("")이면 기존 mailto 방식으로 동작.
  const formspreeId = data.profile.links?.formspreeId;
  if (formspreeId && note) {
    note.textContent = '보내기를 누르면 상담 요청이 강사에게 전달됩니다. 카카오톡 상담도 언제든 환영합니다.';
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#f-name')?.value.trim() ?? '';
    const phone = $('#f-phone')?.value.trim() ?? '';
    const program = $('#f-program')?.value || '미선택';
    const message = $('#f-message')?.value.trim() ?? '';

    if (!name || !phone) {                                     // 1차 클라이언트 검증
      showStatus('이름과 연락처는 필수입니다.');
      (!name ? $('#f-name') : $('#f-phone'))?.focus();
      return;
    }
    const payload = { name, phone, program, message: message || '(없음)' };
    const submitBtn = form.querySelector('[type="submit"]');
    if (formspreeId) {
      submitBtn?.setAttribute('disabled', '');
      try {
        const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        form.reset();
        showStatus('상담 요청이 접수되었습니다. 1일 이내에 회신드립니다.');
      } catch {
        showStatus('전송에 실패했습니다. 잠시 후 다시 시도하거나 카카오톡 채널로 문의해 주세요.');
      } finally {
        submitBtn?.removeAttribute('disabled');
      }
      return;
    }
    const email = data.profile.links?.email;
    if (!isEmail(email)) {                                     // 이메일 누락 시 대체 경로 안내
      showStatus('카카오톡 채널로 문의해 주세요.');
      return;
    }
    const subject = encodeURIComponent(`[상담 예약] ${name}님 — ${program}`);
    const body = encodeURIComponent(
      `이름: ${name}\n연락처: ${phone}\n관심 프로그램: ${program}\n문의 내용: ${message || '(없음)'}\n`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    showStatus(`메일 앱을 열었습니다. 열리지 않으면 ${email} 로 직접 보내주세요.`);
  });
};

/** 맨 위로 버튼 · 저작권 연도 */
const initFooterWidgets = () => {
  const toTop = $('#to-top');
  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
};

/* ─────────────────────────────────────────────────────────────────────
   [5] 부트스트랩 — 렌더 → 인터랙션 순서 보장 + 단계별 예외 격리
   ───────────────────────────────────────────────────────────────────── */

/** 초기화 치명 실패 시 사용자에게 보여줄 안내 (data.js 누락 등) */
const showFatalError = (err) => {
  console.error('[app.js] 초기화 실패 — data.js 위치와 구문을 확인하세요:', err);
  const host = $('#main') || document.body;
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.style.cssText = [
    'max-width:560px', 'margin:20vh auto 0', 'padding:2rem', 'text-align:center',
    'border:1px solid rgba(255,255,255,.14)', 'border-radius:16px',
    'background:#1a1a1e', 'color:#f5f5f7', 'font-family:sans-serif', 'line-height:1.8',
  ].join(';');
  box.innerHTML = [
    '<strong>콘텐츠를 불러오지 못했습니다</strong>',
    '<p style="margin:.6rem 0 0;color:#a1a1aa;font-size:.9rem">data.js 파일이 index.html 과 같은 폴더에 있는지,<br>http(s) 환경에서 열고 있는지 확인해 주세요.</p>',
  ].join('');
  host.prepend(box);
};

const initApp = async () => {
  // DOM 준비 대기 (모듈 스크립트는 기본 지연 로드라 대부분 즉시 통과)
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  try {
    // 동적 import → data.js 누락/구문 오류를 여기서 잡는다
    const mod = await import('./data.js?v=20260920');
    const data = normalizeData(mod);

    // ── 렌더링 (각 단계 격리) ──
    safeRun('SEO 바인딩',   () => updateSeo(data));
    safeRun('프로필 렌더',   () => renderProfile(data));
    safeRun('스탯 렌더',     () => renderStats(data));
    safeRun('강사 소개 렌더', () => renderAbout(data));
    safeRun('철학 렌더',     () => renderPhilosophy(data));
    safeRun('갤러리 렌더',   () => renderGallery(data));
    safeRun('프로그램 렌더', () => renderPrograms(data));
    safeRun('후기 렌더',     () => renderReviews(data));
    safeRun('과정 렌더',     () => renderCurriculum(data));
    safeRun('FAQ 렌더',     () => renderFaq(data));
    safeRun('채용·협업 렌더', () => renderHiring(data));
    safeRun('링크 주입',     () => renderLinks(data));
    safeRun('프로그램 옵션', () => renderProgramOptions(data));

    // ── 인터랙션 (렌더 완료 후 초기화되어야 동적 요소도 관찰 대상이 됨) ──
    safeRun('히어로 비디오',  () => initHeroVideo(data));
    safeRun('히어로 헤드라인', () => splitHeroHeadline());
    safeRun('프리로더',      () => initPreloader());
    safeRun('스크롤 리빌',    () => initScrollReveal());
    safeRun('카운터',        () => initCounters());
    safeRun('아코디언',      () => initAccordions());
    safeRun('플로팅 CTA',    () => initFloatingCta());
    safeRun('라이트박스',    () => initLightbox(data));
    safeRun('도트 내비',     () => initDotNav());
    safeRun('마그네틱 버튼', () => initMagneticButtons());
    safeRun('헤더 스크롤',    () => initHeaderScroll());
    safeRun('스크롤스파이',   () => initScrollSpy());
    safeRun('모바일 메뉴',    () => initMobileMenu());
    safeRun('문의 폼',       () => initContactForm(data));
    safeRun('푸터 위젯',     () => initFooterWidgets());
  } catch (err) {
    showFatalError(err);
  }
};

initApp();
