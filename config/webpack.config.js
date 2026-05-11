const path = require('path');

module.exports = (env, argv) => ({
    entry: {},
    output: {
        path: path.resolve(__dirname, '../target/classes'),
        filename: '[name].js',
    },
});
