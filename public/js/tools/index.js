// tools/index.js — Tools tab: list of tools, each opens its own page
import { showToast } from "../utils/index.js";
import {
  esc,
  formatBytes,
  readImageSize,
  saveToRysav,
  openSaveFolder,
  stampName,
  SAVE_DIR,
} from "./common.js";
import { upscaleImage, compressPdf, removeBackground } from "./ilove.js";
import { findPresets, clearAmCache } from "./amfinder.js";

/* ---------------- strings (en / id; other languages fall back to en) ---------------- */
const S = {
  en: {
    "tools-title": "Tools",
    "tools-sub": "Handy utilities",
    back: "Back",
    "up-desc": "Make photos HD with a before/after view",
    "am-desc": "Find Alight Motion presets from a TikTok link",
    "pdf-desc": "Make PDF files smaller",
    "bg-desc": "Cut the background out of a photo",
    "pick-image": "Choose a photo",
    "pick-pdf": "Choose a PDF",
    "up-hint": "Upload a photo and get an HD version. Drag the handle to compare.",
    "up-run": "Upscale photo",
    "up-scale": "Scale",
    "pdf-hint": "Pick a PDF and shrink it. The result is saved to the RYSAV folder.",
    "pdf-run": "Compress PDF",
    "pdf-level": "Compression",
    "lv-low": "Light",
    "lv-recommended": "Balanced",
    "lv-extreme": "Maximum",
    "bg-hint": "Pick a photo and the background is removed. The result is a transparent PNG.",
    "bg-run": "Remove background",
    "step-session": "Connecting…",
    "step-upload": "Uploading…",
    "step-process": "Processing, this can take a minute…",
    "step-download": "Downloading result…",
    original: "Original",
    result: "Result",
    hd: "HD",
    "saved-to": "Saved to {path}",
    "saved-browser": "Downloaded as {path}",
    "open-folder": "Open folder",
    "save-again": "Save again",
    "no-gain": "This PDF is already as small as it gets, nothing was saved.",
    "saved-pct": "{pct}% smaller",
    failed: "Failed: {msg}",
    "net-hint": "Network tools work inside the RYSAV app. A plain browser usually blocks these requests (CORS).",
    "am-hint": "Paste a TikTok video link. RYSAV reads the description, bio, link-in-bio and comments to find presets.",
    "am-ph": "Paste TikTok link…",
    "am-run": "Find presets",
    "am-rescan": "Scan again",
    paste: "Paste",
    "st-resolve": "Reading the link",
    "st-video": "Fetching video data",
    "st-profile": "Fetching profile and bio link",
    "st-comments": "Reading comments",
    "st-replies": "Checking comment replies",
    "st-links": "Following links",
    "st-titles": "Fetching preset titles",
    "st-cache": "Loaded from cache",
    video: "Video",
    uploader: "Uploader",
    views: "Views",
    likes: "Likes",
    comments: "Comments",
    shares: "Shares",
    posted: "Posted",
    presets: "Presets found",
    "no-presets": "No preset found",
    "no-presets-d": "Checked the description, bio, link-in-bio and comments. Try again later or open the video to look for it yourself.",
    analysis: "Comment analysis",
    "an-comments": "Comments scanned",
    "an-replies": "Replies scanned",
    "an-links": "Comments with links",
    "an-pinned": "Pinned comment",
    "an-by": "Links in comments",
    "other-links": "Other links",
    open: "Open",
    copy: "Copy",
    copied: "Link copied",
    "src-description": "Description",
    "src-bio": "Bio",
    "src-bioLink": "Link in bio",
    "src-comment": "Comment",
    "src-pinned": "Pinned",
    "src-uploader": "From uploader",
    "src-unknown": "Link",
    "resolved-title": "Link resolved",
    "not-alight": "This link does not lead to an Alight Motion preset.",
    "clear-cache": "Clear cache",
    "cache-cleared": "Cache cleared",
    "open-video": "Open video",
  },
  id: {
    "tools-title": "Tools",
    "tools-sub": "Alat bantu praktis",
    back: "Kembali",
    "up-desc": "Foto jadi HD, lengkap dengan perbandingan",
    "am-desc": "Cari preset Alight Motion dari link TikTok",
    "pdf-desc": "Kecilkan ukuran file PDF",
    "bg-desc": "Hapus latar belakang foto",
    "pick-image": "Pilih foto",
    "pick-pdf": "Pilih PDF",
    "up-hint": "Upload foto, dapatkan versi HD. Geser pegangan untuk membandingkan.",
    "up-run": "HD-kan foto",
    "up-scale": "Skala",
    "pdf-hint": "Pilih PDF lalu kecilkan. Hasilnya masuk ke folder RYSAV.",
    "pdf-run": "Compress PDF",
    "pdf-level": "Kompresi",
    "lv-low": "Ringan",
    "lv-recommended": "Seimbang",
    "lv-extreme": "Maksimal",
    "bg-hint": "Pilih foto, latar belakangnya dihapus. Hasilnya PNG transparan.",
    "bg-run": "Hapus latar",
    "step-session": "Menyambung…",
    "step-upload": "Mengunggah…",
    "step-process": "Memproses, bisa sampai semenit…",
    "step-download": "Mengunduh hasil…",
    original: "Asli",
    result: "Hasil",
    hd: "HD",
    "saved-to": "Tersimpan di {path}",
    "saved-browser": "Diunduh sebagai {path}",
    "open-folder": "Buka folder",
    "save-again": "Simpan lagi",
    "no-gain": "PDF ini sudah sekecil mungkin, tidak ada yang disimpan.",
    "saved-pct": "Lebih kecil {pct}%",
    failed: "Gagal: {msg}",
    "net-hint": "Tools jaringan jalan di dalam aplikasi RYSAV. Browser biasa umumnya memblokir request ini (CORS).",
    "am-hint": "Tempel link video TikTok. RYSAV membaca deskripsi, bio, link bio, dan komentar untuk mencari preset.",
    "am-ph": "Tempel link TikTok…",
    "am-run": "Cari preset",
    "am-rescan": "Scan ulang",
    paste: "Tempel",
    "st-resolve": "Membaca link",
    "st-video": "Mengambil data video",
    "st-profile": "Mengambil profil dan link bio",
    "st-comments": "Membaca komentar",
    "st-replies": "Mengecek balasan komentar",
    "st-links": "Menelusuri link",
    "st-titles": "Mengambil judul preset",
    "st-cache": "Diambil dari cache",
    video: "Video",
    uploader: "Pengunggah",
    views: "Ditonton",
    likes: "Suka",
    comments: "Komentar",
    shares: "Dibagikan",
    posted: "Diunggah",
    presets: "Preset ditemukan",
    "no-presets": "Preset tidak ditemukan",
    "no-presets-d": "Sudah dicek di deskripsi, bio, link bio, dan komentar. Coba lagi nanti atau buka videonya dan cari sendiri.",
    analysis: "Analisis komentar",
    "an-comments": "Komentar dipindai",
    "an-replies": "Balasan dipindai",
    "an-links": "Komentar berisi link",
    "an-pinned": "Komentar disematkan",
    "an-by": "Link di komentar",
    "other-links": "Link lain",
    open: "Buka",
    copy: "Salin",
    copied: "Link disalin",
    "src-description": "Deskripsi",
    "src-bio": "Bio",
    "src-bioLink": "Link bio",
    "src-comment": "Komentar",
    "src-pinned": "Disematkan",
    "src-uploader": "Dari pengunggah",
    "src-unknown": "Link",
    "resolved-title": "Link berhasil dibuka",
    "not-alight": "Link ini tidak mengarah ke preset Alight Motion.",
    "clear-cache": "Hapus cache",
    "cache-cleared": "Cache dihapus",
    "open-video": "Buka video",
  },
};
const lang = () => (localStorage.getItem("mori_lang") || "en") === "id" ? "id" : "en";
const t = (k, vars) => {
  let s = S[lang()][k] ?? S.en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
  return s;
};
const locale = () => (localStorage.getItem("mori_lang") || "en");

