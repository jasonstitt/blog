import { getAllPosts } from '$lib/content'

export async function load () {
  const posts = await getAllPosts()
  return { posts }
}
