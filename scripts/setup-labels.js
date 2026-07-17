const LABELS = [
  { name: 'feature', color: 'a2eeef', description: 'New feature or request' },
  { name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
  { name: 'backend', color: '0052cc', description: 'Server-side / API issues or features' },
  { name: 'frontend', color: '1d76db', description: 'Client-side / web application UI' },
  { name: 'database', color: 'bfd4f2', description: 'Database schema, queries, or migrations' },
  { name: 'infra', color: '5319e7', description: 'Infrastructure, docker, docker-compose, or devops' },
  { name: 'security', color: 'e11d21', description: 'Vulnerabilities or security enhancements' },
  { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
  { name: 'architecture', color: '7057ff', description: 'System design and structural proposals' },
  { name: 'technical debt', color: 'fef2c0', description: 'Code cleanup, refactoring, or performance optimization' },
];

async function run() {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'sadiab47/AIOps_Hub';

  if (!token) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is not set.');
    console.log('Please set it using: $env:GITHUB_TOKEN="your_token" (PowerShell) or export GITHUB_TOKEN="your_token" (Bash)');
    process.exit(1);
  }

  console.log(`🚀 Creating professional labels for ${repo}...`);

  for (const label of LABELS) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/labels`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'AIOps-Hub-Setup-Script'
        },
        body: JSON.stringify(label)
      });

      if (response.status === 201) {
        console.log(`✅ Created label: "${label.name}"`);
      } else if (response.status === 422) {
        const updateResponse = await fetch(`https://api.github.com/repos/${repo}/labels/${encodeURIComponent(label.name)}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'AIOps-Hub-Setup-Script'
          },
          body: JSON.stringify({ color: label.color, description: label.description })
        });
        if (updateResponse.status === 200) {
          console.log(`🔄 Updated label: "${label.name}"`);
        } else {
          console.log(`⚠️ Failed to update label: "${label.name}" (Status: ${updateResponse.status})`);
        }
      } else {
        console.log(`⚠️ Failed to create label: "${label.name}" (Status: ${response.status})`);
      }
    } catch (error) {
      console.error(`❌ Error setting label "${label.name}":`, error.message);
    }
  }

  console.log('🎉 Label configuration complete!');
}

run();
