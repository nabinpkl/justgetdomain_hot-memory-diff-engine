/** 
 * JustGetDomain_ 
 * The Logic of Discovery // 2026 
 */

const LANDING_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JustGetDomain — Available Domain Names, Already Found For You</title>
    <meta name="description" content="Stop guessing if a domain is taken. JustGetDomain recursively searches every short domain combination and hands you only the ones that are actually available. 3, 4, 5-letter domains — already checked.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://justgetdomain.com/">
    <meta property="og:title" content="JustGetDomain — Every Available Short Domain, Already Found">
    <meta property="og:description" content="We crawl every 3, 4, and 5-letter domain so you don't have to. Browse only what's available. No guessing, no taken results, no frustration.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://justgetdomain.com/">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Instrument+Serif&display=swap" rel="stylesheet">
    
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='80' fill='%23050505'/%3E%3Ctext x='105' y='340' font-family='Courier New,monospace' font-weight='700' font-size='280' fill='%2300ff41' letter-spacing='-15'%3E%26gt;_%3C/text%3E%3Ccircle cx='385' cy='375' r='20' fill='%2300ff41'/%3E%3C/svg%3E">

    <style>
        :root {
            --bg: #050505;
            --surface: #0a0a0a;
            --text: #f2f2f2;
            --dim: #b0b0b0;
            --accent: #00ff41;
            --accent-dim: rgba(0,255,65,0.08);
            --accent-mid: rgba(0,255,65,0.25);
            --border: #2a2a2a;
            --red: #ff4444;
            --mono: 'JetBrains Mono', monospace;
            --serif: 'Instrument Serif', Georgia, serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
            background: var(--bg);
            color: var(--text);
            font-family: var(--mono);
            line-height: 1.7;
            overflow-x: hidden;
        }

        .topbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 32px;
            background: rgba(5,5,5,0.85);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--border);
            font-size: 0.7rem;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }
        .topbar .logo { color: var(--accent); font-weight: 700; }
        .topbar .status {
            color: var(--dim);
            display: flex; align-items: center; gap: 8px;
        }
        .topbar .status::before {
            content: '';
            width: 6px; height: 6px;
            background: var(--accent);
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--accent-mid); }
            50% { opacity: 0.6; box-shadow: 0 0 0 6px transparent; }
        }

        .container { max-width: 820px; margin: 0 auto; padding: 0 24px; }

        /* ── HERO ── */
        .hero {
            min-height: 100vh;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            text-align: center;
            padding-top: 60px;
            position: relative;
        }
        .hero::before {
            content: '';
            position: absolute; inset: 0;
            background:
                radial-gradient(ellipse 600px 400px at 50% 40%, rgba(0,255,65,0.04), transparent),
                radial-gradient(ellipse 300px 300px at 70% 60%, rgba(0,255,65,0.02), transparent);
            pointer-events: none;
        }
        .hero h1 {
            font-family: var(--serif);
            font-size: clamp(3rem, 10vw, 6.5rem);
            font-weight: 400;
            letter-spacing: -3px;
            line-height: 1;
            margin-bottom: 12px;
            position: relative;
        }
        .hero h1 .dot { color: var(--accent); }
        .hero .sub {
            font-size: 0.72rem;
            color: var(--dim);
            letter-spacing: 6px;
            text-transform: uppercase;
            margin-bottom: 48px;
        }
        .hero .pitch {
            max-width: 540px;
            color: var(--dim);
            font-size: 0.88rem;
            line-height: 1.9;
        }
        .hero .pitch strong { color: var(--text); font-weight: 400; }

        /* Terminal demo */
        .terminal {
            margin-top: 56px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            width: 100%;
            max-width: 560px;
            text-align: left;
            overflow: hidden;
            box-shadow: 0 40px 80px rgba(0,0,0,0.5);
        }
        .terminal-bar {
            padding: 10px 14px;
            border-bottom: 1px solid var(--border);
            display: flex; align-items: center; gap: 6px;
        }
        .terminal-bar span {
            width: 10px; height: 10px; border-radius: 50%;
            background: var(--border);
        }
        .terminal-bar .title {
            flex: 1; text-align: center;
            font-size: 0.65rem; color: var(--dim);
            letter-spacing: 1px; text-transform: uppercase;
        }
        .terminal-body {
            padding: 20px;
            font-size: 0.8rem;
            min-height: 200px;
        }
        .terminal-body .line { margin: 2px 0; white-space: pre; }
        .terminal-body .prompt { color: var(--accent); }
        .terminal-body .comment { color: #5fa85f; font-style: italic; }
        .terminal-body .available { color: var(--accent); }
        .terminal-body .scanning { color: #888; }
        .terminal-body .gap { height: 12px; }
        .cursor-blink {
            display: inline-block;
            width: 8px; height: 16px;
            background: var(--accent);
            vertical-align: text-bottom;
            animation: blink 1s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }

        /* ── SECTIONS ── */
        section.content-block {
            padding: 120px 0;
            border-top: 1px solid var(--border);
        }
        .section-label {
            font-size: 0.65rem;
            color: var(--dim);
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-bottom: 24px;
        }
        h2 {
            font-family: var(--serif);
            font-size: clamp(1.8rem, 4vw, 2.8rem);
            font-weight: 400;
            letter-spacing: -1px;
            margin-bottom: 32px;
            line-height: 1.2;
        }
        .prose {
            color: var(--dim);
            font-size: 0.88rem;
            max-width: 600px;
            line-height: 1.9;
        }
        .prose + .prose { margin-top: 20px; }
        .prose strong { color: var(--text); font-weight: 400; }

        /* Two audiences */
        .audiences {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px;
            background: var(--border);
            margin-top: 56px;
            border: 1px solid var(--border);
        }
        .audience {
            background: var(--bg);
            padding: 36px 28px;
        }
        .audience .label {
            font-size: 0.6rem;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 16px;
        }
        .audience h3 {
            font-family: var(--serif);
            font-size: 1.3rem;
            font-weight: 400;
            margin-bottom: 12px;
        }
        .audience p {
            color: var(--dim);
            font-size: 0.78rem;
            line-height: 1.8;
        }

        /* How it works — depth steps */
        .steps {
            margin-top: 56px;
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .step {
            display: grid;
            grid-template-columns: 80px 1fr;
            gap: 0;
            border-top: 1px solid var(--border);
            padding: 28px 0;
        }
        .step:last-child { border-bottom: 1px solid var(--border); }
        .step .depth {
            font-size: 2rem;
            font-family: var(--serif);
            color: var(--accent);
            opacity: 0.7;
        }
        .step h3 {
            font-size: 0.9rem;
            margin-bottom: 6px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .step p {
            color: var(--dim);
            font-size: 0.78rem;
            line-height: 1.7;
        }

        /* Feature grid */
        .features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: var(--border);
            margin-top: 56px;
            border: 1px solid var(--border);
        }
        .feature {
            background: var(--bg);
            padding: 32px 24px;
        }
        .feature .num {
            font-size: 0.6rem;
            color: var(--accent);
            margin-bottom: 12px;
            letter-spacing: 2px;
        }
        .feature h3 {
            font-family: var(--serif);
            font-size: 1.15rem;
            font-weight: 400;
            margin-bottom: 10px;
        }
        .feature p {
            color: var(--dim);
            font-size: 0.78rem;
            line-height: 1.7;
        }

        /* CTA */
        .cta-section {
            text-align: center;
            padding: 140px 0;
            border-top: 1px solid var(--border);
            position: relative;
        }
        .cta-section::before {
            content: '';
            position: absolute;
            bottom: 0; left: 50%;
            transform: translateX(-50%);
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(0,255,65,0.03), transparent 70%);
            pointer-events: none;
        }
        .cta-section h2 { margin-bottom: 16px; }
        .cta-section .prose { margin: 0 auto 40px; text-align: center; }
        .waitlist-form {
            display: flex;
            gap: 0;
            max-width: 440px;
            margin: 0 auto;
            border: 1px solid var(--border);
            border-radius: 4px;
            overflow: hidden;
            transition: border-color 0.3s;
        }
        .waitlist-form:focus-within { border-color: var(--accent); }
        .waitlist-form input {
            flex: 1;
            padding: 14px 16px;
            background: var(--surface);
            border: none;
            color: var(--text);
            font-family: var(--mono);
            font-size: 0.82rem;
            outline: none;
        }
        .waitlist-form input::placeholder { color: #666; }
        .waitlist-form button {
            padding: 14px 24px;
            background: var(--accent);
            color: #000;
            border: none;
            font-family: var(--mono);
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .waitlist-form button:hover { background: #00cc34; }

        footer {
            padding: 40px 0;
            text-align: center;
            font-size: 0.65rem;
            color: #777;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-top: 1px solid var(--border);
        }

        .fade-up {
            opacity: 0;
            transform: translateY(24px);
            animation: fadeUp 0.8s ease forwards;
        }
        .fade-up:nth-child(2) { animation-delay: 0.15s; }
        .fade-up:nth-child(3) { animation-delay: 0.3s; }
        .fade-up:nth-child(4) { animation-delay: 0.45s; }
        @keyframes fadeUp {
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
            .features { grid-template-columns: 1fr; }
            .audiences { grid-template-columns: 1fr; }
            .topbar { padding: 12px 16px; }
            .waitlist-form { flex-direction: column; }
            .waitlist-form button { padding: 14px; }
            .step { grid-template-columns: 48px 1fr; }
        }
    </style>

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "JustGetDomain",
        "url": "https://justgetdomain.com",
        "description": "Recursively discovers every available short domain name so you don't have to search one by one. Browse 3, 4, and 5-letter domains that are actually available.",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/PreOrder"
        }
    }
    </script>
</head>
<body>

    <nav class="topbar" role="navigation" aria-label="Main">
        <div class="logo">JustGetDomain</div>
        <div class="status">Launching Soon</div>
    </nav>

    <!-- Hero -->
    <header class="hero" id="home">
        <div class="container" style="display:flex;flex-direction:column;align-items:center;">
            <h1 class="fade-up">JustGet<br>Domain<span class="dot">.</span></h1>
            <p class="sub fade-up">Every available short domain. Already found.</p>
            <p class="pitch fade-up">
                We don't wait for you to search. We've already checked every 3, 4, and 5-letter domain and filtered out the taken ones. <strong>You only see what you can actually register.</strong>
            </p>

            <div class="terminal fade-up" role="img" aria-label="Demo showing recursive domain scanning">
                <div class="terminal-bar">
                    <span></span><span></span><span></span>
                    <div class="title">recursive scan</div>
                </div>
                <div class="terminal-body" id="term"></div>
            </div>
        </div>
    </header>

    <!-- The Problem -->
    <section class="content-block" id="problem">
        <div class="container">
            <div class="section-label">The problem</div>
            <h2>You shouldn't have to<br>guess domain names</h2>
            <p class="prose">
                The current workflow is broken. You think of a name, type it into a registrar, see "taken," think of another, see "taken" again, repeat forty times, settle for something you don't love, or give up entirely. Chatbots aren't better — they'll happily suggest names that have been registered since 2004.
            </p>
            <p class="prose">
                <strong>JustGetDomain inverts the process.</strong> Instead of you guessing and us checking, we check everything first and hand you the results. Every available short domain, pre-verified, browsable.
            </p>

            <div class="audiences">
                <div class="audience">
                    <div class="label">Audience 01</div>
                    <h3>"I know what I want"</h3>
                    <p>You have a name in mind but it's taken. You need close variations — different lengths, real words, alternate TLDs — that are actually available right now. No more guessing.</p>
                </div>
                <div class="audience">
                    <div class="label">Audience 02</div>
                    <h3>"Just show me what's open"</h3>
                    <p>You're tired of the search-reject-repeat loop. You want to browse available domains like a catalog and pick one that clicks. We give you the exhaustive list — only available names, nothing taken.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- How it works -->
    <section class="content-block" id="how">
        <div class="container">
            <div class="section-label">How it works</div>
            <h2>Senseful discovery,<br>not blind search</h2>
            <p class="prose">
                We start at short letters and work outward. Every combination gets checked. Taken names get discarded. What's left is yours to browse — an exhaustive, living index of domains that are actually available to register.
            </p>

            <div class="steps">
                <div class="step">
                    <div class="depth">3</div>
                    <div>
                        <h3>Three-letter sweep</h3>
                        <p>Every 3-letter combination across major TLDs. The rarest, most premium namespace — we surface every available one.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="depth">4</div>
                    <div>
                        <h3>Four-letter expansion</h3>
                        <p>The sweet spot for brandable names. Dictionary words, abbreviations, pronounceable combos — filtered to only what's open.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="depth">5</div>
                    <div>
                        <h3>Five-letter deep scan</h3>
                        <p>Real words, compound fragments, memorable slugs. The widest net, still filtered down to zero noise — every result is registrable.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Strategy / Roadmap -->
    <section class="content-block" id="strategy">
        <div class="container">
            <div class="section-label">The approach</div>

            <div class="features">
                <article class="feature">
                    <div class="num">01</div>
                    <h3>Pre-checked</h3>
                    <p>Every domain you see has been verified available. No "taken" results, ever. That's the whole point.</p>
                </article>
                <article class="feature">
                    <div class="num">02</div>
                    <h3>No front-running</h3>
                    <p>We don't register, hold, or broker names. We index availability. Your searches stay private and stateless.</p>
                </article>
                <article class="feature">
                    <div class="num">03</div>
                    <h3>Exhaustive</h3>
                    <p>Not a sample, not "top picks." The full list of available domains at each length. Browse all of it.</p>
                </article>
            </div>
        </div>
    </section>

    <!-- CTA -->
    <section class="cta-section" id="waitlist">
        <div class="container">
            <h2>Get early access(Not working now connect with me on linked in for business opportunities)</h2>
            <p class="prose">We'll let you know when the index goes live. No spam.</p>
            <form class="waitlist-form" aria-label="Waitlist signup" onsubmit="return false;">
                <input type="email" placeholder="you@example.com" aria-label="Email address" required>
                <button type="submit">Notify me</button>
            </form>
        </div>
    </section>

    <center>
      <p>Connect with me on linkedin: <a href="https://linkedin.com/in/nabin-pokhrel">Nabin Pokhrel</a></p>
    <center>
    <br />
    <footer>
        <p>&copy; 2026 JustGetDomain</p>
    </footer>

    <script>
        const lines = [
            { cls: 'comment',   text: '# scanning 3-letter .com domains...', delay: 0 },
            { cls: 'scanning',  text: '  aaa ✗  aab ✗  aac ✗  aad ✗  aae ✗', delay: 400 },
            { cls: 'scanning',  text: '  ...scanning...', delay: 700 },
            { cls: 'available', text: '  ✓ bxq.com              available', delay: 1100 },
            { cls: 'available', text: '  ✓ fwj.com              available', delay: 1350 },
            { cls: 'gap',      text: '', delay: 1500 },
            { cls: 'comment',   text: '# expanding to 4-letter dictionary words...', delay: 1700 },
            { cls: 'scanning',  text: '  apex ✗  bold ✗  calm ✗  dart ✗', delay: 2100 },
            { cls: 'available', text: '  ✓ flux.dev             available', delay: 2500 },
            { cls: 'available', text: '  ✓ grit.sh              available', delay: 2700 },
            { cls: 'available', text: '  ✓ plow.io              available', delay: 2900 },
            { cls: 'gap',      text: '', delay: 3100 },
            { cls: 'comment',   text: '# going deeper — 5 letters...', delay: 3300 },
            { cls: 'scanning',  text: '  blaze ✗  crane ✗  drift ✗', delay: 3600 },
            { cls: 'available', text: '  ✓ gleam.dev            available', delay: 4000 },
            { cls: 'available', text: '  ✓ stoic.sh             available', delay: 4200 },
            { cls: 'gap',      text: '', delay: 4400 },
            { cls: 'prompt',    text: '  7 domains found. 0 taken shown.', delay: 4700 },
            { cls: 'cursor',    text: '', delay: 5000 },
        ];

        const term = document.getElementById('term');
        lines.forEach((l) => {
            setTimeout(() => {
                if (l.cls === 'cursor') {
                    const div = document.createElement('div');
                    div.className = 'prompt';
                    div.innerHTML = '$ <span class="cursor-blink"></span>';
                    term.appendChild(div);
                    return;
                }
                if (l.cls === 'gap') {
                    const div = document.createElement('div');
                    div.style.height = '12px';
                    term.appendChild(div);
                    return;
                }
                const div = document.createElement('div');
                div.className = 'line ' + l.cls;
                div.textContent = l.text;
                term.appendChild(div);
            }, l.delay);
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.opacity = '1';
                    e.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('.content-block, .cta-section').forEach(s => {
            s.style.opacity = '0';
            s.style.transform = 'translateY(32px)';
            s.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            observer.observe(s);
        });
    </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const domain = "justgetdomain.com";

    // 1. Robots.txt (Automated SEO)
    if (url.pathname === "/robots.txt") {
      return new Response(`User-agent: *\nAllow: /\nSitemap: https://${domain}/sitemap.xml`, {
        headers: { "content-type": "text/plain" }
      });
    }

    // 2. Sitemap.xml (AI Crawler Ready)
    if (url.pathname === "/sitemap.xml") {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://sitemaps.org">
        <url>
          <loc>https://\${domain}/</loc>
          <lastmod>\${new Date().toISOString().split('T')[0]}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>1.0</priority>
        </url>
      </urlset>`;
      return new Response(sitemap, { headers: { "content-type": "application/xml" } });
    }

    // 3. Serve the Landing Page variable
    return new Response(LANDING_PAGE, {
      headers: { "content-type": "text/html;charset=UTF-8" }
    });
  }
};
