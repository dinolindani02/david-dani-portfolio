/* =========================================================
   Work gallery — click a collage image to view all in a slider
   ========================================================= */
(() => {
  const box = document.getElementById("lightbox");
  if (!box) return;
  const img = box.querySelector(".lightbox__img");
  const count = box.querySelector(".lightbox__count");
  const thumbs = box.querySelector(".lightbox__thumbs");
  let items = [];
  let index = 0;
  let lastFocus = null;

  function show(i) {
    index = (i + items.length) % items.length;
    const src = items[index];
    img.classList.remove("is-in");
    img.onload = () => img.classList.add("is-in");
    img.src = src.getAttribute("src");
    img.alt = src.alt;
    if (img.complete) img.classList.add("is-in");
    count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    [...thumbs.children].forEach((t, n) => t.classList.toggle("is-active", n === index));
  }

  function open(group, i) {
    items = [...group.querySelectorAll("img")];
    thumbs.innerHTML = "";
    items.forEach((it, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Show image ${n + 1}`);
      b.innerHTML = `<img src="${it.getAttribute("src")}" alt="" />`;
      b.addEventListener("click", () => show(n));
      thumbs.appendChild(b);
    });
    lastFocus = document.activeElement;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add("is-open"));
    document.documentElement.style.overflow = "hidden";
    window.lenis?.stop();
    show(i);
    box.querySelector(".lightbox__close").focus();
  }

  function close() {
    box.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    window.lenis?.start();
    setTimeout(() => (box.hidden = true), 300);
    lastFocus?.focus?.();
  }

  document.querySelectorAll("[data-gallery]").forEach((group) => {
    group.querySelectorAll("img").forEach((el, i) => {
      el.addEventListener("click", () => open(group, i));
    });
  });

  box.querySelector(".lightbox__close").addEventListener("click", close);
  box.querySelector(".lightbox__nav--prev").addEventListener("click", () => show(index - 1));
  box.querySelector(".lightbox__nav--next").addEventListener("click", () => show(index + 1));
  box.addEventListener("click", (e) => { if (e.target === box) close(); });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });

  // swipe on touch screens
  let x0 = null;
  box.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  box.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
