export enum FilterOperation {
	EQUALS = 'equals',
	LT = 'lt',
	LTE = 'lte',
	GT = 'gt',
	GTE = 'gte'
}

export interface FilterItem<T> {
	value: T;
	operator: FilterOperation;
}
