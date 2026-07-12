const fs = require("fs");
const path = require("path");
const { getSupabase } = require("../config/supabase");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "banners";
async function salvarBanner(file) {
  const sb = getSupabase();
  const localPath = `/uploads/banners/${file.filename}`;
  if (!sb) {
    return localPath;
  }
  const ext = path.extname(file.filename) || ".jpg";
  const objectPath = `${Date.now()}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, "")}`;
  const buffer = fs.readFileSync(file.path);
  const { error } = await sb.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.mimetype || "image/jpeg",
    upsert: false
  });
  if (error) {
    console.warn("[Storage] Falha no upload Supabase, usando disco local:", error.message);
    return localPath;
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
  try {
    fs.unlinkSync(file.path);
  } catch {
  }
  return data.publicUrl || localPath;
}
module.exports = { salvarBanner, BUCKET };
