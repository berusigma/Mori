// tools.js — Tools & Utilities Module for Mori / RYSAV

import { showToast, triggerHaptic } from "../utils/index.js";

export function initToolsModule() {
  initToolsCategoryFilter();
  initBulkLinkExtractor();
  initQrCodeGenerator();
  initCodecTools();
  initSizeEstimator();
  initPingTester();
}

/* 1. Category Filter */
function initToolsCategoryFilter() {
  const catBtns = document.querySelectorAll(".tools-cat-btn");
  const toolCards = document.querySelectorAll(".tools-card");

  catBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      triggerHaptic("light");
      const targetCat = btn.getAttribute("data-tools-cat");

      catBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      toolCards.forEach((card) => {
        const cardCat = card.getAttribute("data-cat");
        if (targetCat === "all" || cardCat === targetCat) {
          card.style.display = "block";
          setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
          }, 10);
        } else {
          card.style.opacity = "0";
          card.style.transform = "translateY(10px)";
          setTimeout(() => {
            card.style.display = "none";
          }, 200);
        }
      });
    });
  });
}

/* 2. Bulk Link Extractor */
function initBulkLinkExtractor() {
  const input = document.getElementById("bulkLinkInput");
  const extractBtn = document.getElementById("extractLinksBtn");
  const clearBtn = document.getElementById("clearBulkInputBtn");
  const resultBox = document.getElementById("bulkLinkResults");
  const countSpan = document.getElementById("extractedCount");
  const linkList = document.getElementById("extractedLinkList");
  const copyAllBtn = document.getElementById("copyAllExtractedBtn");

  if (!extractBtn) return;

  let currentExtractedLinks = [];

  extractBtn.addEventListener("click", () => {
    triggerHaptic("medium");
    const text = input.value || "";
    const urlRegex = /(https?:\/\/[^\s<>"']+\.[^\s<>"']+)/gi;
    const matches = text.match(urlRegex) || [];

    // Deduplicate
    currentExtractedLinks = Array.from(new Set(matches));

    if (currentExtractedLinks.length === 0) {
      showToast("Tidak ada link URL yang ditemukan dalam teks", "error");
      resultBox.classList.add("hidden");
      return;
    }

    countSpan.textContent = `${currentExtractedLinks.length} link ditemukan`;
    linkList.innerHTML = "";

    currentExtractedLinks.forEach((url, idx) => {
      const item = document.createElement("div");
      item.className = "extracted-link-item";

      const platform = detectPlatformName(url);

      item.innerHTML = `
        <div class="link-item-info">
          <span class="link-badge">${platform}</span>
          <span class="link-url-text" title="${url}">${url}</span>
        </div>
        <div class="link-item-actions">
          <button class="tools-mini-btn download-link-btn" data-url="${url}">
            Unduh
          </button>
        </div>
      `;

      linkList.appendChild(item);
    });

    resultBox.classList.remove("hidden");
    showToast(`Berhasil mengekstrak ${currentExtractedLinks.length} link!`);

    // Attach listener for download buttons
    linkList.querySelectorAll(".download-link-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetUrl = e.currentTarget.getAttribute("data-url");
        const mainInput = document.getElementById("urlInput");
        if (mainInput && targetUrl) {
          mainInput.value = targetUrl;
          // Switch to home page
          const homeNav = document.querySelector('.nav-item[data-page="home"]');
          if (homeNav) homeNav.click();
          showToast("Link dimasukkan ke form pengunduhan!");
        }
      });
    });
  });

  clearBtn?.addEventListener("click", () => {
    input.value = "";
    resultBox.classList.add("hidden");
    currentExtractedLinks = [];
    showToast("Input dibersihkan");
  });

  copyAllBtn?.addEventListener("click", () => {
    if (currentExtractedLinks.length === 0) return;
    navigator.clipboard.writeText(currentExtractedLinks.join("\n"));
    showToast("Semua link berhasil disalin!");
  });
}

function detectPlatformName(url) {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube";
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "X / Twitter";
  if (lower.includes("facebook.com") || lower.includes("fb.watch")) return "Facebook";
  if (lower.includes("terabox")) return "TeraBox";
  if (lower.includes("pinterest.com") || lower.includes("pin.it")) return "Pinterest";
  return "Direct / Web";
}

