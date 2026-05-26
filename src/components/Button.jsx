/**
 * Button — reusable primitive
 * Variants: primary | ghost
 */

import './Button.css';

const Button = ({
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  children,
  ...rest
}) => (
  <button
    type={type}
    className={`btn btn--${variant} ${className}`.trim()}
    disabled={disabled}
    {...rest}
  >
    {children}
  </button>
);

export default Button;
