<script>
  import { ogimg } from '$lib/ogimg';
  const socialImage = ogimg("Hi, I'm Jason Stitt")
</script>

<svelte:head>
  <title>Jason Stitt</title>
  <meta property="og:image" content={socialImage} />
  <meta property="twitter:card" content={socialImage} />
</svelte:head>

<h1>About me</h1>

<p class="intro">
  Hi! I'm a software engineer & architect with 20 years of professional experience. I'm a generalist working
  on SaaS, data platforms, cloud infrastructure, security, compliance, identity & auth, and anything that
  requires a little push.
</p>

<h1>Links</h1>

<ul class="cards">
  <li>
    <a href="https://github.com/jasonstitt">
      <h2>GitHub</h2>
      <footer>github.com/jasonstitt</footer>
    </a>
  </li>
  <li>
    <a href="https://www.linkedin.com/in/jasonstitt/">
      <h2>LinkedIn</h2>
      <footer>linkedin.com/in/jasonstitt</footer>
    </a>
  </li>
  <li>
    <a href="https://dev.to/jasonstitt">
      <h2>Dev.to</h2>
      <footer>dev.to/jasonstitt</footer>
    </a>
  </li>
  <li>
    <a href="https://jasonstitt.com/">
      <h2>Blog</h2>
      <footer>jasonstitt.com</footer>
    </a>
  </li>
</ul>

<style>
  .intro {
    font-size: 120%;
    line-height: 200%;
  }
  h1 {
    font-family: var(--font-sans);
    font-weight: bold;
    font-size: 1.7rem;
    margin-block-start: 3rem;
    margin-bottom: 0.4rem;
  }
  ul.cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    list-style: none;
    padding: 0;
  }
  ul.cards li {
    margin: 0;
    padding: 0;
  }
  ul.cards a {
    display: block;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    text-decoration: none;
    color: inherit;
  }
  ul.cards a:hover {
    background: hsla(0, 0%, 90%, 10%);
  }
  ul.cards h2 {
    font-family: var(--font-sans);
    font-weight: bold;
    font-size: 1.5rem;
    margin-block: 0;
    margin-bottom: 0.4rem;
  }
  ul.cards footer {
    font-family: var(--font-sans);
    margin-block: 0;
  }
</style>
