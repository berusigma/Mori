// tools/ilove.js — Image Upscale, Compress PDF, Remove BG (iLoveIMG / iLovePDF)
import {
  httpRequest,
  jsonOf,
  assertBinary,
  readImageSize,
} from "./common.js";

const UP_SERVERS = [
  "api1g", "api2g", "api3g", "api8g", "api9g", "api10g", "api11g",
  "api12g", "api13g", "api14g", "api15g", "api16g", "api17g", "api18g",
  "api19g", "api20g", "api21g", "api22g", "api24g", "api25g",
];
const BG_SERVERS = [
  "api1g", "api2g", "api3g", "api6g", "api8g", "api9g", "api10g", "api11g",
  "api12g", "api13g", "api14g", "api15g", "api16g", "api17g", "api18g",
  "api19g", "api20g", "api21g", "api22g", "api24g", "api25g",
];
const UP_TASK =
  "r68zl88mq72xq94j2d5p66bn2z9lrbx20njsbw2qsAvgmzr11lvfhAx9kl87pp6yqgx7c8vg7sfbqnrr42qb16v0gj8jl5s0kq1kgp26mdyjjspd8c5A2wk8b4Adbm6vf5tpwbqlqdr8A9tfn7vbqvy28ylphlxdl379psxpd8r70nzs3sk1";

const CHUNK_SIZE = 1024 * 1024;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const api = (site, server, p) => `https://${server}.${site}.com/v1/${p}`;

async function getSession(site, path) {
  const base = `https://www.${site}.com`;
  const res = await httpRequest({
    url: `${base}/${path}`,
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 20000,
  });
  if (res.status >= 400) throw new Error(`Halaman ${site} tidak bisa dibuka (HTTP ${res.status})`);
  const html = res.text || "";
  const marker = "ilovepdfConfig = ";
  const at = html.indexOf(marker);
  if (at < 0) throw new Error("Config tidak ditemukan");
  let config;
  try {
    config = JSON.parse(html.slice(at + marker.length).split(";")[0]);
  } catch (_) {
    throw new Error("Config tidak valid");
  }
  const csrf = new DOMParser()
    .parseFromString(html, "text/html")
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");
  if (!config?.token || !csrf) throw new Error("Token/CSRF gagal diambil");
  const taskId =
    html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1] || config.taskId || null;
  return {
    token: config.token,
    csrf,
    taskId,
    servers: config.servers || [],
    origin: `${base}/`,
  };
}

const authHeaders = (s) => ({
  Authorization: "Bearer " + s.token,
  Origin: s.origin,
  Cookie: "_csrf=" + s.csrf,
  "User-Agent": "Mozilla/5.0",
});

