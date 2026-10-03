// toolsPresetAM.js — Alight Motion Preset Finder for Mori / RYSAV

import { showToast, triggerHaptic } from "../utils/index.js";

const AM_HOSTS = [
  "alight.link",
  "alight.to",
  "alight.page.link",
  "alightcreative.page.link",
  "alightmotion.page.link",
];
const AM_SHARE_RE = /alightcreative\.com\/am\/share\//i;

const FILE_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "mediafire.com",
  "dropbox.com",
  "mega.nz",
  "sfile.mobi",
];

const LINKTREE_HOSTS = [
  "lynk.id",
  "linktr.ee",
  "bio.link",
  "heylink.me",
  "stan.store",
  "s.id",
  "soc12.my.id",
];

const URL_RE = /https?:\/\/[^\s"'<>()[\]{}\\]+/gi;

export function initPresetAMFinder() {
  const findBtn = document.getElementById("findAmPresetBtn");
  const urlInput = document.getElementById("amTiktokInput");
  const resultCard = document.getElementById("amResultContainer");

  if (!findBtn) return;

  findBtn.addEventListener("click", async () => {
    const inputVal = urlInput.value.trim();
    if (!inputVal) {
      showToast("Masukkan URL video TikTok terlebih dahulu!", "error");
      return;
    }

    triggerHaptic("medium");
    findBtn.disabled = true;
    findBtn.innerHTML = `
      <svg class="spinner-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg>
      Menganalisis & Mencari Preset...
    `;

    try {
      const result = await processPresetAMFinder(inputVal);
      renderPresetAMResult(result);
      resultCard.classList.remove("hidden");
      showToast("Analisis preset selesai!");
    } catch (err) {
      showToast("Gagal menganalisis preset: " + err.message, "error");
    } finally {
      findBtn.disabled = false;
      findBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        Cari & Extrak Preset AM
      `;
    }
  });
}

async function processPresetAMFinder(input) {
  const videoId = extractVideoId(input);
  if (!videoId) {
    throw new Error("URL TikTok atau Video ID tidak valid");
  }

  // 1. Fetch Embed Info
  const videoInfo = await fetchTiktokEmbedInfo(videoId);
  const author = videoInfo.author || "tiktok_user";

  const foundLinks = new Set();
  const presets = [];

  // Extract from description
  if (videoInfo.description) {
    extractLinks(videoInfo.description).forEach((u) =>
      addPresetCandidate(u, "Deskripsi Video", foundLinks, presets)
    );
  }

  // 2. Fetch Comments
  const comments = await fetchTiktokComments(videoId);
  for (const c of comments) {
    const detail = `@${c.user}` + (c.pinned ? " (Disematkan)" : "");
    extractLinks(c.text).forEach((u) =>
      addPresetCandidate(u, `Komentar ${detail}`, foundLinks, presets)
    );
  }

  // 3. Resolve Alight links & titles
  for (const p of presets) {
    if (p.url.includes("alight") || p.url.includes("am/share")) {
      const shareInfo = await fetchAlightShareInfo(p.url);
      if (shareInfo.title) p.title = shareInfo.title;
      if (shareInfo.thumb) p.thumb = shareInfo.thumb;
    }
  }

  return {
    videoId,
    author: "@" + author,
    nickname: videoInfo.nickname || author,
    stats: videoInfo.stats,
    description: videoInfo.description,
    presets,
  };
}

function extractVideoId(input) {
  const s = String(input).trim();
  if (/^\d{15,}$/.test(s)) return s;
  const pats = [
    /\/video\/(\d{15,})/,
    /\/v\/(\d{15,})/,
    /\/share\/video\/(\d{15,})/,
    /[?&](?:item_id|share_item_id|aweme_id)=(\d{15,})/,
    /\/(\d{15,})(?:\?|$)/,
  ];
  for (const p of pats) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractLinks(text) {
  if (!text) return [];
  const out = new Set();
  for (const m of String(text).matchAll(URL_RE)) {
    let u = m[0].replace(/[.,;:!?)'"»”]+$/, "").replace(/&amp;/g, "&");
    if (u) out.add(u);
  }
  return Array.from(out);
}

function addPresetCandidate(url, source, seenSet, outputArray) {
  if (seenSet.has(url)) return;

  const isAm =
    AM_SHARE_RE.test(url) ||
    AM_HOSTS.some((h) => url.toLowerCase().includes(h));
  const isXml =
    url.includes(".xml") ||
    url.includes(".ampreset") ||
    FILE_HOSTS.some((h) => url.toLowerCase().includes(h));

  if (isAm || isXml) {
    seenSet.add(url);
    outputArray.push({
      type: isAm ? "5mb" : "xml",
      url,
      title: isAm ? "Preset 5MB Alight Motion" : "Preset File XML",
      source,
    });
  }
}

async function fetchTiktokEmbedInfo(videoId) {
  try {
    const res = await fetch(`https://www.tiktok.com/embed/v2/${videoId}`);
    const html = await res.text();
    const m = html.match(
      /<script[^>]*id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (m) {
      const st = JSON.parse(m[1]);
      const key = Object.keys(st.source?.data || {}).find((k) =>
        k.includes(videoId)
      );
      const v = key ? st.source.data[key]?.videoData : null;
      if (v) {
        return {
          author: v.authorInfos?.uniqueId || "creator",
          nickname: v.authorInfos?.nickName || "",
          description: v.itemInfos?.text || "",
          stats: {
            likes: v.itemInfos?.diggCount || 0,
            comments: v.itemInfos?.commentCount || 0,
            views: v.itemInfos?.playCount || 0,
            shares: v.itemInfos?.shareCount || 0,
          },
        };
      }
    }
  } catch (e) {}

  return {
    author: "tiktok_creator",
    nickname: "TikTok Creator",
    description: "",
    stats: { likes: 0, comments: 0, views: 0, shares: 0 },
  };
}

async function fetchTiktokComments(videoId) {
  try {
    const q = new URLSearchParams({
      aweme_id: videoId,
      count: "30",
      cursor: "0",
      aid: "1233",
    });
    const res = await fetch(`https://www.tiktok.com/api/comment/list/?${q}`);
    const json = await res.json();
    const comments = json.comments || [];
    return comments.map((c) => ({
      text: c.text || "",
      user: c.user?.unique_id || "user",
      pinned: c.author_pin === true,
    }));
  } catch (e) {
    return [];
  }
}

async function fetchAlightShareInfo(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const m = text.match(/<title>([\s\S]*?)<\/title>/i);
    const title = m
      ? m[1].replace(/\s+/g, " ").trim().replace(/ - Alight Motion Project$/i, "")
      : null;
    return { title };
  } catch (e) {
    return { title: null };
  }
}

function renderPresetAMResult(data) {
  const authorCard = document.getElementById("amAuthorCard");
  const presetList = document.getElementById("amPresetList");

  authorCard.innerHTML = `
    <div class="author-meta">
      <div class="author-avatar-icon">${data.author.charAt(1).toUpperCase()}</div>
      <div>
        <div class="author-name-text">${data.nickname} (${data.author})</div>
        <div class="author-desc-text">${data.description || "Video Preset TikTok"}</div>
      </div>
    </div>
    <div class="stats-pill-group">
      <span class="stat-pill">❤️ ${data.stats.likes.toLocaleString()}</span>
      <span class="stat-pill">💬 ${data.stats.comments.toLocaleString()}</span>
      <span class="stat-pill">👁️ ${data.stats.views.toLocaleString()}</span>
    </div>
  `;

  if (data.presets.length === 0) {
    presetList.innerHTML = `
      <div class="empty-state">
        <p>Tidak ada link preset Alight Motion (5MB/XML) ditemukan dalam video/komentar ini.</p>
      </div>
    `;
    return;
  }

  presetList.innerHTML = data.presets
    .map(
      (p) => `
    <div class="preset-item-card">
      <div class="preset-info">
        <span class="preset-type-tag ${p.type === "5mb" ? "five-mb" : "xml"}">${p.type === "5mb" ? "5MB Preset" : "XML File"}</span>
        <div class="preset-title">${p.title}</div>
        <div class="preset-source-sub">Sumber: ${p.source}</div>
      </div>
      <div class="preset-actions">
        <a href="${p.url}" target="_blank" class="tools-action-btn primary" style="padding: 6px 12px; font-size: 12px;">
          Impor AM
        </a>
        <button class="tools-mini-btn copy-preset-btn" data-url="${p.url}">Salin</button>
      </div>
    </div>
  `
    )
    .join("");

  presetList.querySelectorAll(".copy-preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const url = e.currentTarget.getAttribute("data-url");
      navigator.clipboard.writeText(url);
      showToast("Link preset disalin!");
    });
  });
}
