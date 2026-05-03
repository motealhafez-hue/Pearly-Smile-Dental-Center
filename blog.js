// Mobile-first Blog system: listing + article rendering.
// Data shape matches api/main.py BlogPost + admin Blog editor: slug, title, excerpt, tag, read_time,
// hero_image, meta_title, meta_description, content_html, related_slugs, published.
(function () {
  "use strict";

  /** Default cover for posts without hero_image — clinical, text-free, compressed */
  const DEFAULT_BLOG_COVER =
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=960&q=75";

  function currentLang() {
    return localStorage.getItem("ps-lang") || document.documentElement.lang || "ar";
  }

  function tr(key) {
    try {
      const lang = currentLang();
      const dict = window.TRANSLATIONS || {};
      const v = dict[key];
      return (v && (v[lang] || v.ar || v.en)) || "";
    } catch (e) {
      return "";
    }
  }

  function pickLang(val, lang) {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") return val[lang] || val.ar || val.en || "";
    return String(val);
  }

  function apiBase() {
    try {
      if (typeof window.__API_BASE__ !== "undefined" && window.__API_BASE__) {
        return String(window.__API_BASE__).replace(/\/$/, "");
      }
      return location.protocol === "file:" ? "http://127.0.0.1:8000" : location.origin;
    } catch (e) {
      return "http://127.0.0.1:8000";
    }
  }

  function currentPageType() {
    const el = document.documentElement;
    if (!el) return "";
    const fromDs = el.dataset && el.dataset.page;
    if (fromDs) return fromDs;
    return el.getAttribute("data-page") || "";
  }

  function extractBlogSlug() {
    const path = location.pathname || "";
    const marker = "/blog/";
    const idx = path.indexOf(marker);
    if (idx !== -1) {
      let rest = path.slice(idx + marker.length).replace(/\/+$/, "");
      const segment = rest.split("/")[0] || "";
      if (!segment) return "";
      try {
        return decodeURIComponent(segment);
      } catch (e) {
        return segment;
      }
    }
    try {
      const u = new URL(location.href);
      return String(u.searchParams.get("slug") || "").trim();
    } catch (e2) {
      return "";
    }
  }

  function resolveArticleHtml(post, lang) {
    if (!post || typeof post !== "object") return "";
    const keys = ["content_html", "content", "body", "html"];
    for (let i = 0; i < keys.length; i++) {
      const html = pickLang(post[keys[i]], lang);
      if (html && String(html).trim()) return String(html);
    }
    return "";
  }

  function resolveHeroImage(post) {
    if (!post || typeof post !== "object") return "";
    const v = post.hero_image || post.image || post.cover_image;
    return v ? String(v) : "";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function postUrl(slug) {
    if (typeof window.psBlogPostUrl === "function") {
      return window.psBlogPostUrl(slug);
    }
    const s = encodeURIComponent(String(slug || "").trim());
    if (location.protocol === "file:") return "blog-post.html?slug=" + s;
    const dir = (location.pathname || "").replace(/[^/]+$/, "");
    return (dir || "./") + "blog-post.html?slug=" + s;
  }

  function markSameOriginBlogApi() {
    try {
      if (
        location.protocol !== "file:" &&
        typeof window.psMarkBlogApiAvailable === "function" &&
        apiBase().replace(/\/$/, "") === location.origin
      ) {
        window.psMarkBlogApiAvailable({ sameOrigin: true });
      }
    } catch (e) {
      /* no-op */
    }
  }

  function setMetaTitle(t) {
    if (!t) return;
    document.title = t;
  }

  function setMetaDescription(desc) {
    if (!desc) return;
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", desc);
  }

  function setCanonical(url) {
    if (!url) return;
    const byId = document.getElementById("blog-canonical-link");
    if (byId) {
      byId.setAttribute("href", url);
      return;
    }
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", url);
  }

  function setAbsoluteCanonical(pathOrUrl) {
    try {
      const base = location.protocol === "file:" ? apiBase() : location.origin;
      const u =
        pathOrUrl.indexOf("http") === 0
          ? pathOrUrl
          : base.replace(/\/$/, "") + (pathOrUrl.indexOf("/") === 0 ? pathOrUrl : "/" + pathOrUrl);
      setCanonical(u);
    } catch (e) {
      setCanonical(pathOrUrl);
    }
  }

  function upsertMeta(attrName, attrVal, content) {
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setSocialMeta(opts) {
    const { title, description, imageUrl, url, type } = opts;
    if (title) {
      upsertMeta("property", "og:title", title);
      upsertMeta("name", "twitter:title", title);
    }
    if (description) {
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    if (imageUrl) {
      upsertMeta("property", "og:image", imageUrl);
      upsertMeta("name", "twitter:image", imageUrl);
    }
    if (url) upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", type || "article");
    upsertMeta("property", "og:site_name", "Pearly Smile Dental Center");
  }

  function formatPostDate(iso, lang) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const loc = lang === "ar" ? "ar-SA" : "en-GB";
    try {
      return new Intl.DateTimeFormat(loc, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  function tagsMatch(a, b, lang) {
    return pickLang(a, lang) === pickLang(b, lang);
  }

  async function fetchJson(path) {
    const url = apiBase().replace(/\/$/, "") + path;
    const r = await fetch(url, { credentials: "omit" });
    if (!r.ok) {
      const err = new Error("HTTP " + r.status + " " + url);
      err.status = r.status;
      throw err;
    }
    return r.json();
  }

  // -----------------------
  // Listing
  // -----------------------
  function renderListing(posts) {
    const grid = document.getElementById("blogGrid");
    if (!grid) return;

    const searchEl = document.getElementById("blogSearch");
    const tagEl = document.getElementById("blogTag");
    const prevBtn = document.getElementById("blogPrev");
    const nextBtn = document.getElementById("blogNext");
    const infoEl = document.getElementById("blogPageInfo");

    const PAGE_SIZE = 9;
    let page = 1;
    let q = "";
    let tag = "";
    const lang = currentLang();

    const tags = Array.from(
      new Set(
        (posts || [])
          .map((p) => (p && p.tag ? pickLang(p.tag, lang) : ""))
          .filter(Boolean)
      )
    ).sort();
    if (tagEl) {
      tags.forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t;
        tagEl.appendChild(o);
      });
    }

    function matches(p) {
      if (!p) return false;
      if (tag && pickLang(p.tag, lang) !== tag) return false;
      if (!q) return true;
      const hay = (
        pickLang(p.title, lang) +
        " " +
        pickLang(p.excerpt, lang) +
        " " +
        pickLang(p.tag, lang)
      ).toLowerCase();
      return hay.includes(q);
    }

    function paint() {
      const filtered = (posts || []).filter(matches);
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      page = clamp(page, 1, totalPages);
      const start = (page - 1) * PAGE_SIZE;
      const pageRows = filtered.slice(start, start + PAGE_SIZE);

      grid.innerHTML = "";
      if (!pageRows.length) {
        grid.innerHTML = '<div class="empty-hint">' + escapeHtml(tr("blogNoArticles") || "No articles found.") + "</div>";
      } else {
        grid.innerHTML = pageRows
          .map((p) => {
            const title = pickLang(p.title, lang);
            const excerpt = pickLang(p.excerpt, lang);
            const tagText = pickLang(p.tag, lang);
            const coverSrc = p.hero_image ? String(p.hero_image) : DEFAULT_BLOG_COVER;
            const imgStyle = "background-image:url('" + coverSrc.replace(/'/g, "%27") + "')";
            const rt = p.read_time
              ? (lang === "ar"
                  ? String(p.read_time) + " " + (tr("blogReadTimeSuffix") || "دقائق قراءة")
                  : String(p.read_time) + " " + (tr("blogReadTimeSuffix") || "min read"))
              : tr("blogQuickRead") || "Quick read";
            const tg = tagText ? '<span class="offer-tag">' + escapeHtml(tagText) + "</span>" : "";
            return (
              '<a class="offer-card blog-card" href="' +
              escapeHtml(postUrl(p.slug)) +
              '">' +
              '<div class="offer-image" aria-hidden="true" style="' +
              escapeHtml(imgStyle) +
              '"></div>' +
              '<div class="offer-content">' +
              tg +
              "<h3>" +
              escapeHtml(title || "") +
              "</h3>" +
              '<p class="blog-card__excerpt">' +
              escapeHtml(excerpt || "") +
              "</p>" +
              '<span class="blog-card__readmeta">' +
              escapeHtml(rt) +
              "</span>" +
              '<span class="btn btn-secondary" style="margin-top:14px">' +
              escapeHtml(tr("blogReadMore") || "Read more") +
              "</span>" +
              "</div></a>"
            );
          })
          .join("");
      }

      if (infoEl) infoEl.textContent = "Page " + page + " / " + totalPages;
      if (prevBtn) prevBtn.disabled = page <= 1;
      if (nextBtn) nextBtn.disabled = page >= totalPages;
    }

    if (searchEl) {
      searchEl.addEventListener("input", () => {
        q = String(searchEl.value || "").trim().toLowerCase();
        page = 1;
        paint();
      });
    }
    if (tagEl) {
      tagEl.addEventListener("change", () => {
        tag = String(tagEl.value || "");
        page = 1;
        paint();
      });
    }
    if (prevBtn) prevBtn.addEventListener("click", () => ((page -= 1), paint()));
    if (nextBtn) nextBtn.addEventListener("click", () => ((page += 1), paint()));

    paint();
  }

  // -----------------------
  // Article
  // -----------------------
  async function renderArticle() {
    const titleEl = document.getElementById("blog-title") || document.getElementById("articleTitle");
    const excerptEl = document.getElementById("articleExcerpt");
    const contentEl = document.getElementById("blog-content") || document.getElementById("articleContent");
    const relatedGrid = document.getElementById("relatedGrid");
    const kickerEl = document.getElementById("articleKicker");
    const publishedEl = document.getElementById("articlePublishedTime");
    const readTimeEl = document.getElementById("articleReadTime");
    const featuredFig = document.getElementById("articleFeaturedFigure");
    const featuredImg = document.getElementById("articleFeaturedImg");
    const langMeta = document.getElementById("blogPostingLangMeta");

    if (!contentEl) {
      console.error("[Pearly Blog] Missing #blog-content (or #articleContent) container.");
      const main = document.getElementById("blogPostMain") || document.querySelector("main");
      if (main) {
        main.insertAdjacentHTML(
          "beforeend",
          '<div class="blog-post-shell"><div class="empty-hint">' +
            escapeHtml(tr("blogNotFound") || "Blog page layout error.") +
            "</div></div>"
        );
      }
      return;
    }

    const slug = String(extractBlogSlug() || "").trim();
    console.log("[Pearly Blog] Slug:", slug);

    if (!slug) {
      contentEl.innerHTML =
        '<div class="empty-hint">' + escapeHtml(tr("blogMissingSlug") || "Missing article slug.") + "</div>";
      return;
    }

    try {
      const post = await fetchJson("/api/blog/" + encodeURIComponent(slug));
      console.log("[Pearly Blog] Data:", post);

      markSameOriginBlogApi();
      const lang = currentLang();

      if (langMeta) langMeta.setAttribute("content", lang === "en" ? "en" : "ar");

      const metaTitle = pickLang(post.meta_title, lang) || pickLang(post.title, lang) || "Blog | Pearly Smile";
      const metaDesc =
        pickLang(post.meta_description, lang) || pickLang(post.excerpt, lang) || "Pearly Smile blog article.";
      const headline = pickLang(post.title, lang) || "";
      const heroUrl = resolveHeroImage(post);

      setMetaTitle(metaTitle);
      setMetaDescription(metaDesc);

      const origin = location.protocol === "file:" ? apiBase() : location.origin;
      const canonicalPath =
        location.protocol === "file:"
          ? "blog-post.html?slug=" + encodeURIComponent(slug)
          : "/blog/" + encodeURIComponent(slug);
      const absoluteUrl = origin.replace(/\/$/, "") + (canonicalPath.indexOf("/") === 0 ? canonicalPath : "/" + canonicalPath);
      setAbsoluteCanonical(absoluteUrl);

      setSocialMeta({
        title: metaTitle,
        description: metaDesc,
        imageUrl: heroUrl || undefined,
        url: absoluteUrl,
        type: "article",
      });

      if (titleEl) {
        titleEl.textContent = headline;
        titleEl.removeAttribute("data-translate");
      }
      if (excerptEl) excerptEl.textContent = pickLang(post.excerpt, lang) || "";

      const tagText = pickLang(post.tag, lang);
      if (kickerEl) {
        if (tagText) {
          kickerEl.textContent = tagText;
          kickerEl.hidden = false;
        } else {
          kickerEl.textContent = "";
          kickerEl.hidden = true;
        }
      }

      const rtLine = post.read_time
        ? lang === "ar"
          ? String(post.read_time) + " " + (tr("blogReadTimeSuffix") || "دقائق قراءة")
          : String(post.read_time) + " " + (tr("blogReadTimeSuffix") || "min read")
        : tr("blogQuickRead") || "";
      if (readTimeEl) {
        readTimeEl.textContent = rtLine;
        readTimeEl.hidden = !rtLine;
      }

      const pubIso = post.published_at || post.updated_at || "";
      if (publishedEl) {
        if (pubIso) {
          publishedEl.setAttribute("datetime", pubIso);
          publishedEl.textContent = formatPostDate(pubIso, lang);
          publishedEl.hidden = false;
        } else {
          publishedEl.textContent = "";
          publishedEl.removeAttribute("datetime");
          publishedEl.hidden = true;
        }
      }
      const sepBeforeDate = publishedEl && publishedEl.previousElementSibling;
      if (
        sepBeforeDate &&
        sepBeforeDate.classList &&
        sepBeforeDate.classList.contains("blog-post-meta-sep") &&
        publishedEl
      ) {
        sepBeforeDate.hidden = Boolean(publishedEl.hidden);
      }

      const metaSepRead = document.querySelector(".blog-post-meta-sep--read");
      if (metaSepRead) metaSepRead.style.display = rtLine ? "" : "none";

      if (pubIso) upsertMeta("property", "article:published_time", pubIso);
      if (post.updated_at || post.published_at) {
        upsertMeta("property", "article:modified_time", post.updated_at || post.published_at);
      }
      if (tagText) upsertMeta("property", "article:section", tagText);
      upsertMeta("property", "article:author", "Pearly Smile Dental Center");
      upsertMeta("name", "keywords", [tagText, headline, "dental clinic", "Pearly Smile"].filter(Boolean).join(", "));

      if (featuredFig && featuredImg) {
        if (heroUrl) {
          featuredImg.src = heroUrl;
          featuredImg.alt = headline ? headline : tr("blogPageTitle") || "";
          featuredFig.hidden = false;
        } else {
          featuredFig.hidden = true;
          featuredImg.removeAttribute("src");
        }
      }

      const bodyHtml = resolveArticleHtml(post, lang);
      if (!bodyHtml.trim()) {
        contentEl.innerHTML =
          '<div class="empty-hint">' +
          escapeHtml(tr("blogEmptyContent") || "This article has no body content yet.") +
          "</div>";
      } else {
        contentEl.innerHTML = bodyHtml;
      }

      if (relatedGrid) {
        const all = await fetchJson("/api/blog");
        const related = [];
        const wanted = Array.isArray(post.related_slugs) ? post.related_slugs.map(String) : [];
        if (wanted.length) {
          const map = new Map(all.map((p) => [String(p.slug), p]));
          wanted.forEach((s) => {
            const p = map.get(s);
            if (p && p.slug !== post.slug) related.push(p);
          });
        } else {
          (all || []).forEach((p) => {
            if (!p || p.slug === post.slug) return;
            if (post.tag && p.tag && tagsMatch(post.tag, p.tag, lang)) related.push(p);
          });
        }
        const top = related.slice(0, 4);
        relatedGrid.innerHTML = top.length
          ? top
              .map((p) => {
                const pTitle = pickLang(p.title, lang);
                const excerpt = pickLang(p.excerpt, lang);
                const pTag = pickLang(p.tag, lang);
                const coverSrc = resolveHeroImage(p) || DEFAULT_BLOG_COVER;
                const imgStyle = "background-image:url('" + coverSrc.replace(/'/g, "%27") + "')";
                return (
                  '<a class="offer-card blog-card blog-card--related" href="' +
                  escapeHtml(postUrl(p.slug)) +
                  '">' +
                  '<div class="offer-image blog-card__image" aria-hidden="true" style="' +
                  escapeHtml(imgStyle) +
                  '"></div>' +
                  '<div class="offer-content">' +
                  (pTag ? '<span class="offer-tag">' + escapeHtml(pTag) + "</span>" : "") +
                  "<h3>" +
                  escapeHtml(pTitle || "") +
                  "</h3>" +
                  "<p>" +
                  escapeHtml(excerpt || "") +
                  "</p>" +
                  '<span class="btn btn-secondary blog-card__cta">' +
                  escapeHtml(tr("blogReadMore") || "Read more") +
                  "</span>" +
                  "</div></a>"
                );
              })
              .join("")
          : '<div class="empty-hint">' + escapeHtml(tr("blogNoRelated") || "No related articles yet.") + "</div>";
      }

      if (typeof Analytics !== "undefined" && Analytics.trackEvent) {
        Analytics.trackEvent("page_view", { page: (location.pathname || "") + "" });
      }

      try {
        const pageUrl = absoluteUrl;
        const excerpt = pickLang(post.excerpt, lang) || "";
        const tagTextLd = pickLang(post.tag, lang) || "";
        const ld = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: headline,
          description: metaDesc || excerpt || "",
          image: heroUrl ? [heroUrl] : undefined,
          url: pageUrl,
          mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
          datePublished: pubIso ? pubIso : undefined,
          dateModified: post.updated_at || post.published_at || undefined,
          keywords: [tagTextLd, headline].filter(Boolean).join(", "),
          author: {
            "@type": "Organization",
            name: "Pearly Smile Dental Center",
          },
          publisher: {
            "@type": "Organization",
            name: "Pearly Smile Dental Center",
          },
          inLanguage: lang === "en" ? "en" : "ar",
        };
        let el = document.getElementById("ps-jsonld-blogpost");
        if (!el) {
          el = document.createElement("script");
          el.type = "application/ld+json";
          el.id = "ps-jsonld-blogpost";
          document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(ld);
      } catch (e) {}
    } catch (e) {
      console.error("[Pearly Blog] Failed to load article:", slug, e);
      contentEl.innerHTML =
        '<div class="empty-hint">' + escapeHtml(tr("blogNotFound") || "Article not found.") + "</div>";
    }
  }

  // Public API for global LanguageManager hook
  window.Blog = {
    refreshLanguage: function () {
      // Repaint dynamic content to match new lang
      const page = currentPageType();
      if (page === "blog") {
        setMetaDescription(tr("blogPageDescription"));
        fetchJson("/api/blog")
          .then((posts) => {
            markSameOriginBlogApi();
            renderListing(Array.isArray(posts) ? posts : []);
          })
          .catch(() => {});
      } else if (page === "blog_post") {
        renderArticle();
      }
    },
  };

  // Init
  const page = currentPageType();
  if (page === "blog") {
    setMetaDescription(tr("blogPageDescription"));
    fetchJson("/api/blog")
      .then((posts) => {
        markSameOriginBlogApi();
        renderListing(Array.isArray(posts) ? posts : []);
      })
      .catch(() => {
        const grid = document.getElementById("blogGrid");
        if (grid) grid.innerHTML = '<div class="empty-hint">' + escapeHtml(tr("blogStartApi") || "Unable to load blog posts. Start the API server.") + "</div>";
      });
  } else if (page === "blog_post") {
    function bootArticle() {
      renderArticle();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootArticle, { once: true });
    } else {
      bootArticle();
    }
  }
})();

