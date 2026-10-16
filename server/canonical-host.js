function normalizedHost(value) {
  return String(value || '').trim().toLowerCase().replace(/:\d+$/, '');
}

export function canonicalRedirectMiddleware({ origin, redirectHosts = [], enabled = false }) {
  const canonical = new URL(origin);
  const canonicalHost = normalizedHost(canonical.hostname);
  const hosts = new Set(redirectHosts.map(normalizedHost).filter(host => host && host !== canonicalHost));

  return (req, res, next) => {
    const requestedHost = normalizedHost(req.hostname || req.get?.('host'));
    if (!enabled || !hosts.has(requestedHost)) return next();
    return res.redirect(308, `${canonical.origin}${req.originalUrl || req.url || '/'}`);
  };
}