/* ---------------- icons ---------------- */
const ic = (d, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor"><path d="${d}"/></svg>`;
const ICON = {
  up: "M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z",
  am: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 12 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 12 14 9.5 14z",
  pdf: "M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z",
  bg: "M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  chev: "M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z",
  img: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  file: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z",
  paste: "M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
};

/* ---------------- skeleton markup ---------------- */
const subHeader = (title) =>
  `<div class="sub-page-header"><button class="back-btn-settings" data-tool-back aria-label="Back">${ic(ICON.back, 22)}</button><h3>${title}</h3></div>`;

const fileTool = ({ id, title, iconKey, hint, pick, accept, run, extra = "" }) => `
<section class="tool-sub-page hidden" id="tool-${id}">
  ${subHeader(title)}
  <p class="tool-hint" data-tt="${hint}"></p>
  <label class="tool-drop" id="${id}Drop">
    <input type="file" accept="${accept}" id="${id}File" hidden />
    <span class="tool-drop-icon">${ic(iconKey === "pdf" ? ICON.file : ICON.img, 30)}</span>
    <span class="tool-drop-text" data-tt="${pick}"></span>
    <small class="tool-drop-info" id="${id}Info"></small>
  </label>
  <img class="tool-preview hidden" id="${id}Preview" alt="" />
  ${extra}
  <button class="tool-btn" id="${id}Run" disabled data-tt="${run}"></button>
  <div class="tool-status hidden" id="${id}Status"></div>
  <div class="tool-result hidden" id="${id}Result"></div>
</section>`;

const seg = (id, labelKey, items, activeIndex = 0) => `
<div class="tool-opt">
  <span class="tool-opt-label" data-tt="${labelKey}"></span>
  <div class="tool-seg" id="${id}">
    ${items.map(([v, label, key], i) => `<button type="button" data-v="${v}" class="${i === activeIndex ? "active" : ""}" ${key ? `data-tt="${key}"` : ""}>${label || ""}</button>`).join("")}
  </div>
</div>`;

function buildPage() {
  return `
<div id="toolsMenu">
  <div class="page-header"><h2 data-tt="tools-title"></h2><p data-tt="tools-sub"></p></div>
  <div class="settings-menu-list tool-list">
    ${[
      ["upscale", "Image Upscale", ICON.up, "up-desc"],
      ["am", "Preset AM Finder", ICON.am, "am-desc"],
      ["pdf", "Compress PDF", ICON.pdf, "pdf-desc"],
      ["bg", "Remove BG", ICON.bg, "bg-desc"],
    ]
      .map(
        ([id, name, icon, desc]) => `
    <div class="tool-card" data-tool="${id}" role="button" tabindex="0">
      <div class="menu-icon">${ic(icon)}</div>
      <div class="menu-text"><div class="menu-title">${name}</div><div class="menu-desc" data-tt="${desc}"></div></div>
      <span class="tool-chev">${ic(ICON.chev, 22)}</span>
    </div>`,
      )
      .join("")}
  </div>
</div>

${fileTool({
  id: "upscale",
  title: "Image Upscale",
  iconKey: "img",
  hint: "up-hint",
  pick: "pick-image",
  accept: "image/*",
  run: "up-run",
  extra: seg("upScale", "up-scale", [["2", "2×"], ["4", "4×"]]),
})}

<section class="tool-sub-page hidden" id="tool-am">
  ${subHeader("Preset AM Finder")}
  <p class="tool-hint" data-tt="am-hint"></p>
  <div class="tool-input">
    <input type="text" id="amInput" data-tt-ph="am-ph" autocomplete="off" autocapitalize="off" spellcheck="false" />
    <button type="button" class="tool-input-btn" id="amPaste" aria-label="Paste">${ic(ICON.paste, 20)}</button>
  </div>
  <button class="tool-btn" id="amRun" data-tt="am-run"></button>
  <div class="tool-status hidden" id="amStatus"></div>
  <div class="tool-result hidden" id="amResult"></div>
</section>

${fileTool({
  id: "pdf",
  title: "Compress PDF",
  iconKey: "pdf",
  hint: "pdf-hint",
  pick: "pick-pdf",
  accept: "application/pdf,.pdf",
  run: "pdf-run",
  extra: seg("pdfLevel", "pdf-level", [["low", "", "lv-low"], ["recommended", "", "lv-recommended"], ["extreme", "", "lv-extreme"]], 1),
})}

${fileTool({
  id: "bg",
  title: "Remove BG",
  iconKey: "img",
  hint: "bg-hint",
  pick: "pick-image",
  accept: "image/*",
  run: "bg-run",
})}`;
}

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
let root;

function applyLang() {
  root.querySelectorAll("[data-tt]").forEach((el) => (el.textContent = t(el.dataset.tt)));
  root.querySelectorAll("[data-tt-ph]").forEach((el) => (el.placeholder = t(el.dataset.ttPh)));
}

function setStatus(el, html, kind = "busy") {
  el.className = `tool-status ${kind}`;
  el.innerHTML = html;
}
const spinner = '<span class="tool-spin"></span>';
const hideEl = (el) => el.classList.add("hidden");
const showEl = (el) => el.classList.remove("hidden");

function errorHtml(e) {
  let msg = e?.message || String(e);
  const hint =
    !window.Capacitor?.isNativePlatform?.() && /fetch|network|load failed/i.test(msg)
      ? `<small>${esc(t("net-hint"))}</small>`
      : "";
  return `<strong>${esc(t("failed", { msg }))}</strong>${hint}`;
}

function bindSeg(el) {
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    el.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
  });
  return () => el.querySelector("button.active")?.dataset.v;
}

