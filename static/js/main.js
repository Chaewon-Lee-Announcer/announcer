(() => {
  document.documentElement.classList.add('js');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- header: background after scroll, hides while scrolling down ---------- */
  const header = $('.site-header');
  let lastScrollY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    if (!header.classList.contains('menu-open')) {
      if (y > lastScrollY + 6 && y > 320) header.classList.add('is-hidden');
      else if (y < lastScrollY - 6 || y < 120) header.classList.remove('is-hidden');
    }
    lastScrollY = y;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* ---------- mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const nav = $('#site-nav');
  const setMenu = (open) => {
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- active nav link ---------- */
  const links = $$('.nav a[href^="#"]');
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-active'));
      byId.get(entry.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

  /* ---------- YouTube: load the player only on click ---------- */
  $$('[data-yt]').forEach((box) => {
    const button = $('button', box);
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
      frame.title = box.dataset.title || 'YouTube video';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allowFullscreen = true;
      $('.yt-frame', box).replaceChildren(frame);
    }, { once: true });
  });

  /* ---------- lightbox ---------- */
  const box = $('#lightbox');
  const shots = $$('[data-lb]');
  if (box && shots.length && typeof box.showModal === 'function') {
    const img = $('img', box);
    const cap = $('figcaption', box);
    let index = 0;

    const show = (i) => {
      index = (i + shots.length) % shots.length;
      const source = $('img', shots[index]);
      img.src = source.currentSrc || source.src;
      img.alt = source.alt;
      cap.textContent = shots[index].dataset.caption || '';
    };

    shots.forEach((shot, i) => shot.addEventListener('click', () => { show(i); box.showModal(); }));
    $('.lb-close', box).addEventListener('click', () => box.close());
    $('.lb-prev', box).addEventListener('click', () => show(index - 1));
    $('.lb-next', box).addEventListener('click', () => show(index + 1));
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ---------- copy phone / e-mail ---------- */
  const toast = $('.toast');
  let toastTimer;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 1800);
  };
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      say(`${btn.dataset.copy} 복사했어요`);
    } catch {
      say('복사하지 못했어요. 직접 선택해 주세요.');
    }
  }));

  /* =========================================================
     MOTION
     Content is readable before any of this runs; motion only
     moves, wipes or highlights it.
     ========================================================= */

  // stagger indexes for the CSS enter animations
  $$('.list, .seasons ul, .timeline, .body-info, .shots, .contact-list').forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
  });
  $$('.contact-title mark').forEach((mark, i) => mark.style.setProperty('--i', i));

  // scoreboard flip: digits spin, then settle on the real years
  const flipYears = (scope) => {
    const el = $('.flip', scope);
    if (!el) return;
    const final = el.textContent;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      el.textContent = [...final]
        .map((ch, i) => (/\d/.test(ch) && t < 0.45 + i * 0.06 ? String(Math.floor(Math.random() * 10)) : ch))
        .join('');
      if (t < 1.2) requestAnimationFrame(tick);
      else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };

  // one-shot "enter" classes
  const enterTargets = $$('.sec-title, .list, .seasons, .timeline, .body-info, .shots, .contact-title, .contact-list');
  if (reduceMotion) {
    enterTargets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const enter = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      if (entry.target.classList.contains('seasons')) flipYears(entry.target);
      enter.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  enterTargets.forEach((el) => enter.observe(el));

  /* ---------- marquees: ticker, tape, contact backdrop ---------- */
  const marquees = $$('[data-marquee]').map((el) => {
    const track = el.firstElementChild;
    const copy = track.firstElementChild.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.append(copy);
    const m = { el, track, dir: Number(el.dataset.marquee) || -1, speed: Number(el.dataset.speed) || 60, x: 0, w: 0, slow: false };
    el.addEventListener('pointerenter', () => { m.slow = true; });
    el.addEventListener('pointerleave', () => { m.slow = false; });
    return m;
  });
  const measureMarquees = () => marquees.forEach((m) => {
    m.w = m.track.firstElementChild.offsetWidth;
    if (m.dir > 0 && m.x === 0) m.x = -m.w;
  });
  measureMarquees();
  document.fonts?.ready.then(measureMarquees);

  /* ---------- scroll-linked pieces ---------- */
  const active = new Set();
  let dirty = true;
  const watcher = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? active.add(e.target) : active.delete(e.target)));
    dirty = true;
  }, { rootMargin: '25% 0px' });
  const linked = [];
  const link = (el, fn) => { if (!el) return; linked.push({ el, fn }); watcher.observe(el); };

  // section titles drift sideways as they pass
  $$('.sec-head').forEach((head, i) => {
    const dir = i % 2 ? 1 : -1;
    link(head, (p) => { head.style.transform = `translate3d(${((p - 0.5) * 90 * dir).toFixed(1)}px,0,0)`; });
  });

  // pictures slide inside their frames
  $$('.shot, .profile-photo').forEach((frame) => {
    link(frame, (p) => {
      const pic = $('img', frame);
      if (pic) pic.style.transform = `translate3d(0,${((0.5 - p) * 9).toFixed(2)}%,0) scale(1.14)`;
    });
  });

  // history line fills, dots light up
  const timeline = $('.timeline');
  link(timeline, (p, r) => {
    const mark = innerHeight * 0.6;
    timeline.style.setProperty('--fill', Math.min(1, Math.max(0, (mark - r.top) / r.height)).toFixed(3));
    [...timeline.children].forEach((li) => li.classList.toggle('is-passed', li.getBoundingClientRect().top < mark));
  });

  // the closing figure rises into place
  const contactFigure = $('.contact-figure');
  link($('.contact'), (p) => {
    contactFigure.style.transform = `translate3d(0,${(Math.max(0, 1 - p * 2.2) * 110).toFixed(1)}px,0)`;
  });

  /* ---------- hero: scroll + pointer depth ---------- */
  const hero = {
    section: $('.hero'),
    name: $('.hero .name'),
    role: $('.hero .role'),
    visual: $('.hero-visual'),
    cut: $('.hero-cut-box'),
    sup: $('.super'),
  };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer) {
    hero.section.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    });
    hero.section.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
  }
  const heroFrame = (y) => {
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    const mx = pointer.x;
    const my = pointer.y;
    hero.name.style.transform = `translate3d(${(-y * 0.24 - mx * 16).toFixed(1)}px,${(-my * 6).toFixed(1)}px,0)`;
    hero.role.style.transform = `translate3d(${(y * 0.14 - mx * 8).toFixed(1)}px,0,0)`;
    const photo = `translate3d(${(mx * 10).toFixed(1)}px,${(y * 0.1 + my * 8).toFixed(1)}px,0)`;
    hero.visual.style.transform = photo;
    if (hero.cut) hero.cut.style.transform = photo;
    hero.sup.style.transform = `translate3d(${(mx * 22).toFixed(1)}px,${(-y * 0.07 + my * 12).toFixed(1)}px,0)`;
  };

  /* ---------- hover: photos tilt, buttons lean toward the pointer ---------- */
  if (finePointer) {
    $$('.shot').forEach((frame) => {
      frame.addEventListener('pointermove', (e) => {
        const r = frame.getBoundingClientRect();
        const rx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const ry = ((e.clientY - r.top) / r.height - 0.5) * 2;
        frame.style.transform = `perspective(900px) rotateX(${(-ry * 5).toFixed(2)}deg) rotateY(${(rx * 6).toFixed(2)}deg) translateY(-6px)`;
      });
      frame.addEventListener('pointerleave', () => { frame.style.transform = ''; });
    });
    $$('.btn').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(1)}px,${(((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(1)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- one loop drives it all ---------- */
  const progress = $('.progress');
  let last = performance.now();
  let prevY = window.scrollY;
  let linkedY = NaN;
  let boost = 0;
  window.addEventListener('resize', () => { dirty = true; measureMarquees(); });

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const y = window.scrollY;
    const velocity = Math.abs(y - prevY) / Math.max(dt, 0.001);
    prevY = y;
    boost += (Math.min(velocity / 350, 7) - boost) * 0.08;

    marquees.forEach((m) => {
      if (!m.w) return;
      const speed = m.slow ? m.speed * 0.2 : m.speed * (1 + boost);
      m.x += m.dir * speed * dt;
      if (m.dir < 0 && m.x <= -m.w) m.x += m.w;
      if (m.dir > 0 && m.x >= 0) m.x -= m.w;
      m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`;
    });

    if (y < innerHeight * 1.6) heroFrame(y);

    if (y !== linkedY || dirty) {
      const vh = innerHeight;
      const rects = linked.filter((l) => active.has(l.el)).map((l) => [l, l.el.getBoundingClientRect()]);
      rects.forEach(([l, r]) => l.fn(Math.min(1.2, Math.max(-0.2, (vh - r.top) / (vh + r.height))), r));
      const max = document.documentElement.scrollHeight - vh;
      progress.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
      linkedY = y;
      dirty = false;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
