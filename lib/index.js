'use strict';

const q = require('q');
const qfs = require('q-io/fs');
const _ = require('lodash');
const glob = require('glob');
const defaults = require('./defaults');
const utils = require('./utils');

const isMask = (pattern) => glob.hasMagic(pattern);

const getFilesByMask = (pattern, options) => {
    return q.nfcall(glob, pattern, options)
        .then((paths) => {
            return _.isEmpty(paths) && !isMask(pattern)
                ? q.reject(new Error(`Cannot find files using path '${pattern}'`))
                : paths;
        });
};

const listFiles = (path) => {
    return qfs.listTree(path)
        .then((paths) => utils.asyncFilter(paths, utils.isFile));
};

const expandPath = (path, options) => {
    if (!qfs.isAbsolute(path)) {
        path = qfs.join(options.root, path);
    }

    return utils.isFile(path)
        .then((isFile) => isFile ? [path] : listFiles(path))
        .then((paths) => paths.filter((path) => utils.matchesFormats(path, options.formats)))
        .then((paths) => paths.map((path) => qfs.absolute(path)));
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

exports.isMasks = (patterns) => [].concat(patterns).every(isMask);