/* ---------------- before / after slider ---------------- */
function mountCompare(host, { beforeUrl, afterUrl, beforeLabel, afterLabel, checker = false }) {
  host.innerHTML = `
  <div class="cmp ${checker ? "cmp-checker" : ""}" style="--pos:50%">
    <img class="cmp-img cmp-after" src="${afterUrl}" alt="" draggable="false" />
    <div class="cmp-before"><img class="cmp-img" src="${beforeUrl}" alt="" draggable="false" /></div>
    <div class="cmp-handle"><span>${ic("M8.59 16.59L4 12l4.59-4.59L10 8.83 6.83 12 10 15.17zM15.41 7.41L20 12l-4.59 4.59L14 15.17 17.17 12 14 8.83z", 20)}</span></div>
    <span class="cmp-tag cmp-tag-l">${esc(beforeLabel)}</span>
    <span class="cmp-tag cmp-tag-r">${esc(afterLabel)}</span>
  </div>`;
  const cmp = host.querySelector(".cmp");
  const after = cmp.querySelector(".cmp-after");
  after.addEventListener("load", () => {
    if (after.naturalWidth) cmp.style.aspectRatio = `${after.naturalWidth} / ${after.naturalHeight}`;
  });
  const move = (clientX) => {
    const r = cmp.getBoundingClientRect();
    const p = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    cmp.style.setProperty("--pos", p + "%");
  };
  cmp.addEventListener("pointerdown", (e) => {
    cmp.setPointerCapture(e.pointerId);
    move(e.clientX);
    cmp._drag = true;
  });
  cmp.addEventListener("pointermove", (e) => cmp._drag && move(e.clientX));
  const end = () => (cmp._drag = false);
  cmp.addEventListener("pointerup", end);
  cmp.addEventListener("pointercancel", end);
}

