import { IAppSdkEntity } from '../interfaces/app-sdk-entity.interface';

export class AppSdkEntity implements IAppSdkEntity {
	isAdsEnabled?: boolean;
	appId?: number;
	metricaToken?: string;
	appLovinToken?: string;
	adMobToken?: string;
	firstOpenCode?: string;
	firstInterCode?: string;
	firstNativeCode?: string;
	secondOpenCode?: string;
	secondInterCode?: string;
	secondNativeCode?: string;
	thirdOpenCode?: string;
	thirdInterCode?: string;
	thirdNativeCode?: string;

	constructor(sdk: IAppSdkEntity) {
		Object.assign(this, sdk);
	}
}
