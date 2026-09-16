import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
    invalid?: boolean;
};

const Select = forwardRef<HTMLSelectElement, Props>(({ invalid, className = '', children, ...rest }, ref) => (
    <div className={`${styles.wrap} ${className}`}>
        <select ref={ref} className={`${styles.select} ${invalid ? styles.invalid : ''}`} {...rest}>
            {children}
        </select>
        <ChevronDown size={16} className={styles.chevron} />
    </div>
));
Select.displayName = 'Select';
export default Select;
