import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import './setup.mjs';

const cwd = fileURLToPath(new URL('../', import.meta.url));
function run(args) {
  const result = spawnSync('docker', args, { cwd, env: process.env, stdio: 'inherit' });
  if (result.error) {
    console.error('No se pudo ejecutar Docker. Instala e inicia Docker Desktop.');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

const args = ['build'];
// Docker's predefined proxy arguments are excluded from image history. Pass
// their names, never interpolate credentials or proxy values into shell code.
for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) {
  if (process.env[name]) args.push('--build-arg', name);
}
if (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy) {
  // Installation only contacts the public registry in the frozen lockfile.
  // Host DNS exclusions do not necessarily work inside Docker; route these
  // requests through the configured proxy. Runtime local services are separate.
  args.push('--build-arg', 'NO_PROXY=', '--build-arg', 'no_proxy=');
  const proxyHosts = new Set(['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy']
    .map(name => process.env[name]).filter(Boolean).map(value => new URL(value).hostname));
  // Managed environments may resolve their egress proxy only in the host.
  // Reuse that trusted resolution in BuildKit without changing proxy routing.
  for (const hostname of proxyHosts) {
    try {
      const { address } = await lookup(hostname, { family: 4 });
      args.push('--add-host', `${hostname}:${address}`);
    } catch { /* Docker may have its own working resolver; keep that fallback. */ }
  }
}
// Preserve TLS verification when a managed/corporate environment supplies
// an extra public CA. BuildKit mounts it only for installation; no CA or
// proxy configuration is copied into the application image.
if (process.env.NODE_EXTRA_CA_CERTS) {
  await access(process.env.NODE_EXTRA_CA_CERTS);
  args.push('--secret', `id=build_ca,src=${process.env.NODE_EXTRA_CA_CERTS}`);
}
args.push('-t', 'centraliza-local:latest', '.');
run(args);
run(['compose', 'up', '-d', '--no-build']);
