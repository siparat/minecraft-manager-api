import { IAppSdkEntity } from '../interfaces/app-sdk-entity.interface';

export class AppSdkEntity implements IAppSdkEntity {
	isAdsEnabled?: boolean;
	isOpenAdsEnabled?: boolean;
	isInterAdsEnabled?: boolean;
	isNativeAdsEnabled?: boolean;
	appId?: number;
	metricaToken?: string;
	appLovinToken?: string;
	adMobToken?: string;
	firstOpenCode?: string;
	firstInterCode?: string;
	firstNativeCode?: string;
	firstBannerCode?: string;
	secondOpenCode?: string;
	secondInterCode?: string;
	secondNativeCode?: string;
	secondBannerCode?: string;
	thirdOpenCode?: string;
	thirdInterCode?: string;
	thirdNativeCode?: string;
	thirdBannerCode?: string;
	delayInter?: number;
	chanceShowInterAds?: number;
	chanceShowNativeAds?: number;
	chanceShowOpenAds?: number;
	countNativePreload?: number;
	skipBeforeFirstInterAdsCount?: number;
	adsInverval?: number;

	constructor(sdk: IAppSdkEntity) {
		Object.assign(this, sdk);
	}
}
