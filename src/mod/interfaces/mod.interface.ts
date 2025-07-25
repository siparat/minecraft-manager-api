import { Mod } from 'generated/prisma';

export type ModWithVersions = Mod & { versions: { version: string }[] };
