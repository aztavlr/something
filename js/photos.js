// Photos: pick + resize images, store workout photos in IndexedDB (too big for localStorage).
const DB = 'ironlog', STORE = 'photos';
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}
export const getPhoto = (id) => tx('readonly', (s) => s.get(id)).catch(() => null);
export const setPhoto = (id, dataUrl) => tx('readwrite', (s) => s.put(dataUrl, id));
export const delPhoto = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {});

/** Opens the camera roll / camera. Resolves to an <img> or null. Call from a tap handler. */
export function pickImage() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) return resolve(null);
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    };
    input.click();
  });
}

/** Scales an image to fit maxW×maxH (or a centered square crop) and returns a JPEG data URL. */
export function resize(img, { max = 1080, square = false, quality = 0.75 } = {}) {
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

/** Shrinks an existing data URL (e.g. for uploading a smaller copy). */
export function shrink(dataUrl, opts) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(resize(img, opts));
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
