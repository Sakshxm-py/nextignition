// Centralized stripping of sensitive fields from a user's `data` object before
// it is returned to any client. Several list/search/profile endpoints used to
// return `{ ...user, password: undefined }`, which left password-reset and email
// OTPs in the payload — enough for any authenticated user to read a victim's
// resetOtp and take over the account. Always run user records through this.
const SENSITIVE_USER_FIELDS = [
  'password',
  'verificationOtp',
  'resetOtp',
  'resetToken',
  'otp',
  'twoFactorSecret',
  'refreshToken',
];

export function stripSensitiveUserFields<T extends Record<string, any>>(user: T | null | undefined): T {
  if (!user || typeof user !== 'object') return user as unknown as T;
  const clone: any = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) delete clone[field];
  return clone;
}
