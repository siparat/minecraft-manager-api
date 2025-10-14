import { ModCategory } from 'generated/prisma';

export interface ParsedModShort {
	slug: string;
	publishedAt?: Date;
	rating?: number;
	author?: string;
	title: string;
	image: string;
	shortDescription?: string;
}

export interface ParsedMod {
	updatedAt: Date;
	slug: string;
	description: string;
	descriptionHtml: string;
	category: ModCategory;
	rating: number;
	commentCounts: number;
	descriptionImages: string[];
	downloads: Download[];
	image: string;
	title: string;
	versions: string[];
}

export interface Download {
	file: string;
	id: number;
	name: string;
	type: number;
}
