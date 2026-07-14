import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function defaultFastRentalLocalStorageRoot(): string | undefined {
  const sibling = path.resolve(__dirname, '../../../../../Fast Rental/apps/backend/.local-storage');
  return existsSync(sibling) ? sibling : undefined;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4001),
    PUBLIC_API_BASE_URL: z.string().url(),
    FRONTEND_ORIGIN: z.string().min(1),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_SIGNED_DOWNLOAD_EXPIRES_SECONDS: z.coerce.number().default(300),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_ENABLED: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    EMAIL_FROM: z.string().optional(),
    EMAIL_REPLY_TO: z.string().optional(),
    FAST_RENTAL_APP_URL: z.string().optional(),
    FAST_RENTAL_LOCAL_STORAGE_ROOT: z.string().optional(),
    RATE_LIMIT_LEADS_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_LEADS_MAX: z.coerce.number().default(20),
    RATE_LIMIT_READS_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_READS_MAX: z.coerce.number().default(240),
  })
  .superRefine((data, ctx) => {
    if (data.EMAIL_ENABLED) {
      if (!data.RESEND_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['RESEND_API_KEY'],
          message: 'RESEND_API_KEY is required when EMAIL_ENABLED=true',
        });
      }
      if (!data.EMAIL_FROM) {
        ctx.addIssue({
          code: 'custom',
          path: ['EMAIL_FROM'],
          message: 'EMAIL_FROM is required when EMAIL_ENABLED=true',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  FAST_RENTAL_LOCAL_STORAGE_ROOT:
    parsed.data.FAST_RENTAL_LOCAL_STORAGE_ROOT ??
    (parsed.data.NODE_ENV === 'development' ? defaultFastRentalLocalStorageRoot() : undefined),
};