/* ---------------- save + result footer ---------------- */
async function saveAndReport(bytes, prefix, ext) {
  const name = stampName(prefix, ext);
  const saved = await saveToRysav(bytes, name);
  return { name, saved };
}

function savedLine(saved) {
  const msg = saved.native ? t("saved-to", { path: saved.path }) : t("saved-browser", { path: saved.path });
  return `<div class="tool-saved">${ic(ICON.check, 18)}<span>${esc(msg)}</span></div>`;
}

function footerButtons(canOpen, onAgain) {
  const wrap = document.createElement("div");
  wrap.className = "tool-actions";
  if (canOpen) {
    const open = document.createElement("button");
    open.className = "tool-btn-sec";
    open.textContent = t("open-folder");
    open.addEventListener("click", () => openSaveFolder());
    wrap.appendChild(open);
  }
  const again = document.createElement("button");
  again.className = "tool-btn-sec";
  again.textContent = t("save-again");
  again.addEventListener("click", onAgain);
  wrap.appendChild(again);
  return wrap;
}

/* ---------------- generic file tool ---------------- */
function mountFileTool({ id, kind, getOption, run, prefix, renderResult }) {
  const input = $(`${id}File`);
  const info = $(`${id}Info`);
  const preview = $(`${id}Preview`);
  const runBtn = $(`${id}Run`);
  const status = $(`${id}Status`);
  const result = $(`${id}Result`);
  let file = null;
  let previewUrl = null;
  let busy = false;

  input.addEventListener("change", async () => {
    file = input.files?.[0] || null;
    hideEl(result);
    hideEl(status);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    if (!file) {
      info.textContent = "";
      hideEl(preview);
      runBtn.disabled = true;
      return;
    }
    let extra = "";
    if (kind === "image") {
      previewUrl = URL.createObjectURL(file);
      preview.src = previewUrl;
      showEl(preview);
      try {
        const { width, height } = await readImageSize(file);
        extra = ` · ${width}×${height}`;
      } catch (_) {}
    }
    info.textContent = `${file.name} · ${formatBytes(file.size)}${extra}`;
    runBtn.disabled = false;
  });

  runBtn.addEventListener("click", async () => {
    if (!file || busy) return;
    busy = true;
    runBtn.disabled = true;
    hideEl(result);
    const onStep = (step, frac) => {
      const pct = frac != null && step === "upload" ? ` ${Math.round(frac * 100)}%` : "";
      setStatus(status, `${spinner}<span>${esc(t("step-" + step))}${pct}</span>`);
    };
    onStep("session");
    try {
      const out = await run(file, getOption?.(), onStep);
      hideEl(status);
      if (kind === "image") hideEl(preview);
      result.innerHTML = "";
      showEl(result);
      await renderResult({ file, out, result, prefix, previewUrl });
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.warn("[tools]", e);
      setStatus(status, errorHtml(e), "error");
    } finally {
      busy = false;
      runBtn.disabled = false;
    }
  });
}

