const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

const mode = process.env.NODE_ENV;
const noInline = process.env.noInline;
const debugBuild = mode === 'development';

// For each file, this config is merged with its local babel configuration.
// See https://babeljs.io/docs/configuration#how-babel-merges-config-items
const babelConf = {
    rootMode: 'upward',
    plugins: [
        ['minify-replace', {
            replacements: [{
                identifierName: '__DEBUG__',
                replacement: {
                    type: 'booleanLiteral',
                    value: debugBuild,
                },
            }],
        }],
    ],
};

const include = [
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'utils'),
];

const exclude = [
    path.resolve(__dirname, '.git'),
    path.resolve(__dirname, 'node_modules'),
];

module.exports = () => {
    const babelLoaderOptions = [];
    if (!noInline) {
        babelLoaderOptions.push('babel-inline-import-loader');
    }
    babelLoaderOptions.push({
        loader: 'babel-loader',
        options: babelConf,
    });

    return {
        mode,
        context: path.resolve(__dirname),
        resolve: {
            extensions: ['.ts', '.js'],
            extensionAlias: {
                '.js': ['.ts', '.js'],
            },
        },
        entry: {
            itowns: [
                'core-js',
                './src/MainBundle.js',
            ],
            debug: {
                import: './utils/debug/Main.js',
                dependOn: 'itowns',
            },
            itowns_widgets: {
                import: './src/Utils/gui/Main.js',
                dependOn: 'itowns',
            },
            itowns_potree2worker: {
                import: './src/Worker/Potree2Worker.js',
            },
            itowns_lasworker: {
                import: './src/Worker/LASLoaderWorker.js',
            },
        },
        devtool: 'source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            library: '[name]',
            libraryTarget: 'umd',
            umdNamedDefine: true,
        },
        module: {
            rules: [
                {
                    test: /\.(js|ts)$/,
                    exclude,
                    include,
                    use: babelLoaderOptions,
                },
            ],
        },
        plugins: [
            new ESLintPlugin({
                files: include,
            }),
        ],
        devServer: {
            devMiddleware: {
                publicPath: '/dist/',
            },
            server: 'https',

            static: {

                directory: path.resolve(__dirname, './'),
                watch: {
                    ignored: exclude,
                },
            },
            client: {
                overlay: {
                    errors: true,
                    runtimeErrors: false,
                    warnings: false,
                },
            },
        },
    };
};
