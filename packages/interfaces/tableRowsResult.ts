export interface TableRowsResult<T> {
	/**
	 * Contains a list of table row items. Each row item is
	 * a data object which conforms to the specified type.
	 */
	rows: Array<T>;
	/**
	 * Indicates if more row items are available. Expect `true`
	 * when your table contains more rows than the number
	 * of row items returned, otherwise `false`.
	 */
	more: boolean;
}
