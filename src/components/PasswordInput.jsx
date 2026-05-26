/**
 * PasswordInput — labeled password field with a show/hide eye toggle.
 * Visually consistent with the standard <Input> primitive, but with
 * an extra trailing button that flips the type between password ↔ text.
 */

import { forwardRef, useId, useState } from 'react';
import './PasswordInput.css';

const EyeIcon = ({ open }) =>
  open ? (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );

const PasswordInput = forwardRef(function PasswordInput(
  { label, error, className = '', id, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className={`pfield ${error ? 'pfield--error' : ''} ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="pfield__label">
          {label}
        </label>
      )}
      <div className="pfield__wrap">
        <input
          ref={ref}
          id={inputId}
          type={show ? 'text' : 'password'}
          className="pfield__input"
          {...rest}
        />
        <button
          type="button"
          className="pfield__toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {error && <span className="pfield__error">{error}</span>}
    </div>
  );
});

export default PasswordInput;
