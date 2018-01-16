'use strict';

const fs = require('fs');
const utils = require('../lib/utils');

describe('utils', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    describe('matchesFormats', () => {
        it('should return `true` if the formats option contain passed file format', () => {
            assert.isTrue(utils.matchesFormats('some/path/file.js', ['.js']));
        });

        it('should return `false` if the formats option does not contain passed file format', () => {
            assert.isFalse(utils.matchesFormats('some/path/file.js', ['.txt']));
        });
    });

    describe('isFile', () => {
        beforeEach(() => {
            sandbox.stub(fs, 'statAsync');
        });

        it('should return `true` if the passed path is file', () => {
            fs.statAsync.resolves({isFile: () => true});

            return assert.becomes(utils.isFile('some/path/file.js'), true);
        });

        it('should return `false` if the passed path is directory', () => {
            fs.statAsync.resolves({isFile: () => false});

            return assert.becomes(utils.isFile('some/path/dir'), false);
        });
    });

    describe('getFilePaths', () => {
        const createStatStub = (paths, opts) => {
            paths.forEach((path) => {
                fs.statAsync.withArgs(path).resolves({isFile: () => opts.isFile});
            });
        };

        const createFiles = (...paths) => createStatStub(paths, {isFile: true});

        const createDirs = (...paths) => createStatStub(paths, {isFile: false});

        beforeEach(() => {
            sandbox.stub(fs, 'statAsync');
            sandbox.stub(fs, 'readdirAsync');
        });

        it('should return file if argument is a file', () => {
            createFiles('file.js');

            return assert.becomes(utils.getFilePaths('file.js'), ['file.js']);
        });

        it('should return empty array if argument is an empty directory', () => {
            createDirs(false, 'dir');
            fs.readdirAsync.withArgs('dir').resolves([]);

            return assert.becomes(utils.getFilePaths('dir'), []);
        });

        it('should return only files from file system', () => {
            createDirs('root', 'root/subdir');
            createFiles('root/file.js', 'root/subdir/file2.txt', 'root/subdir/file3.txt');
            fs.readdirAsync.withArgs('root').resolves(['file.js', 'subdir']);
            fs.readdirAsync.withArgs('root/subdir').resolves(['file2.txt', 'file3.txt']);

            return assert.becomes(utils.getFilePaths('root'), ['root/file.js', 'root/subdir/file2.txt', 'root/subdir/file3.txt']);
        });

        it('should throw an error if directory is not acceptable', () => {
            createDirs('root');
            fs.readdirAsync.rejects('no-rights');

            return assert.isRejected(utils.getFilePaths('root'), /no-rights/);
        });
    });
});
