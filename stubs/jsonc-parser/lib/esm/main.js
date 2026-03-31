export function parse(text) { try { return JSON.parse(text); } catch { return null; } }
export function modify() { return []; }
export function applyEdits(text) { return text; }