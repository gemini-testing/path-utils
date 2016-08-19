'use strict';

const q = require('q');
const qfs = require('q-io/fs');
const _ = require('lodash');
const glob = require('glob');
const defaults = require('./defaults');
const utils = require('./utils');

const getFilesByMask = (mask) => {
    return q.nfcall(glob, mask)
        .then((paths) => {
            return _.isEmpty(paths)
                ? q.reject(new Error(`Cannot find files by mask ${mask}`))
                : paths;
        });
};

const listFiles = (path) => {
    return qfs.listTree(path)
        .then((paths) => utils.asyncFilter(paths, utils.isFile));
};

const expandPath = (path, options) => {
    if (options.root && !qfs.isAbsolute(path)) {
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
        .thru(q.all).value()
        .then(_.flatten)
        .then(_.uniq);
};

exports.expandPaths = (paths, options) => {
    options = defaults(options);

    return processPaths(paths, getFilesByMask)
        .then((matchedPaths) => processPaths(matchedPaths, (path) => expandPath(path, options)));
};
