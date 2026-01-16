"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class ShadowGenerator {
    constructor() {
        this.foregroundImg = null;
        this.backgroundImg = null;
        this.depthMapImg = null;
        this.lightAngle = 45;
        this.lightElevation = 45;
        this.shadowIntensity = 0.7;
        const canvasEl = document.getElementById("canvas");
        if (!canvasEl)
            throw new Error("Canvas element not found");
        this.canvas = canvasEl;
        const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx)
            throw new Error("Could not get 2D context");
        this.ctx = ctx;
        this.initEventListeners();
    }
    initEventListeners() {
        const foregroundInput = document.getElementById("foregroundInput");
        const backgroundInput = document.getElementById("backgroundInput");
        const depthInput = document.getElementById("depthInput");
        const angleSlider = document.getElementById("angleSlider");
        const elevationSlider = document.getElementById("elevationSlider");
        const intensitySlider = document.getElementById("intensitySlider");
        const downloadBtn = document.getElementById("downloadBtn");
        foregroundInput.addEventListener("change", (e) => this.handleFileUpload(e, "foreground"));
        backgroundInput.addEventListener("change", (e) => this.handleFileUpload(e, "background"));
        depthInput.addEventListener("change", (e) => this.handleFileUpload(e, "depth"));
        angleSlider.addEventListener("input", (e) => {
            const target = e.target;
            this.lightAngle = parseInt(target.value, 10);
            document.getElementById("angleValue").textContent =
                this.lightAngle.toString();
            this.generateShadow();
        });
        elevationSlider.addEventListener("input", (e) => {
            const target = e.target;
            this.lightElevation = parseInt(target.value, 10);
            document.getElementById("elevationValue").textContent =
                this.lightElevation.toString();
            this.generateShadow();
        });
        intensitySlider.addEventListener("input", (e) => {
            const target = e.target;
            this.shadowIntensity = parseFloat(target.value);
            document.getElementById("intensityValue").textContent =
                this.shadowIntensity.toFixed(2);
            this.generateShadow();
        });
        downloadBtn.addEventListener("click", () => this.downloadImage());
    }
    loadImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                var _a;
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
            };
            reader.readAsDataURL(file);
        });
    }
    handleFileUpload(event, type) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const input = event.target;
            const file = (_a = input.files) === null || _a === void 0 ? void 0 : _a[0];
            if (!file)
                return;
            const img = yield this.loadImage(file);
            switch (type) {
                case "foreground":
                    this.foregroundImg = img;
                    document.getElementById("fgStatus").style.display =
                        "block";
                    break;
                case "background":
                    this.backgroundImg = img;
                    document.getElementById("bgStatus").style.display =
                        "block";
                    break;
                case "depth":
                    this.depthMapImg = img;
                    document.getElementById("depthStatus").style.display =
                        "block";
                    break;
            }
            if (this.foregroundImg && this.backgroundImg) {
                this.generateShadow();
            }
        });
    }
    generateShadow() {
        if (!this.foregroundImg || !this.backgroundImg)
            return;
        document.getElementById("placeholder").style.display = "none";
        document.getElementById("processing").style.display = "flex";
        document.getElementById("downloadBtn").style.display = "block";
        // Hide CSS output initially
        const cssOutput = document.querySelector(".css-output");
        const cssCodeEl = document.getElementById("cssCode");
        if (cssOutput && cssCodeEl) {
            cssOutput.style.display = "none";
        }
        setTimeout(() => {
            const bg = this.backgroundImg;
            const fg = this.foregroundImg;
            this.canvas.width = bg.width;
            this.canvas.height = bg.height;
            this.ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
            // === Compute CSS drop-shadow values ===
            const baseDistance = (90 - this.lightElevation) * 2; // in pixels
            const angleRad = (this.lightAngle * Math.PI) / 180;
            const offsetX = Math.cos(angleRad) * baseDistance;
            const offsetY = Math.sin(angleRad) * baseDistance;
            const blurRadius = Math.max(2, (90 - this.lightElevation) * 0.3);
            const opacity = Math.min(1, this.shadowIntensity * (1 - this.lightElevation / 180));
            const cssDropShadow = `filter: drop-shadow(${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blurRadius.toFixed(1)}px rgba(0, 0, 0, ${opacity.toFixed(2)}));`;
            // Show CSS code
            if (cssOutput && cssCodeEl) {
                cssCodeEl.textContent = cssDropShadow;
                cssOutput.style.display = "block";
            }
            // === Continue with advanced canvas rendering ===
            const scale = Math.min(this.canvas.width / fg.width, this.canvas.height / fg.height) *
                0.6;
            const fgWidth = fg.width * scale;
            const fgHeight = fg.height * scale;
            const fgX = (this.canvas.width - fgWidth) / 2;
            const fgY = this.canvas.height - fgHeight - 50;
            const fgCanvas = document.createElement("canvas");
            fgCanvas.width = fgWidth;
            fgCanvas.height = fgHeight;
            const fgCtx = fgCanvas.getContext("2d", { willReadFrequently: true });
            fgCtx.drawImage(fg, 0, 0, fgWidth, fgHeight);
            const fgData = fgCtx.getImageData(0, 0, fgWidth, fgHeight);
            const shadowLayers = 5;
            for (let layer = shadowLayers - 1; layer >= 0; layer--) {
                const layerCanvas = document.createElement("canvas");
                layerCanvas.width = fgWidth;
                layerCanvas.height = fgHeight;
                const layerCtx = layerCanvas.getContext("2d");
                const layerData = layerCtx.createImageData(fgWidth, fgHeight);
                for (let i = 0; i < fgData.data.length; i += 4) {
                    const alpha = fgData.data[i + 3];
                    if (alpha > 10) {
                        const y = Math.floor(i / 4 / fgWidth);
                        const distanceFromBottom = fgHeight - y;
                        const contactFactor = Math.max(0, 1 - distanceFromBottom / (fgHeight * 0.3));
                        const distanceFactor = Math.exp(-distanceFromBottom / (fgHeight * 0.5));
                        let shadowOpacity = this.shadowIntensity * distanceFactor;
                        if (contactFactor > 0) {
                            shadowOpacity = Math.min(1, shadowOpacity + contactFactor * 0.4);
                        }
                        const layerOpacity = shadowOpacity * (1 - layer * 0.15);
                        layerData.data[i] = 0;
                        layerData.data[i + 1] = 0;
                        layerData.data[i + 2] = 0;
                        layerData.data[i + 3] = layerOpacity * 255;
                    }
                }
                layerCtx.putImageData(layerData, 0, 0);
                // Depth map warping
                if (this.depthMapImg) {
                    const depthCanvas = document.createElement("canvas");
                    depthCanvas.width = this.canvas.width;
                    depthCanvas.height = this.canvas.height;
                    const depthCtx = depthCanvas.getContext("2d", {
                        willReadFrequently: true,
                    });
                    depthCtx.drawImage(this.depthMapImg, 0, 0, this.canvas.width, this.canvas.height);
                    const depthData = depthCtx.getImageData(fgX, fgY, fgWidth, fgHeight);
                    const warpedCanvas = document.createElement("canvas");
                    warpedCanvas.width = fgWidth;
                    warpedCanvas.height = fgHeight;
                    const warpedCtx = warpedCanvas.getContext("2d");
                    const warpedData = warpedCtx.createImageData(fgWidth, fgHeight);
                    for (let y = 0; y < fgHeight; y++) {
                        for (let x = 0; x < fgWidth; x++) {
                            const idx = (y * fgWidth + x) * 4;
                            const depthValue = depthData.data[idx] / 255;
                            const warpX = x + offsetX * depthValue * 0.5;
                            const warpY = y + offsetY * depthValue * 0.5;
                            if (warpX >= 0 && warpX < fgWidth && warpY >= 0 && warpY < fgHeight) {
                                const srcIdx = (Math.floor(warpY) * fgWidth + Math.floor(warpX)) * 4;
                                warpedData.data[idx] = layerData.data[srcIdx];
                                warpedData.data[idx + 1] = layerData.data[srcIdx + 1];
                                warpedData.data[idx + 2] = layerData.data[srcIdx + 2];
                                warpedData.data[idx + 3] = layerData.data[srcIdx + 3];
                            }
                        }
                    }
                    warpedCtx.putImageData(warpedData, 0, 0);
                    const finalLayerCtx = layerCanvas.getContext("2d");
                    finalLayerCtx.clearRect(0, 0, fgWidth, fgHeight);
                    finalLayerCtx.drawImage(warpedCanvas, 0, 0);
                }
                const blurAmount = layer * 3 + 2;
                this.ctx.filter = `blur(${blurAmount}px)`;
                const layerOffsetX = fgX + offsetX + layer * offsetX * 0.2;
                const layerOffsetY = fgY + offsetY + layer * offsetY * 0.2;
                this.ctx.drawImage(layerCanvas, layerOffsetX, layerOffsetY);
                this.ctx.filter = "none";
            }
            // Draw foreground on top
            this.ctx.drawImage(fg, fgX, fgY, fgWidth, fgHeight);
            document.getElementById("processing").style.display = "none";
        }, 100);
    }
    downloadImage() {
        const link = document.createElement("a");
        link.download = "shadow-composite.png";
        link.href = this.canvas.toDataURL();
        link.click();
    }
}
new ShadowGenerator();
