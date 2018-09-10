'use strict';

/* ===== BlockchaniId Class ========================
|  Class with a constructor for blockchain Id      |
| (Wallet address)                                 |
|  ===============================================*/

class BlockchainId {
    constructor(address) {
        this.address = address;
        this.timestamp = + Date.now();
        this.valid = false;

    }

    validate(valid) {
        this.valid = valid;
    }

    isValid() {
        return this.valid;
    }
}

module.exports = BlockchainId;
