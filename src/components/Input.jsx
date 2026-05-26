/**
 * Input — labeled, accessible text input primitive.
 */

import { forwardRef, useId } from 'react';
import './Input.css';

const Input = forwardRef(function Input(
  { label, error, className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <input ref={ref} id={inputId} className="field__input" {...rest} />
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  );
});

export default Input;
