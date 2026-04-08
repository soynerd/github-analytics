import { notFound } from "next/navigation";
import { getProfile } from "../../lib/github";
import { Dashboard } from "../../components/dashboard";

export const revalidate = 3600;
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  try {
    const data = await getProfile(username);
    return <Dashboard {...data} />;
  } catch (error) {
    if (error instanceof Error && error.message === "404") notFound();
    const needsToken =
      error instanceof Error && error.message === "MISSING_GITHUB_TOKEN";
    return (
      <main className="error-page">
        <a className="brand" href="/">
          <span className="brand-mark">⌁</span> gitlume
        </a>
        <div>
          <p className="eyebrow">
            <i />{" "}
            {needsToken ? "SETUP REQUIRED" : "DATA TEMPORARILY UNAVAILABLE"}
          </p>
          <h1>
            {needsToken
              ? "GitLume needs its GitHub data key."
              : "We couldn’t light up this profile."}
          </h1>
          <p>
            {needsToken
              ? "Add GITHUB_TOKEN to the server environment. Visitors never need a GitHub account or token."
              : "GitHub may be rate-limiting requests. Please try again in a moment."}
          </p>
          <a className="back-button" href="/">
            Back to search
          </a>
        </div>
      </main>
    );
  }
}
