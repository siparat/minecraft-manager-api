import { Mod } from 'generated/prisma';

export type ModSearchItem = Omit<Mod, 'htmlDescription'> & {
	htmlDescription?: string | null;
	reactionsCount: number;
	trendingPosition?: number | null;
	versions?: { version: string }[];
	apps?: { id: number }[];
	_count?: { apps: number; reactions: number };
};

export interface ModSearchResponse {
	count: number;
	mods: Mod[];
}
