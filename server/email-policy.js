import { z } from 'zod';

const optionalEmailSchema = z.string().trim().max(254).email();

// A historical exception is allowed only for an identified prior record.
// New records, including fields whose previous value is absent, always follow
// the normal optional-email rule.
export function validateOptionalHistoricalEmail(value, previousValue, { code = 'INVALID_EMAIL', hasPreviousRecord = false } = {}) {
  if (hasPreviousRecord && value === previousValue) return value;
  if (value == null) return value;
  if (typeof value === 'string' && !value.trim()) return '';
  const result = optionalEmailSchema.safeParse(value);
  if (!result.success) throw Object.assign(new Error('Email is invalid'), { status: 409, code });
  return result.data;
}
