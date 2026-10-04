// tools/common.js — shared helpers for RYSAV tools (HTTP, multipart, saving)
import { Filesystem } from "../utils/plugins.js";

export const SAVE_DIR = "Download/RYSAV";
export const UA_MOBILE =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const isNative = () => !!window.Capacitor?.isNativePlatform?.();
const capHttp = () =>
  isNative() ? window.Capacitor?.Plugins?.CapacitorHttp : null;

/* ---------- bytes / base64 ---------- */
export function bytesToBase64(bytes) {
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(bin);
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error("Gagal membaca file"));
    r.readAsDataURL(blob);
  });
}

export const bytesToText = (bytes) => new TextDecoder().decode(bytes);

export function formatBytes(n) {
  if (n == null || isNaN(n)) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return (i === 0 ? Math.round(n) : n.toFixed(1)) + " " + u[i];
}

export function sniffExt(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57) return "webp";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "gif";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44) return "pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "zip";
  return null;
}

/** Throws a readable error when the server answered with text/JSON instead of a file. */
export function assertBinary(res, expectExts) {
  const b = res.bytes;
  const ext = sniffExt(b);
  if (res.status >= 400 || !b || !b.length || !ext || !expectExts.includes(ext)) {
    let hint = "";
    if (b && b.length && (b[0] === 0x7b || b[0] === 0x3c)) {
      hint = bytesToText(b.subarray(0, 160)).replace(/\s+/g, " ");
    }
    throw new Error(
      `Server mengirim respons tidak valid (HTTP ${res.status})` +
        (hint ? `: ${hint}` : ""),
    );
  }
  return ext;
}

export function readImageSize(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Format gambar tidak dikenali"));
    };
    img.src = url;
  });
}

/* ---------- HTTP ---------- */
const lowerHeaders = (h) => {
  const o = {};
  for (const [k, v] of Object.entries(h || {}))
    o[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
  return o;
};

/**
 * Cross-platform request. `form` is an array of [key, value] where value is a
 * string or { blob, filename }. Native (Capacitor) bypasses CORS and can set
 * Origin/Cookie/User-Agent; plain browsers fall back to fetch.
 * Returns { status, headers(lowercase), url, text | bytes }.
 */
export async function httpRequest(opts) {
  const {
    url,
    form,
    body,
    headers = {},
    responseType = "text",
    timeout = 20000,
    noRedirect = false,
  } = opts;
  const method = (opts.method || (form || body !== undefined ? "POST" : "GET")).toUpperCase();
  const cap = capHttp();

  if (cap) {
    const req = {
      url,
      method,
      headers: { ...headers },
      connectTimeout: timeout,
      readTimeout: timeout,
    };
    if (noRedirect) req.disableRedirects = true;
    if (responseType === "bytes") req.responseType = "blob";
    if (form) {
      // Capacitor's native layer reads the boundary from this header
      req.headers["Content-Type"] = `multipart/form-data; boundary=--${Date.now()}`;
      req.dataType = "formData";
      req.data = await Promise.all(
        form.map(async ([key, value]) => {
          if (value && typeof value === "object" && value.blob) {
            return {
              key,
              value: await blobToBase64(value.blob),
              type: "base64File",
              fileName: value.filename || "file",
              contentType: value.blob.type || "application/octet-stream",
            };
          }
          return { key, value: String(value), type: "string" };
        }),
      );
    } else if (body !== undefined) {
      req.data = body;
    }
    const res = await cap.request(req);
    const out = {
      status: res.status,
      headers: lowerHeaders(res.headers),
      url: res.url || url,
    };
    if (responseType === "bytes") {
      out.bytes =
        typeof res.data === "string" ? base64ToBytes(res.data) : new Uint8Array(0);
    } else {
      out.text =
        typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");
    }
    return out;
  }

  const init = { method, headers: { ...headers }, redirect: noRedirect ? "manual" : "follow" };
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout)
    init.signal = AbortSignal.timeout(timeout);
  if (form) {
    const fd = new FormData();
    for (const [k, v] of form) {
      if (v && typeof v === "object" && v.blob) fd.append(k, v.blob, v.filename || "file");
      else fd.append(k, String(v));
    }
    init.body = fd;
  } else if (body !== undefined) {
    init.body = body;
  }
  const res = await fetch(url, init);
  const out = {
    status: res.status,
    headers: lowerHeaders(Object.fromEntries(res.headers.entries())),
    url: res.url || url,
  };
  if (responseType === "bytes") out.bytes = new Uint8Array(await res.arrayBuffer());
  else out.text = await res.text();
  return out;
}

export function jsonOf(res, what = "Server") {
  try {
    const j = JSON.parse(res.text);
    if (res.status >= 400) throw new Error(j?.error?.message || j?.message || `HTTP ${res.status}`);
    return j;
  } catch (e) {
    if (e instanceof SyntaxError)
      throw new Error(`${what} mengirim respons tidak valid (HTTP ${res.status})`);
    throw e;
  }
}

/* ---------- saving ---------- */
export function stampName(prefix, ext) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `RYSAV_${prefix}_${ts}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
}

/** Saves bytes into Download/RYSAV (native) or triggers a browser download. */
export async function saveToRysav(bytes, fileName) {
  if (isNative() && Filesystem) {
    const data = bytesToBase64(bytes);
    const rel = `${SAVE_DIR}/${fileName}`;
    let lastErr;
    for (const directory of ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"]) {
      try {
        await Filesystem.mkdir({ path: SAVE_DIR, directory, recursive: true }).catch(() => {});
        await Filesystem.writeFile({ path: rel, data, directory, recursive: true });
        try {
          window.MoriMainBridge?.scanMediaFile?.(rel);
        } catch (_) {}
        return { path: rel, native: true };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Gagal menyimpan file");
  }
  const blob = new Blob([bytes]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 15000);
  return { path: fileName, native: false };
}

export function openSaveFolder() {
  try {
    return !!window.MoriMainBridge?.openFolder?.(SAVE_DIR);
  } catch (_) {
    return false;
  }
}

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
