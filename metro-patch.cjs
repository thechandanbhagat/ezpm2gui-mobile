/**
 * Shim to fix metro 0.84.x exports map incompatibility with @expo/cli.
 * metro 0.84.x exposes internal paths under `package/private/...` but
 * @expo/cli still imports them as `package/src/...`.
 * This patches Node's CJS resolver to rewrite the broken paths at runtime,
 * without touching node_modules.
 */
const Module = require('module');

const _resolveFilename = Module._resolveFilename.bind(Module);

// Packages that moved from src/ deep imports to private/ wildcard exports
const METRO_PACKAGES = [
  'metro',
  'metro-cache',
  'metro-config',
  'metro-core',
  'metro-file-map',
  'metro-resolver',
  'metro-runtime',
  'metro-source-map',
  'metro-transform-plugins',
  'metro-transform-worker',
];

const SRC_RE = new RegExp(`^(${METRO_PACKAGES.join('|')})/src/(.+)$`);

Module._resolveFilename = function (request, parent, isMain, options) {
  const match = typeof request === 'string' && request.match(SRC_RE);
  if (match) {
    const rewritten = `${match[1]}/private/${match[2]}`;
    try {
      return _resolveFilename(rewritten, parent, isMain, options);
    } catch (_) {
      // fall through to original on failure
    }
  }
  return _resolveFilename(request, parent, isMain, options);
};
