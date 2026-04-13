export default function NotFound() {
  return (
    <main className="error-page">
      <a className="brand" href="/">
        <span className="brand-mark">⌁</span> gitlume
      </a>
      <div>
        <p className="eyebrow">
          <i /> PROFILE NOT FOUND
        </p>
        <h1>This developer is off the grid.</h1>
        <p>
          We couldn’t find that public GitHub username. Check the spelling and
          try again.
        </p>
        <a className="back-button" href="/">
          Back to search
        </a>
      </div>
    </main>
  );
}
