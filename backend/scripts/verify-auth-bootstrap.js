const assert = require('assert');
const { ensureConfiguredAdminForLogin } = require('../src/services/adminBootstrapService');

(async () => {
  process.env.ADMIN_EMAIL = 'admin@cinegeracao.local';
  process.env.ADMIN_PASSWORD = 'Admin@123';

  const prismaStub = {
    admin: {
      upsert: async ({ create }) => ({ id: 'stub-admin-id', ...create })
    }
  };

  const admin = await ensureConfiguredAdminForLogin(prismaStub, 'admin@cinegeracao.local', 'Admin@123', 'Administrador');
  assert.ok(admin, 'Expected bootstrap service to create or update the configured admin');
  assert.strictEqual(admin.email, 'admin@cinegeracao.local');
  assert.strictEqual(admin.perfil, 'ADMIN');
  console.log('Auth bootstrap regression check passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
