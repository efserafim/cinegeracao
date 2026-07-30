/**
 * Gera imagens Open Graph (preview WhatsApp) com UTF-8 correto.
 *
 *   node scripts/make-og-images.js
 */
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const root = path.join(__dirname, "..", "..", "frontend");
const imageDir = path.join(root, "public", "image");

async function drawBase(ctx, w, h) {
  ctx.fillStyle = "rgb(7, 10, 18)";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(225, 29, 46, 0.22)";
  ctx.beginPath();
  ctx.ellipse(-120 + 310, -180 + 260, 310, 260, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(26, 108, 255, 0.16)";
  ctx.beginPath();
  ctx.ellipse(780 + 260, 280 + 210, 260, 210, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(245, 197, 66, 0.14)";
  ctx.beginPath();
  ctx.ellipse(520 + 190, -80 + 140, 190, 140, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgb(225, 29, 46)";
  ctx.fillRect(0, 0, 8, h);
  ctx.fillStyle = "rgb(245, 197, 66)";
  ctx.fillRect(8, 0, 5, h);
  ctx.fillStyle = "rgb(26, 108, 255)";
  ctx.fillRect(13, 0, 5, h);
  ctx.fillStyle = "rgba(245, 197, 66, 0.7)";
  ctx.fillRect(40, h - 3, w - 80, 2);

  const logo = await loadImage(path.join(imageDir, "logo.png"));
  ctx.fillStyle = "rgba(245, 197, 66, 0.27)";
  ctx.beginPath();
  ctx.ellipse(52 + 178, 137 + 178, 178, 178, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(logo, 70, 155, 320, 320);

  const spider = await loadImage(path.join(imageDir, "aranha.png"));
  ctx.globalAlpha = 0.12;
  ctx.drawImage(spider, 940, 410, 190, 190);
  ctx.globalAlpha = 1;
}

async function makeOg(filename, drawText) {
  const w = 1200;
  const h = 630;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  await drawBase(ctx, w, h);
  drawText(ctx);
  const out = path.join(imageDir, filename);
  fs.writeFileSync(out, canvas.toBuffer("image/jpeg", { quality: 0.9 }));
  console.log(`[make-og] wrote ${out}`);
}

async function main() {
  await makeOg("og-spiderman.jpg", (ctx) => {
    const tx = 440;
    ctx.fillStyle = "rgb(245, 197, 66)";
    ctx.font = "bold 16px Segoe UI, Arial, sans-serif";
    ctx.fillText("GERAÇÃO EUCARÍSTICA", tx, 165);

    ctx.fillStyle = "rgb(225, 29, 46)";
    ctx.font = "bold 46px Segoe UI, Arial, sans-serif";
    ctx.fillText("CineGeração", tx, 225);

    ctx.fillStyle = "rgb(245, 245, 250)";
    ctx.font = "bold 26px Segoe UI, Arial, sans-serif";
    ctx.fillText("Homem-Aranha: Um novo dia", tx, 295);

    ctx.fillStyle = "rgba(245, 197, 66, 0.2)";
    ctx.fillRect(tx, 330, 360, 48);
    ctx.fillStyle = "rgb(245, 197, 66)";
    ctx.font = "20px Segoe UI, Arial, sans-serif";
    ctx.fillText("2 de agosto  ·  18h10", tx + 18, 360);

    ctx.fillStyle = "rgb(170, 178, 198)";
    ctx.fillText("Cinema MaxiMovie  ·  Saquarema/RJ", tx, 415);
    ctx.fillText("Pipoca + Guaravita inclusos", tx, 455);
  });

  await makeOg("og-admin.jpg", (ctx) => {
    const tx = 440;
    ctx.fillStyle = "rgb(225, 29, 46)";
    ctx.fillRect(tx, 160, 150, 42);
    ctx.fillStyle = "rgb(245, 245, 250)";
    ctx.font = "bold 16px Segoe UI, Arial, sans-serif";
    ctx.fillText("ADMIN", tx + 36, 188);

    ctx.font = "bold 46px Segoe UI, Arial, sans-serif";
    ctx.fillText("CineGeração", tx, 260);

    ctx.fillStyle = "rgb(245, 197, 66)";
    ctx.font = "22px Segoe UI, Arial, sans-serif";
    ctx.fillText("Painel da equipe", tx, 320);

    ctx.fillStyle = "rgb(170, 178, 198)";
    ctx.fillText("Login · chamada · comprovantes · PIX", tx, 375);

    ctx.fillStyle = "rgb(245, 197, 66)";
    ctx.font = "bold 16px Segoe UI, Arial, sans-serif";
    ctx.fillText("Geração Eucarística", tx, 445);
  });
}

main().catch((err) => {
  console.error("[make-og] Erro:", err.message || err);
  process.exit(1);
});
