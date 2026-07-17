import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { sanitizeConfiguredEmailAddress } from '../utils/emailSafe.js';

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
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
    TRUSTED_HOSTS: z.string().optional(),
    JSON_BODY_LIMIT: z.string().default('100kb'),
    HTTP_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().positive().default(65_000),
    HTTP_HEADERS_TIMEOUT_MS: z.coerce.number().int().positive().default(66_000),
    HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    DB_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(10_000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
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
      } else if (!sanitizeConfiguredEmailAddress(data.EMAIL_FROM)) {
        ctx.addIssue({
          code: 'custom',
          path: ['EMAIL_FROM'],
          message: 'EMAIL_FROM must be a valid email address or "Name <email@domain>"',
        });
      }
    }

    if (data.EMAIL_REPLY_TO && !sanitizeConfiguredEmailAddress(data.EMAIL_REPLY_TO)) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_REPLY_TO'],
        message: 'EMAIL_REPLY_TO must be a valid email address without control characters',
      });
    }

    if (data.NODE_ENV === 'production') {
      if (['debug', 'trace'].includes(data.LOG_LEVEL)) {
        ctx.addIssue({
          code: 'custom',
          path: ['LOG_LEVEL'],
          message: 'LOG_LEVEL must not be debug or trace in production',
        });
      }

      if (!data.PUBLIC_API_BASE_URL.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: ['PUBLIC_API_BASE_URL'],
          message: 'PUBLIC_API_BASE_URL must use https in production',
        });
      }

      for (const origin of data.FRONTEND_ORIGIN.split(',')) {
        const trimmed = origin.trim();
        if (!/^https:\/\//i.test(trimmed)) {
          ctx.addIssue({
            code: 'custom',
            path: ['FRONTEND_ORIGIN'],
            message: 'Production FRONTEND_ORIGIN values must use https',
          });
        }
        if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(trimmed)) {
          ctx.addIssue({
            code: 'custom',
            path: ['FRONTEND_ORIGIN'],
            message: 'Production FRONTEND_ORIGIN must not include localhost',
          });
        }
      }
    }

    for (const origin of data.FRONTEND_ORIGIN.split(',')) {
      const trimmed = origin.trim();
      if (!trimmed) {
        ctx.addIssue({
          code: 'custom',
          path: ['FRONTEND_ORIGIN'],
          message: 'FRONTEND_ORIGIN must not contain empty entries',
        });
        continue;
      }
      try {
        new URL(trimmed);
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['FRONTEND_ORIGIN'],
          message: `Invalid FRONTEND_ORIGIN URL: ${trimmed}`,
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
