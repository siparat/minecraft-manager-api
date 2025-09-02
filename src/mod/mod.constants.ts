import { ModSort } from './interfaces/mod-sort.interface';
import { Prisma } from 'generated/prisma';

export const ModErrorMessages = {
	NOT_FOUND: 'Мод с таким идентификатором не найден'
};

export const ModSorts: Record<ModSort['key'], (sort: Prisma.SortOrder) => Prisma.ModOrderByWithRelationInput> = {
	name: (sort: Prisma.SortOrder) => ({ title: sort }),
	usedCount: (sort: Prisma.SortOrder) => ({ apps: { _count: sort } })
};
