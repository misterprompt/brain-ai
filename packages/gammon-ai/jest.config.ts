import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'vue'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@vue/test-utils$': '<rootDir>/node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js',
    '^\.\./src/(.*)\.js$': '<rootDir>/src/$1.ts',
    '^\.\./\.\./src/(.*)\.js$': '<rootDir>/src/$1.ts',
    '^\.\./\.\./src/websocket/(.*)\.js$': '<rootDir>/src/websocket/$1.ts',
    '^\.\./\.\./src/websocket/tournamentServer\.js$': '<rootDir>/src/websocket/tournamentServer.ts',
    '^\.\./websocket/(.*)\.js$': '<rootDir>/src/websocket/$1.ts',
    '^\.\./services/(.*)\.js$': '<rootDir>/src/services/$1.ts',
    '^@supabase/supabase-js$': '<rootDir>/tests/__mocks__/@supabase/supabase-js.ts'
  },
  testMatch: ['<rootDir>/tests/**/*.(test|spec).ts'],
  collectCoverage: false,
  clearMocks: true
};

export default config;
