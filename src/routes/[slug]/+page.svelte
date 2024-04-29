<script>
  export let data
  import { toDisplayDate, toIsoDate } from '$lib/dates';
  import { ogimg } from '$lib/ogimg';
  const author = 'Jason Stitt'
  const isoDate = toIsoDate(data.date)
  const displayDate = toDisplayDate(data.date)
  const socialImage = ogimg(data.title)
</script>

<svelte:head>
  <title>{data.title} - {author}</title>
  <meta property="og:image" content={socialImage} />
  <meta property="twitter:card" content={socialImage} />
</svelte:head>

<article class="content">
  <h1>{data.title}</h1>
  <time class="pubdate" datetime={isoDate}>{displayDate}</time>
  <address class="byline">By {author}</address>
  <svelte:component this={data.content} />
</article>

<style>
  :global {
    article.content {
      h1 {
        font-family: var(--font-sans);
        font-weight: bold;
        font-size: 1.7rem;
        margin-block: 0;
        margin-bottom: 0.4rem;
      }
      h2 {
        font-family: var(--font-sans);
        font-weight: bold;
        font-size: 1.5rem;
        margin-block: 0.6rem;
        margin-block-start: 1.8rem;
      }
      p code, h2 code {
        margin-inline: 0.1rem;
        padding-inline: 0.2rem;
        padding-block: 0.1rem;
        border-radius: 0.2rem;
        background: hsla(50, 10%, 90%, 15%);
      }
      p code {
        font-size: 110%;
      }
      h2 code {
        font-size: 95%;
      }
      time.pubdate {
        margin-block: 0.4rem;
      }
      address.byline {
        font-style: italic;
        margin-block: 0.4rem;
        margin-bottom: 1.2rem;
      }
      blockquote {
        font-style: italic;
        margin: 0;
        padding-inline: 1rem;
        border-left: 0.35rem solid #ccc;
      }
    }
  }
</style>
