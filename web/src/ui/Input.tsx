import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

type Props = InputHTMLAttributes<HTMLInputElement> & {
    invalid?: boolean;
};

const Input = forwardRef<HTMLInputElement, Props>(({ invalid, className = '', ...rest }, ref) => (
    <input
        ref={ref}
        className={`${styles.input} ${invalid ? styles.invalid : ''} ${className}`}
        {...rest}
    />
));
Input.displayName = 'Input';
export default Input;
