# Rogério Bié | Portfolio

Static portfolio site (HTML, CSS, JS), hosted on GitHub Pages.

## Structure

```
index.html      home
about.html      about
work.html       work
cases.html      case studies
research.html   research
press.html      press
feed.html       feed
game.html       game
assets/         css, js, fonts, images, video, resume PDF
img/            project stills
media/          feed videos and posters
.nojekyll       tells GitHub Pages to serve files as-is (no Jekyll)
```

All paths are relative, so the site works both at `https://<user>.github.io/` and at `https://<user>.github.io/<repo>/`.

## Run locally

```
python -m http.server 8000
```
Then open http://localhost:8000

## Source

Build scripts and old versions live outside this repo, in `Portfolio_Site_v20/_build`.
