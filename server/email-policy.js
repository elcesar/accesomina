import { z } from 'zod';

const optionalEmailSchema = z.string().trim().max(254).email();

// New values must be valid. An exact value already persisted by the tenant is
// historical data and can travel with an unrelated edit without being changed.
export function validateOptionalHistoricalEmail(value, previousValue, { code = 'INVALID_EMAIL' } = {}) {
  if (value === previousValue) return value;
  if (value == null) return value;
  if (typeof value === 'string' && !value.trim()) return '';
  const result = optionalEmailSchema.safeParse(value);
  if (!result.success) throw Object.assign(new Error('Email is invalid'), { status: 409, code });
  return result.data;
}