async function renderImageResult({ file, out, result, prefix, label, checker }) {
  const blob = new Blob([out.bytes], { type: out.ext === "png" ? "image/png" : out.ext === "webp" ? "image/webp" : "image/jpeg" });
  const afterUrl = URL.createObjectURL(blob);
  const beforeUrl = URL.createObjectURL(file);
  const cmpHost = document.createElement("div");
  result.appendChild(cmpHost);
  mountCompare(cmpHost, {
    beforeUrl,
    afterUrl,
    beforeLabel: t("original"),
    afterLabel: label,
    checker,
  });
  const meta = document.createElement("div");
  meta.className = "tool-meta";
  result.appendChild(meta);
  try {
    const [a, b] = await Promise.all([readImageSize(file), readImageSize(blob)]);
    meta.textContent = `${a.width}×${a.height} → ${b.width}×${b.height}  ·  ${formatBytes(file.size)} → ${formatBytes(out.bytes.length)}`;
  } catch (_) {
    meta.textContent = `${formatBytes(file.size)} → ${formatBytes(out.bytes.length)}`;
  }
  const savedBox = document.createElement("div");
  result.appendChild(savedBox);
  const doSave = async () => {
    try {
      const { saved } = await saveAndReport(out.bytes, prefix, out.ext);
      savedBox.innerHTML = savedLine(saved);
      showToast(saved.native ? t("saved-to", { path: saved.path }) : t("saved-browser", { path: saved.path }));
      return saved;
    } catch (e) {
      savedBox.innerHTML = `<div class="tool-status error"><strong>${esc(t("failed", { msg: e.message || e }))}</strong></div>`;
      return null;
    }
  };
  const saved = await doSave();
  result.appendChild(footerButtons(!!saved?.native, doSave));
}

