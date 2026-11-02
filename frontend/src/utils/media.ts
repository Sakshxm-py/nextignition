/**
 * Checks if a string is likely a valid image source (URL, base64, or absolute path)
 */
export const isImageUrl = (val: any): val is string => {
  if (typeof val !== 'string' || !val) return false;
  const trimmed = val.trim();
  // Match http, https, data:, or absolute/relative paths starting with /
  return /^https?:\/\/|^data:image\/|^\/|^\.\/|^\.\.\//i.test(trimmed);
};

/**
 * Extracts initials from a name (max 2 characters)
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
