export interface Server {
	logo: string;
	title: string;
	online: number;
	limitOnline: number;
	ip: string;
	versions: string;
}

export interface ParsedServersData {
	updatedAt: string;
	data: Server[];
}
