const routes = new Map();
let currentRoute = null;
let notFoundHandler = null;

function addRoute(pattern, handler) {
  // Convert route pattern like '/cook/:id/edit' to a regex
  // :param segments become named capture groups
  const paramNames = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const regex = new RegExp('^' + regexStr + '$');
  routes.set(pattern, { regex, paramNames, handler });
}

function onNotFound(handler) {
  notFoundHandler = handler;
}

function navigate(path) {
  window.location.hash = '#' + path;
}

function resolve() {
  const hash = window.location.hash.slice(1) || '/cook';
  console.log('[Router] resolving', hash);

  for (const [pattern, route] of routes) {
    const match = hash.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      currentRoute = { pattern, path: hash, params };
      route.handler(params);
      window.dispatchEvent(new CustomEvent('route-changed', { detail: currentRoute }));
      return;
    }
  }

  // No match
  currentRoute = null;
  if (notFoundHandler) {
    notFoundHandler(hash);
  } else {
    navigate('/cook');
  }
}

function getCurrentRoute() {
  return currentRoute;
}

function start() {
  window.addEventListener('hashchange', resolve);
  resolve();
}

function stop() {
  window.removeEventListener('hashchange', resolve);
}

export { addRoute, onNotFound, navigate, resolve, getCurrentRoute, start, stop };
