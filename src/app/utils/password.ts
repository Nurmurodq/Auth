import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordStrength {
  /** 0 (empty) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: '' };
  let points = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) points++;
  if (pw.length >= 12) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/\d/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;
  if (pw.length < MIN_PASSWORD_LENGTH) return { score: 1, label: 'Too short' };
  const score = Math.min(4, Math.max(1, points - 1)) as PasswordStrength['score'];
  return { score, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}

/** Group validator: `confirm` must equal `password`. */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
};
