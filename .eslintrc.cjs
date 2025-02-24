const path = require('path');

module.exports = {

    // Global ESLint settings
    root: true,
    extends: [
        'eslint-config-airbnb-base',
        'eslint-config-airbnb-base/rules/strict',
    ],
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true,
        },
    },
    settings: {
        'import/resolver': {
            'babel-module': {
                alias: {
                    '@itowns/geographic': path.resolve(__dirname, 'packages/Geographic/src/Main.ts'),
                    itowns: path.resolve(__dirname, 'packages/Main/src/Main.js'),
                },
                plugins: [
                    ['module-extension-resolver'],
                ],
            },
        },
    },
    env: {
        browser: true,
        es2020: true,
        amd: true,
        commonjs: true,
    },
    rules: {
        'no-trailing-spaces': 'warn',
        'padded-blocks': 'warn',
        'no-unused-vars': 'warn',
        'no-plusplus': 'off',
        // this option sets a specific tab width for your code
        // http://eslint.org/docs/rules/indent
        indent: ['warn', 4, {
            SwitchCase: 1,
            VariableDeclarator: 1,
            outerIIFEBody: 1,
            // MemberExpression: null,
            // CallExpression: {
            // parameters: null,
            // },
            FunctionDeclaration: {
                parameters: 1,
                body: 1,
            },
            FunctionExpression: {
                parameters: 1,
                body: 1,
            },
        }],
        'one-var': ['error', 'never'],
        'valid-jsdoc': ['error', {
            requireReturn: false,
            requireParamDescription: false,
            requireReturnDescription: false,
        }],
        // TODO reactivate this rule once a proper npm package is made
        // a good configuration might be:
        /* 'import/no-extraneous-dependencies': ['error', {
      devDependencies: ['test/**', 'tests/**', 'examples/**'],
    }], */
        'import/no-extraneous-dependencies': 'off',
        'import/prefer-default-export': 'off',

        // TODO reactivate all the following rules

        // maybe 'no-mixed-operators': ['error', { allowSamePrecedence: true }],
        'no-mixed-operators': 'off',
        'no-use-before-define': ['error', { functions: false }],
        // should probably be
        // 'no-underscore-dangle': ['error', { allowAfterThis: true, allowAfterSuper: true }],
        'no-underscore-dangle': 'off',
        eqeqeq: 'off',
        // what len ? Airbnb does 100. github wraps line above 80
        'max-len': 'off',
        'no-param-reassign': 'off',
        'no-else-return': 'off',
        'no-var': 'error',
        'vars-on-top': 'off',
        'no-shadow': 'off',
        'no-restricted-properties': 'off',
        'prefer-spread': 'off',
        'prefer-destructuring': 'off',
        'function-paren-newline': 'off',
        'operator-linebreak': 'off',
        'object-curly-newline': 'off',
        curly: ['error', 'all'],
        'no-multiple-empty-lines': 'off',
        'no-restricted-globals': 'off',
        'implicit-arrow-linebreak': 'off',
        'prefer-promise-reject-errors': 'off',
        'no-multi-spaces': 'off',
        'import/no-cycle': 'off',
        'import/no-useless-path-segments': 'off',
        'import/extensions': [
            'error',
            'ignorePackages',
            {
                js: 'never',
                ts: 'never',
                tsx: 'never',
            },
        ],
        camelcase: 'off',
        'switch-colon-spacing': 'off',
        'lines-between-class-members': 'off',
        'no-bitwise': 'off',
        'no-restricted-syntax': 'off',
        'consistent-return': 'off',
        'brace-style': ['error', '1tbs', { allowSingleLine: true }],
        'new-cap': 'off',
        'no-continue': 'off',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'class-methods-use-this': 'off',
        'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
        'max-classes-per-file': ['error', 4],
        'function-call-argument-newline': 'off',
        // change default-param-last to on, but there are several breaking changes or default params to add.
        'default-param-last': 'off',
    },
    globals: {
        __DEBUG__: false,
    },

    // ESLint settings for .ts files
    overrides: [
        {
            files: ['**/*.ts'],
            parser: '@typescript-eslint/parser',
            plugins: [
                '@stylistic',
                '@typescript-eslint',
                'eslint-plugin-tsdoc',
            ],
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
            ],
            rules: {
                '@stylistic/max-len': ['warn', {
                    code: 100,
                    comments: 80,
                    ignoreUrls: true,
                }],
                // see https://typescript-eslint.io/rules/no-use-before-define/
                'no-use-before-define': 'off',
                '@typescript-eslint/no-use-before-define': 'error',
                'valid-jsdoc': 'off',
                'tsdoc/syntax': 'warn',
            },
        },
    ],
};
