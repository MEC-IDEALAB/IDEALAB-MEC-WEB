'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export function PasswordField({ disabled, newPassword = false, id = 'password', name = 'password' }: { disabled?: boolean; newPassword?: boolean; id?: string; name?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field"><input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} required maxLength={1024} disabled={disabled} /><button type="button" aria-controls={id} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(value => !value)} disabled={disabled}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>;
}
