import fs from "node:fs";
import path from "node:path";
import { ValidatedResearchDossier } from "./types.js";

export type ResearchArtifactFiles = {
  dossierPath: string;
  summaryPath: string;
};

export function persistResearchArtifacts(
  basePath: string,
  dossier: ValidatedResearchDossier
): ResearchArtifactFiles {
  const created = new Date(dossier.createdAt);
  const yyyy = created.getUTCFullYear();
  const mm = String(created.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(created.getUTCDate()).padStart(2, "0");
  const datedDir = path.join(basePath, `${yyyy}-${mm}-${dd}`);
  if (!fs.existsSync(datedDir)) {
    fs.mkdirSync(datedDir, { recursive: true });
  }

  const slug = `${slugify(dossier.topic).slice(0, 40)}-${dossier.agentId}-${created.getTime()}`;
  const dossierPath = path.join(datedDir, `${slug}.json`);
  const summaryPath = path.join(datedDir, `${slug}.md`);

  fs.writeFileSync(dossierPath, JSON.stringify(dossier, null, 2));
  fs.writeFileSync(summaryPath, renderDossierMarkdown(dossier));
  return { dossierPath, summaryPath };
}

function renderDossierMarkdown(dossier: ValidatedResearchDossier): string {
  const lines: string[] = [];
  lines.push(`# Research Dossier: ${dossier.topic}`);
  lines.push("");
  lines.push(`- Agent: ${dossier.agentId}`);
  lines.push(`- Created: ${dossier.createdAt}`);
  lines.push(`- Sources: ${dossier.sources.length}`);
  lines.push(`- Supported claims: ${dossier.supportedClaims.length}`);
  lines.push(`- Dropped claims: ${dossier.droppedClaims.length}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(dossier.summary);
  lines.push("");
  lines.push("## Sources");
  lines.push("");
  for (const source of dossier.sources) {
    lines.push(
      `- [${source.id}] [${source.title}](${source.url}) (${source.domain}${
        source.publishedAt ? `, ${source.publishedAt}` : ""
      })`
    );
  }
  lines.push("");
  lines.push("## Claims");
  lines.push("");
  for (const claim of dossier.claims) {
    const refs = claim.sourceIds.length > 0 ? claim.sourceIds.join(", ") : "none";
    const reason = claim.reason ? ` (${claim.reason})` : "";
    lines.push(`- [${claim.id}] ${claim.status.toUpperCase()} refs=${refs}${reason}: ${claim.text}`);
  }
  lines.push("");
  return lines.join("\n");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
