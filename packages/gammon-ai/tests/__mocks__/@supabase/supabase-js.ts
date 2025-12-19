const createQueryBuilder = () => {
  const builder = {
    select: (_columns?: string) => builder,
    eq: (_column: string, _value: unknown) => builder,
    update: (_values: unknown) => builder,
    single: async () => ({ data: null, error: null })
  } as const;

  return builder;
};

export const createClient = (_url?: string, _key?: string) => ({
  auth: {
    getUser: async (_token: string) => ({
      data: {
        user: {
          id: 'mock-supabase-user',
          email: 'mock@example.com',
          user_metadata: { name: 'Mock User' }
        }
      },
      error: null
    })
  },
  from: (_table: string) => createQueryBuilder()
});

export default { createClient };
