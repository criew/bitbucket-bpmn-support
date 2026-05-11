const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => ({
    entry: {
        'bpmn_diff': path.resolve(__dirname, '../src/main/resources/js/bpmn_diff.js'),
        'bpmn_viewer': path.resolve(__dirname, '../src/main/resources/js/bpmn_viewer.js'),
    },
    output: {
        path: path.resolve(__dirname, '../target/classes/js'),
        filename: '[name].bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '../css/[name].bundle.css',
        }),
    ],
    resolve: {
        extensions: ['.js'],
    },
});