/* ---------------- Preset AM Finder UI ---------------- */
const fmtNum = (n) => (n == null ? "–" : new Intl.NumberFormat(locale(), { notation: "compact", maximumFractionDigits: 1 }).format(n));
const fmtFull = (n) => (n == null ? "" : new Intl.NumberFormat(locale()).format(n));

function srcLabel(p) {
  const base = String(p.source || "unknown").split(":")[0];
  const parts = [];
  if (p.byAuthor) parts.push(t("src-uploader"));
  parts.push(S[lang()]["src-" + base] ? t("src-" + base) : t("src-unknown"));
  if (p.pinned) parts.push(t("src-pinned"));
  let s = parts.join(" · ");
  if (p.detail) s += ` ${p.detail}`;
  return s;
}

async function copyText(text) {
  try {
    const cb = window.Capacitor?.Plugins?.Clipboard;
    if (cb?.write) await cb.write({ string: text });
    else await navigator.clipboard.writeText(text);
    showToast(t("copied"));
  } catch (_) {}
}

function presetCard(p) {
  const title = p.title || (p.type === "5mb" ? "Alight Motion" : "Preset");
  const badge = p.type === "5mb" ? "5MB" : "XML";
  return `
  <div class="am-preset">
    <div class="am-thumb">${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ic(ICON.am, 26)}</div>
    <div class="am-info">
      <div class="am-title">${esc(title)}</div>
      <div class="am-tags"><span class="am-badge">${badge}</span>${p.size ? `<span class="am-badge am-badge-soft">${esc(p.size)}</span>` : ""}</div>
      <div class="am-src">${esc(srcLabel(p))}</div>
      <div class="am-links">
        <a class="tool-btn-sec" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t("open"))}</a>
        <button class="tool-btn-sec" data-copy="${esc(p.url)}">${esc(t("copy"))}</button>
      </div>
    </div>
  </div>`;
}