/* ---------------- Image Upscale ---------------- */
export async function upscaleImage(file, scale = 4, onStep) {
  onStep?.("session");
  const session = await getSession("iloveimg", "upscale-image");
  const attempts = [{ task: UP_TASK, servers: UP_SERVERS }];
  if (session.taskId)
    attempts.push({
      task: session.taskId,
      servers: session.servers.length ? session.servers : UP_SERVERS,
    });

  let lastErr;
  for (const a of attempts) {
    try {
      const server = pick(a.servers);
      onStep?.("upload");
      const up = jsonOf(
        await httpRequest({
          url: api("iloveimg", server, "upload"),
          headers: authHeaders(session),
          timeout: 60000,
          form: [
            ["name", "image.jpg"],
            ["chunk", "0"],
            ["chunks", "1"],
            ["task", a.task],
            ["preview", "1"],
            ["file", { blob: file, filename: "image.jpg" }],
          ],
        }),
        "Upload",
      );
      if (!up?.server_filename) throw new Error("Upload gagal: server_filename kosong");

      onStep?.("process");
      const res = await httpRequest({
        url: api("iloveimg", server, "upscale"),
        headers: authHeaders(session),
        responseType: "bytes",
        timeout: 180000,
        form: [
          ["task", a.task],
          ["server_filename", up.server_filename],
          ["scale", String(scale)],
        ],
      });
      const ext = assertBinary(res, ["jpg", "png", "webp"]);
      return { bytes: res.bytes, ext };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/* ---------------- Compress PDF ---------------- */
export async function compressPdf(file, level = "recommended", onStep) {
  onStep?.("session");
  const s = await getSession("ilovepdf", "compress_pdf");
  if (!s.taskId) throw new Error("taskId tidak ditemukan di halaman");
  const server = (s.servers.length ? pick(s.servers) : null) || "api28";
  const headers = authHeaders(s);
  const filename = file.name || "file.pdf";

  const total = Math.ceil(file.size / CHUNK_SIZE) || 1;
  let last = null;
  for (let i = 0; i < total; i++) {
    onStep?.("upload", (i + 1) / total);
    last = jsonOf(
      await httpRequest({
        url: api("ilovepdf", server, "upload"),
        headers,
        timeout: 120000,
        form: [
          ["name", filename],
          ["chunk", String(i)],
          ["chunks", String(total)],
          ["task", s.taskId],
          ["file", { blob: file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size)), filename }],
        ],
      }),
      "Upload",
    );
  }
  if (!last?.server_filename) throw new Error("Upload gagal: server_filename kosong");

  onStep?.("process");
  jsonOfOrOk(
    await httpRequest({
      url: api("ilovepdf", server, "process"),
      headers,
      timeout: 180000,
      form: [
        ["compression_level", level],
        ["isDefault", ""],
        ["output_filename", "{filename}_compressed"],
        ["packaged_filename", "ilovepdf_compressed"],
        ["task", s.taskId],
        ["tool", "compress"],
        ["files[0][server_filename]", last.server_filename],
        ["files[0][filename]", filename],
      ],
    }),
  );

  onStep?.("download");
  const res = await httpRequest({
    url: api("ilovepdf", server, `download/${s.taskId}`),
    headers,
    responseType: "bytes",
    timeout: 180000,
  });
  const ext = assertBinary(res, ["pdf", "zip"]);
  return { bytes: res.bytes, ext };
}

/* ---------------- Remove BG ---------------- */
export async function removeBackground(file, onStep) {
  onStep?.("session");
  const { width, height } = await readImageSize(file);
  const s = await getSession("iloveimg", "remove-background");
  if (!s.taskId) throw new Error("taskId tidak ditemukan di halaman");
  const server = pick(s.servers.length ? s.servers : BG_SERVERS);
  const headers = authHeaders(s);
  const filename = file.name || "image.jpg";

  onStep?.("upload");
  const up = jsonOf(
    await httpRequest({
      url: api("iloveimg", server, "upload"),
      headers,
      timeout: 60000,
      form: [
        ["task", s.taskId],
        ["file", { blob: file, filename }],
      ],
    }),
    "Upload",
  );
  if (!up?.server_filename) throw new Error("Upload gagal: server_filename kosong");

  onStep?.("process");
  await httpRequest({
    url: api("iloveimg", server, "removebackground"),
    headers,
    responseType: "bytes",
    timeout: 180000,
    form: [
      ["task", s.taskId],
      ["server_filename", up.server_filename],
    ],
  });
  jsonOfOrOk(
    await httpRequest({
      url: api("iloveimg", server, "process"),
      headers,
      timeout: 180000,
      form: [
        ["packaged_filename", "iloveimg-background-removed"],
        ["width", String(width)],
        ["height", String(height)],
        ["task", s.taskId],
        ["tool", "removebackgroundimage"],
        ["files[0][server_filename]", up.server_filename],
        ["files[0][filename]", filename],
      ],
    }),
  );

  onStep?.("download");
  const res = await httpRequest({
    url: api("iloveimg", server, `download/${s.taskId}`),
    headers,
    responseType: "bytes",
    timeout: 180000,
  });
  const ext = assertBinary(res, ["png", "webp", "jpg", "zip"]);
  return { bytes: res.bytes, ext };
}

function jsonOfOrOk(res) {
  if (res.status >= 400) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(res.text);
      msg = j?.error?.message || j?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
}
