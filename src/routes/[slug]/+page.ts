export async function load ({ params }) {
  const post = await import(`../../content/${params.slug}.md`)
  const { title, date } = post.metadata
  const content = post.default
  console.log(content)
  return {
    content,
    title,
    date
  }
}
