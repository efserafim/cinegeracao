/**
 * Serviço de OCR – Tesseract.js (padrão) ou Google Vision (opcional).
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const config = require('../config');
const { parseComprovanteOcr, avaliarAlerta } = require('../utils/ocrParser');

/**
 * Pré-processa imagem para melhorar OCR (escala de cinza + contraste).
 */
async function preprocessImage(filePath) {
  const outPath = filePath.replace(/(\.\w+)$/, '_ocr$1');
  await sharp(filePath)
    .rotate()
    .greyscale()
    .normalize()
    .sharpen()
    .toFile(outPath);
  return outPath;
}

/**
 * Executa OCR com Tesseract (pt + eng).
 */
async function ocrTesseract(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, 'por+eng', {
    logger: () => {},
  });
  return data.text || '';
}

/**
 * Executa OCR via Google Cloud Vision (REST API key).
 */
async function ocrGoogleVision(imagePath) {
  const apiKey = config.ocr.googleVisionApiKey;
  if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY não configurada');

  const content = fs.readFileSync(imagePath).toString('base64');
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    },
  );

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Falha no Google Vision');
  }
  return json.responses?.[0]?.fullTextAnnotation?.text || '';
}

/**
 * Processa comprovante e retorna campos + alerta.
 * PDF: Tesseract não lê PDF e pode derrubar o processo via worker —
 * marca OCR_FALHOU para conferência manual (upload ainda é aceito).
 */
async function processarComprovante(filePath, mimeType, valorEsperado) {
  let texto = '';
  let processedPath = null;
  const looksPdf =
    mimeType === 'application/pdf'
    || String(filePath).toLowerCase().endsWith('.pdf');

  try {
    if (looksPdf) {
      console.warn('[OCR] PDF – OCR automático ignorado (conferência manual)');
      const campos = parseComprovanteOcr('');
      return { ...campos, alerta: 'OCR_FALHOU' };
    }

    processedPath = await preprocessImage(filePath);
    if (config.ocr.provider === 'google_vision') {
      texto = await ocrGoogleVision(processedPath);
    } else {
      texto = await ocrTesseract(processedPath);
    }
  } catch (err) {
    console.error('[OCR] Erro:', err.message);
    texto = '';
  } finally {
    if (processedPath && fs.existsSync(processedPath)) {
      try { fs.unlinkSync(processedPath); } catch { /* ignore */ }
    }
  }

  const campos = parseComprovanteOcr(texto);
  const alerta = texto.trim()
    ? avaliarAlerta(campos, valorEsperado)
    : 'OCR_FALHOU';

  return { ...campos, alerta };
}

module.exports = { processarComprovante };
