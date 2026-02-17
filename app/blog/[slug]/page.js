"use client"
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { getPostBySlug } from '../data'
import { FiArrowLeft } from 'react-icons/fi'

export default function BlogDetailPage() {
  const params = useParams()
  const slug = params?.slug
  const post = getPostBySlug(slug)

  if (!post) {
    return (
      <section className="w-full py-20 px-6 sm:px-10 lg:px-20 font-[Poppins] text-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-3">Blog post not found</h1>
          <p className="text-sm text-gray-600 mb-6">
            The article you are looking for does not exist or may have been moved.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <FiArrowLeft className="mr-1" />
            Back to blog
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 py-16 px-6 sm:px-10 lg:px-20 font-[Poppins] text-gray-800">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Link
              href="/blog"
              className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-700"
            >
              <FiArrowLeft className="mr-1" />
              Back to blog
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${post.badgeColor}`}>
              {post.category}
            </span>
            <span>{post.date}</span>
            <span>• {post.readingTime}</span>
          </div>
        </div>

        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            {post.title}
          </h1>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl">
            {post.heroText}
          </p>
          <p className="mt-4 text-xs text-gray-500">
            By <span className="font-medium text-gray-700">{post.author}</span>
          </p>
        </header>

        <div className="mb-10 w-full rounded-2xl overflow-hidden">
          <div className="relative h-44 md:h-72 w-full">
            <Image
              src={post.image}
              alt={post.imageAlt || post.title}
              fill
              sizes="(min-width: 1024px) 800px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-semibold prose-p:text-gray-700 prose-li:text-gray-700">
          {post.sections?.map((section, index) => (
            <section key={index} className="mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                {section.heading}
              </h2>
              <p className="text-sm md:text-base leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}

          {post.keyTakeaways && post.keyTakeaways.length > 0 && (
            <section className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
              <h2 className="text-sm md:text-base font-semibold text-blue-800 mb-3">
                Key Takeaways
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm text-gray-700">
                {post.keyTakeaways.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </section>
  )
}
