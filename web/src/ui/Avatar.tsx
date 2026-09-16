import { useState } from 'react';
import styles from './Avatar.module.css';

type Props = {
    src?: string | null;
    name: string;
    size?: number;
};

export default function Avatar({ src, name, size = 36 }: Props) {
    const [failed, setFailed] = useState(false);

    if (src && !failed) {
        return (
            <img
                src={src}
                alt={name}
                className={styles.avatar}
                style={{ width: size, height: size }}
                loading="lazy"
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <div className={styles.fallback} style={{ width: size, height: size, fontSize: size * 0.4 }}>
            {(name || '?').charAt(0).toUpperCase()}
        </div>
    );
}