/* 3. QR Code Generator */
function initQrCodeGenerator() {
  const qrInput = document.getElementById("qrInput");
  const generateBtn = document.getElementById("generateQrBtn");
  const qrOutput = document.getElementById("qrOutput");
  const container = document.getElementById("qrCanvasContainer");
  const downloadBtn = document.getElementById("downloadQrBtn");

  if (!generateBtn) return;

  generateBtn.addEventListener("click", () => {
    triggerHaptic("medium");
    const val = qrInput.value.trim();
    if (!val) {
      showToast("Masukkan URL atau teks terlebih dahulu!", "error");
      return;
    }

    const encoded = encodeURIComponent(val);
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encoded}&margin=10`;

    container.innerHTML = `
      <img src="${qrApiUrl}" id="generatedQrImg" alt="QR Code" class="qr-img" />
    `;

    qrOutput.classList.remove("hidden");
    showToast("QR Code berhasil dibuat!");
  });

  downloadBtn?.addEventListener("click", () => {
    const img = document.getElementById("generatedQrImg");
    if (!img) return;
    fetch(img.src)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Mori_QRCode.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("QR Code berhasil disimpan!");
      })
      .catch(() => {
        showToast("Gagal mengunduh gambar QR", "error");
      });
  });
}

/* 4. Encoder / Decoder Tools */
function initCodecTools() {
  const input = document.getElementById("codecInput");
  const output = document.getElementById("codecOutput");
  const urlEnc = document.getElementById("urlEncodeBtn");
  const urlDec = document.getElementById("urlDecodeBtn");
  const b64Enc = document.getElementById("b64EncodeBtn");
  const b64Dec = document.getElementById("b64DecodeBtn");

  if (!urlEnc) return;

  const showResult = (resText) => {
    output.textContent = resText;
    output.classList.remove("hidden");
    navigator.clipboard.writeText(resText);
    showToast("Hasil disalin ke clipboard!");
  };

  urlEnc.addEventListener("click", () => {
    if (!input.value) return;
    showResult(encodeURIComponent(input.value));
  });

  urlDec.addEventListener("click", () => {
    if (!input.value) return;
    try {
      showResult(decodeURIComponent(input.value));
    } catch (e) {
      showToast("Gagal Decode URL: Format tidak valid", "error");
    }
  });

  b64Enc.addEventListener("click", () => {
    if (!input.value) return;
    try {
      const encoded = btoa(unescape(encodeURIComponent(input.value)));
      showResult(encoded);
    } catch (e) {
      showToast("Gagal Encode Base64", "error");
    }
  });

  b64Dec.addEventListener("click", () => {
    if (!input.value) return;
    try {
      const decoded = decodeURIComponent(escape(atob(input.value)));
      showResult(decoded);
    } catch (e) {
      showToast("Gagal Decode Base64: String tidak valid", "error");
    }
  });
}

/* 5. Size Estimator */
function initSizeEstimator() {
  const durationInput = document.getElementById("calcDuration");
  const qualitySelect = document.getElementById("calcQuality");
  const calcBtn = document.getElementById("calculateSizeBtn");
  const resultBox = document.getElementById("calcResult");
  const resultVal = document.getElementById("calcResultVal");

  if (!calcBtn) return;

  const qualityBitrates = {
    "1080p": 6000, // kbps
    "720p": 3000,
    "480p": 1200,
    mp3_320: 320,
    mp3_128: 128,
  };

  calcBtn.addEventListener("click", () => {
    triggerHaptic("medium");
    const minutes = parseFloat(durationInput.value) || 0;
    const quality = qualitySelect.value;
    const kbps = qualityBitrates[quality] || 3000;

    if (minutes <= 0) {
      showToast("Masukkan durasi menit yang valid", "error");
      return;
    }

    const totalSeconds = minutes * 60;
    const totalKilobits = totalSeconds * kbps;
    const totalMegabytes = totalKilobits / 8 / 1024;

    let displaySize = "";
    if (totalMegabytes >= 1024) {
      displaySize = (totalMegabytes / 1024).toFixed(2) + " GB";
    } else {
      displaySize = totalMegabytes.toFixed(1) + " MB";
    }

    resultVal.textContent = displaySize;
    resultBox.classList.remove("hidden");
    showToast(`Estimasi ukuran: ${displaySize}`);
  });
}

/* 6. Ping Tester */
function initPingTester() {
  const testBtn = document.getElementById("testPingBtn");
  const resultsGrid = document.getElementById("pingResults");
  const pingVal = document.getElementById("pingVal");
  const pingStatus = document.getElementById("pingStatus");

  if (!testBtn) return;

  testBtn.addEventListener("click", () => {
    triggerHaptic("medium");
    testBtn.disabled = true;
    testBtn.innerHTML = "Menguji Latensi...";

    const start = performance.now();

    fetch("https://1.1.1.1/cdn-cgi/trace", { mode: "no-cors", cache: "no-store" })
      .then(() => {
        const elapsed = Math.round(performance.now() - start);
        pingVal.textContent = `${elapsed} ms`;
        pingStatus.textContent = elapsed < 120 ? "Koneksi Cepat 🟢" : "Koneksi Sedang 🟡";
      })
      .catch(() => {
        const elapsed = Math.round(performance.now() - start);
        pingVal.textContent = `${elapsed} ms`;
        pingStatus.textContent = "Online 🟢";
      })
      .finally(() => {
        resultsGrid.classList.remove("hidden");
        testBtn.disabled = false;
        testBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
          Uji Latensi Koneksi
        `;
        showToast("Pengujian latensi selesai!");
      });
  });
}
