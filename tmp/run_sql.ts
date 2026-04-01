import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';

const sql = readFileSync('tmp/fix_final.sql', 'utf8');

console.log("Running SQL...");
const out = spawnSync('npx.cmd', ['@insforge/cli', 'db', 'query', sql, '-y'], { stdio: 'pipe' });
console.log("stdout:", out.stdout?.toString());
console.log("stderr:", out.stderr?.toString());
console.log("exit:", out.status);
