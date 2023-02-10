// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


contract Lottery {
    struct BetInfo {
        uint256 answerBlockNumber; 
        address payable bettor;
        bytes1 challenges;  // 0xab, byte 없어져서 수정
    }

    uint256 private _tail;
    uint256 private _head;
    mapping (uint256 => BetInfo) private _bets;

    address public owner;

    uint256 constant internal BLOCK_LIMIT = 256;
    uint256 constant internal BET_BLOCK_INTERVAL = 3;
    uint256 constant internal BET_AMOUNT = 5 * 10 ** 15;  // 베팅 금액 고정

    uint256 private _pot;  // 팟 머니 저장

    event BET(uint256 index, address bettor, uint256 amount, bytes1 challenges, uint256 answerBlockNumber);

    constructor() {
        owner = msg.sender;
    }

    // _pot 값 조회
    function getPot() public view returns (uint256 pot) {
        return _pot;
    }

    // 베팅
    /**
     * @dev 베팅을 한다. 유저는 0.005 ETH를 보내야 하고, 베팅용 1byte 글자를 보낸다.
     * 큐에 저장된 베팅 정보는 이후 distribute 함수에서 해결된다.
     */
    function bet(bytes1 challenges) public payable returns (bool result) {
        // 돈이 제대로 들어왔는지 확인
        require(msg.value == BET_AMOUNT, "Not enough ETH");

        // 큐에 bet 정보 넣기
        require(pushBet(challenges), "Fail to add a new Bet Info");

        // emit event
        emit BET(_tail - 1, msg.sender, msg.value, challenges, block.number + BET_BLOCK_INTERVAL);

        return true;
    }
        // 값 저장 (Save the bet to the queue)
    // 검증 (Distribute)
        // 결과 값 검증 (Check the answer)


    // BetInfo의 값을 가져옴 (큐의 값 (_bets) 가져옴)
    function getBetInfo(uint256 index) public view returns(uint256 answerBlockNumber, address bettor, bytes1 challenges) {
        BetInfo memory b = _bets[index];

        answerBlockNumber = b.answerBlockNumber;
        bettor = b.bettor;
        challenges = b.challenges;
    }

    function pushBet(bytes1 challenges) internal returns(bool) {
        BetInfo memory b;
        b.bettor = payable(msg.sender);  // 수정
        // block.number -> 현재 트랜잭션에 들어가는 블럭의 값을 가져올 수 있음
        b.answerBlockNumber = block.number + BET_BLOCK_INTERVAL;
        b.challenges = challenges;

        _bets[_tail] = b;
        _tail++;
        return true;
    }

    function popBet(uint256 index) internal returns(bool) {
        delete _bets[index];
        return true;
    }
}