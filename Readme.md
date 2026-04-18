## Live Demo

[https://gitlume.soynerd.co.in](https://gitlume.soynerd.co.in)

# GitLume — Project Details

[GitLume](https://gitlume.soynerd.co.in) is a fully public GitHub analytics application. Visitors can search any public GitHub username without creating an account or granting GitHub permissions.

## Core experience

- Landing page with GitHub username search and example profiles.
- Public profile dashboard at `/{username}`.
- Side-by-side public profile comparison at `/compare?left=username-a&right=username-b`.
- JSON API endpoint at `/api/profile/{username}`.
- Focused JSON endpoints for repositories, languages, contributions, profile comparison, and cache status.
- Browser-native JSON download, share control, and print-to-PDF export.
- Responsive interface for desktop and mobile.
- Dedicated profile-not-found, temporary API failure, and missing-server-token states.

## Profile information

Each profile dashboard displays public:

- Name, username, avatar, biography, location, company, website, and GitHub join year.
- Follower and following counts.
- Social-account links returned by GitHub.
- Organization memberships.
- Public repository and gist counts.
- Link to the original GitHub profile.

## Repository analytics

- Total public repositories, stars, forks, watchers, and open issues.
- Most-starred repositories, ordered by popularity.
- Repository descriptions, language, stars, forks, and popularity bars.
- Active versus archived repositories.
- Recently active repositories.
- Repository license coverage.
- Release coverage.
- Forked versus original repository counts.
- Template-repository count.
- Default-branch, Discussions, Wiki, and Projects capability data where publicly available.
- Largest repository by language-size data.
- First and newest public repositories.
- Pinned projects.
- Language distribution based on repository language-size information.

## Contribution and collaboration analytics

- GitHub contribution heatmap using real contribution-calendar days.
- Total contributions for the current contribution period.
- Current and longest contribution streaks.
- Most active weekday.
- Weekday activity chart.
- Public commit contributions.
- Pull requests opened.
- Issues opened.
- Pull-request reviews.
- Organizations and public collaboration footprint.

## Insights and achievements

- Favorite/most-used language.
- Most-starred project.
- Number of recently active projects.
- Average stars per repository.
- Deterministic achievements for star count, repository count, language diversity, streak length, and public contribution.
- Repository-health and project-story panels using factual public data only.

## Data architecture

- One server-side GitHub GraphQL query retrieves profile, organizations, repositories, language data, releases, licenses, topics, contribution calendar, pull requests, issues, reviews, gists, social links, and pinned repositories.
- `GITHUB_TOKEN` is used only on the server. It is never sent to visitors.
- Prisma stores processed analytics in PostgreSQL as JSON.
- Analytics cache entries expire after 12 hours.
- Cache reads and writes gracefully degrade if the database is temporarily unavailable, so a live GitHub response can still be served.
- Cached data is validated before use to avoid stale schema shapes after application updates.

## Database

The Prisma `AnalyticsCache` model contains:

- `username` — unique profile key.
- `data` — processed analytics JSON.
- `cachedAt` and `updatedAt` — cache timestamps.
- `expiresAt` — 12-hour freshness boundary.

## Configuration

Copy `.env.example` to `.env` and configure:

```env
GITHUB_TOKEN=""
DATABASE_URL=""
DIRECT_URL=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- `GITHUB_TOKEN` is required for GitHub GraphQL.
- `DATABASE_URL` is required for the PostgreSQL cache.
- `DIRECT_URL` is used by Prisma migrations when a provider supplies a separate non-pooled database URL.

## Commands

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
npm run build
```

## API endpoints

- `GET /api/profile/{username}` — complete processed profile payload.
- `GET /api/profile/{username}/repositories` — repositories and fork/template counts.
- `GET /api/profile/{username}/languages` — aggregated language-size data.
- `GET /api/profile/{username}/contributions` — contribution days and streaks.
- `GET /api/compare?left=user-a&right=user-b` — two public profiles in one response.
- `GET /api/cache/{username}` — cache availability and freshness metadata.

## Public-data boundaries

GitLume intentionally does not invent metrics. Some ideas from the original product notes require data GitHub does not provide as a simple, complete public user-level metric, such as historical star velocity, every commit timestamp, private activity, PR merge-time averages across external repositories, and dependency-update frequency. These can be added later through additional repository-level history collection, scheduled snapshots, or explicit authenticated access where appropriate.

### cache flow

```text
User visits /username
        │
        ▼
Lookup username in DB
        │
        ├───────────────┐
        │               │
     Not Found      Found
        │               │
        ▼               ▼
Fetch GitHub      Is cache expired?
        │               │
        ▼         ┌─────┴─────┐
Process Data      │           │
        │       No (<12h)   Yes
        ▼         │           │
Save to DB        │           ▼
(cachedAt,        │     Fetch GitHub
expiresAt)        │           │
        │         │           ▼
        └────────►│     Process Data
                  │           │
                  ▼           ▼
             Return Data  Update DB
                               │
                               ▼
                          Return Data
```

## Overall Architecture

```text
             User
               │
               ▼
        Next.js Frontend
               │
               ▼
        API Route / Server Action
               │
      ┌────────┴─────────┐
      │                  │
      ▼                  ▼
 Database/Cache     GitHub GraphQL
      │                  │
      └────────┬─────────┘
               ▼
     Analytics Processor
               │
               ▼
      Processed Analytics
               │
               ▼
           Dashboard
```
