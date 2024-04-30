<script>
	export let data
  import { ogimg } from '$lib/ogimg'
  const socialImage = ogimg('Adventures in software engineering')
</script>

<svelte:head>
  <title>Jason Stitt's Blog</title>
  <meta property="og:image" content={socialImage} />
  <meta property="twitter:card" content={socialImage} />
  <link rel="alternate" type="application/rss+xml" title="RSS Feed for jasonstitt.com" href="/all.rss" />
</svelte:head>

<ul class="post-list">
  {#each data.posts as post}
  <li>
    <article>
      <h2><a href="{post.path}">{post.metadata.title}</a></h2>
      <footer>
        <time>{post.metadata.displayDate}</time>
        {#each post.metadata.tags as tag}
        <span class="post-tag">{tag}</span>
        {/each}
      </footer>
    </article>
  </li>
  {/each}
</ul>

<style>
  .post-list {
    list-style: none;
    padding: 0;
  }

  .post-list article {
    margin-block: 1rem;
  }

  .post-list h2 {
    font-family: var(--font-sans);
    font-weight: bold;
    font-size: 1.2rem;
    margin-block: 0.3rem;
  }

  .post-list footer time {
    font-family: var(--font-serif);
    font-size: 0.9rem;
  }

  .post-tag {
    font-family: var(--font-sans);
    font-size: 0.9rem;
    margin-inline: 0.2rem;
    padding-inline: 0.5rem;
    border-radius: 0.25rem;
    background-color: hsl(150, 5%, 30%);
  }
</style>
