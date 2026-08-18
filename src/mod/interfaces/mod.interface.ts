import { Mod, ModTranslation } from 'generated/prisma';

export type ModWithVersions = Mod & {
	versions: { version: string }[];
	translations: ModTranslation[];
	_count: { apps: number; reactions: number };
};
