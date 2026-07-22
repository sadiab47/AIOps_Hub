import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(8),
  AI_ENCRYPTION_KEY: z.string().length(32, { message: 'AI_ENCRYPTION_KEY must be exactly 32 characters for AES-256' }).default('default-secret-key-aes-256-32b!a'),
  AI_TIMEOUT_MS: z.coerce.number().min(5000).max(300000).default(30000),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }
  return result.data;
}
