'use client'

// Traceability watermark: tiles the logged-in user's identity faintly across the
// screen so any screenshot/leak is attributable to an account. Non-interactive.
// (Web can't block screenshots; this deters leaks by identifying the source.)
export default function Watermark({ label }) {
  if (!label) return null
  const safe = String(label).replace(/[<>&"]/g, '')
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='170'>` +
    `<text x='20' y='95' transform='rotate(-28 20 95)' fill='rgba(71,85,105,0.13)' ` +
    `font-family='system-ui,Segoe UI,Roboto,sans-serif' font-size='14' font-weight='600'>${safe}</text></svg>`
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundRepeat: 'repeat',
      }}
    />
  )
}
