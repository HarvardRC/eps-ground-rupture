// The reference-environment driver (docs/app/ddd.md §2, Reference
// environment; §7.6; DD-12; ADR-0016).
//
//   perf/run.mjs [run|destroy|ssh|status] [--dry-run]
//
// run      create or reconcile the VM, measure, then destroy it once the
//          measurement run has completed and its report is downloaded
//          (a budget miss included); keep it after any failure.
// destroy  terraform destroy every resource the state records.
// ssh      an interactive session on a kept VM.
// status   the resources the state records and the instance's EC2 state;
//          changes nothing.
// --dry-run prints, in order, the commands the subcommand would run, and
//          runs none of them, checking no precondition.
//
// Node.js built-ins only. It works on the Terraform root that EGR_PERF_DIR
// names, by default this file's directory. It never prints key or state
// content: the per-run SSH key and known_hosts live in a fresh mkdtemp
// directory, deleted afterwards, never in ~/.ssh.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The runtime pin of docs/app/ddd.md §2; cloud-init.yaml installs the same on the VM. */
const NODE_PIN = 'v22.12.0';

/** RFC 5737 TEST-NET-1: the operator_cidr of every refresh-only apply, destroy, and plan (§7.6). */
const PLACEHOLDER_CIDR = '192.0.2.1/32';

const IP_LOOKUP = 'https://checkip.amazonaws.com';
const SSH_RETRY_MS = 5_000;
const SSH_WINDOW_MS = 5 * 60_000;
const MAX_UPTIME_S = 72_000;
const MEASURE = 'xvfb-run -a npx playwright test --project=measure --workers=1';
const UPTIME = "cut -d' ' -f1 /proc/uptime";
const DESTROY_TASK = './gradlew :subprojects:webapp:webappMeasureDestroy';
const NODE_PATH_EXPORT = 'export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"';

