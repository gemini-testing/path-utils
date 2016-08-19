'use strict';

const _ = require('lodash');
const q = require('q');
const qfs = require('q-io/fs');

exports.asyncFilter = (items, cb) => {
    return _(items)
        .map((item) => cb(item).then((res) => res && item))
        .thru(q.all)
        .value()
        .then(_.compact);
};

exports.matchesFormats = (path, formats) => {
    return _.isEmpty(formats) || _.includes(formats, qfs.extension(path));
};

exports.isFile = (path) => qfs.stat(path).then((stat) => stat.isFile());
