'use client';
import { useFormStatus } from 'react-dom';
export function SubmitButton({ children, pendingText = 'Please wait…', disabled = false, className = 'button button-primary', describedBy }: { children: React.ReactNode; pendingText?: string; disabled?: boolean; className?: string; describedBy?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={disabled || pending} aria-disabled={disabled || pending} aria-describedby={describedBy}>{pending ? pendingText : children}</button>;
}
