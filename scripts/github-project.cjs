// Explicit organization-project setup, preserving existing populated fields.
// GraphQL contracts: https://docs.github.com/en/graphql/reference/projects
const fs = require('node:fs');
const path = require('node:path');
const { api, graphql } = require('./github-setup.cjs');
const org = 'MEC-IDEALAB';
const repository = `${org}/IDEALAB-MEC-WEB`;
const setup = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'github-setup.json'), 'utf8'));
if (setup.repository !== `https://github.com/${repository}` || !Number.isInteger(setup.projectNumber)) throw new Error('Unexpected project destination.');
const query = `query($login:String!,$number:Int!){organization(login:$login){projectV2(number:$number){id title url public fields(first:100){nodes{... on ProjectV2Field{id name} ... on ProjectV2SingleSelectField{id name options{id name}}}} items(first:100){totalCount nodes{id content{... on Issue{number title url labels(first:20){nodes{name}} milestone{title}}} fieldValues(first:100){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{id name}}} ... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2Field{id name}}}}}}}}}}`;
const variables = { login: org, number: setup.projectNumber };
async function load() { return (await graphql(query, variables)).organization.projectV2; }
async function main() {
  let project = await load();
  if (project.public) throw new Error('Project is public; refusing to populate a destination expected private.');
  const fields = [
    ['Phase', ['Foundation', 'Backend', 'Operations', 'Release']],
    ['Priority', ['P0', 'P1', 'P2']],
    ['Verification', ['Not run', 'In progress', 'Passed', 'Failed', 'Blocked']],
  ];
  for (const [name, names] of fields) {
    if (project.fields.nodes.some(field => field.name === name)) continue;
    const options = names.map((value, index) => ({ name: value, color: ['BLUE', 'PURPLE', 'YELLOW', 'GREEN', 'RED'][index], description: `${name}: ${value}` }));
    await graphql('mutation($project:ID!,$name:String!,$options:[ProjectV2SingleSelectFieldOptionInput!]!){createProjectV2Field(input:{projectId:$project,name:$name,dataType:SINGLE_SELECT,singleSelectOptions:$options}){projectV2Field{... on ProjectV2SingleSelectField{id}}}}', { project: project.id, name, options });
  }
  if (!project.fields.nodes.some(field => field.name === 'Next action')) await graphql('mutation($project:ID!){createProjectV2Field(input:{projectId:$project,name:"Next action",dataType:TEXT}){projectV2Field{... on ProjectV2Field{id}}}}', { project: project.id });
  project = await load();
  const update = 'mutation($project:ID!,$item:ID!,$field:ID!,$value:ProjectV2FieldValue!){updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:$value}){projectV2Item{id}}}';
  for (const item of project.items.nodes) {
    const issue = item.content;
    if (!issue?.url?.startsWith(`https://github.com/${repository}/issues/`)) continue;
    const labels = issue.labels.nodes.map(label => label.name);
    const blocked = labels.includes('status:blocked');
    const phase = ({ 'Foundation and UX': 'Foundation', 'Shared backend and identity': 'Backend', 'V1 operational workflows': 'Operations', 'Pilot and release': 'Release' })[issue.milestone?.title];
    const priority = labels.find(label => label.startsWith('priority:'))?.split(':')[1];
    const values = { Phase: phase, Priority: priority, Verification: blocked ? 'Blocked' : 'In progress' };
    for (const [name, value] of Object.entries(values)) {
      const field = project.fields.nodes.find(field => field.name === name);
      if (!value || !field || item.fieldValues.nodes.some(current => current.field?.id === field.id)) continue;
      const option = field.options.find(option => option.name === value);
      if (option) await graphql(update, { project: project.id, item: item.id, field: field.id, value: { singleSelectOptionId: option.id } });
    }
    const next = project.fields.nodes.find(field => field.name === 'Next action');
    if (next && !item.fieldValues.nodes.some(current => current.field?.id === next.id)) await graphql(update, { project: project.id, item: item.id, field: next.id, value: { text: blocked ? 'Resume after shared schema/permission and product contract gates; UI/GitHub phase first.' : 'Complete current-source review and actual acceptance; record evidence before closure.' } });
    const status = project.fields.nodes.find(field => field.name === 'Status');
    const existingStatus = item.fieldValues.nodes.find(current => current.field?.id === status?.id)?.name;
    if (status && !blocked && (!existingStatus || existingStatus === 'Todo') && [1, 2, 3, 13].includes(issue.number)) {
      const option = status.options.find(option => option.name.toLowerCase() === 'in progress');
      if (option) await graphql(update, { project: project.id, item: item.id, field: status.id, value: { singleSelectOptionId: option.id } });
    }
    console.log(`Project fields verified/initialized: #${issue.number}`);
  }
  const finalProject = await load();
  const [repo, milestones, issues] = await Promise.all([api(`repos/${repository}`), api(`repos/${repository}/milestones?state=all&per_page=100`), api(`repos/${repository}/issues?state=all&per_page=100`)]);
  // The website repository is intentionally public; the organization delivery
  // project remains private. Repository visibility must not make a valid public
  // code host fail the project configuration check.
  if (finalProject.public || finalProject.items.totalCount < 13) throw new Error('GitHub setup verification failed.');
  const result = { repository: repo.html_url, private: repo.private, project: finalProject.url, projectPrivate: !finalProject.public, projectItems: finalProject.items.totalCount, fields: finalProject.fields.nodes.map(field => field.name), milestones: milestones.map(item => ({ title: item.title, url: item.html_url })), issueCount: issues.filter(issue => !issue.pull_request).length };
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'github-project.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
