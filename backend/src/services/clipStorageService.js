const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEV_JWT_FALLBACK = "trust-meter-dev-secret";

function getStorageDir() {
  return (
    process.env.CLIP_STORAGE_DIR || path.join(process.cwd(), "storage", "clips")
  );
}

function ensureStorageDir() {
  const dir = getStorageDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function decodeBase64DataUrl(dataUrl) {
  const [meta, base64] = String(dataUrl || "").split(",");
  const mimeMatch = /^data:(.+);base64$/.exec(meta || "");
  if (!mimeMatch || !base64) {
    throw new Error("Invalid clipBase64 format. Expected data URL");
  }

  const mimeType = mimeMatch[1];
  const buffer = Buffer.from(base64, "base64");
  return { mimeType, buffer };
}

function extensionForMime(mimeType) {
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("mp4")) return ".mp4";
  if (mimeType.includes("ogg")) return ".ogg";
  return ".bin";
}

function saveBase64Clip(clipBase64) {
  ensureStorageDir();
  const { mimeType, buffer } = decodeBase64DataUrl(clipBase64);
  const storageKey = `${Date.now()}-${crypto.randomUUID()}${extensionForMime(mimeType)}`;
  const targetPath = path.join(getStorageDir(), storageKey);

  fs.writeFileSync(targetPath, buffer);

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  return {
    storageKey,
    mimeType,
    byteSize: buffer.length,
    sha256,
    absolutePath: targetPath,
  };
}

function signClipToken(clipId, expiresAtEpochMs) {
  const secret =
    process.env.CLIP_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    DEV_JWT_FALLBACK;

  const payload = `${clipId}.${expiresAtEpochMs}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function verifyClipToken(token, clipId) {
  const secret =
    process.env.CLIP_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    DEV_JWT_FALLBACK;

  const [id, expiresAtRaw, signature] = String(token || "").split(".");
  if (!id || !expiresAtRaw || !signature) return false;
  if (id !== String(clipId)) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const payload = `${id}.${expiresAt}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function buildClipPath(storageKey) {
  return path.join(getStorageDir(), storageKey);
}

module.exports = {
  saveBase64Clip,
  signClipToken,
  verifyClipToken,
  buildClipPath,
};
