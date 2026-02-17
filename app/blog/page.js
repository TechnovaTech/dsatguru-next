"use client"
import Link from 'next/link'
import Image from 'next/image'
import { getAllPosts } from './data'
import { FiChevronRight } from 'react-icons/fi'

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <section className="w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 py-16 px-6 sm:px-10 lg:px-20 font-[Poppins] text-gray-800 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600 mb-2">
            Insights & Guides
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            DSAT & PSAT Prep Blog
          </h1>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl">
            Practical strategies, study plans, and exam updates from the DSATGURU team
            to help you earn a higher score with less stress.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden"
            >
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={post.image}
                  alt={post.imageAlt || post.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority={post.slug === posts[0].slug}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                <span className="absolute bottom-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-gray-800">
                  {post.category}
                </span>
              </div>
              <div className="flex-1 flex flex-col p-5">
                <div className="flex items-center justify-between mb-2 text-[11px] font-medium text-gray-500">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${post.badgeColor}`}>
                    {post.category}
                  </span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-700">
                  {post.title}
                </h2>
                <p className="text-xs md:text-sm text-gray-600 line-clamp-3 mb-4">
                  {post.summary}
                </p>
                <div className="mt-auto flex items-center justify-between text-[11px] text-gray-500">
                  <span>{post.author}</span>
                  <span>{post.date}</span>
                </div>
                <div className="mt-3 flex items-center text-xs font-semibold text-blue-600">
                  Read more
                  <FiChevronRight className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
