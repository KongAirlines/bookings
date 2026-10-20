const { createHash } = require('node:crypto');

// Account IDs come only from the Gateway's authenticated Portal application.
// The service must be reachable only through that trusted Gateway boundary.
function demoAccount(accountId) {
  if (typeof accountId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)) {
    return null;
  }
  const id = accountId.toLowerCase();
  const suffix = createHash('sha256').update(id).digest('hex').slice(0, 12);
  return { id, username: `demo-${suffix}` };
}

module.exports = demoAccount;
