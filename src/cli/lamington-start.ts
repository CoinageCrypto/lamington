import { startEos } from './utils';

/**
 * Starts EOS and throws caught errors
 * @note This should handle caught errors
 * @author Kevin Brown <github.com/thekevinbrown>
 */
startEos().catch(error => {
	throw error;
});
