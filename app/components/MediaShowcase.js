'use client'
import Image from 'next/image'

export default function MediaShowcase({ items = [] }) {
  if (!items || items.length === 0) return null
  return (
    <section className="w-full bg-white py-16 px-4 sm:px-6 lg:px-16 font-[Poppins] text-gray-800">
      <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {item.type === 'image' ? (
              <div className="relative w-full h-56">
                <Image
                  src={item.src}
                  alt={item.alt || ''}
                  fill
                  className="object-cover"
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                />
              </div>
            ) : (
              <video className="w-full h-56 object-cover" controls src={item.src} />
            )}
            {item.caption ? (
              <div className="p-4 text-sm text-gray-700">{item.caption}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
