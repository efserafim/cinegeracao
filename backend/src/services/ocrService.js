const path = require("path");
const fs = require("fs");
const Module = require("module");
const sharp = require("sharp");
const Tesseract = require("tesseract.js");
const { createCanvas, DOMMatrix, Path2D, ImageData } = require("@napi-rs/canvas");
const origRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === "canvas") return require("@napi-rs/canvas");
  return origRequire.apply(this, arguments);
};
if (typeof global.DOMMatrix === "undefined") global.DOMMatrix = DOMMatrix;
if (typeof global.Path2D === "undefined") global.Path2D = Path2D;
if (typeof global.ImageData === "undefined") global.ImageData = ImageData;
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const config = require("../config");
const { parseComprovanteOcr, avaliarAlerta } = require("../utils/ocrParser");
async function preprocessImage(filePath) {
  const outPath = filePath.replace(/(\.\w+)$/, "_ocr$1");
  await sharp(filePath).rotate().greyscale().normalize().sharpen().toFile(outPath);
  return outPath;
}
async function loadPdf(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  return pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableWorker: true,
    isEvalSupported: false
  }).promise;
}
async function extractPdfText(pdfPath) {
  const doc = await loadPdf(pdfPath);
  let text = "";
  const max = Math.min(doc.numPages, 3);
  for (let i = 1; i <= max; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += `${content.items.map((it) => it.str).join(" ")}
`;
  }
  try {
    await doc.destroy();
  } catch {
  }
  return text.replace(/\s+/g, " ").trim();
}
async function pdfFirstPageToPng(pdfPath) {
  const doc = await loadPdf(pdfPath);
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: context,
    viewport
  }).promise;
  const outPath = pdfPath.replace(/\.pdf$/i, "_page1.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  try {
    await doc.destroy();
  } catch {
  }
  return outPath;
}
async function ocrTesseract(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, "por+eng", {
    logger: () => {
    }
  });
  return data.text || "";
}
async function ocrGoogleVision(imagePath) {
  const apiKey = config.ocr.googleVisionApiKey;
  if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY não configurada");
  const content = fs.readFileSync(imagePath).toString("base64");
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
          }
        ]
      })
    }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Falha no Google Vision");
  }
  return json.responses?.[0]?.fullTextAnnotation?.text || "";
}
async function processarComprovante(filePath, mimeType, valorEsperado) {
  let texto = "";
  let processedPath = null;
  let pdfRasterPath = null;
  const looksPdf = mimeType === "application/pdf" || String(filePath).toLowerCase().endsWith(".pdf");
  try {
    if (looksPdf) {
      console.info("[OCR] PDF – tentando extrair texto nativo");
      texto = await extractPdfText(filePath);
      if (texto.length < 20) {
        console.info("[OCR] PDF – pouco texto; rasterizando 1ª página");
        pdfRasterPath = await pdfFirstPageToPng(filePath);
        processedPath = await preprocessImage(pdfRasterPath);
        if (config.ocr.provider === "google_vision") {
          texto = await ocrGoogleVision(processedPath);
        } else {
          texto = await ocrTesseract(processedPath);
        }
      }
    } else {
      processedPath = await preprocessImage(filePath);
      if (config.ocr.provider === "google_vision") {
        texto = await ocrGoogleVision(processedPath);
      } else {
        texto = await ocrTesseract(processedPath);
      }
    }
  } catch (err) {
    console.error("[OCR] Erro:", err.message);
    texto = "";
  } finally {
    for (const p of [processedPath, pdfRasterPath]) {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
        }
      }
    }
  }
  const campos = parseComprovanteOcr(texto);
  const alerta = texto.trim() ? avaliarAlerta(campos, valorEsperado) : "OCR_FALHOU";
  return { ...campos, alerta };
}
module.exports = { processarComprovante };
