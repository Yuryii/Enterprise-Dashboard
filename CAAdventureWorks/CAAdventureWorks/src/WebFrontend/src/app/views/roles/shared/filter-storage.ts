export function saveDashboardFilter<T extends object>(storageKey: string, filter: T): void {
    localStorage.setItem(storageKey, JSON.stringify(filter));
}

export function restoreDashboardFilter<T extends object>(storageKey: string, fallbackFilter: T): T {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
        return fallbackFilter;
    }

    try {
        const savedFilter = JSON.parse(raw) as Partial<T>;
        return { ...fallbackFilter, ...savedFilter };
    } catch {
        localStorage.removeItem(storageKey);
        return fallbackFilter;
    }
}

export function clearDashboardFilter(storageKey: string): void {
    localStorage.removeItem(storageKey);
}
