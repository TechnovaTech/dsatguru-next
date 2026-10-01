'use client'
// Shrinks a photographed answer page before it is uploaded.
//
// A phone photo is 3-12 MB; the server takes 8 MB a page and the marker sends
// every page in one request, so pages go up as ~1800px JPEGs - a few hundred KB,
// still sharp enough to read handwriting. Re-encoding also bakes the EXIF
// rotation into the pixels (the marker never sees a sideways page), turns PNG,
// WebP and - where the browser can open it - HEIC into the JPEG the server
// accepts, and drops the photo's metadata, location included.

const UNSUPPORTED =
  "This photo format isn't supported here — take the photo with your phone camera or save it as JPG"

function friendly(message) {
  const e = new Error(message)
  e.friendly = true
  return e
}

function decodeWithImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) })
    img.onerror = () => { URL.revokeObjectURL(url); reject(friendly(UNSUPPORTED)) }
    img.src = url
  })
}

// createImageBitmap applies the EXIF rotation when asked; browsers that do not
// know the option throw, and an <img> (which rotates by default) takes over.
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close?.() }
    } catch {
      /* fall back to <img> */
    }
  }
  return decodeWithImg(file)
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function toJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    const fail = () => reject(friendly('Could not prepare this photo. Please try again, or take a new one.'))
    if (canvas.toBlob) {
      canvas.toBlob((blob) => (blob ? resolve(blob) : fail()), 'image/jpeg', quality)
      return
    }
    try {
      const data = canvas.toDataURL('image/jpeg', quality)
      const bin = atob(data.split(',')[1] || '')
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
      resolve(new Blob([bytes], { type: 'image/jpeg' }))
    } catch {
      fail()
    }
  })
}

// `maxBytes` keeps a dense page under nginx's default 1 MB request limit, in
// case the proxy in front of the API was never raised; quality steps down
// until it fits (never below 0.6, which still reads cleanly).
export async function compressImage(file, { maxEdge = 1800, quality = 0.82, maxBytes = 950 * 1024 } = {}) {
  if (!file) throw friendly('Choose a photo to upload.')
  if (file.type && !file.type.startsWith('image/')) throw friendly('That file is not a photo. Upload a picture of your answer page.')

  const img = await decode(file)
  try {
    const { width, height } = img
    if (!width || !height) throw friendly(UNSUPPORTED)
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))

    // Halve in steps first: one big jump down aliases thin pen strokes away.
    let src = img.source
    let sw = width
    let sh = height
    while (sw / 2 >= w * 1.5 && sh / 2 >= h * 1.5) {
      const nw = Math.round(sw / 2)
      const nh = Math.round(sh / 2)
      const step = makeCanvas(nw, nh)
      const sctx = step.getContext('2d')
      if (!sctx) break
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(src, 0, 0, sw, sh, 0, 0, nw, nh)
      src = step
      sw = nw
      sh = nh
    }

    const canvas = makeCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw friendly('Could not prepare this photo. Please try again, or take a new one.')
    // A transparent PNG would otherwise turn black as a JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, 0, 0, sw, sh, 0, 0, w, h)
    let q = quality
    let blob = await toJpeg(canvas, q)
    while (blob.size > maxBytes && q > 0.6) {
      q = Math.max(0.6, q - 0.1)
      blob = await toJpeg(canvas, q)
    }
    return blob
  } finally {
    img.done()
  }
}