if (process.version !== NODE_PIN) {
  console.error(`run.mjs: Node.js ${process.version} is running; the pinned runtime is ${NODE_PIN}.`);
  console.error(`In subprojects/webapp, after ./gradlew :subprojects:webapp:npmCi: ${NODE_PATH_EXPORT}`);
  process.exit(1);
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WEBAPP_DIR = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(SCRIPT_DIR, '../../..');
const PERF_DIR = resolve(process.env.EGR_PERF_DIR || SCRIPT_DIR);

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const rest = argv.filter(arg => arg !== '--dry-run');
const SUBCOMMANDS = ['run', 'destroy', 'ssh', 'status'];
if (rest.length > 1 || (rest.length === 1 && !SUBCOMMANDS.includes(rest[0]))) {
  console.error('usage: perf/run.mjs [run|destroy|ssh|status] [--dry-run]');
  process.exit(2);
}
const SUBCOMMAND = rest[0] ?? 'run';

// ---------------------------------------------------------------------------
// Commands

class Failure extends Error {}

const quote = arg => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", `'\\''`)}'`);

/**
 * Run (or, under --dry-run, print only) one command. Every command is
 * printed first; `capture` keeps its standard output from the terminal
 * (for key and state content, which are never printed). Under --dry-run
 * the result is `{ status: 0, stdout: dry }`.
 */
function exec(cmd, args, { cwd = PERF_DIR, capture = false, interactive = false, env, dry = '' } = {}) {
  console.log(`+ ${[cmd, ...args].map(quote).join(' ')}`);
  if (DRY) return { status: 0, stdout: dry, stderr: '' };
  const stdio = interactive ? 'inherit' : capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'];
  const result = spawnSync(cmd, args, { cwd, stdio, env: env ?? process.env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) {
    console.error(`run.mjs: could not run ${cmd}: ${result.error.message}`);
    return { status: 127, stdout: '', stderr: String(result.error.message) };
  }
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/**
 * The one builder of every terraform command (§7.6, Terraform commands),
 * run in the Terraform root. operator_cidr joins every apply, destroy,
 * and plan, and no other command: the operator's /32 on the
 * create-or-reconcile apply only, the placeholder everywhere else.
 */
function terraform(args, { cidr = PLACEHOLDER_CIDR, ...options } = {}) {
  const takesCidr = ['apply', 'destroy', 'plan'].includes(args[0]);
  return exec('terraform', takesCidr ? [...args, '-var', `operator_cidr=${cidr}`] : args, options);
}

/** After a destroy that exits 0, the backup holds only resources that are gone, and the last key (§7.6, Access). */
function destroy() {
  const result = terraform(['destroy', '-auto-approve', '-input=false']);
  if (result.status === 0 && !DRY) rmSync(join(PERF_DIR, 'terraform.tfstate.backup'), { force: true });
  return result.status === 0;
}

/**
 * The addresses the state records. Before the first apply there is no
 * state file, and `terraform state list` exits 1 with "No state file was
 * found!" on standard error: exactly that reads as an empty state; any
 * other failure fails the subcommand.
 */
function stateList(dry = '') {
  const result = terraform(['state', 'list'], { capture: true, dry });
  if (result.status === 1 && result.stderr.includes('No state file was found!')) return [];
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Failure('terraform state list failed');
  }
  return result.stdout.split('\n').map(line => line.trim()).filter(Boolean);
}

/** One terraform output value, or null when the state no longer records it. */
function output(name, dry) {
  const result = terraform(['output', '-raw', name], { capture: true, dry });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

// ---------------------------------------------------------------------------
// Temporary directories: keys, known_hosts, saved plans, the payload.

const temporary = new Set();

function makeTemp(label) {
  if (DRY) return `<${label}>`;
  const dir = mkdtempSync(join(tmpdir(), 'egr-perf-'));
  temporary.add(dir);
  return dir;
}

function removeTemp(dir) {
  if (DRY || !dir) return;
  rmSync(dir, { recursive: true, force: true });
  temporary.delete(dir);
}

function removeAllTemp() {
  for (const dir of [...temporary]) removeTemp(dir);
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    removeAllTemp();
    process.exit(128 + ({ SIGHUP: 1, SIGINT: 2, SIGTERM: 15 })[signal]);
  });
}

// ---------------------------------------------------------------------------
// Access (§7.6): the key from the state into a 0600 file, ssh and scp as
// ubuntu on public_ip with a per-run known_hosts.

/** Extract the key and the address of the VM the state records; null when it records none. */
function connect() {
  const dir = makeTemp('tmpdir');
  const key = join(dir, 'key');
  const knownHosts = join(dir, 'known_hosts');
  const secret = terraform(['output', '-raw', 'ssh_private_key'], { capture: true, dry: '<key>' });
  const ip = output('public_ip', '<public_ip>');
  if (secret.status !== 0 || !secret.stdout || !ip) {
    removeTemp(dir);
    return null;
  }
  if (!DRY) writeFileSync(key, secret.stdout.endsWith('\n') ? secret.stdout : `${secret.stdout}\n`, { mode: 0o600 });
  // -F /dev/null: no file under the home directory's SSH configuration is read or written.
  const options = ['-F', '/dev/null', '-i', key, '-o', 'IdentitiesOnly=yes', '-o', `UserKnownHostsFile=${knownHosts}`, '-o', 'StrictHostKeyChecking=accept-new'];
  return { dir, ip, host: `ubuntu@${ip}`, options };
}

const batch = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10'];

function ssh(vm, remote, extra = {}) {
  return exec('ssh', [...vm.options, ...batch, vm.host, remote], extra);
}

function scp(vm, args) {
  return exec('scp', [...vm.options, ...batch, ...args]);
}

const sleep = ms => new Promise(done => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// run: steps 1–7 of §7.6.

/** `terraform version -json` within `~> 1.7` (§2); returns the version. */
function terraformVersion() {
  const result = terraform(['version', '-json'], { capture: true, dry: '{"terraform_version":"<version>"}' });
  if (DRY) return '<version>';
  if (result.status !== 0) throw new Failure('terraform is not on PATH or did not run; install Terraform ~> 1.7 (docs/app/ddd.md §2).');
  let version;
  try {
    version = JSON.parse(result.stdout).terraform_version;
  } catch {
    throw new Failure('terraform version -json printed no version.');
  }
  const [major, minor] = String(version).split('.').map(Number);
  if (major !== 1 || !(minor >= 7)) throw new Failure(`terraform ${version} is outside the constraint ~> 1.7 (docs/app/ddd.md §2).`);
  return version;
}

function requireProfile() {
  if (DRY) return;
  if (!process.env.TF_VAR_aws_profile) {
    throw new Failure('TF_VAR_aws_profile is not set: set egr.perf.awsProfile in ~/.gradle/gradle.properties (perf/README.md).');
  }
}

/** Step 1. */
function preconditions() {
  const status = exec('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: REPO_ROOT, capture: true });
  if (!DRY) {
    if (status.status !== 0) throw new Failure('git status failed.');
    if (status.stdout.trim()) {
      process.stderr.write(status.stdout);
      throw new Failure('The working tree is not clean: a reference run measures committed bytes only.');
    }
  }
  const version = terraformVersion();
  requireProfile();
  const preview = join(REPO_ROOT, 'subprojects/mkdocs/site-preview');
  if (!DRY && !existsSync(preview)) throw new Failure('subprojects/mkdocs/site-preview/ does not exist: run :subprojects:mkdocs:mkdocsPreview first.');
  const commit = exec('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, capture: true, dry: '<commit>' }).stdout.trim();
  const short = exec('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: REPO_ROOT, capture: true, dry: '<short sha>' }).stdout.trim();
  if (!DRY && (!commit || !short)) throw new Failure('git rev-parse failed.');
  return { version, commit, short };
}

/** The operator's public IPv4 address (§7.6, Terraform commands); a failed lookup ends the run. */
async function operatorIp() {
  if (DRY) {
    console.log(`# GET ${IP_LOOKUP}`);
    return '<ip>';
  }
  try {
    const response = await fetch(IP_LOOKUP, { signal: AbortSignal.timeout(15_000) });
    const ip = (await response.text()).trim();
    if (response.ok && /^(\d{1,3})(\.\d{1,3}){3}$/.test(ip) && ip.split('.').every(part => Number(part) <= 255)) return ip;
    throw new Error(`unexpected answer ${JSON.stringify(ip.slice(0, 40))}`);
  } catch (error) {
    throw new Failure(`Could not read the operator's public IP from ${IP_LOOKUP}: ${error.message}`);
  }
}

/** Step 2: create the VM, or reconcile what an earlier run left. */
async function createOrReconcile() {
  if (terraform(['init', '-input=false']).status !== 0) throw new Failure('terraform init failed.');
  if (stateList().length) {
    if (terraform(['apply', '-refresh-only', '-auto-approve', '-input=false']).status !== 0) throw new Failure('The refresh-only apply failed.');
    const left = stateList();
    console.log(`An earlier run left: ${left.length ? left.join(', ') : 'nothing, after the refresh'}.`);
    const instance = left.some(address => address.startsWith('aws_instance.'));
    const key = left.some(address => address.startsWith('tls_private_key.'));
    if (key && !instance) {
      console.log('Its VM is gone (it terminated itself, or an apply stopped before it existed): destroying the rest, so the new VM gets a new key.');
      if (!destroy()) throw new Failure('terraform destroy of the leftover failed.');
    } else if (instance) {
      console.log('Its VM still exists (a failed run kept it, or an interrupted run left it): the apply below reuses it.');
    } else {
      console.log('It holds no key and no VM: the apply below creates the VM and reconciles the rest.');
    }
  }
  const ip = await operatorIp();
  if (terraform(['apply', '-auto-approve', '-input=false'], { cidr: `${ip}/32` }).status !== 0) throw new Failure('The create-or-reconcile apply failed.');
}

/** Step 3: SSH reachable, cloud-init done; returns the VM and its seconds since boot. */
async function waitForVm() {
  const vm = connect();
  if (!vm) throw new Failure('The state records no VM key or address after the apply.');
  const deadline = Date.now() + SSH_WINDOW_MS;
  for (;;) {
    if (ssh(vm, 'true').status === 0) break;
    if (Date.now() + SSH_RETRY_MS > deadline) throw Object.assign(new Failure('No SSH connection within 5 minutes.'), { vm });
    await sleep(SSH_RETRY_MS);
  }
  // The boot time, read once the VM answers, so that a kept VM's lines name its
  // self-termination time even when cloud-init then fails.
  const boot = Number.parseFloat(ssh(vm, UPTIME, { capture: true, dry: '0' }).stdout);
  if (Number.isFinite(boot)) vm.bootedAt = Date.now() - boot * 1000;
  if (ssh(vm, 'timeout 900 cloud-init status --wait').status !== 0) {
    throw Object.assign(new Failure('cloud-init did not finish cleanly within 15 minutes (cloud-init status --wait).'), { vm });
  }
  const uptime = ssh(vm, UPTIME, { capture: true, dry: '0' });
  const seconds = Number.parseFloat(uptime.stdout);
  if (uptime.status !== 0 || !Number.isFinite(seconds)) throw Object.assign(new Failure('Could not read the VM\'s uptime.'), { vm });
  vm.bootedAt = Date.now() - seconds * 1000;
  return { vm, seconds };
}

/** The repository-relative files of the step-4 payload. */
function payloadPaths() {
  const webapp = relative(REPO_ROOT, WEBAPP_DIR);
  const configs = DRY ? ['tsconfig.json', 'tsconfig.node.json'] : readdirSync(WEBAPP_DIR).filter(name => /^tsconfig.*\.json$/.test(name)).sort();
  return [
    'subprojects/mkdocs/site-preview',
    'subprojects/mkdocs/mkdocs.yml',
    ...['package.json', 'package-lock.json', 'playwright.config.ts', 'playwright', ...configs].map(name => `${webapp}/${name}`),
    ...measureSources().map(file => relative(REPO_ROOT, file)),
  ];
}

/**
 * The src/ files the measure specs import: src/stats/quantile.ts and
 * whatever src/ files the specs under playwright/measure/ reach through
 * relative imports, with their own imports.
 */
function measureSources() {
  const seen = new Set();
  const found = new Set();
  const pending = [join(WEBAPP_DIR, 'src/stats/quantile.ts')];
  const measureDir = join(WEBAPP_DIR, 'playwright/measure');
  const walk = dir => (existsSync(dir) ? readdirSync(dir).flatMap(name => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)])) : []);
  pending.push(...walk(measureDir).filter(file => file.endsWith('.ts')));
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    if (file.startsWith(join(WEBAPP_DIR, 'src') + '/')) found.add(file);
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = resolve(dirname(file), match[1]);
      const candidate = [target, `${target}.ts`, target.replace(/\.js$/, '.ts'), join(target, 'index.ts')].find(path => existsSync(path) && statSync(path).isFile());
      if (candidate) pending.push(candidate);
    }
  }
  return [...found].sort();
}

