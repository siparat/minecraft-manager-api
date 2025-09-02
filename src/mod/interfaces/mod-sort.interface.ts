import { SortConfig } from 'src/common/types/sort-config';

export const ModSortKeys = ['name', 'usedCount'] as const;

export type ModSort = SortConfig<(typeof ModSortKeys)[number]>;
