'use strict';

const q = require('q');
const qfs = require('q-io/fs');
const sinon = require('sinon');
const utils = require('../lib/utils');

describe('utils', () => {
    describe('asyncFilter', () => {
        it('should filter array using async function', () => {
            const isPositive = (number) => q.delay(1).then(() => q(number > 0));

            return assert.becomes(utils.asyncFilter([-1, 0, 1], isPositive), [1]);
        });
    });

    describe('matchesFormats', () => {
        it('should return `true` if the formats option contain passed file format', () => {
            assert.isTrue(utils.matchesFormats('some/path/file.js', ['.js']));
        });

        it('should return `false` if the formats option does not contain passed file format', () => {
            assert.isFalse(utils.matchesFormats('some/path/file.js', ['.txt']));
        });
    });

    describe('isFile', () => {
        const sandbox = sinon.sandbox.create();

        beforeEach(() => {
            sandbox.stub(qfs, 'stat');
        });

        afterEach(() => sandbox.restore());

        it('should return `true` if the passed path is file', () => {
            qfs.stat.returns(q({isFile: () => true}));

            return assert.becomes(utils.isFile('some/path/file.js'), true);
        });

        it('should return `false` if the passed path is dir', () => {
            qfs.stat.returns(q({isFile: () => false}));

            return assert.becomes(utils.isFile('some/path/dir'), false);
        });
    });
});
