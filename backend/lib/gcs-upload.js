'use strict';

/**
 * Upload a buffer to Google Cloud Storage. Uses Application Default Credentials on Cloud Run.
 * @returns {Promise<string>} Public or signed URL
 */
async function uploadBuffer({ buffer, destPath, contentType }) {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not configured');
  }
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destPath);
  await file.save(buffer, {
    resumable: false,
    metadata: { contentType: contentType || 'application/octet-stream' },
  });
  if (process.env.GCS_MAKE_PUBLIC === '1' || process.env.GCS_MAKE_PUBLIC === 'true') {
    try {
      await file.makePublic();
    } catch (e) {
      console.warn('GCS makePublic:', e.message);
    }
  }
  if (process.env.GCS_USE_SIGNED_URL === '1' || process.env.GCS_USE_SIGNED_URL === 'true') {
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
    });
    return url;
  }
  const base = (process.env.GCS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/${destPath}`;
  return `https://storage.googleapis.com/${bucketName}/${destPath}`;
}

module.exports = { uploadBuffer };
