/**
 * Transforms a string into the pascal-case format.
 * ThisIsPascalCase, while thisIsCamelCase, this-is-kebab-case, and this_is_snake_case.
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param value String for case transformation
 */
export const pascalCase = (value: string) => {
	const snakePattern = /[_.]+./g;
	const upperFirst = value[0].toUpperCase() + value.slice(1);
	return upperFirst.replace(snakePattern, (match) => match[match.length - 1].toUpperCase());
};

/**
 * Transforms a string into the camel-case format.
 * ThisIsPascalCase, while thisIsCamelCase, this-is-kebab-case, and this_is_snake_case.
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param value String for case transformation
 */
export const camelCase = (value: string) => {
	const snakePattern = /[_.]+./g;
	return value.replace(snakePattern, (match) => match[match.length - 1].toUpperCase());
};
