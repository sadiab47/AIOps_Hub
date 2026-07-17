const LABELS = [
  { name: 'type/bug', color: 'd73a4a', description: 'Something isn\'t working' },
  { name: 'type/feature', color: 'a2eeef', description: 'New feature or request' },
  { name: 'type/docs', color: '0075ca', description: 'Improvements or additions to documentation' },
  { name: 'type/refactor', color: '7057ff', description: 'A code change that neither fixes a bug nor adds a feature' },
  { name: 'priority/critical', color: 'b60205', description: 'Blocks progress or breaks production' },
  { name: 'priority/high', color: 'd93f0b', description: 'High priority issue' },
  { name: 'priority/medium', color: 'fbca04', description: 'Medium priority issue' },
  { name: 'priority/low', color: '0e8a16', description: 'Low priority issue' },
  { name: 'status/in-progress', color: 'fef2c0', description: 'Work is currently in progress' },
  { name: 'status/review-needed', color: 'c2e0c6', description: 'Ready for code review or testing' },
  { name: 'status/on-hold', color: 'ffffff', description: 'Waiting on external dependencies or feedback' },
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
