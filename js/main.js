/* =========================================================
   David Dani D — Portfolio interactions
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.body.classList.add("is-loading");

  /* ---------- Fallback: libraries failed to load ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    $("#loader")?.remove();
    document.body.classList.remove("is-loading");
    $$(".about__text").forEach((el) => (el.style.opacity = 1));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Text splitting ---------- */
  // Splits text into words (kept together) and chars, preserving inner elements like <em>.
  function splitChars(root) {
    const chars = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          const parts = child.textContent.split(/(\s+)/);
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part) && !/ /.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const word = document.createElement("span");
            word.style.display = "inline-block";
            word.style.whiteSpace = "nowrap";
            [...part].forEach((ch) => {
              const c = document.createElement("span");
              c.className = "char";
              c.textContent = ch;
              word.appendChild(c);
              chars.push(c);
            });
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(root);
    return chars;
  }

  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(" ");
    return $$(".word", el);
  }

  // Prepare an SVG path for a "draw" animation
  function prepDraw(els) {
    els.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 1000;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    return els;
  }

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.lenis = lenis; // used by gallery.js to pause scrolling
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // Anchor links
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const menu = $("#menu");
  function closeMenu() {
    burger.classList.remove("open");
    menu.classList.remove("open");
  }
  burger.addEventListener("click", () => {
    const open = !menu.classList.contains("open");
    burger.classList.toggle("open", open);
    menu.classList.toggle("open", open);
    if (open) gsap.fromTo($$("a", menu), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: "power3.out", delay: 0.2 });
  });

  /* ---------- Hero blueprint grid canvas ---------- */
  const canvas = $("#gridCanvas");
  const ctx = canvas.getContext("2d");
  const grid = { reveal: 0, mx: -999, my: -999, w: 0, h: 0, dpr: Math.min(window.devicePixelRatio || 1, 2) };
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    grid.w = r.width;
    grid.h = r.height;
    canvas.width = r.width * grid.dpr;
    canvas.height = r.height * grid.dpr;
    ctx.setTransform(grid.dpr, 0, 0, grid.dpr, 0, 0);
    drawGrid();
  }
  function drawGrid() {
    const { w, h, reveal, mx, my } = grid;
    const step = w < 600 ? 32 : 44;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    // grid lines draw in from the top-left
    for (let x = 0, i = 0; x <= w; x += step, i++) {
      ctx.strokeStyle = i % 5 === 0 ? "rgba(239,233,225,0.07)" : "rgba(239,233,225,0.03)";
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h * reveal);
      ctx.stroke();
    }
    for (let y = 0, i = 0; y <= h; y += step, i++) {
      ctx.strokeStyle = i % 5 === 0 ? "rgba(239,233,225,0.07)" : "rgba(239,233,225,0.03)";
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w * reveal, y + 0.5);
      ctx.stroke();
    }
    // bronze crosses glow near the cursor
    if (mx > -500) {
      const R = 200;
      for (let x = 0; x <= w; x += step) {
        for (let y = 0; y <= h; y += step) {
          const d = Math.hypot(x - mx, y - my);
          if (d > R) continue;
          const a = 1 - d / R;
          const s = 2 + a * 5;
          ctx.strokeStyle = `rgba(201,160,127,${a * 0.9})`;
          ctx.beginPath();
          ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
          ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
          ctx.stroke();
        }
      }
    }
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
  const hero = $(".hero");
  let gridRaf = null;
  hero.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    grid.mx = e.clientX - r.left;
    grid.my = e.clientY - r.top;
    if (!gridRaf) gridRaf = requestAnimationFrame(() => { drawGrid(); gridRaf = null; });
  });
  hero.addEventListener("mouseleave", () => { grid.mx = -999; drawGrid(); });

  /* ---------- Hero lens: reveal the render behind the hero ---------- */
  const reveal = $(".hero__reveal");
  const revealImg = $(".hero__reveal-img");
  const lens = { x: innerWidth * 0.7, y: innerHeight * 0.45, tx: innerWidth * 0.7, ty: innerHeight * 0.45, r: 0, tr: 0, vel: 0 };
  const baseR = () => Math.min(Math.max(innerWidth * 0.17, 150), 280);
  const smallR = () => baseR() * 0.42;
  let heroVisible = true;
  let lensOverUI = false;

  if (!isTouch) {
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      lens.tx = e.clientX - r.left;
      lens.ty = e.clientY - r.top;
      // shrink the lens over text & controls so they stay readable
      lensOverUI = !!e.target.closest(".hero__name, .hero__lead, .hero__cta, .hero__chip, .hero__strip, .hero__photo");
      lens.tr = lensOverUI ? smallR() : baseR();
    });
    hero.addEventListener("mouseenter", () => { lens.tr = baseR(); });
    hero.addEventListener("mouseleave", () => { lens.tr = 0; });
  } else {
    // touch: a slow, drifting lens so the render is still discoverable
    lens.tr = baseR() * 0.8;
    gsap.to(lens, { tx: () => innerWidth * 0.25, ty: () => innerHeight * 0.6, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
    hero.addEventListener("touchmove", (e) => {
      const t = e.touches[0], r = hero.getBoundingClientRect();
      gsap.killTweensOf(lens, "tx,ty");
      lens.tx = t.clientX - r.left;
      lens.ty = t.clientY - r.top;
    }, { passive: true });
  }

  ScrollTrigger.create({ trigger: hero, start: "top bottom", end: "bottom top", onToggle: (s) => (heroVisible = s.isActive) });

  gsap.ticker.add(() => {
    if (!heroVisible) return;
    const dx = lens.tx - lens.x, dy = lens.ty - lens.y;
    lens.x += dx * 0.12;
    lens.y += dy * 0.12;
    // lens swells slightly with pointer speed, then settles
    lens.vel += (Math.min(Math.hypot(dx, dy) * 0.35, 60) - lens.vel) * 0.1;
    lens.r += (lens.tr + (lens.tr ? lens.vel : 0) - lens.r) * 0.09;
    if (lens.r < 0.5 && lens.tr === 0) lens.r = 0;
    reveal.style.setProperty("--x", lens.x.toFixed(1) + "px");
    reveal.style.setProperty("--y", lens.y.toFixed(1) + "px");
    reveal.style.setProperty("--r", lens.r.toFixed(1) + "px");
    // subtle counter-parallax for depth
    const px = (lens.x / hero.clientWidth - 0.5) * -24;
    const py = (lens.y / hero.clientHeight - 0.5) * -16;
    revealImg.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(1.03)`;
  });

  /* ---------- Custom CAD cursor ---------- */
  if (!isTouch) {
    const cur = $(".cursor");
    const ring = $(".cursor__ring");
    const label = $(".cursor__label");
    const hLine = $(".cursor__h");
    const vLine = $(".cursor__v");
    const coords = $(".cursor__coords");
    const cx = $("#cx"), cy = $("#cy");
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { ...pos };

    window.addEventListener("mousemove", (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      cx.textContent = (e.clientX / 10).toFixed(1).padStart(6, "0");
      cy.textContent = ((e.clientY + scrollY) / 10).toFixed(1).padStart(6, "0");
    });
    gsap.ticker.add(() => {
      ringPos.x += (pos.x - ringPos.x) * 0.2;
      ringPos.y += (pos.y - ringPos.y) * 0.2;
      hLine.style.transform = `translateY(${pos.y}px)`;
      vLine.style.transform = `translateX(${pos.x}px)`;
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px)`;
      coords.style.transform = `translate(${pos.x + 14}px, ${pos.y + 14}px)`;
    });

    document.addEventListener("mouseover", (e) => {
      const lbl = e.target.closest("[data-cursor]");
      const hov = e.target.closest("a, button, [data-magnetic], .tool, .lang, .titleblock");
      if (lbl) {
        label.textContent = lbl.dataset.cursor;
        cur.classList.add("has-label");
        cur.classList.remove("is-hover");
      } else {
        cur.classList.remove("has-label");
        cur.classList.toggle("is-hover", !!hov);
      }
    });
    document.addEventListener("mouseleave", () => gsap.to(cur, { opacity: 0, duration: 0.3 }));
    document.addEventListener("mouseenter", () => gsap.to(cur, { opacity: 1, duration: 0.3 }));
  }

  /* ---------- Magnetic elements ---------- */
  if (!isTouch) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = el.classList.contains("contact__btn") ? 0.45 : 0.3;
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- 3D tilt + spotlight ---------- */
  if (!isTouch) {
    $$(".tilt").forEach((el) => {
      const max = 6;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        gsap.to(el, { rotationY: (px - 0.5) * max, rotationX: -(py - 0.5) * max, transformPerspective: 900, duration: 0.6, ease: "power3.out" });
      });
      el.addEventListener("mouseenter", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
      el.addEventListener("mouseleave", () => gsap.to(el, { rotationY: 0, rotationX: 0, duration: 0.9, ease: "elastic.out(1, 0.5)" }));
    });
  }

  /* ---------- Prepare split text ---------- */
  const heroChars = $$(".hero__name .split").map(splitChars);
  const contactChars = $$(".contact__title .split").flatMap(splitChars);
  const titleChars = $$(".section__title").map(splitChars);
  const aboutWords = splitWords($("#aboutText"));

  /* ---------- Preloader ---------- */
  const loaderPaths = prepDraw($$(".loader .ld"));
  gsap.set(heroChars.flat(), { yPercent: 115 });
  gsap.set(".hero__arch", { clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(".loader", { clipPath: "inset(0% 0% 0% 0%)" });
  gsap.set([".hero__chip", ".hero__lead", ".hero__cta", ".hero__float", ".hero__badge", ".hero__strip > *", ".nav"], { opacity: 0 });

  const counter = { v: 0 };
  const loadTl = gsap.timeline();
  loadTl
    .to(loaderPaths, { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: "power2.inOut" }, 0)
    .to(counter, { v: 100, duration: 2.4, ease: "power2.inOut", onUpdate: () => ($("#loaderCount").textContent = Math.round(counter.v)) }, 0)
    .to(".loader__meta", { opacity: 0, duration: 0.3 }, "+=0.15")
    .to(".loader", { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, "<0.1")
    .add(() => {
      $("#loader").remove();
      document.body.classList.remove("is-loading");
      lenis?.start();
    })
    // Hero intro
    .to(grid, { reveal: 1, duration: 1.6, ease: "power3.inOut", onUpdate: drawGrid }, "-=0.9")
    .to(heroChars[0], { yPercent: 0, duration: 1.2, stagger: 0.05, ease: "expo.out" }, "-=1.4")
    .to(heroChars[1], { yPercent: 0, duration: 1.2, stagger: 0.05, ease: "expo.out" }, "<0.12")
    .to(".hero__arch", { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", clearProps: "clipPath" }, "<0.1")
    .from(".hero__arch img", { scale: 1.4, duration: 1.8, ease: "expo.out" }, "<")
    .fromTo([".nav", ".hero__chip", ".hero__lead", ".hero__cta"], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "power3.out" }, "-=1.1")
    .fromTo(".hero__float", { opacity: 0, filter: "blur(12px)" }, { opacity: 1, filter: "blur(0px)", duration: 1, stagger: 0.15, ease: "power2.out", clearProps: "filter" }, "<0.2")
    .fromTo(".hero__badge", { opacity: 0, scale: 0, rotate: -90 }, { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: "back.out(1.6)" }, "<0.1")
    .fromTo(".hero__strip > *", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" }, "<");

  /* ---------- Hero scroll parallax ---------- */
  const heroTl = gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  heroTl
    .to(".hero__left", { yPercent: -18, opacity: 0.2 }, 0)
    .to(".hero__photo", { yPercent: -10, scale: 0.94 }, 0)
    .to(".hero__arch img", { yPercent: -10 }, 0);

  /* ---------- Portrait card tilt ---------- */
  if (!isTouch) {
    const card = $(".hero__photo");
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(".hero__arch", { rotationY: px * 10, rotationX: -py * 10, transformPerspective: 1000, duration: 0.6, ease: "power3.out" });
    });
    card.addEventListener("mouseleave", () => gsap.to(".hero__arch", { rotationY: 0, rotationX: 0, duration: 1, ease: "elastic.out(1, 0.5)" }));
  }

  /* ---------- Marquee (velocity reactive) ---------- */
  const track = $(".marquee__track");
  const marqueeTween = gsap.to(track, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
  marqueeTween.totalTime(28 * 500); // start deep in so reversing never hits time 0
  let mDir = 1;
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = self.getVelocity();
      if (Math.abs(v) < 10) return;
      mDir = v > 0 ? 1 : -1;
      gsap.to(marqueeTween, { timeScale: mDir * Math.min(1 + Math.abs(v) / 400, 6), duration: 0.2, overwrite: true });
      gsap.to(marqueeTween, { timeScale: mDir, duration: 1.2, delay: 0.2, ease: "power2.out" });
    },
  });
  gsap.to(".marquee", { rotate: 1, scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true } });

  /* ---------- Section titles ---------- */
  titleChars.forEach((chars) => {
    const title = chars[0]?.closest(".section__title");
    if (!title) return;
    gsap.from(chars, {
      yPercent: 110, rotate: 8, opacity: 0, duration: 1, stagger: 0.025, ease: "expo.out",
      scrollTrigger: { trigger: title, start: "top 85%" },
    });
  });
  $$(".section__head .tag, .ws__intro .tag").forEach((t) =>
    gsap.from(t, { opacity: 0, x: -20, duration: 0.8, scrollTrigger: { trigger: t, start: "top 88%" } })
  );

  /* ---------- About: word-by-word reading reveal ---------- */
  gsap.to(aboutWords, {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: "#aboutText", start: "top 80%", end: "bottom 45%", scrub: true },
  });

  // Floor plan draws as you scroll
  const planPaths = prepDraw($$(".plan .pl"));
  gsap.timeline({ scrollTrigger: { trigger: ".about__plan", start: "top 85%", end: "bottom 40%", scrub: 1 } })
    .to(planPaths, { strokeDashoffset: 0, stagger: 0.08, ease: "none" })
    .from(".plan text", { opacity: 0, stagger: 0.05 }, "-=0.3");

  // Stat counters
  $$(".stat__num").forEach((el) => {
    const n = +el.dataset.count;
    const o = { v: 0 };
    gsap.to(o, {
      v: n, duration: 1.8, ease: "power3.out",
      onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: "top 90%" },
    });
  });
  gsap.from(".stat", { y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".stats", start: "top 88%" } });

  /* ---------- Experience timeline ---------- */
  gsap.to("#tlProgress", {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: true },
  });
  $$(".job").forEach((job) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: job, start: "top 80%" } });
    tl.from(job.querySelector(".job__dot"), { scale: 0, duration: 0.6, ease: "back.out(3)" })
      .from(job.querySelector(".job__date"), { x: -30, opacity: 0, duration: 0.7, ease: "power3.out" }, "<")
      .from(job.querySelector(".job__card"), { y: 80, opacity: 0, rotationX: -12, transformPerspective: 900, transformOrigin: "50% 0%", duration: 1.1, ease: "expo.out" }, "<0.1")
      .from(job.querySelectorAll("li, .job__tags span"), { x: 20, opacity: 0, stagger: 0.06, duration: 0.6, ease: "power2.out" }, "<0.35");
  });

  $$(".work__item").forEach((item) => {
    gsap.from(item, { y: 80, opacity: 0, duration: 1.1, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: item, start: "top 85%" } });
  });

  /* ---------- Workshops ---------- */
  const mm = gsap.matchMedia();
  const wsArt = $$(".panel__art path, .panel__art ellipse");
  prepDraw(wsArt);

  mm.add("(min-width: 769px)", () => {
    const pin = $(".ws__pin");
    const movers = [$(".ws__intro"), $("#wsTrack")];
    const dist = () => pin.scrollWidth - window.innerWidth;
    const h = gsap.to(movers, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".ws", start: "top top", end: () => "+=" + dist(), pin: pin, scrub: 1, invalidateOnRefresh: true },
    });
    // Each panel plays its own reveal once, at the moment it enters the screen.
    // Panels already on screen when the section arrives play one after another.
    const pinLeft = pin.getBoundingClientRect().left;
    let visibleIdx = 0;
    $$(".panel").forEach((panel) => {
      const paths = $$(".panel__art path, .panel__art ellipse", panel);
      const body = panel.querySelectorAll(".panel__body > *, .panel--end > p");
      const startsVisible = panel.getBoundingClientRect().left - pinLeft < window.innerWidth * 0.9;
      const d = startsVisible ? visibleIdx++ * 0.35 : 0; // stagger panels already on screen
      gsap.timeline({
        scrollTrigger: startsVisible
          ? { trigger: ".ws", start: "top 55%", once: true }
          : { trigger: panel, containerAnimation: h, start: "left 90%", once: true },
      })
        .from(panel, { y: 60, opacity: 0, duration: 0.9, ease: "expo.out" }, d)
        .to(paths, { strokeDashoffset: 0, stagger: 0.08, duration: 1.2, ease: "power2.inOut" }, d + 0.15)
        .from(body, { y: 30, opacity: 0, stagger: 0.1, duration: 0.7, ease: "power3.out" }, d + 0.3);
    });
  });
  mm.add("(max-width: 768px)", () => {
    $$(".panel").forEach((panel) => {
      const paths = $$(".panel__art path, .panel__art ellipse", panel);
      gsap.to(paths, { strokeDashoffset: 0, stagger: 0.1, duration: 1.4, ease: "power2.inOut", scrollTrigger: { trigger: panel, start: "top 80%" } });
      gsap.from(panel, { y: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: panel, start: "top 88%" } });
    });
  });

  /* ---------- Tools ---------- */
  gsap.from(".tool", {
    x: -40, opacity: 0, duration: 0.9, stagger: 0.06, ease: "expo.out",
    scrollTrigger: { trigger: ".tools__grid", start: "top 85%" },
  });
  gsap.from(".tools__grid", {
    clipPath: "inset(0% 100% 0% 0%)", duration: 1.2, ease: "expo.inOut", clearProps: "clipPath",
    scrollTrigger: { trigger: ".tools__grid", start: "top 85%" },
  });
  gsap.from(".pill", {
    y: 50, opacity: 0, scale: 0.8, duration: 0.9, stagger: 0.06, ease: "back.out(1.7)",
    scrollTrigger: { trigger: ".pills", start: "top 88%" },
  });

  /* ---------- Education title blocks ---------- */
  $$(".titleblock").forEach((tb) => {
    gsap.timeline({ scrollTrigger: { trigger: tb, start: "top 85%" } })
      .from(tb, { clipPath: "inset(0% 100% 0% 0%)", duration: 1.2, ease: "expo.inOut" })
      .from(tb.querySelectorAll(".tb__cell > *"), { y: 20, opacity: 0, stagger: 0.05, duration: 0.6 }, "-=0.4");
  });

  /* ---------- Interests ---------- */
  gsap.from(".int", {
    opacity: 0, y: 50, duration: 1, stagger: 0.08, ease: "expo.out",
    scrollTrigger: { trigger: ".int__grid", start: "top 82%" },
  });
  gsap.from(".lang", { yPercent: 100, opacity: 0, stagger: 0.1, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: ".langs", start: "top 92%" } });

  /* ---------- Contact ---------- */
  gsap.from(contactChars, {
    yPercent: 120, duration: 1.2, stagger: 0.025, ease: "expo.out",
    scrollTrigger: { trigger: ".contact__title", start: "top 80%" },
  });
  gsap.from(".contact__btn", { scale: 0, rotate: -90, duration: 1.2, ease: "back.out(1.6)", scrollTrigger: { trigger: ".contact__title", start: "top 70%" } });
  gsap.from(".ci", { y: 30, opacity: 0, stagger: 0.08, duration: 0.8, scrollTrigger: { trigger: ".contact__info", start: "top 92%" } });

  /* ---------- Sheet number + scale bar ---------- */
  const sheetNo = $("#sheetNo");
  $$("[data-sheet]").forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: "top 50%", end: "bottom 50%",
      onToggle: (self) => {
        if (!self.isActive) return;
        gsap.fromTo(sheetNo, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, onStart: () => (sheetNo.textContent = sec.dataset.sheet) });
      },
    });
  });
  gsap.to("#scaleFill", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* ---------- Refresh after fonts / images ---------- */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