/** Steps 4–6; returns the local report directory. */
function measure(vm, context) {
  const work = makeTemp('payload-dir');
  try {
    const tarball = join(work, 'payload.tgz');
    const tar = exec('tar', ['-czf', tarball, '-C', REPO_ROOT, ...payloadPaths()], { cwd: REPO_ROOT, env: { ...process.env, COPYFILE_DISABLE: '1' } });
    if (tar.status !== 0) throw new Failure('Packing the payload failed.');
    if (scp(vm, [tarball, `${vm.host}:payload.tgz`]).status !== 0) throw new Failure('Uploading the payload failed.');
    if (ssh(vm, 'rm -rf ~/egr && mkdir ~/egr && tar -xzf ~/payload.tgz -C ~/egr && rm -f ~/payload.tgz').status !== 0) throw new Failure('Unpacking the payload failed.');
  } finally {
    removeTemp(work);
  }

  const inWebapp = 'cd ~/egr/subprojects/webapp &&';
  if (ssh(vm, `${inWebapp} npm ci`).status !== 0) throw new Failure('npm ci failed on the VM.');
  if (ssh(vm, `${inWebapp} npx playwright install --with-deps chromium`).status !== 0) throw new Failure('Installing Chromium failed on the VM.');
  const env = {
    EGR_PERF_RUN_ID: context.runId,
    EGR_SOURCE_COMMIT: context.commit,
    EGR_SOURCE_TREE_CLEAN: 'true',
    EGR_TERRAFORM_VERSION: context.version,
    ...(process.env.EGR_BASE_URL ? { EGR_BASE_URL: process.env.EGR_BASE_URL } : {}),
  };
  const assignments = Object.entries(env).map(([name, value]) => `${name}=${quote(value)}`).join(' ');
  if (ssh(vm, `${inWebapp} ${assignments} ${MEASURE}`).status !== 0) throw new Failure('The measure run failed (exit status non-zero): an invalid repetition, a failed assertion, or no measure spec.');

  const parent = join(WEBAPP_DIR, 'build/perf');
  const target = join(parent, context.runId);
  if (!DRY) {
    mkdirSync(parent, { recursive: true });
    if (existsSync(target)) throw new Failure(`${relative(REPO_ROOT, target)} already exists.`);
  }
  // scp -r into a directory that does not yet exist copies the contents, adding no measure/ level.
  if (scp(vm, ['-r', `${vm.host}:egr/subprojects/webapp/build/measure`, target]).status !== 0) throw new Failure('Downloading the report failed.');
  return target;
}

