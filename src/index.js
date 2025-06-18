const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
    try {
        const argocdUrl = core.getInput('argocd-url');
        const argocdToken = core.getInput('argocd-token');
        const repoToken = core.getInput('repo-token');
        const owner = github.context.repo.owner;
        const repo = github.context.repo.repo;

        // Fetch applications from ArgoCD
        const response = await axios.get(`${argocdUrl}/api/v1/applications`, {
            headers: {
                'Authorization': `Bearer ${argocdToken}`
            }
        });

        const apps = response.data.items.map(app => ({
            name: app.metadata.name,
            version: app.spec.source.targetRevision
        }));

        // Prepare README content
        let readmeContent = '# ArgoCD Applications\n\n';
        apps.forEach(app => {
            readmeContent += `- **${app.name}**: version ${app.version}\n`;
        });

        // Update README.md in the repository
        const octokit = github.getOctokit(repoToken);
        const readmePath = 'README.md';
        const { data: { sha } } = await octokit.repos.getContent({
            owner,
            repo,
            path: readmePath
        });

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: readmePath,
            message: 'Update README with ArgoCD applications',
            content: Buffer.from(readmeContent).toString('base64'),
            sha: sha
        });

        core.info('README.md updated successfully');
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function main() {
  // Inputs from GitHub Actions
  const argocdServer = process.env.ARGOCD_SERVER || process.env.INPUT_ARGOCD_SERVER;
  const argocdToken = process.env.ARGOCD_TOKEN || process.env.INPUT_ARGOCD_TOKEN;

  if (!argocdServer || !argocdToken) {
    console.error('Missing ArgoCD server or token.');
    process.exit(1);
  }

  // Fetch ArgoCD apps (using argocd CLI)
  let appListRaw;
  try {
    appListRaw = execSync(
      `argocd app list --server ${argocdServer} --auth-token ${argocdToken} -o json`,
      { encoding: 'utf-8' }
    );
  } catch (err) {
    console.error('Failed to fetch ArgoCD apps:', err.message);
    process.exit(1);
  }

  const apps = JSON.parse(appListRaw);

  // Parse apps into { environment: { app: { cluster: [versions] } } }
  const grouped = {};
  for (const app of apps) {
    // Example: app.metadata.name = "frontend-prod-cluster-a"
    const [application, environment, ...clusterParts] = app.metadata.name.split('-');
    const cluster = clusterParts.join('-');
    const version = app.status.sync.revision || 'unknown';

    if (!grouped[environment]) grouped[environment] = {};
    if (!grouped[environment][application]) grouped[environment][application] = {};
    if (!grouped[environment][application][cluster]) grouped[environment][application][cluster] = new Set();

    grouped[environment][application][cluster].add(version);
  }

  // Generate markdown tables per environment
  let output = '';
  for (const environment of Object.keys(grouped).sort()) {
    output += `\n### ${environment}\n\n`;
    output += '| Application | Cluster      | Versions         |\n';
    output += '|-------------|--------------|------------------|\n';
    for (const application of Object.keys(grouped[environment]).sort()) {
      for (const cluster of Object.keys(grouped[environment][application]).sort()) {
        const versions = Array.from(grouped[environment][application][cluster]).sort().join(', ');
        output += `| ${application}    | ${cluster}    | ${versions}   |\n`;
      }
    }
    output += '\n';
  }

  // Update README.md
  const readmePath = path.join(process.cwd(), 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf-8');

  // Replace or append the output section
  const marker = '## Example Output';
  if (readme.includes(marker)) {
    readme = readme.replace(
      new RegExp(`${marker}[\\s\\S]*?(?=\\n## |\\n# |$)`, 'm'),
      `${marker}\n${output}`
    );
  } else {
    readme += `\n${marker}\n${output}`;
  }

  fs.writeFileSync(readmePath, readme);
  console.log('README.md updated with ArgoCD app versions.');
}

run();
main().catch(err => {
  console.error(err);
  process.exit(1);
});