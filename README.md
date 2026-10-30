# Wiser — Make Every Scroll Count

A fully working, dependency-free PWA prototype: an Instagram-Reels-inspired *knowledge* feed with native vertical scrolling, interactive explanations and quizzes, personalized lesson selection, likes, bookmarks, share, speech narration, streaks, XP, daily quests, keyboard shortcuts, a 60-second five-question Brain Duel, and a searchable topic library.

## Run in 10 seconds

- **Easiest:** open `index.html` in Chrome, Safari, Edge or Firefox. The feed works without installation or a server. (Some browsers restrict local storage and speech synthesis on `file://`.)
- **Recommended locally:** run `python -m http.server 8000` from this folder, then visit `http://localhost:8000`.
- **Publish:** upload the entire folder to any static host with HTTPS (Netlify, Cloudflare Pages, Vercel, GitHub Pages, etc.). It becomes installable as a PWA in supported browsers.

## Try

1. Scroll/swipe down (or press ↓) for the next lesson.
2. Tap **Unlock the idea**, then **Test your brain**.
3. Choose an answer to earn XP, unlock achievements, and progress toward the daily quest.
4. Like or bookmark lessons. Open **Explore** to search the full 50-lesson library.
5. Open **My Progress** to view XP, accuracy and streaks.
6. Play **⚡ Brain Duel**: five questions across different topics in 60 seconds.
7. Use the **♫** action to listen to a lesson (where speech synthesis is available).

## Scope / honest limitations

This is a **working front-end product prototype**, not a launched billion-user platform. It ships with 50 carefully written evergreen educational cards. Its endless feed cycles through, reshuffles and adapts this library; it does not yet stream infinite new creator videos. Data is kept locally in the browser. There is no account login, recommendation API, creator upload, payments, cloud synchronization, moderation dashboard, video hosting, or AI fact-checking service. The original card designs and motion are generated with CSS, not third-party video clips.

## Recommended next phases

1. **Real short videos:** vertical video pipeline using licensed/original clips, creator upload, HLS/CDN, subtitle editor, production-ready media player and transcript accessibility.
2. **Trustworthy scale:** expert-reviewed content, source citations, transparent corrections, multilingual editorial workflows, author attribution and safety guardrails for health, money and other high-stakes topics.
3. **Personalization:** privacy-respecting recommendation service combining interests, explicit dislikes, topic diversity, quiz retention and novelty; prevent repetitive engagement traps.
4. **Social loop:** topic duels, collaborative learning, friend challenges, creator profiles, shareable progress cards and meaningful follow-ups.
5. **Backend & launch:** managed authentication, Postgres, queue/worker jobs, video object storage, CDN, analytics/experimentation with consent, privacy policies, accessibility testing, native apps and abuse moderation.

## Licensing

This project contains original prototype code, art, and lesson copy created for this request. No commercial rights are granted by third-party content sources; no stock footage is embedded. Google Fonts is optional and subject to its font licenses. Remove the `@import` in `styles.css` for fully offline/zero-external-request typography.
