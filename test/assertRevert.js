module.exports = async(promise) => {
    try {
        await promise;
        asserts.fail('Expected revert not received')
    }catch (error) {
        const revertFound = error.message.search('revert') >= 0
        assert(revertFound, `Expected "revert", got ${error} instead`);
    }
}