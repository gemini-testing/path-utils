'use strict';

const q = require('q');
const qfs = require('q-io/fs');
const _ = require('lodash');
const glob = require('glob');
const defaults = require('./defaults');
const utils = require('./utils');
const resolvePath = require('path').resolve;

const isMask = (pattern) => glob.hasMagic(pattern);

const getFilesByMask = (pattern, options) => q.nfcall(glob, pattern, options);

const listFiles = (path) => {
    return qfs.listTree(path)
        .then((paths) => utils.asyncFilter(paths, utils.isFile));
};

const expandPath = (path, options) => {
    path = options.root ? resolvePath(options.root, path) : path;

    return utils.isFile(path)
        .then((isFile) => isFile ? [path] : listFiles(path))
        .then((paths) => paths.filter((path) => utils.matchesFormats(path, options.formats)));
};

const processPaths = (paths, cb) => {
    return _(paths)
        .map(cb)
        .thru(q.all)
        .value()
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
