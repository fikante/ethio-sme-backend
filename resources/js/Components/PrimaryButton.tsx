import { ButtonHTMLAttributes } from 'react';
import { btnPrimarySm } from '@/lib/uiTheme';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={`${btnPrimarySm} uppercase tracking-widest ${disabled ? 'opacity-25' : ''} ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
