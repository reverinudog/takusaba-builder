import { Loader2 } from 'lucide-react';
import styles from './Spinner.module.css';

export default function Spinner({ size = 20 }: { size?: number }) {
    return <Loader2 size={size} className={styles.spin} />;
}
