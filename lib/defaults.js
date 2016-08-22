'use strict';
const _ = require('lodash');

module.exports = (options) => {
    return _.defaults(options || {}, {
        formats: [],
        root: process.cwd()
    });
};
