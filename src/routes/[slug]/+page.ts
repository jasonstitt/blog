import { getAllPosts } from '$lib/content.js'
import { get } from 'svelte/store'

export async function load ({ params }) {
  const post = await import(`../../content/${params.slug}.md`)
  const { title, date } = post.metadata
  const content = post.default
  const allPosts = await getAllPosts()
  const recent = allPosts
    .slice(0, 6)
    .filter(p => p.path !== `/${params.slug}`)
    .slice(0, 5)
  return {
    content,
    title,
    date,
    recent
  }
}
