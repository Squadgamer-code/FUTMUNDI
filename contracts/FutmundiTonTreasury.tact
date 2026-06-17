import "@stdlib/deploy";
import "@stdlib/ownable";

// FUTMUNDI TON-only Treasury
// Economy confirmed:
// 1 TON = 40 gems
// Withdraw gross: min 4 TON (160 gems), max 80 TON (3200 gems)
// Withdrawal fee: 6% + 1 TON. Fixed 1 TON is sent to feeWallet; 6% remains in Treasury.

message(0x46544d01) WithdrawTON {
    queryId: Int as uint64;
    amount: Int as coins; // gross amount in TON nano-units
    to: Address;
}

message(0x46544d02) UpdateFees {
    feeBps: Int as uint16; // 600 = 6%
    fixedFee: Int as coins;
    minWithdraw: Int as coins;
    maxWithdraw: Int as coins;
}

message(0x46544d03) Pause {}
message(0x46544d04) Unpause {}

message(0x46544d05) EmergencyWithdrawTON {
    amount: Int as coins;
    to: Address;
}

message(0x46544d06) UpdateFeeWallet {
    feeWallet: Address;
}

contract FutmundiTonTreasury with Deployable, Ownable {
    owner: Address;
    feeWallet: Address;
    paused: Bool;
    feeBps: Int as uint16;
    fixedFee: Int as coins;
    minWithdraw: Int as coins;
    maxWithdraw: Int as coins;

    init(owner: Address, feeWallet: Address) {
        self.owner = owner;
        self.feeWallet = feeWallet;
        self.paused = false;
        self.feeBps = 600; // 6%
        self.fixedFee = ton("1");
        self.minWithdraw = ton("4");
        self.maxWithdraw = ton("80");
    }

    receive("Fund") {
        require(context().value > 0, "No TON sent");
    }

    receive("Deposit") {
        require(context().value > 0, "No TON sent");
    }

    receive("Bet") {
        require(context().value > 0, "No TON sent");
    }

    receive("Tournament") {
        require(context().value > 0, "No TON sent");
    }

    receive(msg: WithdrawTON) {
        self.requireOwner();
        require(!self.paused, "Treasury paused");
        require(msg.amount >= self.minWithdraw, "Min withdraw");
        require(msg.amount <= self.maxWithdraw, "Max withdraw");

        let percentFee: Int = msg.amount * self.feeBps / 10000;
        let totalFee: Int = percentFee + self.fixedFee;
        require(msg.amount > totalFee, "Fee exceeds amount");
        let userAmount: Int = msg.amount - totalFee;

        // Send net TON to the user.
        send(SendParameters{
            to: msg.to,
            value: userAmount,
            mode: SendPayGasSeparately,
            body: null
        });

        // Send fixed fee to fee wallet. Percent fee remains in Treasury balance.
        if (self.fixedFee > 0) {
            send(SendParameters{
                to: self.feeWallet,
                value: self.fixedFee,
                mode: SendPayGasSeparately,
                body: null
            });
        }
    }

    receive(msg: UpdateFees) {
        self.requireOwner();
        require(msg.feeBps <= 2000, "Fee too high"); // max 20%
        require(msg.fixedFee >= 0, "Bad fixed fee");
        require(msg.minWithdraw > 0, "Bad min");
        require(msg.maxWithdraw >= msg.minWithdraw, "Bad max");
        self.feeBps = msg.feeBps;
        self.fixedFee = msg.fixedFee;
        self.minWithdraw = msg.minWithdraw;
        self.maxWithdraw = msg.maxWithdraw;
    }

    receive(_: Pause) {
        self.requireOwner();
        self.paused = true;
    }

    receive(_: Unpause) {
        self.requireOwner();
        self.paused = false;
    }

    receive(msg: UpdateFeeWallet) {
        self.requireOwner();
        self.feeWallet = msg.feeWallet;
    }

    receive(msg: EmergencyWithdrawTON) {
        self.requireOwner();
        require(msg.amount > 0, "Bad amount");
        send(SendParameters{
            to: msg.to,
            value: msg.amount,
            mode: SendPayGasSeparately,
            body: null
        });
    }

    get fun config(): String {
        return "FUTMUNDI TON Treasury v1: 1 TON = 40 gems; withdraw fee 6% + 1 TON";
    }
}
