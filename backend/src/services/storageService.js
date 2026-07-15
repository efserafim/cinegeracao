const fs = require("fs");
const path = require("path");
const { getSupabase } = require("../config/supabase");

const BANNER_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "banners";
const COMPROVANTE_BUCKET = process.env.SUPABASE_COMPROVANTES_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "comprovantes";

async function uploadToSupabase(bucket, file, folder = "") {
  const sb = getSupabase();
  if (!sb) return null;
  const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const objectPath = `${folder ? `${folder.replace(/\/$/, "")}/` : ""}${Date.now()}-${safeName}`;
  const buffer = fs.readFileSync(file.path);
  const { error } = await sb.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.mimetype || "application/octet-stream",
    upsert: false
  });
  if (error) {
    console.warn(`[Storage] Falha no upload Supabase (${bucket}):`, error.message);
    return null;
  }
  const { data } = sb.storage.from(bucket).getPublicUrl(objectPath);
  try {
    fs.unlinkSync(file.path);
  } catch {
  }
  return data.publicUrl || null;
}

async function salvarBanner(file) {
  const localPath = `/uploads/banners/${file.filename}`;
  const remote = await uploadToSupabase(BANNER_BUCKET, file);
  return remote || localPath;
}

async function salvarComprovante(file) {
  const localPath = `/uploads/comprovantes/${file.filename}`;
  const remote = await uploadToSupabase(COMPROVANTE_BUCKET, file, "comprovantes");
  return remote || localPath;
}

module.exports = {
  salvarBanner,
  salvarComprovante
};
