// toolsRemoveBG.js — Background Removal Tool for Mori / RYSAV

import { showToast, triggerHaptic } from "../utils/index.js";

export function initRemoveBGTool() {
  const fileInput = document.getElementById("bgImageInput");
  const uploadBox = document.getElementById("bgUploadBox");
  const removeBtn = document.getElementById("startRemoveBgBtn");
  const resultCard = document.getElementById("bgResultCard");
  const previewImg = document.getElementById("bgTransparentPreview");
  const downloadBtn = document.getElementById("downloadBgPngBtn");

  if (!removeBtn) return;

  let selectedFile = null;
  let transparentPngUrl = null;

  uploadBox?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedFile = e.target.files[0];
      uploadBox.querySelector(".file-upload-text").textContent = selectedFile.name;
      showToast("Foto terpilih: " + selectedFile.name);
    }
  });

  removeBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showToast("Pilih foto terlebih dahulu!", "error");
      return;
    }

    triggerHaptic("medium");
    removeBtn.disabled = true;
    removeBtn.innerHTML = `
      <svg class="spinner-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg>
      Menghapus Latar Belakang...
    `;

    try {
      transparentPngUrl = await removeImageBackground(selectedFile);
      previewImg.src = transparentPngUrl;
      resultCard.classList.remove("hidden");
      showToast("Latar belakang berhasil dihapus!");
    } catch (err) {
      showToast("Gagal menghapus BG: " + err.message, "error");
    } finally {
      removeBtn.disabled = false;
      removeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        Hapus Latar Belakang
      `;
    }
  });

  downloadBtn?.addEventListener("click", () => {
    if (!transparentPngUrl) return;
    const a = document.createElement("a");
    a.href = transparentPngUrl;
    a.download = `Mori_NoBG_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("File PNG Transparan berhasil diunduh!");
  });
}

async function removeImageBackground(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file foto"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format foto tidak valid"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Smart threshold background removal (removes solid / light / white background)
        const cornerR = data[0];
        const cornerG = data[1];
        const cornerB = data[2];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check color similarity with corner background
          const diff =
            Math.abs(r - cornerR) + Math.abs(g - cornerG) + Math.abs(b - cornerB);

          // If light/white or matching corner background, set alpha to 0
          if (diff < 60 || (r > 240 && g > 240 && b > 240)) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
