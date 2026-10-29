/** Strict credential input; never stringify Files, accept duplicates or log secrets. */
function single(form: FormData, name: string): string | null {
  const values = form.getAll(name);
  return values.length === 1 && typeof values[0] === 'string' ? values[0] : null;
}
export function readAuthEmail(form: FormData): string | null {
  if (!(form instanceof FormData)) return null;
  const raw = single(form, 'email');
  if (raw === null) return null;
  const email = raw.trim();
  const controls = Array.from(email).some(character => character.charCodeAt(0) < 32 || (character.charCodeAt(0) >= 127 && character.charCodeAt(0) <= 159));
  return email.length <= 254 && !controls && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
export function readAuthCredentials(form: FormData, creating = false): { email: string; password: string } | null {
  const email = readAuthEmail(form);
  if (!email) return null;
  const password = single(form, 'password');
  if (password === null || password.length < (creating ? 8 : 1) || password.length > 1024) return null;
  return { email, password };
}

/** Strict PKCE callback parameters; never accept a caller-controlled destination. */
export function readAuthCode(params: URLSearchParams): { code: string; options?: { flowId: string } } | null {
  const codes = params.getAll('code');
  const flows = params.getAll('sb_flow_id');
  if (params.has('error') || codes.length !== 1 || !codes[0] || codes[0].length > 4096
    || Array.from(codes[0]).some(character => character.charCodeAt(0) <= 32 || (character.charCodeAt(0) >= 127 && character.charCodeAt(0) <= 159)) || flows.length > 1) return null;
  if (flows.length && !/^[a-zA-Z0-9_-]{8,64}$/.test(flows[0])) return null;
  return { code: codes[0], ...(flows.length ? { options: { flowId: flows[0] } } : {}) };
}

export function readNewPassword(form: FormData): string | null {
  if (!(form instanceof FormData)) return null;
  const password = single(form, 'new_password');
  const confirmation = single(form, 'confirm_password');
  return password !== null && password.length >= 8 && password.length <= 1024 && password === confirmation ? password : null;
}