function renderAm(res, host) {
  if (res.mode === "resolve") {
    host.innerHTML = res.isAlight
      ? `<div class="tool-card-static"><h4>${esc(t("resolved-title"))}</h4>${presetCard({ type: "5mb", url: res.resolved, title: res.title, thumb: res.thumb, source: "unknown" })}</div>`
      : `<div class="tool-status error"><strong>${esc(t("not-alight"))}</strong><small>${esc(res.resolved || "")}</small></div>`;
    return;
  }
  const v = res.video || {};
  const a = res.authorDetail || {};
  const st = v.stats || {};
  const sc = res.scanned || {};
  const posted = v.createTime
    ? new Date(v.createTime * 1000).toLocaleDateString(locale(), { year: "numeric", month: "short", day: "numeric" })
    : null;
  const stat = (label, n) => `<div class="am-stat" title="${esc(fmtFull(n))}"><b>${esc(fmtNum(n))}</b><span>${esc(label)}</span></div>`;

  let html = `
  <div class="tool-card-static">
    <h4>${esc(t("video"))}</h4>
    <div class="am-author">
      <div class="am-avatar">${esc((a.nickname || a.uniqueId || "?").trim().charAt(0).toUpperCase())}</div>
      <div>
        <div class="am-nick">${esc(a.nickname || a.uniqueId || "")}</div>
        <div class="am-handle">${a.uniqueId ? "@" + esc(a.uniqueId) : ""}${posted ? ` · ${esc(t("posted"))} ${esc(posted)}` : ""}</div>
      </div>
    </div>
    ${v.description ? `<p class="am-desc">${esc(v.description)}</p>` : ""}
    <div class="am-stats">${stat(t("views"), st.views)}${stat(t("likes"), st.likes)}${stat(t("comments"), st.comments)}${stat(t("shares"), st.shares)}</div>
    ${a.bio ? `<p class="am-bio">${esc(a.bio)}</p>` : ""}
    <div class="am-links"><a class="tool-btn-sec" href="${esc(res.videoUrl)}" target="_blank" rel="noopener">${esc(t("open-video"))}</a></div>
  </div>`;

  html += `<div class="tool-card-static"><h4>${esc(res.found ? t("presets") + " (" + res.presetLinks.length + ")" : t("no-presets"))}</h4>`;
  html += res.found ? res.presetLinks.map(presetCard).join("") : `<p class="am-desc">${esc(t("no-presets-d"))}</p>`;
  html += `</div>`;

  const row = (label, val) => `<div class="am-row"><span>${esc(label)}</span><b>${esc(val)}</b></div>`;
  html += `<div class="tool-card-static"><h4>${esc(t("analysis"))}</h4>
    ${row(t("an-comments"), fmtFull(sc.comments ?? 0))}
    ${row(t("an-replies"), fmtFull(sc.replies ?? 0))}
    ${row(t("an-links"), fmtFull(sc.commentsWithLinks ?? 0))}
    ${sc.pinnedComment ? `<div class="am-pinned"><span>${esc(t("an-pinned"))}</span><p>${esc(sc.pinnedComment)}</p></div>` : ""}`;
  if (res.commentLinks?.length) {
    html += `<div class="am-sub">${esc(t("an-by"))}</div>` +
      res.commentLinks
        .map(
          (c) => `<div class="am-linkrow"><div><div class="am-linkuser">${esc(c.user)}${c.pinned ? " 📌" : ""}${c.byAuthor ? " ✓" : ""}${c.digg ? ` · ♥ ${esc(fmtNum(c.digg))}` : ""}</div><div class="am-linkurl">${esc(c.url)}</div></div><button class="tool-btn-sec" data-copy="${esc(c.url)}">${esc(t("copy"))}</button></div>`,
        )
        .join("");
  }
  if (res.otherLinks?.length) {
    html += `<div class="am-sub">${esc(t("other-links"))}</div>` +
      res.otherLinks
        .map((o) => `<div class="am-linkrow"><div><div class="am-linkurl">${esc(o.url)}</div></div><button class="tool-btn-sec" data-copy="${esc(o.url)}">${esc(t("copy"))}</button></div>`)
        .join("");
  }
  html += `</div>`;
  host.innerHTML = html;
}

function mountAm() {
  const input = $("amInput");
  const runBtn = $("amRun");
  const status = $("amStatus");
  const result = $("amResult");
  let busy = false;
  let scannedOnce = false;

  $("amPaste").addEventListener("click", async () => {
    try {
      const cb = window.Capacitor?.Plugins?.Clipboard;
      let text = "";
      if (cb?.read) text = (await cb.read())?.value || "";
      else text = await navigator.clipboard.readText();
      if (text) input.value = text.trim();
    } catch (_) {}
  });

  result.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (b) copyText(b.dataset.copy);
  });

  const run = async (noCache) => {
    const link = input.value.trim();
    if (!link || busy) return;
    busy = true;
    runBtn.disabled = true;
    hideEl(result);
    const done = [];
    let current = "";
    const paint = () =>
      setStatus(
        status,
        `<div class="am-steps">${done.map((s) => `<div class="am-step ok">${ic(ICON.check, 16)}<span>${esc(s)}</span></div>`).join("")}${current ? `<div class="am-step">${spinner}<span>${esc(current)}</span></div>` : ""}</div>`,
      );
    const onLog = (key) => {
      if (current) done.push(current);
      current = t("st-" + key);
      paint();
    };
    paint();
    try {
      const res = await findPresets(link, { onLog, noCache });
      hideEl(status);
      renderAm(res, result);
      showEl(result);
      result.scrollIntoView({ behavior: "smooth", block: "start" });
      scannedOnce = true;
      runBtn.textContent = t("am-rescan");
    } catch (e) {
      console.warn("[tools/am]", e);
      setStatus(status, errorHtml(e), "error");
    } finally {
      busy = false;
      runBtn.disabled = false;
    }
  };
  runBtn.addEventListener("click", () => run(scannedOnce));
  input.addEventListener("keydown", (e) => e.key === "Enter" && run(false));
  input.addEventListener("input", () => {
    scannedOnce = false;
    runBtn.textContent = t("am-run");
  });
}

