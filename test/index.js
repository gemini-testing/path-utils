'use strict';

const proxyquire = require('proxyquire');
const fs = require('fs');
const utils = require('../lib/utils');

describe('path-utils', () => {
    const sandbox = sinon.sandbox.create();

    let glob;
    let globExtra;

    beforeEach(() => {
        sandbox.stub(process, 'cwd').returns('');
        glob = sandbox.stub();

        globExtra = proxyquire('../lib/index', {glob});

        sandbox.stub(utils, 'getFilePaths');
        sandbox.stub(fs, 'statAsync').resolves({isFile: () => true});
    });

    afterEach(() => sandbox.restore());

    describe('masks', () => {
        it('should get file path from passed mask', () => {
            glob.withArgs('some/deep/**/*.js').yields(null, ['some/deep/path/file.js']);

            return globExtra.expandPaths(['some/deep/**/*.js'])
                .then((paths) => assert.deepEqual(paths, ['some/deep/path/file.js']));
        });

        it('should ignore masks which do not match to files', () => {
            glob.withArgs('bad/mask/*.js').yields(null, []);
            glob.withArgs('some/path/*.js').yields(null, ['some/path/file.js']);

            return globExtra.expandPaths([
                'bad/mask/*.js',
                'some/path/*.js'
            ]).then((paths) => assert.deepEqual(paths, ['some/path/file.js']));
        });

        it('should get file path from passed mask according to formats option', () => {
            glob.withArgs('some/path/*.*').yields(null, ['some/path/file.js', 'some/path/file.txt']);

            return globExtra.expandPaths(['some/path/*.*'], {formats: ['.js']})
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should get uniq file path from passed masks', () => {
            glob.withArgs('some/path/*.js').yields(null, ['some/path/file.js']);

            return globExtra.expandPaths(['some/path/*.js', 'some/path/*.js'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });
    });

    describe('directories', () => {
        beforeEach(() => {
            fs.statAsync.withArgs('some/path').resolves({isFile: () => false});
        });

        it('should get paths for all files from passed dir', () => {
            glob.withArgs('some/path').yields(null, ['some/path']);

            utils.getFilePaths.withArgs('some/path').resolves(['some/path/first.js', 'some/path/second.txt']);

            return globExtra.expandPaths(['some/path'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/first.js', 'some/path/second.txt']);
                });
        });

        it('should get file paths according to formats option', () => {
            glob.withArgs('some/path').yields(null, ['some/path']);

            utils.getFilePaths.withArgs('some/path').resolves(['some/path/first.js', 'some/path/second.txt']);

            return globExtra.expandPaths(['some/path'], {formats: ['.js']})
                .then((paths) => assert.deepEqual(paths, ['some/path/first.js']));
        });

        it('should get uniq absolute file path from passed dirs', () => {
            glob.withArgs('some/path').yields(null, ['some/path']);

            utils.getFilePaths.withArgs('some/path').resolves(['some/path/file.js']);

            return globExtra.expandPaths(['some/path', 'some/path'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });
    });

    describe('files', () => {
        it('should get file path from passed string file path', () => {
            glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

            return globExtra.expandPaths('some/path/file.js')
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should get file path from passed file path', () => {
            glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

            return globExtra.expandPaths(['some/path/file.js'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should filter files according to formats option', () => {
            glob
                .withArgs('some/path/file.js').yields(null, ['some/path/file.js'])
                .withArgs('some/path/file.txt').yields(null, ['some/path/file.txt']);

            return globExtra.expandPaths(['some/path/file.js', 'some/path/file.txt'], {formats: ['.js']})
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should get uniq absolute file path', () => {
            glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

            return globExtra.expandPaths(['some/path/file.js', 'some/path/file.js'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });
    });

    describe('defaults', () => {
        it('should use project root passed from root option', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            fs.statAsync.withArgs('/project/root/some/path').resolves({isFile: () => false});
            utils.getFilePaths.withArgs('/project/root/some/path').resolves(['/project/root/some/path/file.js']);

            return globExtra.expandPaths(['some/path/'], {root: '/project/root'})
                .then((paths) => {
                    assert.deepEqual(paths, ['/project/root/some/path/file.js']);
                });
        });
    });

    describe('glob options', () => {
        it('should exclude file paths from passed masks', () => {
            const globOpts = {ignore: ['some/other/*']};

            glob.withArgs('some/**', globOpts).yields(null, ['some/path/file.js']);

            return globExtra.expandPaths('some/**', {formats: ['.js']}, globOpts)
                .then(() => assert.calledWith(glob, 'some/**', globOpts));
        });
    });

    describe('isMask', () => {
        it('should return true if passed pattern specified as mask', () => {
            assert.isOk(globExtra.isMask('some/path/*'));
            assert.isOk(globExtra.isMask('another/**'));
        });

        it('should return false if passed pattern is not a mask', () => {
            assert.isNotOk(globExtra.isMask('some/path/file.js'));
        });
    });

    describe('project root', () => {
        beforeEach(() => sandbox.stub(utils, 'isFile').resolves(true));

        it('shout resolve relative paths using project root', () => {
            glob.withArgs('some/path').yields(null, ['some/path/file.js']);

            return globExtra.expandPaths('some/path', {root: '/root'})
                .then(() => assert.calledWith(utils.isFile, '/root/some/path/file.js'));
        });

        it('should not resolve absolute paths using project root', () => {
            glob.withArgs('/absolute/some/path').yields(null, ['/absolute/some/path/file.js']);

            return globExtra.expandPaths('/absolute/some/path', {root: '/root'})
                .then(() => assert.calledWith(utils.isFile, '/absolute/some/path/file.js'));
        });

        it('should use relative paths if project root is not specified', () => {
            glob.withArgs('some/path').yields(null, ['some/path/file.js']);

            return globExtra.expandPaths('some/path')
                .then(() => assert.calledWith(utils.isFile, 'some/path/file.js'));
        });

        it('should use absolute paths if project roout is not specified', () => {
            glob.withArgs('/absolute/some/path').yields(null, ['/absolute/some/path/file.js']);

            return globExtra.expandPaths('/absolute/some/path')
                .then(() => assert.calledWith(utils.isFile, '/absolute/some/path/file.js'));
        });
    });
});
