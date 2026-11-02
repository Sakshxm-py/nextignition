export const debuglog = (_section?: string) => {
  return (..._args: any[]) => {};
};

export const inspect = (obj: any) => {
  try {
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
  } catch {
    return String(obj);
  }
};

export default { debuglog, inspect };
