import { Prisma } from 'generated/prisma';

export interface SortConfig<K extends string> {
	key: K;
	value: Prisma.SortOrder;
}
