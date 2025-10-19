import { ModSort } from './interfaces/mod-sort.interface';
import { Prisma } from 'generated/prisma';

export const ModErrorMessages = {
	NOT_FOUND: 'Мод с таким идентификатором не найден'
};

export const ModSorts: Record<ModSort['key'], (sort: Prisma.SortOrder) => Prisma.AppModOrderByWithRelationInput> = {
	name: (sort: Prisma.SortOrder) => ({ mod: { title: sort } }),
	usedCount: (sort: Prisma.SortOrder) => ({ mod: { apps: { _count: sort } } }),
	rating: (sort: Prisma.SortOrder) => ({ mod: { rating: { sort, nulls: 'last' } } }),
	commentCounts: (sort: Prisma.SortOrder) => ({ mod: { commentCounts: { sort, nulls: 'last' } } }),
	order: (sort: Prisma.SortOrder) => ({ order: sort })
};
