// Helper to format numbers with commas (Indian style)
export const formatWithCommas = (value: string | number) => {
    if (value === undefined || value === null || value === '') return '';
    const stringValue = String(value);
    const cleanValue = stringValue.replace(/,/g, '');
    if (isNaN(Number(cleanValue))) return stringValue;
    return new Intl.NumberFormat('en-IN').format(Number(cleanValue));
};

// Helper to handle numeric input changes
export const parseNumericValue = (value: string) => {
    return value.replace(/,/g, '');
};

// Validates if a string is a simple integer
export const isValidNumericInput = (value: string) => {
    const clean = value.replace(/,/g, '');
    return clean === '' || /^\d+$/.test(clean);
};

// ── Timezone-safe date helpers ──────────────────────────────────────────────
// `new Date("2026-06-07")` parses date-only ISO strings as UTC midnight, which
// renders as the *previous* day for users in negative-UTC offsets. These helpers
// parse/treat date-only strings in the user's local timezone instead.

// Parse a date string into a local Date. Date-only strings (YYYY-MM-DD) are
// interpreted in local time; full ISO timestamps are left untouched.
export const parseLocalDate = (dateString: string): Date => {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(dateString);
    if (dateOnly) {
        const [y, m, d] = dateString.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateString);
};

// Format a date string for display without timezone drift.
export const formatLocalDate = (
    dateString: string,
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
    locale?: string,
): string => {
    const date = parseLocalDate(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(locale, options);
};

// Today's date as a local YYYY-MM-DD string (for <input type="date"> min/value).
export const todayLocalISO = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
