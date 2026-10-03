// toolsImageUpscale.js — Image Upscale HD Enhancer with Interactive Before/After Comparison Slider

import { showToast, triggerHaptic } from "../utils/index.js";

export function initImageUpscalingTool() {
  const fileInput = document.getElementById("hdImageInput");
  const uploadBox = document.getElementById("hdUploadBox");
  const upscaleBtn = document.getElementById("startUpscaleBtn");
  const resultCard = document.getElementById("hdResultCard");
  const compareWrapper = document.getElementById("hdCompareWrapper");
  const downloadBtn = document.getElementById("downloadHdBtn");
  const scale2xBtn = document.getElementById("scale2xBtn");
  const scale4xBtn = document.getElementById("scale4xBtn");

  if (!upscaleBtn) return;

  let selectedFile = null;
  let currentScale = 4;
  let originalDataUrl = null;
  let enhancedDataUrl = null;

  // Scale buttons toggle
  scale2xBtn?.addEventListener("click", () => {
    currentScale = 2;
    scale2xBtn.classList.add("active");
    scale4xBtn.classList.remove("active");
  });
  scale4xBtn?.addEventListener("click", () => {
    currentScale = 4;
    scale4xBtn.classList.add("active");
    scale2xBtn.classList.remove("active");
  });

  // Drag & drop & file pick
  uploadBox?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedFile = e.target.files[0];
      uploadBox.querySelector(".file-upload-text").textContent = selectedFile.name;
      showToast("Foto terpilih: " + selectedFile.name);
    }
  });

  upscaleBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showToast("Pilih foto terlebih dahulu!", "error");
      return;
    }

    triggerHaptic("medium");
    upscaleBtn.disabled = true;
    upscaleBtn.innerHTML = `
      <svg class="spinner-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg>
      Meningkatkan Kualitas ke HD ${currentScale}x...
    `;

    try {
      const { beforeUrl, afterUrl } = await upscaleImageHD(selectedFile, currentScale);
      originalDataUrl = beforeUrl;
      enhancedDataUrl = afterUrl;

      renderBeforeAfterSlider(beforeUrl, afterUrl);
      resultCard.classList.remove("hidden");
      showToast("Peningkatan kualitas HD selesai!");
    } catch (err) {
      showToast("Gagal menaikkan resolusi: " + err.message, "error");
    } finally {
      upscaleBtn.disabled = false;
      upscaleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Tingkatkan Kualitas ke HD
      `;
    }
  });

  downloadBtn?.addEventListener("click", () => {
    if (!enhancedDataUrl) return;
    const a = document.createElement("a");
    a.href = enhancedDataUrl;
    a.download = `Mori_HD_${currentScale}x_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Foto HD berhasil diunduh!");
  });
}

async function upscaleImageHD(file, scaleFactor) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file foto"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format foto tidak valid"));
      img.onload = () => {
        const beforeUrl = e.target.result;

        // Enhance resolution using high quality canvas scaling
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply sharpening filter
        sharpenCanvas(ctx, canvas.width, canvas.height);

        const afterUrl = canvas.toDataURL("image/png", 0.95);
        resolve({ beforeUrl, afterUrl });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function sharpenCanvas(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Simple contrast and clarity enhancement
  const factor = 1.15; // Contrast boost
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
  }
  ctx.putImageData(imgData, 0, 0);
}

function renderBeforeAfterSlider(beforeUrl, afterUrl) {
  const container = document.getElementById("hdCompareContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="image-compare-wrapper">
      <div class="image-compare-container">
        <img src="${afterUrl}" class="image-compare-after" alt="HD Enhanced" />
        <div class="image-compare-before-wrapper" id="compareBeforeWrapper">
          <img src="${beforeUrl}" class="image-compare-before" alt="Original" />
        </div>
        <input type="range" min="0" max="100" value="50" class="image-compare-range" id="compareRangeInput" />
        <span class="compare-badge before">BEFORE (ORIGINAL)</span>
        <span class="compare-badge after">AFTER (HD ${afterUrl ? "ENHANCED" : ""})</span>
      </div>
    </div>
  `;

  const rangeInput = document.getElementById("compareRangeInput");
  const beforeWrapper = document.getElementById("compareBeforeWrapper");

  rangeInput?.addEventListener("input", (e) => {
    const val = e.target.value;
    if (beforeWrapper) {
      beforeWrapper.style.width = `${val}%`;
    }
  });
}
