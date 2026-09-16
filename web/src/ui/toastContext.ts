import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';
export type ToastFn = (message: string, tone?: ToastTone) => void;

export const ToastContext = createContext<ToastFn>(() => {});

export const useToast = () => useContext(ToastContext);

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));
