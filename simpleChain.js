/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(){
    this.getBlockHeight()
        .then((value)=>{
          if (value < 0) {
            this.addBlock(new Block("First block in the chain - Genesis block"));
          }
        }, (error)=>{
          console.log("[constructor]", error)
        })
  }

  // Remove all the keys in the database
  clearDb() {
    db.createKeyStream().on('data', (key)=>{db.del(key)});
  }

  // Add new block
  addBlock(newBlock){
    //console.log("[addBlock][1]" + JSON.stringify(newBlock));

    this.getBlockHeight()
        .then((height) => {
          var p1, p2;

          if (height >= 0) {
            p1 = this.getBlock(height)
                .then((previousBlock)=>{
                  // previous block hash
                  newBlock.previousBlockHash = previousBlock.hash;
                })
          }
          else {
            p2 = Promise.resolve(1);
          }

          Promise.all([p1,p2])
                 .then(()=>{
                  // Block height
                  newBlock.height = height+1;
                  // UTC timestamp
                  newBlock.time = new Date().getTime().toString().slice(0,-3);
                  // Block hash with SHA256 using newBlock and converting to a string
                  newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
                  // Adding block object to chain
                  //console.log("[addBlock][2]" + JSON.stringify(newBlock), JSON.parse(JSON.stringify(newBlock)));
                  this.addLevelDBData(newBlock.height, newBlock);
                })
          }, (error)=>{
            console.log("[addBlock]", error)
          });
  }

  // Add data to levelDB with key/value pair
  addLevelDBData(key,value){
    //console.log("[addLevelDBData][1]" + JSON.stringify(value), value);
    db.put(key, JSON.stringify(value), function(err) {

      if (err) return console.log('Block ' + key + ' submission failed', err);

      // db.get(key, (err,value)=>{
      //   if (err) return console.log('Reading block ' + key + ' failed', err);

      //   //console.log("[addLevelDBData][db.put][db.get][1]" + value, JSON.parse(value));

      // })
    })
  }

  // Get block height
    getBlockHeight(){
      var h = 0;
      let p = new Promise(function(resolve, reject) {
        db.createKeyStream()
        .on('data', function (data) {
          h++;
          //console.log('h:' + h)
        })
        .on('end', function(){
          //console.log('resolve:'+h);
          resolve(h-1);
        })
      });

      return p;
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
          .then((block)=>{
            // get block hash
            let blockHash = block.hash;
            // remove block hash to test block integrity
            block.hash = '';
            // generate block hash
            let validBlockHash = SHA256(JSON.stringify(block)).toString();
            // Compare
            if (blockHash===validBlockHash) {
               return true;
              } else {
                console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
               return false;
              }

          }, (error)=>{
            console.log("[validateBlock]", error)
          })

      return res;
    }

   // Validate blockchain
    validateChain(){
      let errorLog = [];
      
      this.getBlockHeight()
          .then((height)=>{
            let promises = [];
            for (var i=1; i<=height; i++) {
              let p = new Promise((resolve, reject)=>{
                let key = i;
                var blockHash = "", previousHash = "";
                return  this.getBlock(key)
                            .then((block)=>{
                              previousHash = block.previousBlockHash;
                              return this.getBlock(key-1);
                            })
                            .then((block)=>{
                              blockHash = block.hash;
                              return this.validateBlock(key);
                            })
                            .then((valid)=>{
                              //console.log(key, valid, blockHash, previousHash);
                              if (!valid || (key > 0 && blockHash != previousHash)) {
                                errorLog.push(key);
                              }
                              resolve();
                            });
                });
              promises.push(p);
            }

            Promise.all(promises).then(()=>{
              if (errorLog.length>0) {
                console.log('Block errors = ' + errorLog.length);
                console.log('Blocks: '+errorLog);
              } else {
                console.log('No errors detected');
              }
            });
          });
    }
}

