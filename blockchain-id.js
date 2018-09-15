'use strict';

// Blockchain object
const Blockchain = require('./simpleChain');

/* ===== BlockchaniId Class ========================
|  Class with a constructor for blockchain Id      |
| (Wallet address)                                 |
|  ===============================================*/

class BlockchainId {
    constructor(address) {
        this.address = address;
        this.timestamp = Blockchain.getTimestamp();
        this.valid = false;
        //console.log(`[new BlockchainId] ${this.toString()}`);
    }

    validate(valid) {
        this.valid = valid;
    }

    isValid() {
        return this.valid;
    }

    toString() {
        return `{\n\t address:${this.address},\n\ttimestamp:${this.timestamp},\n\tvalid=${this.valid}}`;
    }
}

module.exports = BlockchainId;
