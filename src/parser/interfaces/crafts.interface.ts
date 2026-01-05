export interface Craft {
	name: string;
	image: string;
	ingredient: string;
	description: string;
}

export interface ParsedCraftsData {
	updatedAt: string;
	data: Craft[];
}
