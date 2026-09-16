import { createContext, useContext, useState, createElement, type ReactNode } from 'react';

type UnsavedCtx = {
    isDirty: boolean;
    setDirty: (dirty: boolean) => void;
};

const UnsavedContext = createContext<UnsavedCtx>({ isDirty: false, setDirty: () => {} });

export const UnsavedProvider = ({ children }: { children: ReactNode }) => {
    const [isDirty, setDirty] = useState(false);
    return createElement(UnsavedContext.Provider, { value: { isDirty, setDirty } }, children);
};

export const useUnsaved = () => useContext(UnsavedContext);
