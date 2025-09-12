import { ModVersion } from 'generated/prisma';
import { IModEntity } from '../interfaces/mod-entity.interface';

export class ModEntity implements IModEntity {
	id?: number;
	parsedSlug?: string;
	htmlDescription?: string;
	createdAt?: Date;
	updatedAt?: Date;
	isParsed?: boolean;
	descriptionImages: string[];
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
		this.isParsed = mod.isParsed || undefined;
		this.parsedSlug = mod.parsedSlug || undefined;
		this.htmlDescription = mod.htmlDescription || undefined;
		this.descriptionImages = mod.descriptionImages || [];
		this.versions = [];
	}

	setVersions(versions: ModVersion[]): this {
		this.versions = versions;
		return this;
	}
}
