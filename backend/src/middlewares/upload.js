const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const rootUpload = path.resolve(process.cwd(), config.upload.dir);
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(path.join(rootUpload, "banners"));
ensureDir(path.join(rootUpload, "comprovantes"));
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const COMPROVANTE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf"
]);
const COMPROVANTE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf"]);
function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.join(rootUpload, subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      let ext = path.extname(file.originalname).toLowerCase() || ".bin";
      if (ext === ".pdf" && file.originalname.toLowerCase().endsWith(".pdf.pdf")) {
        ext = ".pdf";
      }
      if (file.mimetype === "application/pdf") ext = ".pdf";
      else if (file.mimetype === "image/png") ext = ".png";
      else if (file.mimetype === "image/webp") ext = ".webp";
      else if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") ext = ".jpg";
      cb(null, `${uuidv4()}${ext}`);
    }
  });
}
const maxBytes = config.upload.maxFileSizeMb * 1024 * 1024;
function isComprovanteAceito(file) {
  if (COMPROVANTE_TYPES.has(file.mimetype)) return true;
  const name = (file.originalname || "").toLowerCase();
  const ext = path.extname(name.replace(/\.pdf\.pdf$/i, ".pdf"));
  return COMPROVANTE_EXTS.has(ext);
}
const uploadBanner = multer({
  storage: makeStorage("banners"),
  limits: { fileSize: maxBytes },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Banner deve ser PNG, JPG ou WEBP"));
  }
});
const uploadComprovante = multer({
  storage: makeStorage("comprovantes"),
  limits: { fileSize: maxBytes },
  fileFilter: (_req, file, cb) => {
    if (isComprovanteAceito(file)) return cb(null, true);
    return cb(new Error("Comprovante deve ser PNG, JPG, JPEG ou PDF"));
  }
});
module.exports = { uploadBanner, uploadComprovante, rootUpload };
