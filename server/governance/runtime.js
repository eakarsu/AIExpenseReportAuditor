function validateRuntime(env = process.env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters.');
  }
  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL && (!env.DB_HOST || !env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD)) {
      throw new Error('Production database configuration is incomplete.');
    }
    const origins = String(env.CLIENT_URL || '').split(',').map((value) => value.trim());
    if (!env.CLIENT_URL || origins.includes('*')) {
      throw new Error('Production CLIENT_URL must be an explicit allowlist.');
    }
  }
  return true;
}

module.exports = { validateRuntime };

