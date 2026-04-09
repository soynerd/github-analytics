import { prisma } from "./db";
import { ContributionDay, streaks, topWeekday } from "./analytics";

export type GithubUser = { login: string; name: string | null; avatar_url: string; bio: string | null; location: string | null; blog: string; company: string | null; followers: number; following: number; public_repos: number; public_gists: number; created_at: string; html_url: string; organizations: { login: string; avatarUrl: string }[]; social: { provider: string; url: string }[] };
export type GithubRepo = { id: string; name: string; description: string | null; html_url: string; stargazers_count: number; forks_count: number; watchers: number; language: string | null; languageColor: string | null; size: number; updated_at: string; created_at: string; fork: boolean; archived: boolean; template: boolean; discussions: boolean; wiki: boolean; projects: boolean; defaultBranch: string | null; openIssues: number; license: string | null; topics: string[]; releases: number };
export type ProfileAnalytics = { user: GithubUser; repos: GithubRepo[]; forkedRepositoryCount: number; templateRepositoryCount: number; contributions: ContributionDay[]; totalContributions: number; totalCommits: number; contributionPullRequests: number; contributionIssues: number; reviews: number; currentStreak: number; longestStreak: number; mostActiveDay: string; pullRequests: number; issues: number; pinned: string[]; cachedAt: string };

const query = `query ProfileAnalytics($login: String!) {
  user(login: $login) {
    login name avatarUrl bio location websiteUrl company createdAt url socialAccounts(first: 10) { nodes { provider url } } gists(privacy: PUBLIC) { totalCount }
    followers { totalCount } following { totalCount }
    organizations(first: 20) { nodes { login avatarUrl } }
    repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount nodes { id name description url stargazerCount forkCount diskUsage updatedAt createdAt isFork isArchived isTemplate hasDiscussionsEnabled hasWikiEnabled hasProjectsEnabled defaultBranchRef { name } watchers { totalCount } licenseInfo { spdxId name } releases(first: 1) { totalCount } repositoryTopics(first: 20) { nodes { topic { name } } }
        primaryLanguage { name color } issues(states: OPEN) { totalCount }
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } }
      }
    }
    pullRequests { totalCount } issues { totalCount }
    pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name } } }
    contributionsCollection { totalCommitContributions totalIssueContributions totalPullRequestContributions pullRequestReviewContributions { totalCount } contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel weekday } } } }
  }
}`;

