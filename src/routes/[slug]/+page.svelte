<script>
  export let data
  import { toDisplayDate, toIsoDate } from '$lib/dates';
  const author = 'Jason Stitt'
  const isoDate = toIsoDate(data.date)
  const displayDate = toDisplayDate(data.date)
</script>

<svelte:head>
  <title>{data.title} - {author}</title> 
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
      h2 code {
        font-size: 90%;
      }
      p code {
        font-size: 110%;
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
