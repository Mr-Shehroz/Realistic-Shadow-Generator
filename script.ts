class ShadowGenerator {
  private foregroundImg: HTMLImageElement | null = null;
  private backgroundImg: HTMLImageElement | null = null;
  private depthMapImg: HTMLImageElement | null = null;
  private lightAngle: number = 45;
  private lightElevation: number = 45;
  private shadowIntensity: number = 0.7;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    const canvasEl = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvasEl) throw new Error("Canvas element not found");
    this.canvas = canvasEl;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;

    this.initEventListeners();
  }

  private initEventListeners(): void {
    const foregroundInput = document.getElementById(
      "foregroundInput"
    ) as HTMLInputElement;
    const backgroundInput = document.getElementById(
      "backgroundInput"
    ) as HTMLInputElement;
    const depthInput = document.getElementById(
      "depthInput"
    ) as HTMLInputElement;
    const angleSlider = document.getElementById(
      "angleSlider"
    ) as HTMLInputElement;
    const elevationSlider = document.getElementById(
      "elevationSlider"
    ) as HTMLInputElement;
    const intensitySlider = document.getElementById(
      "intensitySlider"
    ) as HTMLInputElement;
    const downloadBtn = document.getElementById(
      "downloadBtn"
    ) as HTMLButtonElement;

    foregroundInput.addEventListener("change", (e) =>
      this.handleFileUpload(e, "foreground")
    );
    backgroundInput.addEventListener("change", (e) =>
      this.handleFileUpload(e, "background")
    );
    depthInput.addEventListener("change", (e) =>
      this.handleFileUpload(e, "depth")
    );

    angleSlider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      this.lightAngle = parseInt(target.value, 10);
      (document.getElementById("angleValue") as HTMLElement).textContent =
        this.lightAngle.toString();
      this.generateShadow();
    });

    elevationSlider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      this.lightElevation = parseInt(target.value, 10);
      (document.getElementById("elevationValue") as HTMLElement).textContent =
        this.lightElevation.toString();
      this.generateShadow();
    });

    intensitySlider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      this.shadowIntensity = parseFloat(target.value);
      (document.getElementById("intensityValue") as HTMLElement).textContent =
        this.shadowIntensity.toFixed(2);
      this.generateShadow();
    });

    downloadBtn.addEventListener("click", () => this.downloadImage());
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  private async handleFileUpload(
    event: Event,
    type: "foreground" | "background" | "depth"
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const img = await this.loadImage(file);

    switch (type) {
      case "foreground":
        this.foregroundImg = img;
        (document.getElementById("fgStatus") as HTMLElement).style.display =
          "block";
        break;
      case "background":
        this.backgroundImg = img;
        (document.getElementById("bgStatus") as HTMLElement).style.display =
          "block";
        break;
      case "depth":
        this.depthMapImg = img;
        (document.getElementById("depthStatus") as HTMLElement).style.display =
          "block";
        break;
    }

    if (this.foregroundImg && this.backgroundImg) {
      this.generateShadow();
    }
  }

  private generateShadow(): void {
    if (!this.foregroundImg || !this.backgroundImg) return;

    (document.getElementById("placeholder") as HTMLElement).style.display = "none";
    (document.getElementById("processing") as HTMLElement).style.display = "flex";
    (document.getElementById("downloadBtn") as HTMLElement).style.display = "block";

    // Hide CSS output initially
    const cssOutput = document.querySelector(".css-output") as HTMLElement | null;
    const cssCodeEl = document.getElementById("cssCode") as HTMLElement | null;
    if (cssOutput && cssCodeEl) {
      cssOutput.style.display = "none";
    }

    setTimeout(() => {
      const bg = this.backgroundImg!;
      const fg = this.foregroundImg!;

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
      const scale =
        Math.min(this.canvas.width / fg.width, this.canvas.height / fg.height) *
        0.6;
      const fgWidth = fg.width * scale;
      const fgHeight = fg.height * scale;
      const fgX = (this.canvas.width - fgWidth) / 2;
      const fgY = this.canvas.height - fgHeight - 50;

      const fgCanvas = document.createElement("canvas");
      fgCanvas.width = fgWidth;
      fgCanvas.height = fgHeight;
      const fgCtx = fgCanvas.getContext("2d", { willReadFrequently: true })!;
      fgCtx.drawImage(fg, 0, 0, fgWidth, fgHeight);

      const fgData = fgCtx.getImageData(0, 0, fgWidth, fgHeight);
      const shadowLayers = 5;

      for (let layer = shadowLayers - 1; layer >= 0; layer--) {
        const layerCanvas = document.createElement("canvas");
        layerCanvas.width = fgWidth;
        layerCanvas.height = fgHeight;
        const layerCtx = layerCanvas.getContext("2d")!;
        const layerData = layerCtx.createImageData(fgWidth, fgHeight);

        for (let i = 0; i < fgData.data.length; i += 4) {
          const alpha = fgData.data[i + 3];
          if (alpha > 10) {
            const y = Math.floor(i / 4 / fgWidth);
            const distanceFromBottom = fgHeight - y;

            const contactFactor = Math.max(
              0,
              1 - distanceFromBottom / (fgHeight * 0.3)
            );
            const distanceFactor = Math.exp(
              -distanceFromBottom / (fgHeight * 0.5)
            );

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
          })!;
          depthCtx.drawImage(
            this.depthMapImg,
            0,
            0,
            this.canvas.width,
            this.canvas.height
          );

          const depthData = depthCtx.getImageData(fgX, fgY, fgWidth, fgHeight);
          const warpedCanvas = document.createElement("canvas");
          warpedCanvas.width = fgWidth;
          warpedCanvas.height = fgHeight;
          const warpedCtx = warpedCanvas.getContext("2d")!;
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
          const finalLayerCtx = layerCanvas.getContext("2d")!;
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

      (document.getElementById("processing") as HTMLElement).style.display = "none";
    }, 100);
  }

  private downloadImage(): void {
    const link = document.createElement("a");
    link.download = "shadow-composite.png";
    link.href = this.canvas.toDataURL();
    link.click();
  }
}

new ShadowGenerator();