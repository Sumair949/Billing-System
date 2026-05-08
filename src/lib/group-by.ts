/**
 * Groups an array of items by a string key, mapping each item through a
 * transform before storing. Used to avoid the repeated Map-building pattern
 * throughout the codebase.
 *
 * @example
 * const descsByBill = groupValuesBy(items, "bill_id", i => i.description);
 */
export function groupValuesBy<T extends Record<string, unknown>, V>(
    items: T[],
    key: keyof T & string,
    getValue: (item: T) => V,
): Map<string, V[]> {
    const map = new Map<string, V[]>();
    for (const item of items) {
        const k = item[key] as string;
        const arr = map.get(k) ?? [];
        arr.push(getValue(item));
        map.set(k, arr);
    }
    return map;
}
