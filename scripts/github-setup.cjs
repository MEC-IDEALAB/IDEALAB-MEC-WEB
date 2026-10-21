// Idempotent, explicitly invoked setup for the user-authorized destination.
// Requires an existing gh login with organization access and project scope.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const org = 'MEC-IDEALAB';
const repo = `${org}/IDEALAB-MEC-WEB`;
const projectTitle = 'IDEALAB MEC — V1 delivery';
if (!process.argv.includes('--execute')) throw new Error('Use --execute for the authorized GitHub setup.');
// Retrieve the existing CLI credential into process memory only. Never print,
// persist or pass it through shell arguments. HTTP reuses one connection pool
// instead of spawning a slow Windows CLI process for every API operation.
const credential = spawnSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', timeout: 60000, windowsHide: true });
if (credential.error || credential.status !== 0) throw new Error('Existing GitHub CLI authentication could not be read.');
const token = credential.stdout.trim();
async function api(endpoint, method = 'GET', body, optional = false) {
  const response = await fetch(`https://api.github.com/${endpoint}`, {
    method, signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) {
    if (optional && [403, 404].includes(response.status)) return null;
    throw new Error(`GitHub ${method} ${endpoint}: ${response.status} ${data.message || 'request failed'}`);
  }
  return data;
}
async function graphql(query, variables) {
  const response = await api('graphql', 'POST', { query, variables });
  if (response.errors?.length) throw new Error(response.errors.map(error => error.message).join('; '));
  return response.data;
}
async function main() {
const membership = await api(`user/memberships/orgs/${org}`);
if (membership.state !== 'active' || membership.role !== 'admin') throw new Error('Active organization owner access is required.');
console.log(`Verified organization owner access: ${org}`);
let repository = await api(`repos/${repo}`, 'GET', undefined, true);
if (!repository) {
  repository = await api(`orgs/${org}/repos`, 'POST', { name: 'IDEALAB-MEC-WEB', private: true, description: 'IDEALAB MEC website and signed-in innovation lab platform — Next.js and TypeScript.', has_issues: true, has_projects: true, has_wiki: false, auto_init: false });
}
if (!repository.private) throw new Error('Expected a private repository; refusing to change existing visibility automatically.');
console.log(`Private repository verified: ${repository.html_url}`);
const customized = await api(`orgs/${org}`, 'PATCH', { name: 'IDEALAB MEC', description: 'IDEA Lab at Model Engineering College — platform development and delivery.', blog: 'https://idealab.mec.ac.in/' }, true);
console.log(customized ? 'Organization profile metadata updated.' : 'Organization profile metadata update unavailable with current credential; repository setup continues.');
const labels = [
  ['area:design', 'D5EC83'], ['area:frontend', '2453DB'], ['area:backend', '8250DF'], ['area:security', 'D1242F'], ['area:delivery', 'F6D36B'], ['type:epic', '0E8A16'], ['type:task', '1D76DB'], ['status:blocked', 'B60205'], ['priority:P0', 'B60205'], ['priority:P1', 'D93F0B'], ['priority:P2', 'FBCA04'],
];
const currentLabels = await api(`repos/${repo}/labels?per_page=100`);
for (const [name, color] of labels) if (!currentLabels.some(label => label.name === name)) await api(`repos/${repo}/labels`, 'POST', { name, color });
let milestones = await api(`repos/${repo}/milestones?state=all&per_page=100`);
for (const title of ['Foundation and UX', 'Shared backend and identity', 'V1 operational workflows', 'Pilot and release']) {
  if (!milestones.some(item => item.title === title)) milestones.push(await api(`repos/${repo}/milestones`, 'POST', { title }));
}
const issues = [
  ['V1 delivery tracker and acceptance gates', 'Foundation and UX', ['type:epic','area:delivery','priority:P0'], ['Maintain requirements, architecture, flow/wireframe and dependency records.', 'Complete actual user and staff journeys for the full documented V1.', 'Resolve product/backend gates with explicit evidence.', 'Require current-source local checks, independent review and hosted CI before release.', 'Keep sample data separate from verified operational records.']],
  ['Responsive public website and institutional branding', 'Foundation and UX', ['type:task','area:frontend','priority:P1'], ['Use IDEALAB MEC identity and verified official IDEA Lab/MEC logos.', 'Curated public homepage; project/event records require sign-in.', 'Verify 320/375/768/1024/1440px, keyboard, reduced motion and real assets.', 'Retain content/font source attribution.']],
  ['Member and staff UX flows, wireframes and design system', 'Foundation and UX', ['type:task','area:design','priority:P1'], ['Document student, Machine/Operations/Events Head and Super Admin journeys.', 'Use machine/room-specific head assignments.', 'Preferred time requires head confirmation; requester accepts a changed time.', 'Review loading, empty, unavailable, denied, retry and success states.']],
  ['Shared schema, migration and RLS reconciliation', 'Shared backend and identity', ['type:task','area:backend','area:security','priority:P0','status:blocked'], ['Inspect live schema, migration ledger, grants, RLS and functions.', 'Reconcile conflicting role/member/event/RSVP contracts with Flutter.', 'Approve compatibility architecture and reviewed rollback/migration plan.', 'Verify cross-user and cross-scope denial with actual backend tests.']],
  ['Shared account signup, browser auth, recovery and onboarding', 'Shared backend and identity', ['type:task','area:backend','priority:P0','status:blocked'], ['Verify existing email/password identities in browser and Flutter.', 'Complete verified signup, explicit sign-in, recovery and browser Google OAuth.', 'Use a server-owned idempotent minimum-profile contract.', 'Test expired/revoked sessions, missing/inactive profile and no-store behavior.']],
  ['Scoped operational positions and administrative controls', 'Shared backend and identity', ['type:task','area:backend','area:security','priority:P0','status:blocked'], ['Approve machine/room scope, term, assignment, delegation and revocation rules.', 'Super Admin manages trusted assignments with audit history.', 'Enforce active account and current scoped authority on every mutation.', 'Verify unrelated head and ordinary member cannot access privileged records/actions.']],
  ['Work Request lifecycle and preferred-time negotiation', 'V1 operational workflows', ['type:task','area:backend','priority:P1','status:blocked'], ['Separate Machine and Operations requests and route to responsible head.', 'Replace local-only drafts with real server receipt and immutable history.', 'Resolve claim/review versus direct cancellation atomically.', 'After head involvement require reasoned cancellation and head decision.', 'Requester must accept changed proposed time; no inferred guaranteed reservation.', 'Replace clearly marked sample services with approved catalog before operational launch.']],
  ['Projects and creator-approved membership', 'V1 operational workflows', ['type:task','area:backend','priority:P1','status:blocked'], ['Support public/private projects inside signed-in discovery.', 'Project code creates a join request, not immediate membership.', 'Creator approves/denies; private data is server-protected.', 'Create project and creator membership atomically; preserve accountable ownership.']],
  ['Events, capacity, manual payment and cancellation', 'V1 operational workflows', ['type:task','area:backend','priority:P1','status:blocked'], ['Implement eligible free/paid registration and attendance.', 'Unverified payment holds no seat; capacity and confirmation are atomic.', 'Events Head owns event payment/refund and cancellation decisions.', 'Verify full, duplicate, concurrent registration and negative permission paths.']],
  ['Lab visits, inventory and borrowing', 'V1 operational workflows', ['type:task','area:backend','priority:P1','status:blocked'], ['Manual purpose-based check-in/out; QR optional.', 'Enforce outside-hours checked-in-head policy.', 'Separate assets, consumables and borrowable items; approved import/catalog only.', 'Record stock movements and Operations-verified returns.', 'Approve fine/due-date/waiver rules before automated charges.']],
  ['Manufacturing tasks, machine queue, runtime and maintenance', 'V1 operational workflows', ['type:task','area:backend','priority:P1','status:blocked'], ['Keep request, manufacturing task and machine queue records separate.', 'Only assigned Machine Head operates fabrication machines and controls queue.', 'Use verified machine/room catalog and safety/concurrency rules.', 'Show requester queue/ETA only from approved real source and disclosure policy.']],
  ['Quotations, UPI verification, reports, notifications and audit', 'V1 operational workflows', ['type:task','area:backend','priority:P1','status:blocked'], ['Use official UPI QR and manual verification with accountable actors.', 'Approve quote/charge/deposit/refund accounting before implementation.', 'Support approved operational exports and real in-app notifications.', 'Audit critical actions; agree readers and retention.']],
  ['CI, PR gates, Vercel delivery and pilot readiness', 'Pilot and release', ['type:task','area:delivery','priority:P0'], ['Run lint, TypeScript, audit, production build and real browser acceptance.', 'Use pinned actions and required final gate rejecting skipped/failed jobs.', 'Inspect actual hosted CI on current revision and independent review.', 'Connect Vercel only after account/configuration and release gates.', 'Verify full live member/staff journeys and rollback before pilot.']],
];
const currentIssues = await api(`repos/${repo}/issues?state=all&per_page=100`);
const created = [];
for (const [title, milestoneTitle, issueLabels, tasks] of issues) {
  let issue = currentIssues.find(item => !item.pull_request && item.title === title);
  if (!issue) {
    const body = `## Intended outcome\n\n${title}.\n\n## Task list and acceptance\n\n${tasks.map(task => `- [ ] ${task}`).join('\n')}\n\n## Current evidence and dependencies\n\nThe public website and member foundation exist locally. This issue is open: no full-V1 completion, live backend validation or production deployment is implied. Follow repository docs for confirmed product decisions and dependencies. Shared/production database changes require a reviewed specific migration plan.\n\n## Verification record\n\nRecord actual commands, current source revision, review findings, browser evidence and remaining unverified paths before closure.\n`;
    issue = await api(`repos/${repo}/issues`, 'POST', { title, body, labels: issueLabels, milestone: milestones.find(item => item.title === milestoneTitle).number });
  }
  created.push({ number: issue.number, nodeId: issue.node_id, title, url: issue.html_url });
  console.log(`Issue #${issue.number}: ${title}`);
}
const owner = (await graphql('query($login:String!){organization(login:$login){id projectsV2(first:100){nodes{id number title url}}}}', { login: org })).organization;
let project = owner.projectsV2.nodes.find(item => item.title === projectTitle);
if (!project) project = (await graphql('mutation($owner:ID!,$title:String!){createProjectV2(input:{ownerId:$owner,title:$title}){projectV2{id number title url}}}', { owner: owner.id, title: projectTitle })).createProjectV2.projectV2;
await graphql('mutation($id:ID!,$description:String!){updateProjectV2(input:{projectId:$id,shortDescription:$description,public:false}){projectV2{id}}}', { id: project.id, description: 'IDEALAB MEC V1: requirements, UX, shared backend, operations, verification and Vercel delivery.' });
await graphql('mutation($project:ID!,$repository:ID!){linkProjectV2ToRepository(input:{projectId:$project,repositoryId:$repository}){repository{id}}}', { project: project.id, repository: repository.node_id });
const projectItems = (await graphql('query($id:ID!){node(id:$id){... on ProjectV2{items(first:100){nodes{id content{... on Issue{id url}}}}}}}', { id: project.id })).node.items.nodes;
for (const issue of created) if (!projectItems.some(item => item.content?.url === issue.url)) await graphql('mutation($project:ID!,$content:ID!){addProjectV2ItemById(input:{projectId:$project,contentId:$content}){item{id}}}', { project: project.id, content: issue.nodeId });
const result = { organization: `https://github.com/${org}`, repository: repository.html_url, private: true, project: project.url, projectNumber: project.number, issues: created, organizationMetadataUpdated: !!customized };
fs.mkdirSync(path.join(__dirname, '..', 'docs'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'github-setup.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { api, graphql };
