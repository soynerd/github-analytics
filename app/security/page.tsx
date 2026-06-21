"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SecurityScanResult, Vulnerability, DependencyTreeNode } from "../../lib/security";

function formatSeverity(severity: string) {
  switch (severity) {
    case "CRITICAL": return <span style={{ color: "#d73a4a", fontWeight: 600 }}>CRITICAL</span>;
    case "HIGH": return <span style={{ color: "#cb2431", fontWeight: 600 }}>HIGH</span>;
    case "MODERATE": return <span style={{ color: "#b08800", fontWeight: 600 }}>MODERATE</span>;
    case "LOW": return <span style={{ color: "#0366d6", fontWeight: 600 }}>LOW</span>;
    default: return <span style={{ color: "#6a737d", fontWeight: 600 }}>UNKNOWN</span>;
  }
}

function SecurityScannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [repo, setRepo] = useState(searchParams.get("repo") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SecurityScanResult | null>(null);
  const [filter, setFilter] = useState("All");

  const runScan = async (repoUrl: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/security?repo=${encodeURIComponent(repoUrl)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to scan repository");
      }
      setResult(data);
      router.push(`/security?repo=${encodeURIComponent(repoUrl)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const r = searchParams.get("repo");
    if (r && !result && !loading && !error) {
      runScan(r);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (repo) runScan(repo);
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-scan-${result.repository.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredVulns = result?.vulnerabilities.filter(v => filter === "All" || v.severity === filter.toUpperCase()) || [];

  return (
    <main className="dashboard" style={{ minHeight: "100vh" }}>
      <header className="dash-nav">
        <a className="brand" href="/">
          <span className="brand-mark">⌁</span> gitlume
        </a>
        <a className="nav-note" href="/compare">Compare developers →</a>
      </header>

      <section className="hero" style={{ marginTop: "60px", marginBottom: "40px" }}>
        <div className="eyebrow"><i /> REPOSITORY SECURITY</div>
        <h1 style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>Dependency Scanner</h1>
        <p>Analyze public GitHub repositories for known vulnerabilities.</p>
        
        <form className="search" style={{ marginTop: "20px" }} onSubmit={handleSubmit}>
          <div className="search-icon">⚲</div>
          <input 
            type="text" 
            placeholder="owner/repository or github URL" 
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
          <button type="submit" disabled={loading} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {loading ? <>Scanning... <span className="spinner"></span></> : <>Scan <span>→</span></>}
          </button>
        </form>
        <div className="examples">
          Supported: <span>package.json</span> <span>package-lock.json</span> <span>requirements.txt</span>
        </div>
      </section>

      {error && (
        <section className="error-page" style={{ minHeight: "auto", padding: "0" }}>
           <div style={{ margin: "40px auto" }} className="card empty">
              <h2 style={{ fontSize: "20px", marginTop: 0, color: "#d73a4a" }}>Scan Error</h2>
              <p>{error}</p>
           </div>
        </section>
      )}

      {loading && !error && (
        <div className="card empty" style={{ margin: "40px auto", maxWidth: "800px", textAlign: "center", display: "flex", gap: "12px", alignItems: "center", justifyContent: "center" }}>
          Scanning dependencies... This might take a few moments. <span className="spinner"></span>
        </div>
      )}

      {result && !loading && (
        <>
          <section className="profile-head" style={{ padding: "40px 0 20px" }}>
            <div className="profile-copy" style={{ gridColumn: "1 / -1" }}>
              <div className="profile-title">
                <div>
                  <p className="eyebrow"><i /> SCAN REPORT</p>
                  <h1>{result.repository.owner}/{result.repository.name}</h1>
                  <a href={result.repository.url} className="handle" target="_blank" rel="noreferrer">
                    {result.repository.url} ↗
                  </a>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                   <span className="nav-note">Commit: {result.repository.commitSha.substring(0, 7)}</span>
                   <button className="follow" onClick={handleExport} style={{ height: "42px", padding: "10px 20px" }}>Export JSON</button>
                </div>
              </div>
            </div>
          </section>

          {result.status === "NO_FILES" ? (
             <div className="card empty" style={{ margin: "40px 0" }}>
               No supported dependency files were found in this repository.
             </div>
          ) : (
            <>
              <section className="stat-grid">
                <article className="stat card">
                  <span style={{ color: "var(--coral)" }}>✦</span>
                  <div>
                    <strong>{result.summary.dependenciesScanned}</strong>
                    <p>Dependencies scanned</p>
                  </div>
                </article>
                <article className="stat card">
                  <span style={{ color: result.summary.vulnerableDependencies > 0 ? "#cb2431" : "var(--green)" }}>{result.summary.vulnerableDependencies > 0 ? "⚠" : "✓"}</span>
                  <div>
                    <strong>{result.summary.vulnerableDependencies}</strong>
                    <p>Vulnerable dependencies</p>
                  </div>
                </article>
                <article className="stat card">
                  <span style={{ color: "#d73a4a" }}>■</span>
                  <div>
                    <strong>{result.summary.critical}</strong>
                    <p>Critical severity</p>
                  </div>
                </article>
                <article className="stat card">
                  <span style={{ color: "#cb2431" }}>■</span>
                  <div>
                    <strong>{result.summary.high}</strong>
                    <p>High severity</p>
                  </div>
                </article>
                <article className="stat card">
                  <span style={{ color: "#b08800" }}>■</span>
                  <div>
                    <strong>{result.summary.moderate}</strong>
                    <p>Moderate severity</p>
                  </div>
                </article>
                <article className="stat card">
                  <span style={{ color: "#0366d6" }}>■</span>
                  <div>
                    <strong>{result.summary.low}</strong>
                    <p>Low severity</p>
                  </div>
                </article>
                <article className="stat card">
                  <span style={{ color: "var(--muted)" }}>■</span>
                  <div>
                    <strong>{result.summary.unknown}</strong>
                    <p>Unknown severity</p>
                  </div>
                </article>
                <article className="stat card">
                  <span style={{ color: "var(--muted)" }}>◌</span>
                  <div>
                    <strong>{result.manifests.length}</strong>
                    <p>Manifests parsed</p>
                  </div>
                </article>
              </section>

              <section className="content-grid extra-grid">
                <div className="card" style={{ padding: "26px", gridColumn: "1 / -1" }}>
                  <div className="card-title">
                    <div>
                      <p className="eyebrow"><i /> VULNERABILITIES</p>
                      <h2>Findings</h2>
                    </div>
                    <div>
                      <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ padding: "8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--paper)", font: "13px 'DM Sans'" }}
                      >
                        <option value="All">All</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Low">Low</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: "20px" }}>
                    {filteredVulns.length === 0 ? (
                      <div className="empty" style={{ padding: "30px", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        {filter === "All" ? "No known vulnerabilities found." : `No vulnerabilities matching '${filter}' severity.`}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {filteredVulns.map((vuln, i) => (
                          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", background: "var(--paper)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div>
                                <strong style={{ fontSize: "16px", fontFamily: "'DM Mono', monospace" }}>{vuln.package}@{vuln.version}</strong>
                                <span style={{ marginLeft: "10px", fontSize: "12px", color: "var(--muted)", textTransform: "uppercase" }}>{vuln.ecosystem} · {vuln.type} {vuln.isTransitive ? "· Transitive" : "· Direct"}</span>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                {formatSeverity(vuln.severity)}
                              </div>
                            </div>
                            <p style={{ fontSize: "14px", color: "var(--ink)", margin: "10px 0", lineHeight: "1.5" }}>
                              {vuln.summary}
                            </p>
                            <div className="health-list" style={{ marginTop: "12px", borderTop: "1px dashed var(--line)", paddingTop: "12px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: 0, border: 0 }}>
                                <div style={{ fontSize: "12px" }}>
                                  <span style={{ color: "var(--muted)" }}>Advisory: </span>
                                  <a href={vuln.references[0]} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", fontWeight: 500 }}>
                                    {vuln.cve || vuln.ghsa || vuln.advisoryId} ↗
                                  </a>
                                </div>
                                <div style={{ fontSize: "12px" }}>
                                  <span style={{ color: "var(--muted)" }}>Fixed in: </span>
                                  <strong>{vuln.fixedVersion || "No known fixed version"}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {result.dependencyTree.length > 0 && (
                <section className="card" style={{ padding: "26px", marginTop: "18px" }}>
                  <div className="card-title">
                    <div>
                      <p className="eyebrow"><i /> DEPENDENCIES</p>
                      <h2>Dependency Tree (Direct)</h2>
                    </div>
                  </div>
                  <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "10px" }}>
                    {result.dependencyTree.slice(0, 100).map((node, i) => (
                      <div key={i} style={{ padding: "10px", border: "1px solid var(--line)", borderRadius: "6px", background: "var(--paper)", fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                         <span style={{ fontFamily: "'DM Mono', monospace" }}>{node.name}</span>
                         <span style={{ color: "var(--muted)" }}>{node.version}</span>
                      </div>
                    ))}
                    {result.dependencyTree.length > 100 && (
                      <div style={{ padding: "10px", color: "var(--muted)", fontSize: "13px" }}>... and {result.dependencyTree.length - 100} more</div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
      
      <footer className="dash-footer" style={{ marginTop: "60px" }}>
        <span>Based on public GitHub information and OSV database</span>
        <a href="/">Analyze a developer profile →</a>
      </footer>
    </main>
  );
}

export default function SecurityScanner() {
  return (
    <Suspense fallback={<div className="dashboard card empty" style={{ margin: "40px auto", maxWidth: "800px", textAlign: "center", height: "100vh", display: "flex", gap: "12px", alignItems: "center", justifyContent: "center" }}>Loading... <span className="spinner"></span></div>}>
      <SecurityScannerContent />
    </Suspense>
  );
}
