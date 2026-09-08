/**
 * Hash routing. Simple on purpose: the whole app is five screens deep at most,
 * and hash URLs work on GitHub Pages without any server configuration.
 */

const routes = [];
let notFound = null;
let current = null;

export function route(pattern, handler) {
  // '#/topic/:id' -> regex with a named group
  const names = [];
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/\//g, '\\/')
        .replace(/:(\w+)/g, (_, name) => {
          names.push(name);
          return '([^/]+)';
        }) +
      '$'
  );
  routes.push({ regex, names, handler });
}

export function fallback(handler) {
  notFound = handler;
}

export function navigate(path, { replace = false } = {}) {
  const hash = path.startsWith('#') ? path : '#' + path;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

export function back(fallbackPath = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallbackPath, { replace: true });
}

export function currentPath() {
  return current;
}

function resolve() {
  const path = window.location.hash.replace(/^#/, '') || '/';
  current = path;

  for (const { regex, names, handler } of routes) {
    const match = path.match(regex);
    if (!match) continue;
    const params = {};
    names.forEach((name, i) => {
      params[name] = decodeURIComponent(match[i + 1]);
    });
    handler(params);
    return;
  }
  if (notFound) notFound(path);
}

export function start() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
