// Checks every Markdown link in the repository's docs: relative files exist, #anchors match a heading, and with
// --external, absolute URLs answer. Usage: node scripts/check-links.mjs [--external]
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const files = ['README.md', 'AGENTS.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'docs/api.md', 'docs/mockups/README.md',
  '.github/pull_request_template.md'].filter(existsSync);
const external = process.argv.includes('--external');
const slug = (heading) => heading.trim().toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-');
const anchors = (file) => new Set([...readFileSync(file, 'utf8').matchAll(/^#{1,6} (.+)$/gm)].map(([, heading]) => slug(heading)));
const problems = [];
const urls = new Map();

for (const file of files) {
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const links = [...text.matchAll(/\]\(([^)\s]+)\)|(?:href|src|srcset)="([^"]+)"/g)].map((match) => match[1] ?? match[2]);
  for (const link of links) {
    if (/^https?:/.test(link)) {
      if (/^https?:\/\/(127\.0\.0\.1|localhost)/.test(link)) problems.push(`${file}: local URL ${link}`);
      else urls.set(link, file);
      continue;
    }
    if (/^(mailto:|#?$)/.test(link)) continue;
    const [path, hash] = link.split('#');
    const target = path ? resolve(dirname(file), path) : resolve(file);
    if (path && !existsSync(target)) { problems.push(`${file}: missing ${link}`); continue; }
    if (hash && target.endsWith('.md') && !anchors(target).has(hash)) problems.push(`${file}: no heading for ${link}`);
  }
}
if (external) {
  await Promise.all([...urls].map(async ([url, file]) => {
    try {
      const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (!response.ok) problems.push(`${file}: ${response.status} ${url}`);
    } catch (error) { problems.push(`${file}: ${error.message} ${url}`); }
  }));
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Links OK in ${files.length} files${external ? `, ${urls.size} external URLs` : ''}.`);
