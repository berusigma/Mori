// tools/amfinder.js — Preset AM Finder: TikTok link -> Alight Motion presets
import { httpRequest, bytesToText } from "./common.js";

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.3 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AM_HOSTS = ["alight.link", "alight.to", "alight.page.link", "alightcreative.page.link", "alightmotion.page.link"];
const AM_SHARE_RE = /alightcreative\.com\/am\/share\//i;
const FILE_HOSTS = [
  "drive.google.com", "docs.google.com", "drive.usercontent.google.com", "mediafire.com",
  "dropbox.com", "mega.nz", "sfile.mobi", "wetransfer.com", "apkdownload", "github.com", "gitlab.com",
];
const SOCIAL_HOSTS = [
  "tiktok.com", "instagram.com", "facebook.com", "youtube.com", "twitter.com", "x.com", "t.me",
  "telegram.me", "wa.me", "whatsapp.com", "lynk.id", "linktr.ee", "bio.link", "heylink.me",
  "stan.store", "s.id", "soc12.my.id",
];
const LINKTREE_HOSTS = [
  "lynk.id", "linktr.ee", "bio.link", "heylink.me", "about.me", "stan.store", "s.id", "cutt.ly",
  "bit.ly", "tinyurl.com", "linktree.com", "taplink.cc", "soc12.my.id",
];
const NOISE_HOSTS = [
  "ttwstatic.com", "tiktokv.com", "tiktokcdn.com", "tiktok.com", "snssdk.com", "bytedance.com",
  "byteimg.com", "googleapis.com", "gstatic.com", "google-analytics.com", "doubleclick.net",
  "facebook.net", "fbcdn.net", "apple.com", "w3.org", "schema.org", "cloudflare.com", "jsdelivr.net",
  "unpkg.com", "socket.io", "amazonaws.com", "appsflyer.com", "branch.io", "sentry.io",
  "newrelic.com", "crashlytics.com",
];
const URL_RE = /https?:\/\/[^\s"'<>()[\]{}\\]+/gi;

/* ---------- url helpers ---------- */
function cleanUrl(u) {
  if (!u) return null;
  return u.replace(/[.,;:!?)'"»”]+$/, "").replace(/&amp;/g, "&");
}
function extractLinks(text) {
  if (!text) return [];
  const out = new Set();
  for (const m of String(text).matchAll(URL_RE)) {
    const u = cleanUrl(m[0]);
    if (u) out.add(u);
  }
  for (const m of String(text).matchAll(
    /(?:^|[\s({[>])((?:www\.)?(?:alight\.(?:link|to)\/[A-Za-z0-9_-]+|alightcreative\.com\/am\/share\/[^\s"'<>]+))/gi,
  )) {
    out.add(cleanUrl("https://" + m[1]));
  }
  return [...out];
}
function hostOf(u) {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
function hostIn(u, list) {
  const h = hostOf(u);
  return !!h && list.some((x) => h === x || h.endsWith("." + x));
}
const isAmUrl = (u) => !!u && (AM_SHARE_RE.test(u) || hostIn(u, AM_HOSTS));
const isFileUrl = (u) => hostIn(u, FILE_HOSTS) || /\.(xml|zip|ampreset|json)(\?|$)/i.test(u);
const isSocialUrl = (u) => hostIn(u, SOCIAL_HOSTS);
const isLinktree = (u) => hostIn(u, LINKTREE_HOSTS);
function isNoiseUrl(u) {
  const h = hostOf(u);
  if (h.includes("tiktokcdn") || h.endsWith(".ttwstatic.com") || h.endsWith(".tiktokv.com")) return true;
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|mp4|mp3|css|js|mjs)(\?|$)/i.test(u)) return true;
  if (/^https?:\/\/(apis|static|img|images|assets|sf16|lf16|sf6|lf6)\./i.test(u)) return true;
  return hostIn(u, NOISE_HOSTS);
}

/* ---------- http ---------- */
async function getText(url, opts = {}) {
  const res = await httpRequest({
    url,
    headers: {
      "User-Agent": opts.ua || UA,
      Accept: opts.accept || "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: opts.referer || "https://www.tiktok.com/",
    },
    timeout: opts.timeout || 20000,
    noRedirect: !!opts.noRedirect,
  });
  return res;
}

async function resolveChain(url, max = 8) {
  let cur = url;
  const chain = [];
  const amFound = [];
  let lastHttp = url;
  const note = (u) => {
    if (!u) return;
    const s = String(u);
    const m = s.match(/https?:\/\/alightcreative\.com\/am\/share\/[^\s"'<>;]+/i);
    if (m) return void amFound.push(m[0]);
    if (/^https?:/i.test(s) && hostIn(s, AM_HOSTS)) amFound.push(s.split(/[?#]/)[0]);
  };
  note(url);
  for (let i = 0; i < max; i++) {
    let res;
    try {
      res = await getText(cur, { noRedirect: true, timeout: 12000 });
    } catch {
      break;
    }
    // some runtimes follow redirects anyway: the final URL tells us where we ended up
    if (res.status < 300 && res.url && res.url !== cur) {
      cur = res.url;
      chain.push(cur);
      note(cur);
    }
    if (res.status >= 300 && res.status < 400) {
      let loc = res.headers.location;
      if (!loc) break;
      if (loc.startsWith("intent://")) {
        const decoded = decodeURIComponent(loc);
        note(decoded);
        const embedded = decoded.match(/https?:\/\/alightcreative\.com\/am\/share\/[^\s"'<>;]+/i);
        loc = embedded ? embedded[0] : null;
        if (!loc) break;
      }
      if (!/^https?:/i.test(loc)) break;
      cur = new URL(loc, cur).href;
      chain.push(cur);
      note(cur);
      if (AM_SHARE_RE.test(cur)) {
        lastHttp = cur;
        break;
      }
      continue;
    }
    lastHttp = cur;
    note(cur);
    break;
  }
  note(lastHttp);
  const share = amFound.find((x) => AM_SHARE_RE.test(x));
  return { finalUrl: lastHttp, amUrl: share || amFound[amFound.length - 1] || null, chain };
}

/* ---------- tiktok ---------- */
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

async function resolveTiktokUrl(input) {
  const direct = extractVideoId(input);
  if (!/^https?:\/\//i.test(input) && direct) return { videoId: direct, canonical: null };
  let cur = /^https?:\/\//i.test(input) ? input : "https://" + input;
  const canon = (id, u) => {
    const m = String(u).match(/\/@([^/?#]+)\//);
    return m ? `https://www.tiktok.com/@${m[1]}/video/${id}` : null;
  };
  for (let i = 0; i < 6; i++) {
    const id = extractVideoId(cur);
    if (id && /tiktok\.com/i.test(cur)) return { videoId: id, canonical: canon(id, cur) };
    let res;
    try {
      res = await getText(cur, { noRedirect: true, timeout: 15000 });
    } catch {
      break;
    }
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      cur = new URL(res.headers.location, cur).href;
      continue;
    }
    if (res.url && res.url !== cur) {
      cur = res.url;
      continue;
    }
    const id2 = extractVideoId(cur);
    if (id2) return { videoId: id2, canonical: canon(id2, cur) };
    break;
  }
  const fallbackId = extractVideoId(cur) || direct;
  if (!fallbackId) throw new Error("Gagal membaca ID video dari link");
  return { videoId: fallbackId, canonical: canon(fallbackId, cur) };
}

function parseJsonScript(html, id) {
  const m = html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`));
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

async function getVideoInfo(videoId, attempts = 2) {
  let lastError = "embed gagal";
  for (let i = 0; i < attempts; i++) {
    if (i) await sleep(700);
    let res;
    try {
      res = await getText(`https://www.tiktok.com/embed/v2/${videoId}`, {
        accept: "text/html,application/json",
        timeout: 8000,
      });
    } catch (e) {
      lastError = `embed timeout (${e.name || e.message})`;
      continue;
    }
    const st = parseJsonScript(res.text || "", "__FRONTITY_CONNECT_STATE__");
    if (!st) {
      lastError = `embed gagal (status ${res.status})`;
      continue;
    }
    const key = Object.keys(st.source?.data || {}).find((k) => k.includes(videoId));
    const node = key ? st.source.data[key] : null;
    const v = node?.videoData;
    if (!v) return { error: `video tidak tersedia (code ${node?.customErrorCode ?? "?"})` };
    return {
      id: v.itemInfos?.id || videoId,
      description: v.itemInfos?.text || "",
      createTime: v.itemInfos?.createTime || null,
      commentCount: v.itemInfos?.commentCount ?? null,
      diggCount: v.itemInfos?.diggCount ?? null,
      playCount: v.itemInfos?.playCount ?? null,
      shareCount: v.itemInfos?.shareCount ?? null,
      author: {
        uniqueId: v.authorInfos?.uniqueId || "",
        nickname: v.authorInfos?.nickName || "",
        bio: v.authorInfos?.signature || "",
        secUid: v.authorInfos?.secUid || "",
      },
    };
  }
  return { error: lastError };
}

async function getProfile(uniqueId) {
  if (!uniqueId) return { links: [] };
  try {
    const { text: body = "" } = await getText(`https://www.tiktok.com/@${uniqueId}`);
    const uni = parseJsonScript(body, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
    const user = uni?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo?.user || {};
    let bioLink = null;
    const bm = body.match(/"bioLink":\{"link":"([^"]+)"/);
    if (bm) bioLink = bm[1].replace(/\\u002F/g, "/");
    const links = extractLinks(body).filter(
      (u) => !isNoiseUrl(u) && !/youtube|instagram|twitter|x\.com/i.test(u),
    );
    return {
      bio: user.signature || "",
      nickname: user.nickname || "",
      bioLink,
      links: [...new Set([...(bioLink ? [bioLink] : []), ...links])],
    };
  } catch (e) {
    return { links: [], error: e.message };
  }
}

async function getComments(videoId, author = "", maxPages = 4) {
  const all = [];
  let cursor = 0;
  for (let p = 0; p < maxPages; p++) {
    const q = new URLSearchParams({
      device_id: "7000000000000000001",
      aweme_id: videoId,
      count: "50",
      cursor: String(cursor),
      aid: "1233",
      app_language: "en",
      device_platform: "android",
      os_version: "29",
      region: "ID",
    });
    try {
      const res = await getText(`https://www.tiktok.com/api/comment/list/?${q}`, {
        accept: "application/json",
        timeout: 15000,
      });
      if (!res.text) break;
      const j = JSON.parse(res.text);
      const list = j.comments || [];
      for (const c of list) {
        const user = c.user?.unique_id || "";
        all.push({
          text: c.text || "",
          user,
          pinned: c.author_pin === true,
          diggCount: c.digg_count || 0,
          cid: c.cid || "",
          replyCount: c.reply_comment_total ?? c.reply_count ?? 0,
          byAuthor: !!author && user === author,
        });
      }
      if (!j.has_more || !list.length) break;
      cursor = j.cursor ?? cursor + 50;
      await sleep(350);
    } catch {
      break;
    }
  }
  all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.diggCount - a.diggCount);
  return all;
}

const REPLY_UA =
  "com.zhiliaoapp.musically/300000 (Linux; U; Android 13; id_ID; M2101K6G; Build/TKQ1.220829.002; Cronet/TTNetVersion:b4d74d55 2023-02-16 QuicVersion:41928d6a 2023-01-30)";
const REPLY_Q = {
  device_id: "7185643774736387594",
  iid: "7129847366169418245",
  version_code: "300000",
  aid: "1180",
  device_platform: "android",
  channel: "googleplay",
  app_name: "musically",
  os_api: "33",
  os_version: "13",
  os_name: "Android",
  device_type: "Redmi Note 10",
  resolution: "1080*2400",
  language: "en",
};

async function getReplies(videoId, cid, maxPages = 2) {
  const out = [];
  let cursor = 0;
  for (let p = 0; p < maxPages; p++) {
    const q = new URLSearchParams({
      ...REPLY_Q,
      aweme_id: videoId,
      comment_id: String(cid),
      cursor: String(cursor),
      count: "20",
    });
    try {
      const res = await getText(`https://api16.tiktokv.com/aweme/v1/comment/list/reply/?${q}`, {
        accept: "application/json",
        ua: REPLY_UA,
        timeout: 15000,
      });
      if (!res.text) break;
      const j = JSON.parse(res.text);
      if (j.status_code && j.status_code !== 0) break;
      const list = j.comments || [];
      for (const c of list)
        out.push({ text: c.text || "", user: c.user?.unique_id || "", pinned: false, diggCount: c.digg_count || 0, reply: true });
      if (!j.has_more || !list.length) break;
      cursor = j.cursor ?? cursor + 20;
      await sleep(250);
    } catch {
      break;
    }
  }
  return out;
}

const getReplyParents = (comments, max = 25) =>
  comments
    .filter((c) => c.cid && c.replyCount > 0)
    .sort((a, b) => Number(b.byAuthor) - Number(a.byAuthor) || Number(b.pinned) - Number(a.pinned) || b.diggCount - a.diggCount)
    .slice(0, max);

/* ---------- alight share / files ---------- */
async function getShareInfo(url) {
  try {
    const { text: body = "" } = await getText(url, { timeout: 15000 });
    const m = body.match(/<title>([\s\S]*?)<\/title>/i);
    const title = m ? m[1].replace(/\s+/g, " ").trim().replace(/ - Alight Motion Project$/i, "") : null;
    const thumbs = [
      ...new Set(
        [...body.matchAll(/https:\/\/firebasestorage\.googleapis\.com\/[^\s"'<>]+thumb-\w+\.jpg[^\s"'<>]*/gi)].map((x) =>
          x[0].replace(/&amp;/g, "&"),
        ),
      ),
    ];
    const rank = (u) => (/thumb-med/i.test(u) ? 0 : /thumb-small/i.test(u) ? 1 : 2);
    thumbs.sort((a, b) => rank(a) - rank(b));
    return { title: title || null, thumb: thumbs[0] || null };
  } catch {
    return { title: null, thumb: null };
  }
}

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return null;
  const unit = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < unit.length - 1) {
    n /= 1024;
    i++;
  }
  return i === 0 ? `${Math.round(n)} B` : `${n.toFixed(1)} ${unit[i]}`;
}

async function getFileTitle(url) {
  try {
    const { text: body = "" } = await getText(url, { timeout: 12000 });
    const m = body.match(/<title>([\s\S]*?)<\/title>/i);
    if (!m) return null;
    return m[1].replace(/\s+/g, " ").trim().replace(/\s+-\s+(Google Drive|MediaFire|Dropbox|Mega)\s*$/i, "") || null;
  } catch {
    return null;
  }
}

async function getDriveFileInfo(url) {
  const id = String(url).match(/\/file\/d\/([\w-]{10,})/)?.[1];
  if (!id) return null;
  try {
    // Range request: read only the head of the file (title lives in the first bytes)
    const res = await httpRequest({
      url: `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
      headers: { "User-Agent": UA, Accept: "*/*", Referer: "https://drive.google.com/", Range: "bytes=0-8191" },
      responseType: "bytes",
      timeout: 25000,
    });
    if (res.status >= 400 || !res.bytes?.length) return null;
    if ((res.headers["content-type"] || "").includes("text/html")) return null;
    const total =
      Number(String(res.headers["content-range"] || "").match(/\/(\d+)$/)?.[1]) ||
      Number(res.headers["content-length"] || 0) ||
      res.bytes.length;
    const head = bytesToText(res.bytes.subarray(0, 8192));
    const scene = head.match(/<scene[^>]*\stitle="([^"]*)"/);
    return { sizeBytes: total, sceneTitle: scene ? scene[1] : null };
  } catch {
    return null;
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

function collectUrls(node, out = new Set(), depth = 0) {
  if (!node || typeof node !== "object" || depth > 6) return out;
  if (Array.isArray(node)) {
    for (const n of node) collectUrls(n, out, depth + 1);
    return out;
  }
  for (const k of ["url", "href"]) {
    const v = node[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) out.add(v);
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === "url" || k === "href") continue;
    if (v && typeof v === "object") collectUrls(v, out, depth + 1);
  }
  return out;
}

async function harvestLinktree(url) {
  try {
    const { text: body = "" } = await getText(url, { timeout: 15000 });
    const nd = body.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
    if (nd) {
      try {
        const pp = JSON.parse(nd[1])?.props?.pageProps;
        const set = new Set();
        [pp?.links, pp?.socialLinks, pp?.pinnedLinks, pp?.account?.links].filter(Boolean).forEach((r) => collectUrls(r, set));
        const clean = [...set].filter((u) => !isNoiseUrl(u) && u !== url);
        if (clean.length) return clean;
      } catch {}
    }
    const sh = hostOf(url) || "";
    return extractLinks(body).filter((u) => {
      if (u === url || isNoiseUrl(u)) return false;
      const h = hostOf(u);
      return !!h && !h.endsWith(".internal") && h !== sh && !h.endsWith("." + sh);
    });
  } catch {
    return [];
  }
}

/* ---------- cache (localStorage) ---------- */
const CACHE_KEY = "rysav_am_cache";
const CACHE_VER = "v2";
const CACHE_MAX = 80;
const TTL_FOUND = 86400;
const TTL_EMPTY = 3600;

function loadCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
function saveCache(cache) {
  try {
    const now = Date.now();
    const entries = Object.entries(cache)
      .filter(([, e]) => e && e.v && now - e.t < (e.ttl || TTL_EMPTY) * 1000)
      .sort((a, b) => b[1].t - a[1].t)
      .slice(0, CACHE_MAX);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}
export function clearAmCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

function stripNulls(v) {
  if (Array.isArray(v)) return v.map(stripNulls).filter((x) => x !== null && x !== undefined);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      const y = stripNulls(x);
      if (y !== null && y !== undefined) o[k] = y;
    }
    return o;
  }
  return v;
}

const sourceLabel = (kind, extra) => (kind === "comment" ? `comment${extra?.pinned ? ":pinned" : ""}` : kind);

/* ---------- main ---------- */
export function isTiktokInput(input) {
  return /tiktok\.(com|v)/i.test(input) || (/^\d{15,}$/.test(input.trim()));
}

/**
 * Returns { ok, mode: "resolve" | "video", ... }.
 * "video" results always include full metadata + comment analysis.
 */
export async function findPresets(rawInput, { onLog = () => {}, noCache = false } = {}) {
  const input = String(rawInput || "").trim();
  if (!input) throw new Error("Link kosong");
  const cache = noCache ? null : loadCache();

  // Non-TikTok URL: just resolve a preset share link
  if (/^https?:\/\//i.test(input) && !/tiktok\.(com|v)/i.test(input)) {
    const key = "resolve:" + CACHE_VER + ":" + input;
    if (cache?.[key]) {
      onLog("cache");
      return cache[key].v;
    }
    onLog("resolve");
    const r = await resolveChain(input);
    const share = r.amUrl ? await getShareInfo(r.amUrl) : { title: null, thumb: null };
    const out = stripNulls({
      ok: true,
      mode: "resolve",
      input,
      resolved: r.amUrl || r.finalUrl,
      isAlight: !!r.amUrl,
      title: share.title,
      thumb: share.thumb,
      chain: r.chain,
    });
    if (cache) {
      cache[key] = { t: Date.now(), ttl: TTL_FOUND, v: out };
      saveCache(cache);
    }
    return out;
  }

  onLog("resolve");
  const { videoId, canonical } = await resolveTiktokUrl(input);

  const cacheKey = "video:" + CACHE_VER + ":" + videoId;
  if (cache?.[cacheKey]) {
    onLog("cache");
    return cache[cacheKey].v;
  }

  onLog("video");
  let info = await getVideoInfo(videoId);
  if (info.error && /status/.test(info.error)) {
    await sleep(800);
    info = await getVideoInfo(videoId, 1);
  }
  const uniqueId = info.author?.uniqueId || canonical?.match(/tiktok\.com\/@([^/?#]+)/)?.[1] || "";
  if (uniqueId && !info.author?.uniqueId) info.author = { ...(info.author || {}), uniqueId };

  onLog("profile");
  const profile = await getProfile(uniqueId);

  onLog("comments");
  const topLevel = await getComments(videoId, uniqueId);
  const replies = [];
  const comments = topLevel;

  const collected = [];
  const seenUrl = new Set();
  const add = (url, kind, extra) => {
    const u = cleanUrl(url);
    if (!u || seenUrl.has(u) || isNoiseUrl(u)) return;
    seenUrl.add(u);
    collected.push({
      url: u,
      source: sourceLabel(kind, extra),
      detail: extra?.detail || null,
      kind,
      pinned: !!extra?.pinned,
      byAuthor: !!extra?.byAuthor,
      digg: extra?.digg || 0,
    });
  };

  extractLinks(info.description || "").forEach((u) => add(u, "description"));
  extractLinks(profile.bio || "").forEach((u) => add(u, "bio"));
  if (profile.bioLink) add(profile.bioLink, "bioLink");
  (profile.links || []).forEach((u) => add(u, "bioLink"));
  for (const c of comments) {
    const detail = "@" + c.user + (c.reply ? " (balasan)" : "");
    extractLinks(c.text).forEach((u) => add(u, "comment", { pinned: c.pinned, byAuthor: c.byAuthor, digg: c.diggCount, detail }));
  }

  if (!collected.some((x) => isAmUrl(x.url))) {
    const parents = getReplyParents(topLevel, 12);
    if (parents.length) onLog("replies");
    const startLen = collected.length;
    for (let i = 0; i < parents.length; i += 3) {
      const chunk = await mapLimit(parents.slice(i, i + 3), 3, (p) => getReplies(videoId, p.cid));
      for (const c of chunk.flat()) {
        replies.push(c);
        extractLinks(c.text).forEach((u) =>
          add(u, "comment", {
            pinned: false,
            byAuthor: !!uniqueId && c.user === uniqueId,
            digg: c.diggCount,
            detail: "@" + c.user + " (balasan)",
          }),
        );
      }
      await sleep(200);
      const found = collected.slice(startLen);
      if (found.some((x) => isAmUrl(x.url))) break;
      if (found.some((x) => isFileUrl(x.url)) && i >= 6) break;
      if (replies.length > 80) break;
    }
  }

  onLog("links");
  let openedTrees = 0;
  if (!collected.some((x) => isAmUrl(x.url))) {
    const trees = collected.filter((x) => isLinktree(x.url)).map((x) => x.url);
    if (trees.length) {
      const res = await mapLimit(trees, 4, harvestLinktree);
      res.flat().slice(0, 40).forEach((u) => add(u, "bioLink"));
      openedTrees = trees.length;
    }
  }

  const rank = (x) => (isAmUrl(x.url) ? 0 : isFileUrl(x.url) ? 1 : isSocialUrl(x.url) ? 3 : 2);
  const ordered = [...collected].sort((a, b) => rank(a) - rank(b));
  const resolveTargets = ordered.filter((x) => !isFileUrl(x.url) && !isSocialUrl(x.url)).slice(0, 15).map((x) => x.url);

  if (resolveTargets.length) {
    const resolved = await mapLimit(resolveTargets, 5, async (u) => ({ u, ...(await resolveChain(u)) }));
    for (const r of resolved) {
      const target = r.amUrl || (isAmUrl(r.finalUrl) ? r.finalUrl : null);
      if (!target) continue;
      const hit = collected.find((x) => x.url === r.u);
      collected.push({
        url: target,
        source: hit?.source || "unknown",
        detail: hit?.detail || null,
        kind: hit?.kind || "redirect",
        origin: r.u !== target ? r.u : null,
        pinned: !!hit?.pinned,
        byAuthor: !!hit?.byAuthor,
        digg: hit?.digg || 0,
      });
      seenUrl.add(target);
    }
  }

  const preset = [];
  const others = [];
  const done = new Set();
  for (const x of ordered.concat(collected)) {
    if (done.has(x.url)) continue;
    done.add(x.url);
    const base = {
      url: x.origin || x.url,
      resolved: x.url,
      title: null,
      source: x.source,
      detail: x.detail,
      kind: x.kind,
      pinned: !!x.pinned,
      byAuthor: !!x.byAuthor,
      digg: x.digg || 0,
    };
    if (isAmUrl(x.url)) preset.push({ type: "5mb", ...base });
    else if (isFileUrl(x.url)) preset.push({ type: "xml", ...base, url: x.url });
    else others.push({ url: x.url, source: x.source, detail: x.detail });
  }

  if (preset.length) {
    onLog("titles");
    await mapLimit(preset, 4, async (p) => {
      if (p.type === "5mb") {
        const si = await getShareInfo(p.resolved);
        p.title = si.title;
        p.thumb = si.thumb;
        return;
      }
      const d = await getDriveFileInfo(p.resolved);
      if (d) {
        p.size = humanSize(d.sizeBytes);
        if (d.sceneTitle) p.title = d.sceneTitle;
      }
      if (!p.title) p.title = await getFileTitle(p.resolved);
    });

    const isDefaultTitle = (t) => /^proyek baru\s*\d+$/i.test(String(t || "").trim());
    for (const p of preset) {
      if (!isDefaultTitle(p.title)) continue;
      const pair = preset.find((q) => q !== p && q.detail && q.detail === p.detail && q.title && !isDefaultTitle(q.title));
      if (pair) p.title = pair.title;
    }
    const pairCount = {};
    for (const p of preset) if (p.detail) pairCount[p.detail] = (pairCount[p.detail] || 0) + 1;
    const trust = (p) => {
      if (p.kind === "description") return 100;
      if (p.byAuthor) return 90;
      if (p.kind === "bio") return 85;
      if (p.kind === "bioLink") return 80;
      if (p.pinned) return 70;
      if (p.kind === "comment") return 20 + Math.min(p.digg, 50) / 5;
      return 15;
    };
    for (const p of preset) p.score = trust(p) + (pairCount[p.detail] > 1 ? 5 : 0);
    preset.sort(
      (a, b) => b.score - a.score || (a.type === b.type ? 0 : a.type === "5mb" ? -1 : 1) || b.digg - a.digg,
    );
  }

  const videoUrl = canonical || `https://www.tiktok.com/@${uniqueId}/video/${videoId}`;
  const seenCommentUrl = new Set();
  const commentLinks = collected
    .filter((x) => {
      if (x.kind !== "comment" || isSocialUrl(x.url)) return false;
      const key = x.origin || x.url;
      if (seenCommentUrl.has(key) || seenCommentUrl.has(x.url)) return false;
      seenCommentUrl.add(key);
      seenCommentUrl.add(x.url);
      return true;
    })
    .map((x) => ({ url: x.url, user: (x.detail || "").replace(/ \(balasan\)$/, ""), reply: /balasan/.test(x.detail || ""), pinned: x.pinned, byAuthor: x.byAuthor, digg: x.digg }));

  const out = {
    ok: true,
    mode: "video",
    found: preset.length > 0,
    author: uniqueId ? `@${uniqueId}` : null,
    videoUrl,
    presetLinks: preset.map((p) => {
      const o = { type: p.type, url: p.resolved };
      if (p.title) o.title = p.title;
      if (p.size) o.size = p.size;
      if (p.thumb) o.thumb = p.thumb;
      if (p.source) o.source = p.source;
      if (p.detail) o.detail = p.detail;
      if (p.byAuthor) o.byAuthor = true;
      if (p.pinned) o.pinned = true;
      return o;
    }),
    video: {
      id: videoId,
      url: videoUrl,
      description: info.description || "",
      createTime: info.createTime || null,
      stats: {
        views: info.playCount ?? null,
        likes: info.diggCount ?? null,
        comments: info.commentCount ?? comments.length,
        shares: info.shareCount ?? null,
      },
    },
    authorDetail: {
      uniqueId,
      nickname: info.author?.nickname || profile.nickname || "",
      bio: info.author?.bio || profile.bio || "",
      bioLink: profile.bioLink || null,
    },
    scanned: {
      description: !!info.description,
      bio: !!(info.author?.bio || profile.bio),
      bioLinkPage: !!profile.bioLink,
      linkInBio: openedTrees,
      comments: topLevel.length,
      replies: replies.length,
      commentsWithLinks: commentLinks.length,
      pinnedComment: comments.find((c) => c.pinned)?.text || null,
    },
    commentLinks: commentLinks.slice(0, 20),
    otherLinks: others.filter((o) => o.url !== profile.bioLink).slice(0, 15),
  };
  if (info.error && !info.description && !info.author?.uniqueId) out.videoError = info.error;

  const final = stripNulls(out);
  if (cache) {
    cache[cacheKey] = { t: Date.now(), ttl: final.found ? TTL_FOUND : TTL_EMPTY, v: final };
    saveCache(cache);
  }
  return final;
}
