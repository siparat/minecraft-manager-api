import { Injectable } from '@nestjs/common';
import { Download, ParsedMod } from './interfaces/mod.interface';
import { parseCategory } from './utils/parse-category.util';
import { ParserGateway } from './parser.gateway';
import { Mod } from 'generated/prisma';
import { ModRepository } from 'src/mod/repositories/mod.repository';
import { ContentParserService } from './content-parser.service';
import { FileStorageService } from './file-storage.service';

@Injectable()
export class ParserService {
	constructor(
		private parserGateway: ParserGateway,
		private contentParser: ContentParserService,
		private fileStorage: FileStorageService,
		private modRepository: ModRepository
	) {}

	async getRelevantLinks(slug: string): Promise<ParsedMod['downloads'] | null> {
		const page = await this.parserGateway.getModPage(slug);
		if (!page) {
			return null;
		}

		const downloads: Download[] = page.nuxtState?.state?.slug?.model?.downloads;
		if (!downloads || !downloads.length) {
			return null;
		}

		const filteredDownloads = Array.from(new Map(downloads.map((d) => [d.file, d])).values());

		if (filteredDownloads.some(({ file }) => file.startsWith('/leaving'))) {
			return null;
		}

		return filteredDownloads;
	}

	async saveModfilesToS3(mod: Pick<Mod, 'id' | 'parsedSlug' | 'title' | 'files'>): Promise<string[] | null>;
	async saveModfilesToS3(mod: ParsedMod): Promise<string[] | null>;
	async saveModfilesToS3(
		mod: ParsedMod | Pick<Mod, 'id' | 'parsedSlug' | 'title' | 'files'>
	): Promise<string[] | null> {
		let downloads: Pick<Download, 'file'>[] = [];
		let slug = '';

		if ('id' in mod) {
			if (!mod.parsedSlug) return null;
			slug = mod.parsedSlug;

			const page = await this.parserGateway.getModPage(slug);
			if (page) {
				const parsed = this.contentParser.parseMod(slug, page.nuxtState);
				downloads = parsed ? parsed.downloads : mod.files.map((f) => ({ file: f }));
			} else {
				downloads = mod.files.map((f) => ({ file: f }));
			}
		} else {
			downloads = mod.downloads;
			slug = mod.slug;
		}

		if (downloads[0]?.file.startsWith('https://api.mcpedl.com')) {
			const relevantsLinks = await this.getRelevantLinks(slug);
			if (relevantsLinks) downloads = relevantsLinks;
		}

		const files: string[] = [];

		await Promise.allSettled(
			downloads.map(async ({ file }) => {
				let s3Url: string | null;
				if (file.startsWith('https://api.mcpedl.com')) {
					s3Url = await this.fileStorage.uploadFromPlaywright(file);
				} else {
					s3Url = await this.fileStorage.uploadFromUrl(file);
				}

				if (s3Url) {
					files.push(s3Url);
				} else {
					files.push(file);
				}
			})
		);

		return files;
	}

	async parseMod(slug: string, nuxt: any): Promise<ParsedMod | null> {
		const model = nuxt?.state?.slug?.model;
		if (!model?.title) return null;

		const category = parseCategory(model.categories || []);
		if (!category) return null;

		const downloads: Download[] = model.downloads || [];
		const filteredDownloads = Array.from(new Map(downloads.map((d) => [d.file, d])).values());

		if (filteredDownloads.some((d) => d.file.startsWith('/leaving'))) {
			return null;
		}

		const descriptionHtml = (model.description || '').trim();
		const description = descriptionHtml
			.replace(/<[^>]+>/g, '')
			.replace(/\n{2,}/g, '\n')
			.trim();

		return {
			slug,
			title: model.title,
			image: model.image,
			category,
			downloads: filteredDownloads,
			description,
			descriptionHtml,
			descriptionImages: model.submission_images || [],
			commentCounts: model.comments_total || 0,
			rating: Number(Number(model.comments_rating?.average || 0).toFixed(2)),
			versions: model.minecraft_versions?.map((v) => v.name) || [],
			updatedAt: new Date(model.updated_at)
		};
	}
}
