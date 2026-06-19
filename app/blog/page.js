'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { getAllPosts } from './data'
import { FiArrowRight, FiClock, FiUser } from 'react-icons/fi'

const fadeUp = {
  hidden: { opacity: 1, y: 26 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55, ease: 'easeOut' } }),
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const [featured, ...rest] = posts

  return (
    <section className="dg w-full bg-white text-slate-900">
      {/* ===== HERO ===== */}
      <div className="relative -mt-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="dg-blob absolute -right-24 -top-24 h-[30rem] w-[30rem] rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="dg-blob-slow absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute inset-0 dg-grid-bg opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-10 pt-40 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-600 shadow-sm backdrop-blur">
            Insights &amp; Guides
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
            DSAT &amp; PSAT <span className="dg-gradient-text">Prep Blog</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Practical strategies, study plans, and exam updates from the DSATGURU team to help you earn a higher score
            with less stress.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-12">
        {/* ===== Featured post ===== */}
        {featured && (
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg transition-all hover:shadow-2xl md:grid-cols-2"
            >
              <div className="relative h-60 w-full overflow-hidden md:h-full md:min-h-[20rem]">
                <Image
                  src={featured.image}
                  alt={featured.imageAlt || featured.title}
                  fill
                  sizes="(min-width:768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
                <span className="absolute left-4 top-4 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
                  Featured
                </span>
              </div>
              <div className="flex flex-col justify-center p-8 md:p-10">
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${featured.badgeColor}`}>{featured.category}</span>
                  <span className="flex items-center gap-1"><FiClock size={12} /> {featured.readingTime}</span>
                </div>
                <h2 className="mt-4 text-2xl font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 md:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 md:text-base">{featured.summary}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500"><FiUser size={12} /> {featured.author}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                    Read article <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* ===== Grid ===== */}
        <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, i) => (
            <motion.div
              key={post.slug}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              whileHover={{ y: -8 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    fill
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-transparent to-transparent" />
                  <span className={`absolute bottom-3 left-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${post.badgeColor}`}>
                    {post.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <FiClock size={11} /> {post.readingTime}
                  </div>
                  <h2 className="text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 md:text-lg">
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.summary}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                    <span>{post.author}</span>
                    <span>{post.date}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center text-xs font-bold text-indigo-600">
                    Read more <FiArrowRight className="ml-1 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
