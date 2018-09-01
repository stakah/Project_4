/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===========================
|  Learn more: level: https://github.com/Level/level         |
|  =========================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

/* ===== Block Class =========================================
|  Class with a constructor for block 			                 |
|  =========================================================*/

const Block = require('./block');

// The key to store the block height
const HEIGHT_KEY = 'heightKey';

/* ===== Blockchain Class ====================================
|  Class with a constructor for new blockchain 	             |
|  =========================================================*/

class Blockchain{
  constructor(){
    (async ()=>{
      let height = await this.getBlockHeight();
      if (height < 0) {
        this.addBlock(new Block("First block in the chain - Genesis block"));
      }
    }).bind(this)();
  }

  // Removes all the keys in the database
  clearDb() {
    db.createKeyStream().on('data', key=>db.del(key));
  }

   // Add new block
  async addBlock(newBlock){
    let height = await this.getBlockHeight();
    if (height >= 0) {
      let pBlock = await this.getBlock(height);
      newBlock.previousBlockHash = pBlock.hash;
    }
    // Block height
    newBlock.height = height+1;
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
    await this.addLevelDBData(newBlock.height, newBlock);
    const aBlock = await this.getBlock(newBlock.height);
    return aBlock;
   }

  // Add data to levelDB with key/value pair
  addLevelDBData(key,value){
    return new Promise((resolve, reject)=>{
      db.batch()
      .put(HEIGHT_KEY, key)
      .put(key, JSON.stringify(value))
      .write(function(err) {
        if (err) {
          console.log('Block ' + key + ' submission failed', err);
          reject(err);
        } else {
          resolve();
        }
      });

    });
  }

  // Get block height
  getBlockHeight(){
    return new Promise((resolve, reject)=>{
       db.get(HEIGHT_KEY)
         .then(data=>resolve(parseInt(data))
              ,err=>{
                var h = 0;
                db.createKeyStream()
                  .on('data', function (key) {
                     if (key !== HEIGHT_KEY) h++;
                  })
                  .on('end', function(){
                    let height = h-1;
                    db.put(HEIGHT_KEY, height, function(err){
                      if (err) console.log('Error saving block height.', err);
                      resolve(height);
                    });
                  })
               })
               ;
    });
  }

    // get block
  async getBlock(blockHeight){
    let data = await db.get(blockHeight);
    return JSON.parse(data);
  }

    // validate block
   validateBlock(blockHeight){
      let res = this.getBlock(blockHeight)
          .then(block=>{
            // get block hash
            let blockHash = block.hash;
            // remove block hash to test block integrity
            block.hash = '';
            // generate block hash
            let validBlockHash = SHA256(JSON.stringify(block)).toString();
            // Compare
            if (blockHash===validBlockHash) {
              console.log('Block #'+blockHeight+' valid');
              return true;
            } else {
              console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
              return false;
            }

          }, error=>{
            console.log("[validateBlock]", error)
          })

      return res;
    }

   // Validate blockchain
   async validateChain(){
    let errorLog = [];
    
    let blockHash, previousHash;
    let height = await this.getBlockHeight();
    for (let i = 0; i <=height; i++) {
      let key = i;
      let blockValid = await this.validateBlock(key);
      let block = await this.getBlock(key);
      previousHash = block.previousBlockHash;
      if (!blockValid || (key > 0 && blockHash != previousHash) ) {
        errorLog.push(key);
      }
      blockHash = block.hash;
    }
    if (errorLog.length>0) {
      console.log('Block errors = ' + errorLog.length);
      console.log('Blocks: '+errorLog);
    } else {
      console.log('No errors detected');
    }

  }
}

module.exports = Blockchain