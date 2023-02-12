const Lottery = artifacts.require("Lottery");
const { assert } = require('chai');
const assertRevert = require('./assertRevert');
const expectEvent = require('./expectEvent');

contract('Lottery', function([deployer, user1, user2]){
    let lottery;
    let betAmount = 5 * 10 ** 15;
    let betAmountBN = new web3.utils.BN('5000000000000000');
    let bet_block_interval = 3;
    beforeEach(async () => {
        lottery = await Lottery.new();  // 배포
    })

    it('getPot should return current pot', async () => {
        let pot = await lottery.getPot();
        assert.equal(pot, 0)
    })

    describe('Bet', function() {
        it('should fail when the bet money is not 0.005 ETH', async () => {
            // Faill transaction
            // transaction object {chainId, value, to, from, gas(limit), gasPrice}
            await assertRevert(lottery.bet('0xab', {from: user1, value: 4000000000000000}))

        })
        it('should put the bet to the bet queue with 1 bet', async () => {
            // Bet
            let receipt = await lottery.bet('0xab', {from: user1, value: betAmount})
            //console.log(receipt)

            let pot = await lottery.getPot();
            assert.equal(pot, 0);

            // Check contract balance == 0.005
            let contractBalance = await web3.eth.getBalance(lottery.address);
            assert.equal(contractBalance, betAmount)

            // Check bet info
            let currentBlockNumber = await web3.eth.getBlockNumber();
            let bet = await lottery.getBetInfo(0);

            assert.equal(bet.answerBlockNumber, currentBlockNumber + bet_block_interval);
            assert.equal(bet.bettor, user1);
            assert.equal(bet.challenges, '0xab');

            // Check log
            //console.log(receipt)
            await expectEvent.inLogs(receipt.logs, 'BET');
        })
    })

    describe('isMatch', function(){
        let blockHash = '0xabcacfe4c96b1bb2f6d736398871d951a76fd73ab490ea65d7864b0a6d1e4601';

        it('should be bettingResult. win when two characters match', async () => {
            let matchingResult = await lottery.isMatch('0xab', blockHash);
            assert.equal(matchingResult, 1);
        })

        it('should be bettingResult. Fail when two characters match', async () => {
            let matchingResult = await lottery.isMatch('0xcd', blockHash);
            assert.equal(matchingResult, 0);
        })

        it('should be bettingResult. Draw when two characters match', async () => {
            let matchingResult = await lottery.isMatch('0xaf', blockHash);
            assert.equal(matchingResult, 2);

            matchingResult = await lottery.isMatch('0xfb', blockHash);
            assert.equal(matchingResult, 2);
        })
    })

    describe('Distribute', function() {
        describe('When the answer is checkable', function() {

            // 두 글자 다 맞았을때
            it('should give the user the pot when the answer matches', async () => {
                
                // 테스트를 위한 정답 셋팅
                await lottery.setAnswerForTest('0xabcacfe4c96b1bb2f6d736398871d951a76fd73ab490ea65d7864b0a6d1e4601', {from: deployer});

                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 1 -> 4
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 2 -> 5
                await lottery.betAndDistribute('0xab', {from: user1, value: betAmount})  // 3 -> 6, 6번 블럭의 정답을 확인하려면 7번 블럭까지는 마이닝을 해야함
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 4 -> 7
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 5 -> 8
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 6 -> 9

                let potBefore = await lottery.getPot();  // == 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);

                let receipt7 = await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 7 -> 10, 정답 체크 후 user1에게 팟머니 전달

                let potAfter = await lottery.getPot();  // == 0.015 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1);  // before + 0.015 ETH

                // pot의 변화량 
                assert.equal(potBefore.toString(), new web3.utils.BN('10000000000000000').toString());
                assert.equal(potAfter.toString(), new web3.utils.BN('0').toString());

                // user(winner)의 밸런스 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
                assert.equal(user1BalanceBefore.add(potBefore).add(betAmountBN).toString(), new web3.utils.BN(user1BalanceAfter).toString())
            })

            // 한 글자만 맞았을때
            it('should give the user the amount he or she bet when a single character matches', async () => {
                // 테스트를 위한 정답 셋팅
                await lottery.setAnswerForTest('0xabcacfe4c96b1bb2f6d736398871d951a76fd73ab490ea65d7864b0a6d1e4601', {from: deployer});

                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 1 -> 4
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 2 -> 5
                await lottery.betAndDistribute('0xaf', {from: user1, value: betAmount})  // 3 -> 6, 6번 블럭의 정답을 확인하려면 7번 블럭까지는 마이닝을 해야함
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 4 -> 7
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 5 -> 8
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 6 -> 9

                let potBefore = await lottery.getPot();  // == 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);

                let receipt7 = await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 7 -> 10, 정답 체크 후 user1에게 팟머니 전달

                let potAfter = await lottery.getPot();  // == 0.01 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1);  // before + 0.005 ETH

                // pot의 변화량 
                assert.equal(potBefore.toString(), potAfter.toString());

                // user(winner)의 밸런스 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
                assert.equal(user1BalanceBefore.add(betAmountBN).toString(), new web3.utils.BN(user1BalanceAfter).toString())
            })

            // 다 틀렸을때
            it.only('should get the eth of user when the answer does not match at all', async () => {
                await lottery.setAnswerForTest('0xabcacfe4c96b1bb2f6d736398871d951a76fd73ab490ea65d7864b0a6d1e4601', {from: deployer});

                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 1 -> 4
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 2 -> 5
                await lottery.betAndDistribute('0xef', {from: user1, value: betAmount})  // 3 -> 6, 6번 블럭의 정답을 확인하려면 7번 블럭까지는 마이닝을 해야함
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 4 -> 7
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 5 -> 8
                await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 6 -> 9

                let potBefore = await lottery.getPot();  // == 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);

                let receipt7 = await lottery.betAndDistribute('0xef', {from: user2, value: betAmount})  // 7 -> 10, 정답 체크 후 user1에게 팟머니 전달

                let potAfter = await lottery.getPot();  // == 0.015 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1);  // before

                // pot의 변화량 
                assert.equal(potBefore.add(betAmountBN).toString(), potAfter.toString());

                // user(winner)의 밸런스 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
                assert.equal(user1BalanceBefore.toString(), new web3.utils.BN(user1BalanceAfter).toString())
            })
        })
        describe('When the answer is not revealed(Not Moned)', function() {
        
        })
        describe('When the answer is not revealed(Block limit is passed', function() {
        
        })
    })
})