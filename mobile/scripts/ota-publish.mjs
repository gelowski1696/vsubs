import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mobileDir = path.join(rootDir, 'mobile');
const releaseDir = path.join(mobileDir, 'release');

const args = parseArgs(process.argv.slice(2));

if (hasFlag(args, 'help')) {
  printUsage(0);
}

const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.VSUBS_API_BASE_URL || 'http://127.0.0.1:3003/v1');
const clientId = args['client-id'] || process.env.VSUBS_CLIENT_ID || 'subman-mobile';
const email = args.email || process.env.VSUBS_ADMIN_EMAIL;
const password = args.password || process.env.VSUBS_ADMIN_PASSWORD;

if (!email || !password) {
  printUsage(1, 'Missing admin credentials. Use --email/--password or VSUBS_ADMIN_EMAIL/VSUBS_ADMIN_PASSWORD.');
}

const manifest = loadManifest(args.manifest);
const appVersion = args['app-version'] || manifest?.appVersion;
const bundleVersion = args['bundle-version'] || manifest?.bundleVersion;
const channel = args.channel || 'stable';
const releaseNotes = args['release-notes'] || `OTA release ${bundleVersion ?? ''}`.trim();
const mandatory = parseBoolean(args.mandatory, false);
const minSupported = args['min-supported'] || null;
const publish = !hasFlag(args, 'draft');

if (!appVersion || !bundleVersion) {
  printUsage(1, 'Missing version values. Provide --app-version and --bundle-version (or pass --manifest).');
}

const zipPath = resolveZipPath(args.zip, manifest);
if (!zipPath || !fs.existsSync(zipPath)) {
  throw new Error(`Bundle zip not found. Provide --zip or prepare release first. Tried: ${zipPath ?? '(none)'}`);
}

const zipStat = fs.statSync(zipPath);
if (zipStat.size <= 0) {
  throw new Error(`Bundle zip is empty: ${zipPath}`);
}

console.log('Publishing OTA release...');
console.log(`- Base URL: ${baseUrl}`);
console.log(`- Client ID: ${clientId}`);
console.log(`- Bundle: ${toPosixPath(path.relative(rootDir, zipPath))}`);
console.log(`- App version: ${appVersion}`);
console.log(`- Bundle version: ${bundleVersion}`);

const loginPayload = await requestJson('POST', `${baseUrl}/auth/login`, {
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Id': clientId,
  },
  body: JSON.stringify({ email, password }),
});
const loginData = unwrapEnvelope(loginPayload);
const accessToken = loginData?.accessToken;
if (!accessToken) {
  throw new Error('Login succeeded but access token is missing in response.');
}

const createPayload = await requestJson('POST', `${baseUrl}/mobile-updates/releases`, {
  headers: authHeaders(clientId, accessToken),
  body: JSON.stringify({
    platform: 'android',
    channel,
    appVersion,
    bundleVersion,
    releaseNotes,
    mandatory,
    minimumSupportedAppVersion: minSupported || undefined,
  }),
});
const release = unwrapEnvelope(createPayload);
const releaseId = release?.id;
if (!releaseId) {
  throw new Error('Release creation succeeded but release id is missing in response.');
}
console.log(`- Release created: ${releaseId}`);

const bundleBytes = fs.readFileSync(zipPath);
const form = new FormData();
form.append('bundle', new Blob([bundleBytes], { type: 'application/zip' }), path.basename(zipPath));

const uploadPayload = await requestJson('POST', `${baseUrl}/mobile-updates/releases/${releaseId}/upload`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'X-Client-Id': clientId,
  },
  body: form,
});
const uploadData = unwrapEnvelope(uploadPayload);
console.log(`- Bundle uploaded: ${uploadData?.fileName ?? path.basename(zipPath)}`);

let publishData = null;
if (publish) {
  const publishPayload = await requestJson('PATCH', `${baseUrl}/mobile-updates/releases/${releaseId}/publish`, {
    headers: authHeaders(clientId, accessToken),
    body: JSON.stringify({ publish: true }),
  });
  publishData = unwrapEnvelope(publishPayload);
  console.log(`- Published: ${publishData?.isPublished === true ? 'yes' : 'unknown'}`);
} else {
  console.log('- Draft mode: release not published');
}

console.log('\nDone.');
console.log(`Release ID: ${releaseId}`);
if (publish) {
  console.log(`Check endpoint: ${baseUrl}/mobile-updates/check?platform=android&channel=${encodeURIComponent(channel)}&appVersion=${encodeURIComponent(appVersion)}&bundleVersion=${encodeURIComponent(bundleVersion)}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const cur = argv[i];
    if (!cur.startsWith('--')) {
      continue;
    }
    const key = cur.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function hasFlag(parsed, key) {
  return parsed[key] === true || parsed[key] === 'true';
}

function normalizeBaseUrl(input) {
  return String(input || '').replace(/\/+$/, '');
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return fallback;
}

function loadManifest(manifestArg) {
  if (!manifestArg) {
    return null;
  }
  const manifestPath = path.isAbsolute(manifestArg)
    ? manifestArg
    : path.join(rootDir, manifestArg);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function resolveZipPath(zipArg, manifest) {
  if (zipArg) {
    return path.isAbsolute(zipArg) ? zipArg : path.join(rootDir, zipArg);
  }

  const manifestOtaPath = manifest?.files?.ota?.path;
  if (manifestOtaPath) {
    const normalized = manifestOtaPath.split('/').join(path.sep);
    return path.join(rootDir, normalized);
  }

  if (!fs.existsSync(releaseDir)) {
    return null;
  }
  const candidates = fs
    .readdirSync(releaseDir)
    .filter((name) => name.startsWith('ota-') && name.endsWith('.zip'))
    .map((name) => path.join(releaseDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] || null;
}

function authHeaders(clientId, accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-Client-Id': clientId,
  };
}

async function requestJson(method, url, options = {}) {
  const response = await fetch(url, {
    method,
    headers: options.headers,
    body: options.body,
  });

  const raw = await response.text();
  let parsed = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { raw };
    }
  }

  if (!response.ok) {
    const msg =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.raw ||
      `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`${method} ${url} failed: ${msg}`);
  }

  return parsed;
}

function unwrapEnvelope(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

function toPosixPath(input) {
  return input.split(path.sep).join('/');
}

function printUsage(exitCode, message) {
  if (message) {
    console.error(message);
    console.error('');
  }
  console.log('Usage:');
  console.log('  npm run -w mobile ota:publish -- --base-url http://<VPS_IP>:3003/v1 --client-id subman-mobile --email admin@vmjam.com --password Admin123! --app-version 1.0.1 --bundle-version web-1.0.1 --zip mobile/release/ota-web-1.0.1.zip');
  console.log('');
  console.log('Optional flags:');
  console.log('  --manifest <path>          Read app/bundle/zip from release manifest json');
  console.log('  --channel stable|beta      Default: stable');
  console.log('  --release-notes "text"     Release notes text');
  console.log('  --mandatory true|false     Default: false');
  console.log('  --min-supported 1.0.0      Minimum supported app version');
  console.log('  --draft                    Create + upload only, do not publish');
  console.log('  --help');
  process.exit(exitCode);
}

