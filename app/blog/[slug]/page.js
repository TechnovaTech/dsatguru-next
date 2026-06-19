'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { getPostBySlug } from '../data'
import { FiArrowLeft, FiArrowRight, FiClock, FiPlus, FiCheck } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${open ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-sm font-semibold text-slate-800 md:text-base">
          {index + 1}. {q}
        </span>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all ${open ? 'rotate-45 bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <FiPlus size={16} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BlogDetailPage() {
  const params = useParams()
  const slug = params?.slug
  const post = getPostBySlug(slug)

  useEffect(() => {
    if (post) {
      document.title = post.metaTitle || post.title
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.name = 'description'
        document.head.appendChild(metaDesc)
      }
      metaDesc.content = post.metaDescription || ''
    }
    let metaRobots = document.querySelector('meta[name="robots"]')
    if (!metaRobots) {
      metaRobots = document.createElement('meta')
      metaRobots.name = 'robots'
      metaRobots.content = 'noindex, nofollow'
      document.head.appendChild(metaRobots)
    } else {
      metaRobots.content = 'noindex, nofollow'
    }
  }, [post])

  if (!post) {
    return (
      <section className="dg flex min-h-[60vh] w-full items-center justify-center px-6 text-slate-800">
        <div className="text-center">
          <h1 className="mb-3 text-2xl font-bold">Blog post not found</h1>
          <p className="mb-6 text-sm text-slate-500">The article you are looking for does not exist or may have been moved.</p>
          <Link href="/blog" className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            <FiArrowLeft /> Back to blog
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="dg w-full bg-white text-slate-900">
      {/* ===== HERO ===== */}
      <div className="relative -mt-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="dg-blob absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute inset-0 dg-grid-bg opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-8 pt-36">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700">
            <FiArrowLeft /> Back to blog
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${post.badgeColor}`}>{post.category}</span>
            <span>{post.date}</span>
            <span className="flex items-center gap-1"><FiClock size={12} /> {post.readingTime}</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[2.6rem]">
            {post.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{post.heroText}</p>
          <p className="mt-4 text-xs text-slate-500">
            By <span className="font-semibold text-slate-700">{post.author}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-20">
        {/* Hero image */}
        <motion.div
          initial={{ opacity: 1, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative mb-10 h-52 w-full overflow-hidden rounded-3xl border-4 border-white shadow-2xl shadow-indigo-900/15 md:h-80"
        >
          <Image src={post.image} alt={post.imageAlt || post.title} fill sizes="(min-width:768px) 768px, 100vw" className="object-cover" priority />
        </motion.div>

        {/* Article */}
        <article className="space-y-8">
          {post.sections?.map((section, index) => (
            <motion.section
              key={index}
              initial={{ opacity: 1, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="mb-3 flex items-center gap-3 text-xl font-extrabold text-slate-900 md:text-2xl">
                <span className="h-6 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-indigo-600 to-blue-600" />
                {section.heading}
              </h2>
              {section.sectionImage && (
                <div className="my-4 overflow-hidden rounded-2xl">
                  <Image src={section.sectionImage} alt={section.heading} width={800} height={400} className="w-full rounded-2xl object-cover" />
                </div>
              )}
              {section.body && <p className="text-[15px] leading-relaxed text-slate-600">{section.body}</p>}
              {section.bullets && (
                <ul className="mt-3 space-y-2">
                  {section.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2.5 text-[15px] text-slate-600">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><FiCheck size={11} /></span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {section.table && (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                      <tr>
                        {section.table.headers.map((h, i) => (
                          <th key={i} className="px-4 py-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`px-4 py-3 text-slate-600 ${ci === 0 ? 'font-semibold text-slate-900' : ''}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>
          ))}

          {/* Key Takeaways */}
          {post.keyTakeaways && post.keyTakeaways.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-700 p-7 text-white shadow-xl">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <h2 className="relative mb-4 text-lg font-extrabold">Key Takeaways</h2>
              <ul className="relative space-y-2.5">
                {post.keyTakeaways.map((item, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-white/95">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20"><FiCheck size={11} /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FAQs (accordion) */}
          {post.faqs && post.faqs.length > 0 && (
            <div>
              <h2 className="mb-5 text-2xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {post.faqs.map((faq, index) => (
                  <FaqItem key={index} index={index} q={faq.question} a={faq.answer} />
                ))}
              </div>
            </div>
          )}
        </article>

        {/* End CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 px-8 py-10 text-center">
          <h3 className="text-xl font-extrabold text-slate-900 md:text-2xl">Ready to put this into practice?</h3>
          <p className="max-w-xl text-sm text-slate-600">Start with a free DSAT demo test or explore our courses to turn these strategies into a higher score.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/demo-test" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-transform hover:-translate-y-0.5">
              Try Free Demo <FiArrowRight />
            </Link>
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
              <FiArrowLeft /> More articles
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