/** Step 7's lines for a kept VM, from what the state still records. */
function keptVm(vm) {
  const id = output('instance_id', '<instance_id>');
  if (!id) {
    console.error('');
    console.error('The state records no VM. If it records anything else (node perf/run.mjs status),');
    console.error(`remove it with ${DESTROY_TASK}.`);
    return;
  }
  const ip = output('public_ip', '<public_ip>') ?? 'unknown (the state records none)';
  const ends = vm?.bootedAt ? new Date(vm.bootedAt + 24 * 3600_000).toISOString().replace(/\.\d+Z$/, 'Z') : 'unknown';
  console.error('');
  console.error('The reference VM is kept for diagnosis.');
  console.error(`  Instance ID:      ${id}`);
  console.error(`  Public IP:        ${ip}`);
  console.error(`  Connect:          in subprojects/webapp, ${NODE_PATH_EXPORT}`);
  console.error('                    then node perf/run.mjs ssh');
  console.error(`  Self-termination: ${ends} (24 hours after first boot)`);
  console.error(`  Destroy:          ${DESTROY_TASK}`);
  console.error('  The key pair, the security group, and the Terraform state (with the VM\'s');
  console.error('  private key) outlast the self-termination until that command runs.');
}

function runId(short) {
  const stamp = new Date(START).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${stamp}-${short}`;
}

const START = Date.now();

async function run() {
  const { version, commit, short } = preconditions();
  const context = { version, commit, runId: runId(short) };
  let vm = null;
  let reported = null;
  try {
    await createOrReconcile();
    let waited = await waitForVm();
    vm = waited.vm;
    if (waited.seconds > MAX_UPTIME_S) {
      console.log(`The VM has been up ${Math.round(waited.seconds)} s, past 20 hours: it would reach its 24-hour shutdown within the run. Replacing it.`);
      removeTemp(vm.dir);
      vm = null;
      if (!destroy()) throw new Failure('terraform destroy of the aging VM failed.');
      await createOrReconcile();
      waited = await waitForVm();
      vm = waited.vm;
      if (waited.seconds > MAX_UPTIME_S) throw new Failure('The replacement VM also reports more than 20 hours of uptime.');
    }
    reported = measure(vm, context);
  } catch (error) {
    console.error(error instanceof Failure ? `run.mjs: ${error.message}` : `run.mjs: unexpected error: ${error?.stack ?? error}`);
    vm ??= error?.vm ?? null;
    if (vm) removeTemp(vm.dir);
    keptVm(vm);
    return 1;
  }
  removeTemp(vm.dir);
  console.log(`Report: ${relative(REPO_ROOT, reported)}/report.json`);
  // Step 7: the run has completed and its report is downloaded, a budget miss included.
  if (destroy()) return 0;
  console.error('run.mjs: the destroy failed. The run has completed and its report stays valid once the VM is destroyed.');
  keptVm(vm);
  return 1;
}

// ---------------------------------------------------------------------------
// destroy, ssh, status

function destroySubcommand() {
  terraformVersion();
  requireProfile();
  if (terraform(['init', '-input=false']).status !== 0) throw new Failure('terraform init failed.');
  return destroy() ? 0 : 1;
}

function sshSubcommand() {
  terraformVersion();
  const vm = connect();
  if (!vm) throw new Failure('The state records no VM to connect to.');
  try {
    return exec('ssh', [...vm.options, vm.host], { interactive: true }).status;
  } finally {
    removeTemp(vm.dir);
  }
}

function statusSubcommand() {
  terraformVersion();
  requireProfile();
  const addresses = stateList(DRY ? 'aws_instance.reference' : '');
  if (!addresses.length) {
    console.log('state empty');
    return 0;
  }
  if (terraform(['init', '-input=false']).status !== 0) throw new Failure('terraform init failed.');
  // A saved plan holds the state and its key: a fresh directory, deleted in finally.
  const dir = makeTemp('tmpdir');
  try {
    const plan = join(dir, 'status.tfplan');
    if (terraform(['plan', '-refresh-only', '-input=false', `-out=${plan}`]).status !== 0) throw new Failure('terraform plan -refresh-only failed.');
    const shown = terraform(['show', '-json', plan], { capture: true, dry: '{}' });
    if (shown.status !== 0) throw new Failure('terraform show -json failed.');
    if (DRY) return 0;
    let parsed;
    try {
      parsed = JSON.parse(shown.stdout);
    } catch {
      throw new Failure('terraform show -json printed no JSON.');
    }
    const modules = [];
    const collect = module => {
      if (!module) return;
      modules.push(module);
      (module.child_modules ?? []).forEach(collect);
    };
    collect(parsed?.prior_state?.values?.root_module);
    const resources = modules.flatMap(module => module.resources ?? []);
    for (const address of addresses) {
      if (!address.startsWith('aws_instance.')) {
        console.log(address);
        continue;
      }
      const instance = resources.find(resource => resource.address === address);
      console.log(`${address} ${instance?.values?.instance_state ?? 'terminated'}`);
    }
    return 0;
  } finally {
    removeTemp(dir);
  }
}

// ---------------------------------------------------------------------------

const subcommands = { run, destroy: destroySubcommand, ssh: sshSubcommand, status: statusSubcommand };

try {
  process.exitCode = await subcommands[SUBCOMMAND]();
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  console.error(`run.mjs: ${error.message}`);
  process.exitCode = 1;
} finally {
  removeAllTemp();
}
