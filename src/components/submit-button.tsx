'use client';
import { useFormStatus } from 'react-dom';
export function SubmitButton({ children, pendingText = 'Please wait…', disabled = false }: { children: React.ReactNode; pendingText?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className="button button-primary" type="submit" disabled={disabled || pending} aria-disabled={disabled || pending}>{pending ? pendingText : children}</button>;
}
