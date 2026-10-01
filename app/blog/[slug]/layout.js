import { getPostBySlug } from '../data'

// Server-rendered <title> / description / canonical for each post, so they are in
// the HTML rather than patched in client-side. The blog's index/noindex decision
// lives in app/blog/layout.js and is inherited here untouched (robots is not set).
export async function generateMetadata({ params }) {
  const post = getPostBySlug(params?.slug)
  if (!post) {
    return { title: 'Blog post not found | DSATGURU' }
  }
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
  }
}

export default function BlogPostLayout({ children }) {
  return children
}
