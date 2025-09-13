import { Mod, ModTranslation } from 'generated/prisma';

export type ModWithVersions = Mod & { versions: { version: string }[]; translations: ModTranslation[] };
