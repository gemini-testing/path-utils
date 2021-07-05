'use strict';

global.assert.calledOnceWith = (...args) => {
    assert.calledOnce(args[0]);
    assert.calledWith(...args);
};

global.assert.calledOnceWithMatch = (...args) => {
    assert.calledOnce(args[0]);
    assert.calledWithMatch(...args);
};
