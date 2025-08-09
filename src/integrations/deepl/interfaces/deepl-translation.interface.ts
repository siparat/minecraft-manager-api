export interface DeeplTranslation {
	detected_source_language: string;
	text: string;
	billed_characters?: number;
	model_type_used?: string;
}

export interface DeeplTranslateResponse {
	translations: DeeplTranslation[];
}
