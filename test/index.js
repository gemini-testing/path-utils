'use strict';

const proxyquire = require('proxyquire');
const fs = require('fs');
const utils = require('../lib/utils');

describe('path-utils', () => {
    const sandbox = sinon.sandbox.create();

    let fastGlob;
    let globExtra;

    beforeEach(() => {
        sandbox.stub(process, 'cwd').returns('');
        fastGlob = sandbox.stub();

        globExtra = proxyquire('../lib/index', {'fast-glob': fastGlob});

        sandbox.stub(utils, 'getFilePaths');
        sandbox.stub(fs, 'statAsync').resolves({isFile: () => true});
    });

    afterEach(() => sandbox.restore());

    describe('masks', () => {
        it('should get file path from passed mask', () => {
            fastGlob.withArgs('some/deep/**/*.js').resolves(['some/deep/path/file.js']);

            return globExtra.expandPaths(['some/deep/**/*.js'])
                .then((paths) => assert.deepEqual(paths, ['some/deep/path/file.js']));
        });

        it('should ignore masks which do not match to files', () => {
            fastGlob.withArgs('bad/mask/*.js').resolves([]);
            fastGlob.withArgs('some/path/*.js').resolves(['some/path/file.js']);

            return globExtra.expandPaths([
                'bad/mask/*.js',
                'some/path/*.js'
            ]).then((paths) => assert.deepEqual(paths, ['some/path/file.js']));
        });

        it('should get file path from passed mask according to formats option', () => {
            fastGlob.withArgs('some/path/*.*').resolves(['some/path/file.js', 'some/path/file.txt']);

            return globExtra.expandPaths(['some/path/*.*'], {formats: ['.js']})
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should get uniq file path from passed masks', () => {
            fastGlob.withArgs('some/path/*.js').resolves(['some/path/file.js']);

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
            fastGlob.withArgs('some/path', {onlyFiles: false}).resolves(['some/path']);

            utils.getFilePaths.withArgs('some/path').resolves(['some/path/first.js', 'some/path/second.txt']);

            return globExtra.expandPaths(['some/path'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/first.js', 'some/path/second.txt']);
                });
        });

        it('should get file paths according to formats option', () => {
            fastGlob.withArgs('some/path', {onlyFiles: false}).resolves(['some/path']);

            utils.getFilePaths.withArgs('some/path').resolves(['some/path/first.js', 'some/path/second.txt']);

            return globExtra.expandPaths(['some/path'], {formats: ['.js']})
                .then((paths) => assert.deepEqual(paths, ['some/path/first.js']));
        });

        it('should get uniq absolute file path from passed dirs', () => {
            fastGlob.withArgs('some/path', {onlyFiles: false}).resolves(['some/path']);

            utils.getFilePaths.withArgs('some/path').resolves(['some/path/file.js']);

            return globExtra.expandPaths(['some/path', 'some/path'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });
    });

    describe('files', () => {
        it('should get file path from passed string file path', () => {
            fastGlob.withArgs('some/path/file.js').resolves(['some/path/file.js']);

            return globExtra.expandPaths('some/path/file.js')
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should get file path from passed file path', () => {
            fastGlob.withArgs('some/path/file.js').resolves(['some/path/file.js']);

            return globExtra.expandPaths(['some/path/file.js'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should filter files according to formats option', () => {
            fastGlob
                .withArgs('some/path/file.js').resolves(['some/path/file.js'])
                .withArgs('some/path/file.txt').resolves(['some/path/file.txt']);

            return globExtra.expandPaths(['some/path/file.js', 'some/path/file.txt'], {formats: ['.js']})
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });

        it('should get uniq absolute file path', () => {
            fastGlob.withArgs('some/path/file.js').resolves(['some/path/file.js']);

            return globExtra.expandPaths(['some/path/file.js', 'some/path/file.js'])
                .then((paths) => {
                    assert.deepEqual(paths, ['some/path/file.js']);
                });
        });
    });

    describe('defaults', () => {
        it('should use project root passed from root option', () => {
            fastGlob.withArgs('some/path/', {onlyFiles: false}).resolves(['some/path/']);

            fs.statAsync.withArgs('/project/root/some/path').resolves({isFile: () => false});
            utils.getFilePaths.withArgs('/project/root/some/path').resolves(['/project/root/some/path/file.js']);

            return globExtra.expandPaths(['some/path/'], {root: '/project/root'})
                .then((paths) => {
                    assert.deepEqual(paths, ['/project/root/some/path/file.js']);
                });
        });

        it('should use passed glob options', () => {
            fastGlob.withArgs('some/path/', {onlyFiles: true}).resolves([]);

            return globExtra.expandPaths(['some/path/'], {}, {onlyFiles: true})
                .then((paths) => assert.deepEqual(paths, []));
        });
    });

    describe('glob options', () => {
        it('should exclude file paths from passed masks', () => {
            const globOpts = {ignore: ['some/other/*']};

            fastGlob.withArgs('some/**', globOpts).resolves(['some/path/file.js']);

            return globExtra.expandPaths('some/**', {}, globOpts)
                .then(() => assert.calledWith(fastGlob, 'some/**', globOpts));
        });

        it('should omit fields with "undefined" value', () => {
            const globOpts = {ignore: undefined, onlyFiles: true};
            const expectedGlobOpts = {onlyFiles: true};

            fastGlob.withArgs('some/**', globOpts).resolves(['some/path/file.js']);

            return globExtra.expandPaths('some/**', {}, globOpts)
                .then(() => assert.calledWith(fastGlob, 'some/**', expectedGlobOpts));
        });
    });

    describe('isMask', () => {
        it('should return false if pattern is not passed', () => {
            assert.isFalse(globExtra.isMask());
        });

        it('should return false if passed pattern is not a mask', () => {
            assert.isFalse(globExtra.isMask('some/path/file.js'));
        });

        it('should return true if passed pattern specified as mask', () => {
            assert.isTrue(globExtra.isMask('some/path/*'));
            assert.isTrue(globExtra.isMask('another/**'));
        });
    });

    describe('project root', () => {
        beforeEach(() => sandbox.stub(utils, 'isFile').resolves(true));

        it('shout resolve relative paths using project root', () => {
            fastGlob.withArgs('some/path').resolves(['some/path/file.js']);

            return globExtra.expandPaths('some/path', {root: '/root'})
                .then(() => assert.calledWith(utils.isFile, '/root/some/path/file.js'));
        });

        it('should not resolve absolute paths using project root', () => {
            fastGlob.withArgs('/absolute/some/path').resolves(['/absolute/some/path/file.js']);

            return globExtra.expandPaths('/absolute/some/path', {root: '/root'})
                .then(() => assert.calledWith(utils.isFile, '/absolute/some/path/file.js'));
        });

        it('should use relative paths if project root is not specified', () => {
            fastGlob.withArgs('some/path').resolves(['some/path/file.js']);

            return globExtra.expandPaths('some/path')
                .then(() => assert.calledWith(utils.isFile, 'some/path/file.js'));
        });

        it('should use absolute paths if project roout is not specified', () => {
            fastGlob.withArgs('/absolute/some/path').resolves(['/absolute/some/path/file.js']);

            return globExtra.expandPaths('/absolute/some/path')
                .then(() => assert.calledWith(utils.isFile, '/absolute/some/path/file.js'));
        });
    });
});
