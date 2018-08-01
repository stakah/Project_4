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
    this.getBlockHeight()
        .then(value=>{
          if (value < 0) {
            this.addBlock(new Block("First block in the chain - Genesis block"));
          }
        }, error=>console.log("[constructor]", error))
  }

  // Removes all the keys in the database
  clearDb() {
    db.createKeyStream().on('data', key=>db.del(key));
  }

  // Add new block
  addBlock(newBlock){
   return this.getBlockHeight()
              .then(height => {
                // Block height
                newBlock.height = height+1;
                // UTC timestamp
                newBlock.time = new Date().getTime().toString().slice(0,-3);
                // Block hash with SHA256 using newBlock and converting to a string
                newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
                if (height >= 0) {
                  (async () => {
                    await this.getBlock(height)
                              .then(previousBlock=>{
                                newBlock.previousBlockHash = previousBlock.hash;
                              });
                  }).bind(this)();
                }

                // Adding block object to chain
                return this.addLevelDBData(newBlock.height, newBlock);
              }, error=>{
                console.log("[addBlock]", error)
              });
  }

  // Add data to levelDB with key/value pair
  addLevelDBData(key,value){
    db.batch()
      .put(HEIGHT_KEY, key)
      .put(key, JSON.stringify(value))
      .write(function(err) {
      if (err) return console.log('Block ' + key + ' submission failed', err);
    })
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
                      db.put(HEIGHT_KEY, height);
                      resolve(height);
                    })
                 })
                 ;
      });
    }

    // get block
    getBlock(blockHeight){
      let p = new Promise(function(resolve, reject) {
        db.get(blockHeight, function(err, data) {
          if (err) return console.log("Loading block " + blockHeight + " failed ", err);
  
          resolve(JSON.parse(data));
        });
      })
      return p;
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
    validateChain(){
      let errorLog = [];
      
      this.getBlockHeight()
          .then(height=>{
            let promises = [];
            (async function loop() {
              for (let i = 0; i <=height; i++) {
                var blockHash, previousHash, blockValid;
                let key = i;
                await this.validateBlock(key)
                          .then(valid=>{
                            blockValid = valid;
                            return  this.getBlock(key)
                          })
                          .then(block=>{
                            previousHash = block.previousBlockHash;
                            if (!blockValid || (key > 0 && blockHash != previousHash) ) {
                              errorLog.push(key);
                            }
                            blockHash = block.hash;
                          })
                          ;
              }
            }).bind(this)();
          })
          .then(()=>{
            if (errorLog.length>0) {
              console.log('Block errors = ' + errorLog.length);
              console.log('Blocks: '+errorLog);
            } else {
              console.log('No errors detected');
            }
          });
    }
}

