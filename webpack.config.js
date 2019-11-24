const path = require('path');

module.exports = {
	target: 'node',
	entry: path.resolve(__dirname, 'packages/index.ts'),
	mode: 'development',
	output: {
		path: path.resolve(__dirname, 'out'),
		filename: 'bundle.js',
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'awesome-typescript-loader',
				options: {
					useTranspileModule: true,
					forceIsolatedModules: true,
					useCache: true,
					useBabel: false,
				},
			},
		],
	},
};