/* ---------------- navigation inside the tools tab ---------------- */
let activeTool = null;

function openTool(id) {
  activeTool = id;
  hideEl($("toolsMenu"));
  root.querySelectorAll(".tool-sub-page").forEach((p) => p.classList.toggle("hidden", p.id !== "tool-" + id));
  window.scrollTo({ top: 0 });
}

export function closeActiveTool() {
  if (!activeTool) return false;
  activeTool = null;
  root.querySelectorAll(".tool-sub-page").forEach((p) => p.classList.add("hidden"));
  showEl($("toolsMenu"));
  return true;
}

export function resetToolsMenu() {
  if (!root) return;
  closeActiveTool();
  applyLang();
}

export function initTools() {
  root = $("toolsPage");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "1";
  root.innerHTML = buildPage();
  applyLang();

  root.addEventListener("click", (e) => {
    const card = e.target.closest(".tool-card");
    if (card) return openTool(card.dataset.tool);
    if (e.target.closest("[data-tool-back]")) closeActiveTool();
  });
  root.addEventListener("keydown", (e) => {
    const card = e.target.closest?.(".tool-card");
    if (card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openTool(card.dataset.tool);
    }
  });

  mountFileTool({
    id: "upscale",
    kind: "image",
    getOption: bindSeg($("upScale")),
    run: (file, scale, onStep) => upscaleImage(file, Number(scale) || 2, onStep),
    prefix: "Upscale",
    renderResult: (ctx) => renderImageResult({ ...ctx, label: t("hd"), checker: false }),
  });

  mountFileTool({
    id: "bg",
    kind: "image",
    run: (file, _o, onStep) => removeBackground(file, onStep),
    prefix: "RemoveBG",
    renderResult: (ctx) => renderImageResult({ ...ctx, label: t("result"), checker: true }),
  });

  mountFileTool({
    id: "pdf",
    kind: "pdf",
    getOption: bindSeg($("pdfLevel")),
    run: (file, level, onStep) => compressPdf(file, level || "recommended", onStep),
    prefix: "Compressed",
    renderResult: async ({ file, out, result }) => {
      const before = file.size;
      const after = out.bytes.length;
      if (after >= before) {
        result.innerHTML = `<div class="tool-status error"><strong>${esc(t("no-gain"))}</strong></div>`;
        return;
      }
      const pct = Math.round((1 - after / before) * 100);
      result.innerHTML = `
        <div class="tool-card-static pdf-sum">
          <div class="pdf-sizes"><div><b>${esc(formatBytes(before))}</b><span>${esc(t("original"))}</span></div><div class="pdf-arrow">→</div><div><b>${esc(formatBytes(after))}</b><span>${esc(t("result"))}</span></div></div>
          <div class="pdf-pct">${esc(t("saved-pct", { pct }))}</div>
          <div class="pdf-saved"></div>
        </div>`;
      const box = result.querySelector(".pdf-saved");
      const doSave = async () => {
        try {
          const { saved } = await saveAndReport(out.bytes, "Compressed", out.ext);
          box.innerHTML = savedLine(saved);
          showToast(saved.native ? t("saved-to", { path: saved.path }) : t("saved-browser", { path: saved.path }));
          return saved;
        } catch (e) {
          box.innerHTML = `<div class="tool-status error"><strong>${esc(t("failed", { msg: e.message || e }))}</strong></div>`;
          return null;
        }
      };
      const saved = await doSave();
      result.querySelector(".tool-card-static").appendChild(footerButtons(!!saved?.native, doSave));
    },
  });

  mountAm();
}

export { clearAmCache, SAVE_DIR };
