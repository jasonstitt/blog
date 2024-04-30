import { Feed } from '@numbered/feed'
import { getAllPosts } from '$lib/content'
import { render } from 'svelte/server'

export const prerender = true

export async function GET () {
  const feed = new Feed({
    title: "Jason Stitt's Blog",
    description: 'Adventures in software engineering',
    id: 'https://jasonstitt.com',
    link: 'https://jasonstitt.com',
    language: 'en',
    image: 'https://jasonstitt.com/favicon.png',
    favicon: 'https://jasonstitt.com/favicon.png',
    copyright: 'Copyright Jason Stitt. All rights reserved.',
    feedLinks: {
      rss: 'https://jasonstitt.com/all.rss'
    },
    author: {
      name: 'Jason Stitt'
    }
  })
  const posts = (await getAllPosts(true)).slice(0, 10)
  for (const post of posts) {
    const html = render(post.content, { props: {} }).html
    const htmlWithoutBlocks = html.replace(/<!--(?:\[|\])-->/g, '')
    feed.addItem({
      title: post.metadata.title,
      id: `https://jasonstitt.com${post.path}`,
      link: `https://jasonstitt.com${post.path}`,
      content: htmlWithoutBlocks,
      date: post.metadata.date
    })
  }
  return new Response(feed.rss2())
}
