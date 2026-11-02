// NextIgnition Brand Colors

export const brandColors = {
  atomicOrange: '#f78405',
  white: '#ffffff',
  black: '#1a1a1a',
  electricBlue: '#6666ff',
  navyBlue: '#242b64',
} as const;

// Utility function to get color with opacity
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};
