<script>
  import '@fontsource/merriweather/400.css'
  import '@fontsource/merriweather/700.css'
  import '@fontsource/source-sans-pro/400.css'
  import '@fontsource/source-sans-pro/600.css'
  import '@fontsource/inconsolata/400.css'
  import './highlight.css'
  const year = new Date().getFullYear()
</script>

<div class="container">
  <header>
    <a href="/">
      <img src="/profile.webp" alt="Jason Stitt" class="main-avatar" width="90" height="90" />
    </a>
  </header>
  <slot />
  <footer>
    © 2009-{year} Jason Stitt. These are my personal views and don't represent any past or present employer.
  </footer>
</div>

<style>
  :root {
    --font-serif: 'Merriweather', serif;
    --font-sans: 'Source Sans Pro', 'comic sans';
    --font-mono: 'Inconsolata', monospace;
    font-family: var(--font-serif);
    background: rgb(50, 50, 60);
    color: rgb(220, 220, 230);
    line-height: 150%;
  }
  :global {
    h1,h2,h3,h4,h5 {
      text-wrap: balance;
    }
    a {
      color: hsl(209, 57%, 63%);
      text-decoration: none;
    }
    a:hover {
      background-color: hsla(250, 20%, 50%, 40%);
      border-radius: 0.2rem;
    }
    code {
      font-family: var(--font-mono);
    }
  }
  .main-avatar {
    display: block;
    max-block-size: 6rem;
    margin-block: 2rem;
    margin-inline: auto;
  }
  .container {
    max-inline-size: 60rem;
    margin-inline: auto;
    padding-inline: 1rem;
  }
  footer {
    margin-block: 2rem;
    padding-block: 2rem;
    text-align: center;
    opacity: 75%;
    border-top: 1px solid rgba(220, 220, 230, 0.4);
  }
</style>
