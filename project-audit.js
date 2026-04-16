#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.env', '.env.example', '.yml', '.yaml', '.html', '.css']);

const secretPatterns = [
  /AIza[0-9A-Za-z_-]{35}/g,
  /AIza[0-9A-Za-z\-_]{35}/g,
  /ghp_[A-Za-z0-9_]{36}/g,
  /gho_[A-Za-z0-9_]{36}/g,
  /ghu_[A-Za-z0-9_]{36}/g,
  /ghs_[A-Za-z0-9_]{36}/g,
  /AKIA[0-9A-Z]{16}/g,
  /(?:sk_live|sk_test)_[A-Za-z0-9]{24,48}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /-----BEGIN PRIVATE KEY-----/g,
  /-----BEGIN RSA PRIVATE KEY-----/g,
  /password\s*[:=]\s*['\"][^'\"]+['\"]/gi,
  /secret\s*[:=]\s*['\"][^'\"]+['\"]/gi,
  /api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]/gi,
  /client_secret\s*[:=]\s*['\"][^'\"]+['\"]/gi,
];

const sensitiveEnvNames = [
  'API_KEY',
  'SECRET',
  'TOKEN',
  'PASSWORD',
  'PRIVATE_KEY',
  'ACCESS_KEY',
  'AUTH_DOMAIN',
  'DATABASE_URL',
  'CLIENT_SECRET',
  'SERVICE_ACCOUNT',
  'GEMINI_API_KEY',
  'FIREBASE_API_KEY',
];

const specialAllowedProcessEnv = new Set(['VITE_', 'NODE_ENV', 'DISABLE_HMR']);
const forbiddenProcessEnv = new Set(['GEMINI_API_KEY', 'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID']);

function isBinary(buffer) {
  for (let i = 0; i < 24 && i < buffer.length; i++) {
    const code = buffer[i];
    if (code === 0) return true;
  }
  return false;
}

function walkDirectory(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || filePath.endsWith('.env') || filePath.endsWith('.env.example');
}

function checkFileContent(filePath, content) {
  const issues = [];
  const lines = content.split(/\r?\n/);

  if (/(?:process\.env\.(?!VITE_|NODE_ENV|DISABLE_HMR))/g.test(content)) {
    const matches = [...content.matchAll(/process\.env\.([A-Za-z0-9_]+)/g)];
    for (const match of matches) {
      const key = match[1];
      if (![...specialAllowedProcessEnv].some(prefix => key.startsWith(prefix))) {
        issues.push({ type: 'ProcessEnv', message: `Unexpected client-side environment access to process.env.${key}` });
      }
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lowerLine = line.toLowerCase();

    for (const variable of sensitiveEnvNames) {
      if (lowerLine.includes(variable.toLowerCase()) && /[=:\s](['\"]?)[^'\"]+\1/.test(line)) {
        issues.push({ type: 'SensitiveString', message: `Potential sensitive value for ${variable} on line ${lineIndex + 1}` });
      }
    }

    if (/use(State|Effect|Memo|Callback|Reducer|Ref)\s*\(/.test(line) && !content.includes('function App') && !content.includes('export default function App')) {
      issues.push({ type: 'ReactHook', message: `Potential top-level hook usage on line ${lineIndex + 1}` });
    }

    for (const pattern of secretPatterns) {
      if (pattern.test(line)) {
        issues.push({ type: 'SecretLiteral', message: `Possible hard-coded secret on line ${lineIndex + 1}` });
      }
    }
  }

  return issues;
}

function scanRepo() {
  const results = { files: [], secrets: [], envIssues: [], reactIssues: [], audit: null, build: null };
  walkDirectory(ROOT, (filePath) => {
    if (!shouldScanFile(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(ROOT, filePath);

    const fileIssues = checkFileContent(relPath, content);
    if (fileIssues.length > 0) {
      results.files.push({ file: relPath, issues: fileIssues });
    }

    if (path.basename(filePath).startsWith('.env')) {
      const envLines = content.split(/\r?\n/);
      envLines.forEach((line, index) => {
        if (!line || line.startsWith('#')) return;
        const [key, value] = line.split('=');
        if (!value) return;
        const normalized = key.trim().toUpperCase();
        if (sensitiveEnvNames.some(name => normalized.includes(name))) {
          results.envIssues.push({ file: relPath, line: index + 1, key: normalized, value: value.trim() });
        }
      });
    }
  });
  return results;
}

function runNpmAudit() {
  try {
    const raw = execSync('npm audit --json', { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    const audit = JSON.parse(raw);
    if (audit.error) return { error: audit.error }; 
    return audit;
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

function runBuildCheck() {
  try {
    execSync('npm run build', { stdio: 'ignore' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

function summarize(issues) {
  const lines = [];
  lines.push('Project audit summary');
  lines.push('====================');

  if (issues.files.length === 0 && issues.envIssues.length === 0) {
    lines.push('No suspicious file contents found.');
  } else {
    for (const file of issues.files) {
      lines.push(`\nFile: ${file.file}`);
      for (const issue of file.issues) {
        lines.push(`  - [${issue.type}] ${issue.message}`);
      }
    }
    for (const env of issues.envIssues) {
      lines.push(`\nEnv file: ${env.file} line ${env.line} => ${env.key}`);
    }
  }

  if (issues.audit) {
    if (issues.audit.error) {
      lines.push(`\nnpm audit failed: ${issues.audit.error}`);
    } else if (issues.audit.metadata && issues.audit.metadata.vulnerabilities) {
      const vuln = issues.audit.metadata.vulnerabilities;
      const total = Object.values(vuln).reduce((sum, count) => sum + count, 0);
      lines.push(`\nnpm audit vulnerabilities: ${total} (low ${vuln.low}, moderate ${vuln.moderate}, high ${vuln.high}, critical ${vuln.critical})`);
    }
  }

  if (issues.build) {
    lines.push(`\nBuild check: ${issues.build.success ? 'OK' : 'FAILED'}`);
    if (!issues.build.success) {
      lines.push(`  - ${issues.build.error}`);
    }
  }

  return lines.join('\n');
}

function main() {
  console.log('Running project audit...');
  const issues = scanRepo();
  issues.audit = runNpmAudit();
  issues.build = runBuildCheck();
  console.log(summarize(issues));
  if (!issues.build.success || issues.audit?.metadata?.vulnerabilities?.high || issues.audit?.metadata?.vulnerabilities?.critical || issues.files.length > 0 || issues.envIssues.length > 0) {
    process.exitCode = 1;
  }
}

main();
