export type PartialFields<Object extends object, Fields extends keyof Object> = Omit<Object, Fields> &
	Partial<Pick<Object, Fields>>;
