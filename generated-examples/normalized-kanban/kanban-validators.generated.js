export function safeText(val) { return val == null ? '' : String(val); }
export function safeClassToken(val) { return val == null ? '' : String(val).toLowerCase().replace(/[^a-z0-9-]/g, '-'); }
export function normalizeEnum(val, allowed) { return allowed.includes(val) ? val : allowed[0]; }
