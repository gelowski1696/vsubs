import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mobileDir = path.join(rootDir, 'mobile');
const releaseDir = path.join(mobileDir, 'release');

const args = parseArgs(process.argv.slice(2));

const appVersion = args['app-version'] || args.v || null;
const bundleVersion = args['bundle-version'] || args.b || null;
const versionCodeRaw = args['version-code'] || args.c || null;
const otaChannel = args.channel || null;
const skipBuild = hasFlag(args, 'skip-build');
const skipSync = hasFlag(args, 'skip-sync');
const skipApk = hasFlag(args, 'skip-apk');
const skipOta = hasFlag(args, 'skip-ota');
const dryRun = hasFlag(args, 'dry-run');

if (!appVersion || !bundleVersion || !versionCodeRaw) {
  printUsageAndExit(
    'Missing required args. Provide --app-version, --bundle-version, and --version-code.',
  );
}

const versionCode = Number(versionCodeRaw);
if (!Number.isInteger(versionCode) || versionCode <= 0) {
  printUsageAndExit('--version-code must be a positive integer.');
}

const androidGradlePath = path.join(mobileDir, 'android', 'app', 'build.gradle');
const appInfoPath = path.join(mobileDir, 'src', 'app', 'core', 'config', 'app-info.ts');
const packageJsonPath = path.join(mobileDir, 'package.json');

await ensureDir(releaseDir);

updatePackageJson(packageJsonPath, appVersion, dryRun);
updateAppInfo(appInfoPath, appVersion, bundleVersion, otaChannel, dryRun);
updateAndroidGradle(androidGradlePath, versionCode, appVersion, dryRun);

if (!dryRun) {
  if (!skipBuild) {
    await run('npm', ['run', '-w', 'mobile', 'build'], rootDir);
  }
  if (!skipSync) {
    await run('npm', ['run', '-w', 'mobile', 'cap:sync'], rootDir);
  }
  if (!skipApk) {
    const releaseScript = process.platform === 'win32' ? 'android:release' : 'android:release:linux';
    await run('npm', ['run', '-w', 'mobile', releaseScript], rootDir);
  }
}

const result = {
  appVersion,
  bundleVersion,
  versionCode,
  generatedAt: new Date().toISOString(),
  files: {},
};

if (!skipApk) {
  const apkPath = path.join(
    mobileDir,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    'release',
    'app-release.apk',
  );
  if (!dryRun && fs.existsSync(apkPath)) {
    const copiedApkName = `vsubs-v${appVersion}-${versionCode}.apk`;
    const copiedApkPath = path.join(releaseDir, copiedApkName);
    fs.copyFileSync(apkPath, copiedApkPath);
    result.files.apk = {
      path: toPosixPath(path.relative(rootDir, copiedApkPath)),
      sizeBytes: fs.statSync(copiedApkPath).size,
      sha256: sha256File(copiedApkPath),
    };
  } else {
    result.files.apk = {
      path: toPosixPath(path.relative(rootDir, apkPath)),
      note: dryRun ? 'dry-run: not generated' : 'not found',
    };
  }
}

if (!skipOta) {
  const distDir = path.join(mobileDir, 'dist', 'mobile');
  const otaZipName = `ota-${bundleVersion}.zip`;
  const otaZipPath = path.join(releaseDir, otaZipName);
  if (!dryRun) {
    if (!fs.existsSync(distDir)) {
      throw new Error(`Cannot create OTA zip. Dist folder not found: ${distDir}`);
    }
    await zipDirectory(distDir, otaZipPath);
  }

  if (!dryRun && fs.existsSync(otaZipPath)) {
    result.files.ota = {
      path: toPosixPath(path.relative(rootDir, otaZipPath)),
      sizeBytes: fs.statSync(otaZipPath).size,
      sha256: sha256File(otaZipPath),
    };
  } else {
    result.files.ota = {
      path: toPosixPath(path.relative(rootDir, otaZipPath)),
      note: dryRun ? 'dry-run: not generated' : 'not found',
    };
  }
}

const manifestPath = path.join(releaseDir, `release-${bundleVersion}.json`);
if (!dryRun) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log('\nRelease preparation complete.');
console.log(`- App version: ${appVersion}`);
console.log(`- Bundle version: ${bundleVersion}`);
console.log(`- Version code: ${versionCode}`);
if (!dryRun) {
  console.log(`- Manifest: ${toPosixPath(path.relative(rootDir, manifestPath))}`);
}
console.log(`- Dry run: ${dryRun ? 'yes' : 'no'}`);

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

function printUsageAndExit(message) {
  console.error(message);
  console.error('\nUsage:');
  console.error(
    'node mobile/scripts/release-prep.mjs --app-version 1.0.1 --bundle-version web-1.0.1 --version-code 2 [--channel stable] [--skip-apk] [--skip-ota] [--skip-sync] [--skip-build] [--dry-run]',
  );
  process.exit(1);
}

function updatePackageJson(filePath, nextVersion, isDryRun) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.version = nextVersion;
  if (isDryRun) {
    return;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
}

function updateAppInfo(filePath, nextVersion, nextBundleVersion, nextChannel, isDryRun) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/version:\s*'[^']*'/, `version: '${nextVersion}'`);
  text = text.replace(/bundleVersion:\s*'[^']*'/, `bundleVersion: '${nextBundleVersion}'`);
  if (nextChannel) {
    text = text.replace(/otaChannel:\s*'[^']*'/, `otaChannel: '${nextChannel}'`);
  }
  if (!isDryRun) {
    fs.writeFileSync(filePath, text, 'utf8');
  }
}

function updateAndroidGradle(filePath, nextVersionCode, nextVersionName, isDryRun) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/versionCode\s+\d+/, `versionCode ${nextVersionCode}`);
  text = text.replace(/versionName\s+"[^"]+"/, `versionName "${nextVersionName}"`);
  if (!isDryRun) {
    fs.writeFileSync(filePath, text, 'utf8');
  }
}

async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
      }
    });
  });
}

async function zipDirectory(sourceDir, targetZipPath) {
  if (fs.existsSync(targetZipPath)) {
    fs.rmSync(targetZipPath, { force: true });
  }

  if (process.platform === 'win32') {
    const sourceEscaped = sourceDir.replace(/\\/g, '\\\\');
    const targetEscaped = targetZipPath.replace(/\\/g, '\\\\');
    const cmd =
      `$src='${sourceEscaped}\\\\*';` +
      `$dst='${targetEscaped}';` +
      `Compress-Archive -Path $src -DestinationPath $dst -Force`;
    await run('powershell', ['-NoProfile', '-Command', cmd], rootDir);
    return;
  }

  await run('zip', ['-qr', targetZipPath, '.'], sourceDir);
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

async function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function toPosixPath(input) {
  return input.split(path.sep).join('/');
}
