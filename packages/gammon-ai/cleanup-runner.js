(async () => {
  try {
    const mod = require('./dist/services/gameSessionRegistry');
    const registry = mod.GameSessionRegistry || (mod.default && mod.default.GameSessionRegistry) || mod;
    const fn = registry && registry.cleanupExpiredSessions;

    if (typeof fn !== 'function') {
      console.error('ERROR: cleanupExpiredSessions function not found via GameSessionRegistry export');
      process.exit(2);
    }

    console.log('INFO: invoking cleanupExpiredSessions...');
    await fn.call(registry);
    console.log('CLEANUP_OK');
    process.exit(0);
  } catch (err) {
    console.error('CLEANUP_ERR');
    console.error(err && (err.stack || err));
    process.exit(1);
  }
})();
