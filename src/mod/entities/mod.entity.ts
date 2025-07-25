import { ModVersion } from 'generated/prisma';
import { IModEntity } from '../interfaces/mod-entity.interface';

export class ModEntity implements IModEntity {
	id?: number;
	createdAt?: Date;
	updatedAt?: Date;
	title: string;
	description: string;
	image: string;
	files: string[];
	versions: ModVersion[];

	constructor(mod: IModEntity) {
		Object.assign(this, mod);
		this.versions = [];
	}

	setVersions(versions: ModVersion[]): this {
		this.versions = versions;
		return this;
	}
}
