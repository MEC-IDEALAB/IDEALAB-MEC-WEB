// User-authorized delivery metadata; credentials are handled by the shared helper.
const { api } = require('./github-setup.cjs');
const setup = require('../docs/github-setup.json');
const repo = 'MEC-IDEALAB/IDEALAB-MEC-WEB';
async function main() {
  const issues = await api(`repos/${repo}/issues?state=all&per_page=100`);
  const ownedUrls = new Set(setup.issues.map(issue => issue.url));
  for (const issue of issues.filter(item => !item.pull_request)) {
    // Repair only the generated one-line template, preserving edited issue bodies.
    if (ownedUrls.has(issue.html_url) && typeof issue.body === 'string'
      && issue.body.startsWith(`## Intended outcome\\n\\n${issue.title}.\\n\\n## Task list and acceptance\\n\\n`)
      && issue.body.includes('## Current evidence and dependencies\\n\\nThe public website and member foundation exist locally.')
      && issue.body.includes('## Verification record\\n\\nRecord actual commands, current source revision, review findings, browser evidence and remaining unverified paths before closure.')
      && !issue.body.includes('\n')) {
      await api(`repos/${repo}/issues/${issue.number}`, 'PATCH', { body: issue.body.replaceAll('\\n', '\n') });
      console.log(`Repaired issue #${issue.number} task-list formatting.`);
    }
  }
  await api(`repos/${repo}`, 'PATCH', { allow_squash_merge: true, allow_merge_commit: false, allow_rebase_merge: false, delete_branch_on_merge: true });
  const result = await api(`repos/${repo}`);
  console.log(JSON.stringify({ repository: result.html_url, private: result.private, defaultBranch: result.default_branch, squashMerge: result.allow_squash_merge, deleteBranchOnMerge: result.delete_branch_on_merge }));
  try {
    await api(`repos/${repo}/branches/main/protection`, 'PUT', {
      required_status_checks: { strict: true, contexts: ['Documentation gate', 'Required gate'] },
      enforce_admins: true,
      required_pull_request_reviews: { dismiss_stale_reviews: true, require_code_owner_reviews: true, required_approving_review_count: 1 },
      restrictions: null, required_conversation_resolution: true, allow_force_pushes: false, allow_deletions: false,
    });
    console.log('Main branch protection configured.');
  } catch (error) {
    if (!/403|404/.test(error.message)) throw error;
    console.log(`Branch protection unavailable: ${error.message}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
