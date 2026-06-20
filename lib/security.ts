import { prisma } from "./db";

// -- TYPES --

export type Severity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";

export interface Vulnerability {
  package: string;
  version: string;
  ecosystem: string;
  type: string; // "dependency", "devDependency", etc.
  severity: Severity;
  advisoryId: string; // OSV ID
  cve?: string;
  ghsa?: string;
  cvss?: number;
  summary: string;
  fixedVersion?: string;
  isTransitive: boolean;
  introducedThrough?: string;
  publishedDate?: string;
  modifiedDate?: string;
  references: string[];
}

export interface Dependency {
  name: string;
  version: string;
  type: string; // "dependency", "devDependency", etc.
  isTransitive: boolean;
  introducedThrough?: string;
}

export interface Manifest {
  path: string;
  type: "npm" | "python";
  dependencies: Dependency[];
}

export interface SecuritySummary {
  dependenciesScanned: number;
  vulnerableDependencies: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  unknown: number;
  directVulnerable: number;
  transitiveVulnerable: number;
}

export interface DependencyTreeNode {
  name: string;
  version: string;
  isTransitive: boolean;
  vulnerabilityCount: number;
  children: DependencyTreeNode[];
}

export interface SecurityScanResult {
  repository: {
    owner: string;
    name: string;
    url: string;
    commitSha: string;
  };
  summary: SecuritySummary;
  manifests: Manifest[];
  vulnerabilities: Vulnerability[];
  dependencyTree: DependencyTreeNode[];
  status: "SUCCESS" | "NO_FILES" | "LIMIT_REACHED" | "ERROR";
  message?: string;
  scannedAt: string;
}

// -- GITHUB API HELPERS --

const githubHeaders = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("MISSING_GITHUB_TOKEN");
  return {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github.v3+json",
  };
};

