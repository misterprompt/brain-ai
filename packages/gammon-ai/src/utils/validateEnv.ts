type ValidateEnvOptions = {
  allowMissingDatabase?: boolean;
};

export function validateEnv(requiredKeys?: string[], options?: ValidateEnvOptions): Record<string, string> {
  const missingKeys = new Set<string>();
  const values: Record<string, string> = {};

  const readEnv = (key: string) => {
    const value = process.env[key];

    if (value == null || value === '') {
      missingKeys.add(key);
      return;
    }

    values[key] = value;
  };

  if (Array.isArray(requiredKeys)) {
    for (const key of requiredKeys) {
      readEnv(key);
    }
  }

  const allowMissingDatabase = Boolean(options?.allowMissingDatabase);

  if (allowMissingDatabase) {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl && databaseUrl !== '') {
      values.DATABASE_URL = databaseUrl;
    } else {
      const pgKeys = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGPORT'];
      for (const key of pgKeys) {
        readEnv(key);
      }
    }
  }

  if (missingKeys.size > 0) {
    throw new Error(`Missing required environment variables: ${Array.from(missingKeys).join(', ')}`);
  }

  return values;
}
