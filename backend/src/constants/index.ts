/**
 * Application Constants
 * Centralized configuration for tiers, messages, and other constants
 */

export const INVESTOR_TIERS = {
  UNVERIFIED: 1,
  VERIFIED: 2,
  ACCREDITED: 3,
} as const;

export const TIER_NAMES: Record<number, string> = {
  [INVESTOR_TIERS.UNVERIFIED]: 'Unverified',
  [INVESTOR_TIERS.VERIFIED]: 'Verified',
  [INVESTOR_TIERS.ACCREDITED]: 'Accredited',
} as const;

export const VERIFICATION_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  USER_NOT_FOUND: 'User not found',
  FORBIDDEN: 'Forbidden',
  INVALID_TIER: 'Admin access required',
  PROFILE_LOCKED: 'Profile editing is locked for unverified investors',
  PROFILE_LOCK_REASON: 'Complete verification to unlock all features',
  VERIFY_PROFILE_ACTION: 'verify-profile',
  VERIFIED_INVESTOR_REQUIRED: 'This feature requires verified investor status',
  VERIFIED_INVESTOR_ACTION: 'complete-verification',
  VERIFICATION_FAILED: 'Failed to complete verification',
  BANNER_STATE_FAILED: 'Failed to update banner state',
  VERIFICATION_STATUS_FAILED: 'Failed to fetch verification status',
  SOCIAL_VERIFICATION_REQUIRED: 'This feature requires verified investor status',
  SOCIAL_VERIFICATION_ACTION: 'complete-verification',
  INVALID_PROFILE_URL: 'Invalid profile URL',
  SOCIAL_VERIFIED: 'Social account verified successfully',
  SOCIAL_VERIFICATION_FAILED: 'Failed to verify social account',
  PENDING_ACCREDITATION: 'You already have a pending accreditation request',
  ACCREDITATION_SUBMITTED: 'Accreditation request submitted successfully',
  ACCREDITATION_FAILED: 'Failed to submit accreditation request',
  PROFILE_FETCH_FAILED: 'Failed to fetch profile',
  INVESTOR_NOT_FOUND: 'Investor not found',
  QUEUE_FETCH_FAILED: 'Failed to fetch pending verifications',
  VERIFICATION_APPROVED: 'Investor verified successfully',
  APPROVAL_FAILED: 'Failed to approve verification',
  VERIFICATION_REJECTED: 'Verification request rejected',
  REJECTION_FAILED: 'Failed to reject verification',
} as const;

export const VALID_PLATFORMS = ['linkedin', 'twitter', 'github', 'angellist'] as const;

export const DEFAULT_PROFILE_COMPLETION = {
  percentage: 0,
  completedFields: [],
} as const;

export const DEFAULT_ADMIN_VERIFICATION = {
  status: 'none' as const,
} as const;

export const REQUIRED_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'company',
  'role',
  'profileImage',
] as const;

export const TIER_2_COMPLETION_THRESHOLD = 80; // Percentage

export const VERIFICATION_METHODS = {
  URL_VALIDATION: 'url_validation',
} as const;

export const QUEUE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const DEFAULT_PAGINATION = {
  LIMIT: 50,
} as const;