type RawUser = Record<string, unknown>;
function normalize(raw: RawUser): ProfileAnalytics {
  const repositoryRoot = raw.repositories as { totalCount: number; nodes: RawUser[] };
  const allRepos = repositoryRoot.nodes.map(repo => {
    const primary = repo.primaryLanguage as { name: string; color: string } | null;
    const languageEdges = (repo.languages as { edges: { size: number; node: { name: string; color: string } }[] }).edges;
    return { id: String(repo.id), name: String(repo.name), description: repo.description as string | null, html_url: String(repo.url), stargazers_count: Number(repo.stargazerCount), forks_count: Number(repo.forkCount), watchers: Number((repo.watchers as { totalCount: number }).totalCount), language: primary?.name ?? languageEdges[0]?.node.name ?? null, languageColor: primary?.color ?? languageEdges[0]?.node.color ?? null, size: languageEdges.reduce((total, edge) => total + edge.size, 0) || Number(repo.diskUsage), updated_at: String(repo.updatedAt), created_at: String(repo.createdAt), fork: Boolean(repo.isFork), archived: Boolean(repo.isArchived), template: Boolean(repo.isTemplate), discussions: Boolean(repo.hasDiscussionsEnabled), wiki: Boolean(repo.hasWikiEnabled), projects: Boolean(repo.hasProjectsEnabled), defaultBranch: (repo.defaultBranchRef as { name?: string } | null)?.name ?? null, openIssues: Number((repo.issues as { totalCount: number }).totalCount), license: ((repo.licenseInfo as { spdxId?: string; name?: string } | null)?.spdxId || (repo.licenseInfo as { name?: string } | null)?.name || null), topics: ((repo.repositoryTopics as { nodes: { topic: { name: string } }[] }).nodes).map(node => node.topic.name), releases: Number((repo.releases as { totalCount: number }).totalCount) };
  });
  const repos = allRepos.filter(repo => !repo.fork);
  const days = ((raw.contributionsCollection as { contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string; weekday: number }[] }[] } }).contributionCalendar.weeks).flatMap(week => week.contributionDays).map(day => ({ date: day.date, count: day.contributionCount, level: ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"].indexOf(day.contributionLevel), weekday: day.weekday }));
  const { current, longest } = streaks(days);
  const collection = raw.contributionsCollection as { totalCommitContributions: number; totalIssueContributions: number; totalPullRequestContributions: number; pullRequestReviewContributions: { totalCount: number }; contributionCalendar: { totalContributions: number } };
  return { user: { login: String(raw.login), name: raw.name as string | null, avatar_url: String(raw.avatarUrl), bio: raw.bio as string | null, location: raw.location as string | null, blog: String(raw.websiteUrl || ""), company: raw.company as string | null, followers: Number((raw.followers as { totalCount: number }).totalCount), following: Number((raw.following as { totalCount: number }).totalCount), public_repos: repositoryRoot.totalCount, public_gists: Number((raw.gists as { totalCount: number }).totalCount), created_at: String(raw.createdAt), html_url: String(raw.url), organizations: ((raw.organizations as { nodes: { login: string; avatarUrl: string }[] }).nodes), social: ((raw.socialAccounts as { nodes: { provider: string; url: string }[] }).nodes) }, repos, forkedRepositoryCount: allRepos.filter(repo => repo.fork).length, templateRepositoryCount: allRepos.filter(repo => repo.template).length, contributions: days, totalContributions: collection.contributionCalendar.totalContributions, totalCommits: collection.totalCommitContributions, contributionPullRequests: collection.totalPullRequestContributions, contributionIssues: collection.totalIssueContributions, reviews: collection.pullRequestReviewContributions.totalCount, currentStreak: current, longestStreak: longest, mostActiveDay: topWeekday(days), pullRequests: Number((raw.pullRequests as { totalCount: number }).totalCount), issues: Number((raw.issues as { totalCount: number }).totalCount), pinned: ((raw.pinnedItems as { nodes: { name: string }[] }).nodes).map(node => node.name), cachedAt: new Date().toISOString() };
}

async function graphQL(username: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("MISSING_GITHUB_TOKEN");
  const response = await fetch("https://api.github.com/graphql", { method: "POST", headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables: { login: username } }), cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  const payload = await response.json() as { data?: { user?: RawUser | null }; errors?: { type?: string; message: string }[] };
  if (payload.errors?.length) throw new Error(payload.errors[0].type === "NOT_FOUND" ? "404" : payload.errors[0].message);
  if (!payload.data?.user) throw new Error("404");
  return normalize(payload.data.user);
}

export async function getProfile(username: string): Promise<ProfileAnalytics> {
  const key = username.toLowerCase();
  const now = new Date();
  if (process.env.DATABASE_URL) {
    try {
      const cached = await prisma.analyticsCache.findUnique({ where: { username: key } });
      const cachedData = cached?.data as { user?: { social?: unknown }; totalCommits?: unknown; forkedRepositoryCount?: unknown; repos?: { id?: unknown; template?: unknown }[] } | undefined;
      if (cached && cached.expiresAt > now && Array.isArray(cachedData?.user?.social) && typeof cachedData.totalCommits === "number" && typeof cachedData.forkedRepositoryCount === "number" && cachedData.repos?.every((repo) => typeof repo.id === "string" && typeof repo.template === "boolean")) return cached.data as unknown as ProfileAnalytics;
    } catch { /* cache gracefully degrades if database is unavailable */ }
  }
  const data = await graphQL(key);
  if (process.env.DATABASE_URL) {
    try {
      await prisma.analyticsCache.upsert(
        {
          where: { username: key },
          create: {
            username: key,
            data: data as object,
            expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000)
          },
          update: {
            data: data as object,
            cachedAt: now,
            expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000)
          }
        });
    } catch { /* profile remains available even if cache write fails */ }
  }
  return data;
}
