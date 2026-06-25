import { SearchBox } from "../components/search-box";
import { OnboardingHint } from "../components/onboarding-hint";

const features = [
  ["◫", "The complete picture", "Repositories, languages, popularity, and contribution patterns—brought into focus."],
  ["◌", "Human-readable insights", "See the story behind the numbers, from your most productive day to your standout project."],
  ["↗", "Always public", "No account, permissions, or setup. Enter a username and explore what’s already public."],
];

export default function Home() {
  return <main className="landing">
    <nav className="nav">
      <a className="brand" href="/"><span className="brand-mark">⌁</span> gitlume</a>
      <div style={{ display: "flex", gap: "20px", position: "relative" }}>
        <a className="nav-note" href="/compare">Compare developers →</a>
        <a className="nav-note" href="/security">Security Scanner →</a>
        <OnboardingHint />
      </div>
    </nav>
    <section className="hero">
      <div className="eyebrow"><i /> GITHUB ANALYTICS, REIMAGINED</div>
      <h1>See your work<br /><em>in a new light.</em></h1>
      <p>Turn a GitHub profile into a clear, beautiful story of how you build, collaborate, and grow.</p>
      <SearchBox />
      <div className="examples">Try an example: <a href="/torvalds">torvalds</a><span>·</span><a href="/gaearon">gaearon</a><span>·</span><a href="/vercel">vercel</a></div>
    </section>
    <section className="feature-grid">{features.map(([icon, title, copy]) => <article className="feature" key={title}><div className="feature-icon">{icon}</div><h2>{title}</h2><p>{copy}</p></article>)}</section>
    <footer>Built for the open web <span>✦</span> Powered by public GitHub data</footer>
  </main>;
}
