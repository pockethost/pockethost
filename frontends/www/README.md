# Marketing, Blog, and Documentation for PocketHost

Built with 11ty, Tailwind, Daisy UI, and Markdown

## Getting Started

- Clone the repo
- Run `pnpm install` at the project root
- Navigate to `frontends/www/`
- Run `npx @11ty/eleventy --serve --quiet` to start the development server
- Access the site at http://localhost:8080/

## Development

11ty can use a variety of file types to make content. It supports `.html`, `.njk`, and `.md` to name a few. All will be compiled normally without additional setup needed. Markdown is probably the best for blog posts or documentation pages.

### Creating Variables

You can use the `set` function from nunjucks to create variables.

```twig
{% set linkCSS = "block py-2 px-3 rounded hover:text-white hover:bg-zinc-800" %}

<a href="#" class="{{ linkCSS }}">Link</a>
<a href="#" class="{{ linkCSS }}">Link</a>
<a href="#" class="{{ linkCSS }}">Link</a>
```

### Creating Reusable Components

You can use the `macro` command to create reusable functions. An example looks like this:

```twig
{# /components/your-component-file.njk #}

{# Reusable component for creating custom buttons #}
{% macro PrimaryButton(text, url, icon = "") %}
    <div class="relative inline-flex  group">
        <div
                class="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt">
        </div>

        <a href="{{ url }}"
           class="relative inline-flex gap-4 items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-900 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
           role="button">
            {{ text }}
            {% if icon %}
                <i class="{{ icon }}"></i>
            {% endif %}
        </a>
    </div>
{% endmacro %}
```

Now that your component has been built with the three properties: `text`, `url`, and the optional `icon`, you can import it wherever you want. Note that imports by default start in the `_includes` folder, so no need to reference through the folder tree to get to it.

```twig
{# /content/about.njk #}

{% import "components/buttons.njk" as Buttons %}

{{ Buttons.PrimaryButton("Get Started", "#", "fa-solid fa-arrow-right") }}
```

You can also make macros, or reusable functions, within the page itself, as long as that component is only being used on that specific page. If you need to use it in multiple pages, it is best to put it in its own file in the `_includes/components` folder.

### Reference Page Data

Within each page, you can add metadata at the very top like so:

```md
---
title: My Cool Blog Post
description: This is a cool blog post
---
```

and reference it anywhere in the page with the `{{ }}` syntax. A full example looks like this:

```md
---
title: My Cool Blog Post
description: This is a cool blog post
---

# {{ title }}

New post! Read the description below:

{{ description }}
```

The metadata will be injected into the template, and rendered as static html.

### Folder Structure

```bash
_data/ # Data files like JSON and your global site metadata go here
_includes/ # This is where your layouts, and reusable components go
├── components/ # Any reusable components can go here
└── layouts/ # Any reusable layout files can go here.
_site/ # This is the static HTML output of your 11ty site
content/ # This is where your pages, blog posts, and documentation pages go
├── blog/ # This holds the list of all markdown blog posts
├── docs/ # This holds the list of all markdown documentation posts
├── feed/ # This automatically creates a feed of your blog posts
└── sitemap/ # This automatically generates a sitemap of the marketing site, including blog and documentation pages
public/ # This folder is copied into the _site folder at compile time. Images and static content go here
├── css/ # This is only used to inject tailwind. All CSS should be developed using Tailwind and DaisyUI's utility classes
├── icons/ # This holds the Font Awesome icon system
└── img/ # All images used on the site should go in this folder
└── webfonts # This holds the Font Awesome icon system
```

## 11ty Advanced Features

- 11ty "Get Started" Documentation: https://www.11ty.dev/docs/getting-started/
- Using [Eleventy v2.0](https://www.11ty.dev/blog/eleventy-v2/) with zero-JavaScript output.
  - Content is exclusively pre-rendered (this is a static site).
  - Can easily [deploy to a subfolder without changing any content](https://www.11ty.dev/docs/plugins/html-base/)
  - All URLs are decoupled from the content’s location on the file system.
  - Configure templates via the [Eleventy Data Cascade](https://www.11ty.dev/docs/data-cascade/)
- **Performance focused** with no client-side javascript
- Local development live reload provided by [Eleventy Dev Server](https://www.11ty.dev/docs/dev-server/).
- Content-driven [navigation menu](https://www.11ty.dev/docs/plugins/navigation/)
- [Image optimization](https://www.11ty.dev/docs/plugins/image/) via the `{% image %}` shortcode.
  - Zero-JavaScript output.
  - Support for modern image formats automatically (e.g. AVIF and WebP)
  - Prefers `<img>` markup if possible (single image format) but switches automatically to `<picture>` for multiple image formats.
  - Automated `<picture>` syntax markup with `srcset` and optional `sizes`
  - Includes `width`/`height` attributes to avoid [content layout shift](https://web.dev/cls/).
  - Includes `loading="lazy"` for native lazy loading without JavaScript.
  - Includes [`decoding="async"`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding)
  - Images can be co-located with blog post files.
  - View the [Image plugin source code](https://github.com/11ty/eleventy-base-blog/blob/main/eleventy.config.images.js)
- Per page CSS bundles [via `eleventy-plugin-bundle`](https://github.com/11ty/eleventy-plugin-bundle).
- Built-in [syntax highlighter](https://www.11ty.dev/docs/plugins/syntaxhighlight/) (zero-JavaScript output).
- Blog Posts
  - Draft posts: use `draft: true` to mark a blog post as a draft. Drafts are **only** included during `--serve`/`--watch` and are excluded from full builds. View the [Drafts plugin source code](https://github.com/11ty/eleventy-base-blog/blob/main/eleventy.config.drafts.js).
  - Automated next/previous links
  - Accessible deep links to headings
- Generated Pages
  - Home, Archive, and About pages.
  - [Feeds for Atom and JSON](https://www.11ty.dev/docs/plugins/rss/)
  - `sitemap.xml`
  - Zero-maintenance tag pages ([View on the Demo](https://eleventy-base-blog.netlify.app/tags/))
  - Content not found (404) page
- `content/blog/` has the blog posts, but really they can live in any directory. They need only the `posts` tag to be included in the blog posts [collection](https://www.11ty.dev/docs/collections/).
- Content can be in _any template format_ (blog posts needn’t exclusively be markdown, for example). Configure your project’s supported templates in `eleventy.config.js` -> `templateFormats`.
- The `public` folder in your input directory will be copied to the output folder (via `addPassthroughCopy` in the `eleventy.config.js` file). This means `./public/css/*` will live at `./_site/css/*` after your build completes.
- Provides two content feeds:
  - `content/feed/feed.njk`
  - `content/feed/json.njk`
- This project uses multiple [Eleventy Layouts](https://www.11ty.dev/docs/layouts/):
- `_includes/components/postslist.njk` is a Nunjucks include and is a reusable component used to display a list of all the posts. `content/index.njk` has an example of how to use it.

## Helpful Links

- [11ty Documentation](https://www.11ty.dev/docs/)
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Daisy UI Documentation](https://daisyui.com/)
- [Font Awesome Documentation](https://fontawesome.com/v5.15/how-to-use/on-the-web/referencing-icons/basic-use)
- [Markdown Cheatsheet](https://www.markdownguide.org/cheat-sheet/)
- [Nunjucks Documentation](https://mozilla.github.io/nunjucks/templating.html)
