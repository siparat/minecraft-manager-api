import { Injectable, Logger } from '@nestjs/common';
import { Download, ParsedMod, ParsedModShort } from './interfaces/mod.interface';
import { parseCategory } from './utils/parse-category.util';
import { ParserGateway } from './parser.gateway';
import { JSDOM } from 'jsdom';
import { Mod } from 'generated/prisma';
import { S3Service } from 'src/s3/s3.service';
import { ModRepository } from 'src/mod/repositories/mod.repository';

@Injectable()
export class ParserService {
	constructor(
		private parserGateway: ParserGateway,
		private s3Service: S3Service,
		private modRepository: ModRepository
	) {}

	parseModsFromSearchPage(html: string): ParsedModShort[] {
		const { window } = new JSDOM(html);
		const cards = window.document.querySelectorAll('.fancybox.post');
		const mods = Array.from(cards).map(this.handleModCard);
		return mods.filter(Boolean) as ParsedModShort[];
	}

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

	async updateModfilesInS3(): Promise<void> {
		const mods = await this.modRepository.findUsedMods();

		for (const mod of mods) {
			const files = await this.saveModfilesToS3(mod);
			if (files) {
				await this.modRepository.updateFiles(mod.id, files);
			}
		}
	}

	async saveModfilesToS3(mod: Pick<Mod, 'id' | 'parsedSlug' | 'title'>): Promise<string[] | null>;
	async saveModfilesToS3(mod: ParsedMod): Promise<string[] | null>;
	async saveModfilesToS3(mod: ParsedMod | Pick<Mod, 'id' | 'parsedSlug' | 'title'>): Promise<string[] | null> {
		let parsedMod: ParsedMod;

		if ('id' in mod) {
			if (!mod.parsedSlug) {
				return null;
			}

			const page = await this.parserGateway.getModPage(mod.parsedSlug);
			const modParseResult = await this.parseMod(mod.parsedSlug, page?.nuxtState);

			if (!modParseResult) {
				return null;
			}
			parsedMod = modParseResult;
		} else {
			parsedMod = mod;
		}

		if (parsedMod.downloads[0]?.file.startsWith('https://api.mcpedl.com')) {
			const relevantsLinks = await this.getRelevantLinks(parsedMod.slug);
			if (!relevantsLinks) {
				return null;
			}
			parsedMod.downloads = relevantsLinks;
		}

		const files: string[] = [];

		await Promise.allSettled(
			parsedMod.downloads.map(async ({ file }) => {
				const url = new URL(file);
				const pathname = url.pathname.slice(1);
				const response = await fetch(url);

				if (response.status !== 200) {
					Logger.error(`Не удалось скачать файл по ссылке ${file} для мода ${mod.title}`);
					files.push(file);
					return;
				}

				const result = await this.s3Service.uploadFile(await response.bytes(), pathname);
				files.push(result.Location);
				Logger.log(`Файл ${pathname} загружен в S3`);
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

	private handleModCard(card: Element): ParsedModShort | null {
		const slug = card.querySelector<HTMLAnchorElement>('.fancybox__content__title a')?.href.slice(1, -1);
		const title = card.querySelector('.fancybox__content__title')?.textContent;
		const shortDescription = card.querySelector('.fancybox__content__description')?.textContent || undefined;
		const author = card.querySelector('.fancybox__header__content a')?.textContent || undefined;
		const dateString = card
			.querySelector('.fancybox__header__content small')
			?.textContent?.replace('Published on ', '')
			.trim();
		const rating = card.querySelector('.fancybox__header__rating')?.textContent?.trim();
		const image = card.querySelector<HTMLImageElement>('.post__img__static img')?.src;
		if (!slug || !title || !image) {
			Logger.error('Невозможно собрать данные мода');
			return null;
		}
		return {
			slug,
			title,
			shortDescription,
			author,
			publishedAt: dateString ? new Date(dateString) : undefined,
			rating: Number(rating),
			image
		};
	}
}
