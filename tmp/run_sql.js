const { execSync } = require('child_process');
const fs = require('fs');

const sql = fs.readFileSync('tmp/fix_rls.sql', 'utf8');

try {
  console.log("Running SQL...");
  // Escape newlines for CLI
  // Actually, we can just execute the CLI command directly, bypassing bash/cmd quoting limits if we spawn it carefully,
  // but it's simpler to format it as a single line for the shell.
  const singleLineSql = sql.replace(/\n/g, ' ').replace(/"/g, '\\"');
  const out = execSync(`npx @insforge/cli db query "${singleLineSql}" -y`, { stdio: 'inherit' });
  console.log("Success");
} catch (e) {
  console.error("Error running SQL:", e.message);
}
