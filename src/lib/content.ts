import { toDisplayDate } from '$lib/dates'
const files = import.meta.glob('/src/content/*.md')

export async function getAllPosts (includeContent = false) {
  const posts = await Promise.all(
    Object.entries(files).map(async ([path, file]) => {
      const { metadata = {}, default: content } = (await file()) as any
      path = path.replace('/src/content', '').replace('.md', '')
      metadata.date = new Date(metadata.date || 0)
      metadata.displayDate = toDisplayDate(metadata.date)
      metadata.tags = splitTags(metadata.tags)
      return { path, metadata, content: includeContent ? content : null }
    })
  )
  posts.sort(comparePostDates)
  return posts
}

function splitTags (tags: string | string[] | undefined) {
  if (Array.isArray(tags)) {
    return tags
  }
  if (tags) {
    return tags.split(',').map((t: string) => t.trim())
  }
  return []
}

function comparePostDates (p1: any, p2: any) {
  const d1 = Number(new Date(p1.metadata.date || 0))
  const d2 = Number(new Date(p2.metadata.date || 0))
  return d2 - d1
}
