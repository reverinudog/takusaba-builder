import { forwardRef, type TextareaHTMLAttributes } from 'react';
import styles from './Textarea.module.css';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    invalid?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ invalid, className = '', ...rest }, ref) => (
    <textarea
        ref={ref}
        className={`${styles.textarea} ${invalid ? styles.invalid : ''} ${className}`}
        {...rest}
    />
));
Textarea.displayName = 'Textarea';
export default Textarea;
