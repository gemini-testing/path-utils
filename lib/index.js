'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const glob = Promise.promisify(require('glob'));
const defaults = require('./defaults');
const utils = require('./utils');
const path = require('path');

const isMask = (pattern) => glob.hasMagic(pattern);

const getFilesByMask = (pattern, options) => glob(pattern, options);

const expandPath = (basePath, options) => {
    basePath = options.root ? path.resolve(options.root, basePath) : basePath;

    return utils.isFile(basePath)
        .then((isFile) => isFile ? [basePath] : utils.getFilePaths(basePath))
        .then((paths) => paths.filter((path) => utils.matchesFormats(path, options.formats)));
};

const processPaths = (paths, cb) => {
    return Promise.map(paths, cb)
        .then(_.flatten)
        .then(_.uniq);
};

exports.expandPaths = (paths, expandOpts, globOpts) => {
    expandOpts = defaults(expandOpts);

    paths = [].concat(paths);

    return processPaths(paths, (path) => getFilesByMask(path, globOpts))
        .then((matchedPaths) => processPaths(matchedPaths, (path) => expandPath(path, expandOpts)));
};

exports.isMask = isMask;
