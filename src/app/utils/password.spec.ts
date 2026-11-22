import { FormControl, FormGroup } from '@angular/forms';
import { passwordStrength, passwordsMatch } from './password';

describe('password helpers', () => {
  it('scores password strength', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc').label).toBe('Too short');
    expect(passwordStrength('abcdefgh').score).toBeLessThanOrEqual(2);
    expect(passwordStrength('Correct-Horse-42').score).toBe(4);
  });

  it('validates matching confirmation', () => {
    const group = new FormGroup({ password: new FormControl('secret-one'), confirm: new FormControl('secret-two') }, { validators: passwordsMatch });
    expect(group.errors).toEqual({ mismatch: true });
    group.controls.confirm.setValue('secret-one');
    expect(group.errors).toBeNull();
  });
});
