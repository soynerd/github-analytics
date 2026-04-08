import { GithubRepo, GithubUser, ProfileAnalytics } from "../lib/github";
import { SearchBox } from "./search-box";
import { ExportControls } from "./export-controls";

const palette = [
  "#df7f61",
  "#e5ba5a",
  "#6f9d95",
  "#a082c5",
  "#90a7d9",
  "#a7b1b4",
];
const typeFromRepo = (repo: GithubRepo) => repo.language || "Other";
const short = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export function Dashboard({
  user,
  repos,
  contributions,
  totalContributions,
  totalCommits,
  contributionPullRequests,
  contributionIssues,
  reviews,
  currentStreak,
  longestStreak,
  mostActiveDay,
  pullRequests,
  issues,
  pinned,
  forkedRepositoryCount,
  templateRepositoryCount,
}: ProfileAnalytics) {
  const stars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const forks = repos.reduce((sum, r) => sum + r.forks_count, 0);
  const top = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);
  const languageMap = repos.reduce<Record<string, number>>((acc, repo) => {
    const key = typeFromRepo(repo);
    acc[key] = (acc[key] || 0) + Math.max(repo.size, 1);
    return acc;
  }, {});
  const languages = Object.entries(languageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalSize = languages.reduce((sum, [, value]) => sum + value, 0) || 1;
  const primary = languages[0]?.[0] || "No language data";
  const joined = new Date(user.created_at).getFullYear();
  const heatCells = contributions;
  const maxStars = Math.max(...top.map((r) => r.stargazers_count), 1);
  const bio =
    user.bio || "Building in public, one thoughtful commit at a time.";
  const totalWatchers = repos.reduce((sum, repo) => sum + repo.watchers, 0);
  const openIssues = repos.reduce((sum, repo) => sum + repo.openIssues, 0);
  const newest = [...repos].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const oldest = [...repos].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const largest = [...repos].sort((a, b) => b.size - a.size)[0];
  const maintained = repos.filter((repo) => new Date(repo.updated_at).getTime() > Date.now() - 365 * 86400000).length;
  const licensed = repos.filter((repo) => repo.license).length;
  const released = repos.filter((repo) => repo.releases > 0).length;

  return (
    <main className="dashboard">
      <header className="dash-nav">
        <a className="brand" href="/">
          <span className="brand-mark">⌁</span> gitlume
        </a>
        <SearchBox compact />
        <a
          className="github-link"
          href={user.html_url}
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub ↗
        </a>
      </header>
      <section className="profile-head">
        <img src={user.avatar_url} alt="" className="avatar" />
        <div className="profile-copy">
          <div className="profile-title">
            <div>
              <p className="eyebrow">
                <i /> DEVELOPER PROFILE
              </p>
              <h1>{user.name || user.login}</h1>
              <span className="handle">@{user.login}</span>
            </div>
            <a
              href={user.html_url}
              target="_blank"
              rel="noreferrer"
              className="follow"
            >
              Follow <span>↗</span>
            </a>
          </div>
          <p className="bio">{bio}</p>
          <div className="details">
            {user.location && <span>⌖ {user.location}</span>}
            {user.company && <span>◫ {user.company.replace(/^@/, "")}</span>}
            {user.blog && (
              <a
                href={
                  user.blog.startsWith("http")
                    ? user.blog
                    : `https://${user.blog}`
                }
              >
                ↗ {user.blog.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span>◎ GitHub since {joined}</span>
            {user.social.map((account) => <a key={account.url} href={account.url} target="_blank" rel="noreferrer">{account.provider} ↗</a>)}
          </div>
        </div>
      </section>
      <section className="stat-grid">
        <Stat label="Public repos" value={user.public_repos} icon="◫" />
        <Stat label="Stars earned" value={short(stars)} icon="✦" />
        <Stat label="Followers" value={short(user.followers)} icon="◌" />
        <Stat label="Forks" value={short(forks)} icon="⑂" />
        <Stat label="Public commits" value={short(totalCommits)} icon="⌘" />
        <Stat label="PRs opened" value={short(contributionPullRequests || pullRequests)} icon="↗" />
        <Stat label="Issues opened" value={short(contributionIssues || issues)} icon="○" />
        <Stat label="Reviews" value={short(reviews)} icon="✓" />
      </section>
      <section className="section-heading">
        <div>
          <p className="eyebrow">
            <i /> CONTRIBUTION RHYTHM
          </p>
          <h2>A year of momentum</h2>
        </div>
        <span className="soft-label">Activity estimate · Public events</span>
      </section>
      <section className="contribution card">
        <div className="heatmap-wrap">
          <div className="months">
            <span>Aug</span>
            <span>Oct</span>
            <span>Dec</span>
            <span>Feb</span>
            <span>Apr</span>
            <span>Jun</span>
          </div>
          <div className="heatmap">
            <div className="day-labels">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className="squares">
              {heatCells.map((day, index) => (
                <i
                  title={`${day.date}: ${day.count} contributions`}
                  key={index}
                  className={`heat h${day.level}`}
                />
              ))}
            </div>
          </div>
          <div className="heat-legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <i className={`heat h${n}`} key={n} />
            ))}
            <span>More</span>
          </div>
        </div>
        <aside className="momentum">
          <Metric value={`${currentStreak} days`} label="Current streak" />
          <Metric value={`${longestStreak} days`} label="Longest streak" />
          <Metric value={short(totalContributions)} label="Contributions" />
          <Metric value={mostActiveDay} label="Most active day" />
        </aside>
      </section>
      <section className="content-grid">
        <div className="card languages">
          <div className="card-title">
            <div>
              <p className="eyebrow">
                <i /> LANGUAGE MIX
              </p>
              <h2>Built with intention</h2>
            </div>
            <span className="muted">
              {Object.keys(languageMap).length} languages
            </span>
          </div>
          <div className="language-content">
            <div
              className="donut"
              style={{
                background: `conic-gradient(${languages.map(([name, value], i) => `${palette[i]} 0 ${(languages.slice(0, i + 1).reduce((sum, [, v]) => sum + v, 0) / totalSize) * 100}%`).join(", ")})`,
              }}
            >
              <div>
                <strong>
                  {Math.round(((languages[0]?.[1] || 0) / totalSize) * 100)}%
                </strong>
                <span>top language</span>
              </div>
            </div>
            <div className="legend">
              {languages.map(([name, value], i) => (
                <div key={name}>
                  <i style={{ background: palette[i] }} />
                  <span>{name}</span>
                  <b>{Math.round((value / totalSize) * 100)}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card insights">
          <div className="card-title">
            <div>
              <p className="eyebrow">
                <i /> AT A GLANCE
              </p>
              <h2>Signals worth noticing</h2>
            </div>
          </div>
          <div className="insight-list">
            <Insight
              icon="⌘"
              text={
                <>
                  <b>{primary}</b> leads the way across public projects.
                </>
              }
            />
            <Insight
              icon="✦"
              text={
                <>
                  <b>{top[0]?.name || "Your work"}</b> is the most-starred
                  repository.
                </>
              }
            />
            <Insight
              icon="◷"
              text={
                <>
                  <b>
                    {
                      repos.filter(
                        (r) =>
                          new Date(r.updated_at).getFullYear() >=
                          new Date().getFullYear() - 1,
                      ).length
                    }{" "}
                    projects
                  </b>{" "}
                  were active in the past year.
                </>
              }
            />
            <Insight
              icon="◌"
              text={
                <>
                  An average of{" "}
                  <b>
                    {repos.length ? (stars / repos.length).toFixed(1) : 0} stars
                  </b>{" "}
                  per repository.
                </>
              }
            />
          </div>
        </div>
      </section>
      <section className="section-heading repo-heading">
        <div>
          <p className="eyebrow">
            <i /> REPOSITORY SPOTLIGHT
          </p>
          <h2>The work people notice</h2>
        </div>
        <span className="soft-label">Sorted by popularity</span>
      </section>
      <section className="repositories">
        {top.length ? (
          top.map((repo, index) => (
            <article className="repo card" key={repo.id}>
              <div className="repo-top">
                <span className="rank">0{index + 1}</span>
                <a href={repo.html_url} target="_blank" rel="noreferrer">
                  {repo.name} <small>↗</small>
                </a>
                <span className="language-dot">
                  <i style={{ background: palette[index % palette.length] }} />
                  {typeFromRepo(repo)}
                </span>
              </div>
              <p>
                {repo.description || "A public project from this developer."}
              </p>
              <div className="repo-bottom">
                <span>✦ {short(repo.stargazers_count)}</span>
                <span>⑂ {short(repo.forks_count)}</span>
                <div className="repo-bar">
                  <i
                    style={{
                      width: `${Math.max((repo.stargazers_count / maxStars) * 100, 3)}%`,
                    }}
                  />
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty card">
            This profile has no public repositories yet.
          </div>
        )}
      </section>
      <section className="content-grid extra-grid">
        <div className="card activity-card">
          <div className="card-title">
            <div>
              <p className="eyebrow">
                <i /> ACTIVITY PATTERN
              </p>
              <h2>When momentum happens</h2>
            </div>
          </div>
          <div className="weekday-bars">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (name, index) => {
                const count = contributions
                  .filter((d) => d.weekday === index)
                  .reduce((sum, d) => sum + d.count, 0);
                const max = Math.max(
                  ...[0, 1, 2, 3, 4, 5, 6].map((day) =>
                    contributions
                      .filter((d) => d.weekday === day)
                      .reduce((sum, item) => sum + item.count, 0),
                  ),
                  1,
                );
                return (
                  <div key={name}>
                    <i
                      style={{ height: `${Math.max(8, (count / max) * 100)}%` }}
                    />
                    <span>{name}</span>
                  </div>
                );
              },
            )}
          </div>
        </div>
        <div className="card achievements">
          <div className="card-title">
            <div>
              <p className="eyebrow">
                <i /> ACHIEVEMENTS
              </p>
              <h2>Milestones unlocked</h2>
            </div>
          </div>
          <div className="badge-list">
            {stars >= 100 && (
              <Badge icon="✦" name="Star power" text="100+ stars" />
            )}
            {repos.length >= 10 && (
              <Badge icon="◫" name="Builder" text="10+ repositories" />
            )}
            {Object.keys(languageMap).length >= 5 && (
              <Badge icon="◌" name="Polyglot" text="5+ languages" />
            )}
            {longestStreak >= 30 && (
              <Badge icon="♨" name="On fire" text="30-day streak" />
            )}
            {repos.length > 0 && (
              <Badge icon="↗" name="Open source" text="Public contributor" />
            )}
          </div>
        </div>
      </section>
      <section className="content-grid extra-grid">
        <div className="card health-card">
          <div className="card-title"><div><p className="eyebrow"><i /> REPOSITORY HEALTH</p><h2>A strong public footprint</h2></div></div>
          <div className="health-list">
            <Health label="Active in the last year" value={`${maintained} / ${repos.length}`} />
            <Health label="Repositories with a license" value={`${licensed} / ${repos.length}`} />
            <Health label="Repositories with releases" value={`${released} / ${repos.length}`} />
            <Health label="Open issues across projects" value={String(openIssues)} />
            <Health label="Watchers across projects" value={short(totalWatchers)} />
            <Health label="Forked vs original projects" value={`${forkedRepositoryCount} / ${repos.length}`} />
            <Health label="Template repositories" value={String(templateRepositoryCount)} />
            <Health label="Discussions enabled" value={String(repos.filter((repo) => repo.discussions).length)} />
            <Health label="Wikis enabled" value={String(repos.filter((repo) => repo.wiki).length)} />
          </div>
        </div>
        <div className="card fun-card">
          <div className="card-title"><div><p className="eyebrow"><i /> PROJECT STORY</p><h2>Small details, big picture</h2></div></div>
          <div className="health-list">
            <Health label="First repository" value={oldest?.name || "—"} />
            <Health label="Newest repository" value={newest?.name || "—"} />
            <Health label="Largest repository" value={largest ? `${largest.name} · ${(largest.size / 1024).toFixed(1)} MB` : "—"} />
            <Health label="Public gists" value={String(user.public_gists)} />
            <Health label="Pinned projects" value={pinned.length ? pinned.join(", ") : "None"} />
          </div>
        </div>
      </section>
      {user.organizations.length > 0 && (
        <section className="org-section">
          <p className="eyebrow">
            <i /> ORGANIZATIONS
          </p>
          <div className="orgs">
            {user.organizations.map((org) => (
              <a
                href={`https://github.com/${org.login}`}
                target="_blank"
                rel="noreferrer"
                className="org card"
                key={org.login}
              >
                <img src={org.avatarUrl} alt="" />
                {org.login}
                <span>↗</span>
              </a>
            ))}
          </div>
        </section>
      )}
      <footer className="dash-footer">
        <span>Cached for 12 hours · Based on public GitHub information</span>
        <ExportControls username={user.login} />
        <a href="/">Analyze another profile →</a>
      </footer>
    </main>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <article className="stat card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function Insight({ icon, text }: { icon: string; text: React.ReactNode }) {
  return (
    <div className="insight">
      <i>{icon}</i>
      <p>{text}</p>
    </div>
  );
}
function Badge({
  icon,
  name,
  text,
}: {
  icon: string;
  name: string;
  text: string;
}) {
  return (
    <div className="badge">
      <i>{icon}</i>
      <b>{name}</b>
      <span>{text}</span>
    </div>
  );
}
function Health({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><b>{value}</b></div>;
}
