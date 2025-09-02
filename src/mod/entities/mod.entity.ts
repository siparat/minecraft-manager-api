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
		this.id = mod.id;
		this.createdAt = mod.createdAt;
		this.updatedAt = mod.updatedAt;
		this.title = mod.title;
		this.description = mod.description;
		this.image = mod.image;
		this.files = mod.files;
		this.versions = [];
	}

	setVersions(versions: ModVersion[]): this {
		this.versions = versions;
		return this;
	}
}