export async function getRepositoryInfo(owner: string, name: string) {
  const query = `query RepoDetails($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        name
        target {
          oid
        }
      }
    }
  }`;
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({ query, variables: { owner, name } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub API Error: ${response.status}`);
  const payload = await response.json() as any;
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  if (!payload.data?.repository) throw new Error("Repository not found");
  
  return {
    commitSha: payload.data.repository.defaultBranchRef?.target?.oid as string,
  };
}

export async function getTree(owner: string, name: string, sha: string) {
  const url = `https://api.github.com/repos/${owner}/${name}/git/trees/${sha}?recursive=1`;
  const response = await fetch(url, { headers: githubHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub Tree API Error: ${response.status}`);
  const data = await response.json() as any;
  return data.tree as { path: string; type: string; sha: string; size?: number }[];
}

export async function getFileContent(owner: string, name: string, sha: string) {
  const url = `https://api.github.com/repos/${owner}/${name}/git/blobs/${sha}`;
  const response = await fetch(url, { headers: githubHeaders(), cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json() as any;
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content as string;
}

// -- PARSERS --

export function parsePackageJson(content: string, path: string): Dependency[] {
  try {
    const pkg = JSON.parse(content);
    const deps: Dependency[] = [];
    const addDeps = (obj: any, type: string) => {
      if (!obj || typeof obj !== "object") return;
      for (const [name, version] of Object.entries(obj)) {
        deps.push({ name, version: String(version), type, isTransitive: false });
      }
    };
    addDeps(pkg.dependencies, "dependency");
    addDeps(pkg.devDependencies, "devDependency");
    addDeps(pkg.optionalDependencies, "optionalDependency");
    addDeps(pkg.peerDependencies, "peerDependency");
    return deps;
  } catch {
    return [];
  }
}

export function parsePackageLock(content: string): Dependency[] {
  try {
    const lock = JSON.parse(content);
    const deps: Dependency[] = [];
    // lockfileVersion 2/3 (packages)
    if (lock.packages) {
      for (const [pkgPath, pkgData] of Object.entries(lock.packages)) {
        if (!pkgPath) continue; // Root project
        if (typeof pkgData !== "object" || !pkgData) continue;
        const data = pkgData as any;
        const name = pkgPath.replace(/^.*node_modules\//, ""); // Extract name from path
        
        // Exclude local links or aliases if they don't have a clean name
        if (!name) continue;
        
        const isTransitive = pkgPath.includes("node_modules/") && pkgPath !== `node_modules/${name}`;
        
        deps.push({
          name,
          version: data.version || "",
          type: data.dev ? "devDependency" : "dependency",
          isTransitive, // We treat lockfile entries as potentially transitive, but we reconcile later
        });
      }
    } else if (lock.dependencies) {
      // lockfileVersion 1
      const walk = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        for (const [name, data] of Object.entries(obj)) {
          const depData = data as any;
          deps.push({
            name,
            version: depData.version || "",
            type: depData.dev ? "devDependency" : "dependency",
            isTransitive: true,
          });
          if (depData.dependencies) {
            walk(depData.dependencies);
          }
        }
      };
      walk(lock.dependencies);
    }
    return deps;
  } catch {
    return [];
  }
}

export function parseRequirementsTxt(content: string): Dependency[] {
  const deps: Dependency[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    let cleanLine = line.split("#")[0].trim();
    if (!cleanLine || cleanLine.startsWith("-")) continue;
    
    // Simplistic regex for name and version
    const match = cleanLine.match(/^([a-zA-Z0-9_\-\.]+)(?:[=<>~]+(.*))?$/);
    if (match) {
      const [, name, version] = match;
      deps.push({
        name,
        version: version || "Version unresolved",
        type: "dependency",
        isTransitive: false,
      });
    }
  }
  return deps;
}

// -- OSV API --

async function queryOSV(queries: { package: { name: string; ecosystem: string }; version: string }[]) {
  if (queries.length === 0) return [];
  // Chunk queries into max 1000 per request
  const results: any[] = [];
  const chunkSize = 1000;
  for (let i = 0; i < queries.length; i += chunkSize) {
    const chunk = queries.slice(i, i + chunkSize);
    try {
      const res = await fetch("https://api.osv.dev/v1/querybatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: chunk }),
      });
      if (res.ok) {
        const data = await res.json() as { results: any[] };
        results.push(...(data.results || []));
      } else {
        // Fill with nulls if batch fails
        results.push(...new Array(chunk.length).fill(null));
      }
    } catch {
      results.push(...new Array(chunk.length).fill(null));
    }
  }
  return results;
}

function calculateCVSS3(vector?: string): number | undefined {
  if (!vector || (!vector.startsWith("CVSS:3.0/") && !vector.startsWith("CVSS:3.1/"))) return undefined;
  
  const parts = vector.split("/");
  const metrics: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const [k, v] = part.split(":");
    metrics[k] = v;
  }

  const AV: any = { N: 0.85, A: 0.62, L: 0.55, P: 0.20 };
  const AC: any = { L: 0.77, H: 0.44 };
  const UI: any = { N: 0.85, R: 0.62 };
  const S = metrics.S;
  
  const PR_vals: any = S === "U" ? { N: 0.85, L: 0.62, H: 0.27 } : { N: 0.85, L: 0.68, H: 0.50 };
  const PR = PR_vals[metrics.PR];

  const C: any = { H: 0.56, L: 0.22, N: 0.00 };
  const I: any = { H: 0.56, L: 0.22, N: 0.00 };
  const A: any = { H: 0.56, L: 0.22, N: 0.00 };

  const mAV = AV[metrics.AV], mAC = AC[metrics.AC], mUI = UI[metrics.UI], mC = C[metrics.C], mI = I[metrics.I], mA = A[metrics.A];
  if ([mAV, mAC, mUI, PR, mC, mI, mA, S].some(x => x === undefined)) return undefined;

  const iscBase = 1 - ((1 - mC) * (1 - mI) * (1 - mA));
  const impact = S === "U" 
    ? 6.42 * iscBase 
    : 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15);
    
  const exploitability = 8.22 * mAV * mAC * PR * mUI;

  if (impact <= 0) return 0.0;

  let baseScore;
  if (S === "U") {
    baseScore = Math.min(impact + exploitability, 10);
  } else {
    baseScore = Math.min(1.08 * (impact + exploitability), 10);
  }

  return Math.ceil(baseScore * 10) / 10;
}

export function parseCVSS(severityList?: any[]): number | undefined {
  if (!severityList) return undefined;
  for (const sev of severityList) {
    if (sev.type === "CVSS_V3" && sev.score) {
      return calculateCVSS3(sev.score);
    }
  }
  return undefined;
}

export function cvssToSeverity(score: number): Severity {
  if (score >= 9.0) return "CRITICAL";
  if (score >= 7.0) return "HIGH";
  if (score >= 4.0) return "MODERATE";
  if (score > 0.0) return "LOW";
  return "UNKNOWN";
}

export function normalizeSeverity(databaseSpecific?: string, aliases?: string[]): Severity {
  const text = (databaseSpecific || "").toUpperCase();
  if (text.includes("CRITICAL")) return "CRITICAL";
  if (text.includes("HIGH")) return "HIGH";
  if (text.includes("MODERATE") || text.includes("MEDIUM")) return "MODERATE";
  if (text.includes("LOW")) return "LOW";
  return "UNKNOWN";
}

// -- SCANNER LOGIC --

export async function runSecurityScan(owner: string, repoName: string): Promise<SecurityScanResult> {
  const start = Date.now();
  let commitSha = "";
  try {
    const info = await getRepositoryInfo(owner, repoName);
    commitSha = info.commitSha;
  } catch (err: any) {
    return {
      repository: { owner, name: repoName, url: `https://github.com/${owner}/${repoName}`, commitSha: "" },
      summary: { dependenciesScanned: 0, vulnerableDependencies: 0, critical: 0, high: 0, moderate: 0, low: 0, unknown: 0, directVulnerable: 0, transitiveVulnerable: 0 },
      manifests: [], vulnerabilities: [], dependencyTree: [], status: "ERROR", message: err.message, scannedAt: new Date().toISOString()
    };
  }

  // Check cache
  if (process.env.DATABASE_URL) {
    try {
      const cached = await prisma.securityScan.findUnique({
        where: { owner_repository_commitSha: { owner, repository: repoName, commitSha } },
      });
      if (cached) {
        return cached.result as unknown as SecurityScanResult;
      }
    } catch {
      // ignore
    }
  }

  const tree = await getTree(owner, repoName, commitSha).catch(() => []);
  
  const packageJsons = tree.filter(t => t.path.endsWith("package.json"));
  const packageLocks = tree.filter(t => t.path.endsWith("package-lock.json"));
  const requirementsTxts = tree.filter(t => t.path.endsWith("requirements.txt"));
  
  if (packageJsons.length === 0 && requirementsTxts.length === 0) {
    return {
      repository: { owner, name: repoName, url: `https://github.com/${owner}/${repoName}`, commitSha },
      summary: { dependenciesScanned: 0, vulnerableDependencies: 0, critical: 0, high: 0, moderate: 0, low: 0, unknown: 0, directVulnerable: 0, transitiveVulnerable: 0 },
      manifests: [], vulnerabilities: [], dependencyTree: [], status: "NO_FILES", scannedAt: new Date().toISOString()
    };
  }

  // Limit number of manifests
  const MANIFEST_LIMIT = 20;
  let allFiles = [...packageJsons, ...packageLocks, ...requirementsTxts].slice(0, MANIFEST_LIMIT);
  
  const manifests: Manifest[] = [];
  const lockDepsMap = new Map<string, Dependency[]>(); // dir -> deps
  
  // First, parse locks
  for (const file of allFiles.filter(f => f.path.endsWith("package-lock.json"))) {
    const content = await getFileContent(owner, repoName, file.sha);
    if (content) {
      const deps = parsePackageLock(content);
      const dir = file.path.replace("package-lock.json", "");
      lockDepsMap.set(dir, deps);
    }
  }

  // Then package.json and requirements
  for (const file of allFiles.filter(f => f.path.endsWith("package.json") || f.path.endsWith("requirements.txt"))) {
    const content = await getFileContent(owner, repoName, file.sha);
    if (!content) continue;
    
    let deps: Dependency[] = [];
    const type = file.path.endsWith("requirements.txt") ? "python" : "npm";
    
    if (type === "npm") {
      const declaredDeps = parsePackageJson(content, file.path);
      const dir = file.path.replace("package.json", "");
      const lockDeps = lockDepsMap.get(dir);
      
      // Merge: prefer lock versions for resolved, keep declared structure
      const finalDeps = new Map<string, Dependency>();
      
      // Add all lock deps (resolved versions)
      if (lockDeps) {
        for (const ld of lockDeps) {
          finalDeps.set(ld.name, ld);
        }
      }
      
      // Reconcile with declared deps
      for (const dd of declaredDeps) {
        const existing = finalDeps.get(dd.name);
        if (existing) {
          existing.isTransitive = false; // It's explicitly declared
          existing.type = dd.type;
        } else {
          finalDeps.set(dd.name, dd); // Fallback to declared
        }
      }
      
      deps = Array.from(finalDeps.values());
    } else {
      deps = parseRequirementsTxt(content);
    }
    
    manifests.push({ path: file.path, type, dependencies: deps });
  }

  // Collect unique dependencies for OSV queries
  const osvQueries: { package: { name: string; ecosystem: string }; version: string }[] = [];
  const queryIndexToDep: { manifestIndex: number; depIndex: number }[] = [];

  manifests.forEach((m, mIdx) => {
    m.dependencies.forEach((d, dIdx) => {
      // Don't query unresolved ranges if we can't extract a valid version.
      // But for simplicity, we pass what we have. OSV can handle exact versions or commits.
      // If version is a range (e.g. ^1.0.0) without lockfile, OSV query won't match exactly by version string.
      // A more robust implementation would resolve the range or query by commit.
      let cleanVer = d.version.replace(/^[^\d]+/, ""); // strip ^, ~, >= etc for a best effort
      if (cleanVer.includes("Version unresolved") || !cleanVer) return;

      const ecosystem = m.type === "npm" ? "npm" : "PyPI";
      osvQueries.push({
        package: { name: d.name, ecosystem },
        version: cleanVer, // sending a clean version
      });
      queryIndexToDep.push({ manifestIndex: mIdx, depIndex: dIdx });
    });
  });

  const osvResults = await queryOSV(osvQueries);
  
  // OSV querybatch returns abbreviated vulnerabilities (only ID and modified).
  // We must fetch full details for all unique IDs to get severity and summary.
  const uniqueVulnIds = new Set<string>();
  osvResults.forEach(res => {
    if (res?.vulns) {
      res.vulns.forEach((v: any) => uniqueVulnIds.add(v.id));
    }
  });

  const fullVulnsMap = new Map<string, any>();
  
  // Fetch full vulns in chunks of 10 to avoid overwhelming network
  const idsArray = Array.from(uniqueVulnIds);
  for (let i = 0; i < idsArray.length; i += 10) {
    const chunk = idsArray.slice(i, i + 10);
    await Promise.all(chunk.map(async (id) => {
      try {
        const res = await fetch(`https://api.osv.dev/v1/vulns/${id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          fullVulnsMap.set(id, data);
        }
      } catch {
        // Ignore fetch errors
      }
    }));
  }

  const vulnerabilities: Vulnerability[] = [];

  const summary: SecuritySummary = {
    dependenciesScanned: 0,
    vulnerableDependencies: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    unknown: 0,
    directVulnerable: 0,
    transitiveVulnerable: 0,
  };

  const scannedSet = new Set<string>();

  osvResults.forEach((res, i) => {
    const { manifestIndex, depIndex } = queryIndexToDep[i];
    const dep = manifests[manifestIndex].dependencies[depIndex];
    const ecosystem = manifests[manifestIndex].type;
    
    const uniqueKey = `${ecosystem}:${dep.name}:${dep.version}`;
    if (!scannedSet.has(uniqueKey)) {
      scannedSet.add(uniqueKey);
      summary.dependenciesScanned++;
    }

    if (res && res.vulns && res.vulns.length > 0) {
      let isDepVulnerable = false;
      
      for (const abbreviatedVuln of res.vulns) {
        const vuln = fullVulnsMap.get(abbreviatedVuln.id) || abbreviatedVuln;
        // Extract severity
        let severity: Severity = "UNKNOWN";
        const cvssScore = parseCVSS(vuln.severity);
        
        if (vuln.database_specific?.severity) {
          severity = normalizeSeverity(vuln.database_specific.severity);
        } else if (cvssScore !== undefined) {
          severity = cvssToSeverity(cvssScore);
        } else if (vuln.severity && vuln.severity.length > 0 && typeof vuln.severity[0] === 'string') {
          severity = normalizeSeverity("", vuln.severity); 
        }
        
        let cve: string | undefined = undefined;
        let ghsa: string | undefined = undefined;
        
        if (vuln.aliases) {
          cve = vuln.aliases.find((a: string) => a.startsWith("CVE-"));
          ghsa = vuln.aliases.find((a: string) => a.startsWith("GHSA-"));
        }

        // Fixed version (naive extraction from affected)
        let fixedVersion: string | undefined = undefined;
        if (vuln.affected) {
          for (const aff of vuln.affected) {
            if (aff.ranges) {
              for (const r of aff.ranges) {
                if (r.events) {
                  for (const ev of r.events) {
                    if (ev.fixed) {
                      fixedVersion = ev.fixed;
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        vulnerabilities.push({
          package: dep.name,
          version: dep.version,
          ecosystem,
          type: dep.type,
          severity,
          advisoryId: vuln.id,
          cve,
          ghsa,
          cvss: cvssScore,
          summary: vuln.summary || vuln.details?.substring(0, 300) || "Vulnerability detected",
          fixedVersion,
          isTransitive: dep.isTransitive,
          introducedThrough: undefined, // Hard to trace without full tree
          publishedDate: vuln.published,
          modifiedDate: vuln.modified,
          references: vuln.references?.map((r: any) => r.url) || [],
        });
        
        isDepVulnerable = true;
      }
      
      if (isDepVulnerable) {
        // Track unique vulnerable dependencies. We count the dependency itself, not each vuln.
        // But the summary counts are simplified here. 
        // We'll aggregate counts below.
      }
    }
  });

  // Calculate summary counts
  const vulnsByPackage = new Set<string>();
  for (const v of vulnerabilities) {
    const key = `${v.ecosystem}:${v.package}:${v.version}`;
    if (!vulnsByPackage.has(key)) {
      vulnsByPackage.add(key);
      summary.vulnerableDependencies++;
      if (v.isTransitive) summary.transitiveVulnerable++;
      else summary.directVulnerable++;
    }
    
    if (v.severity === "CRITICAL") summary.critical++;
    else if (v.severity === "HIGH") summary.high++;
    else if (v.severity === "MODERATE") summary.moderate++;
    else if (v.severity === "LOW") summary.low++;
    else summary.unknown++;
  }

  // Very basic flat dependency tree for now
  const dependencyTree: DependencyTreeNode[] = [];
  for (const m of manifests) {
    const direct = m.dependencies.filter(d => !d.isTransitive);
    for (const d of direct) {
      dependencyTree.push({
        name: d.name,
        version: d.version,
        isTransitive: false,
        vulnerabilityCount: vulnerabilities.filter(v => v.package === d.name).length,
        children: [] // Proper resolution requires lockfile parsing into a graph
      });
    }
  }

  const result: SecurityScanResult = {
    repository: { owner, name: repoName, url: `https://github.com/${owner}/${repoName}`, commitSha },
    summary,
    manifests,
    vulnerabilities,
    dependencyTree,
    status: "SUCCESS",
    scannedAt: new Date().toISOString()
  };

  // Cache it
  if (process.env.DATABASE_URL && commitSha) {
    try {
      await prisma.securityScan.upsert({
        where: { owner_repository_commitSha: { owner, repository: repoName, commitSha } },
        create: {
          owner, repository: repoName, commitSha, status: result.status, result: result as any
        },
        update: {
          status: result.status, result: result as any, scannedAt: new Date()
        }
      });
    } catch {
      // ignore
    }
  }

  return result;
}
