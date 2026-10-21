'use client';
import { useFormStatus } from 'react-dom';
export function SubmitButton({ children, pendingText = 'Please wait…', disabled = false, className = 'button button-primary' }: { children: React.ReactNode; pendingText?: string; disabled?: boolean; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={disabled || pending} aria-disabled={disabled || pending}>{pending ? pendingText : children}</button>;
}
