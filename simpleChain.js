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

// Star Object
const StarRegistryBody = require("./StarRegistryBody");

// The key to store the block height
const HEIGHT_KEY = 'heightKey';

// Index object map block hash -> block height
const HASH_IDX = 'hashIdx';

// Index object map block address -> array of block heights
const ADDR_IDX = 'addrIdx';

/* ===== Blockchain Class ====================================
|  Bitcoinjs                                                 |
|  =========================================================*/
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');

/* ===== Blockchain Class ====================================
|  Class with a constructor for new blockchain 	             |
|  =========================================================*/

class Blockchain{
  constructor(done){
    (async ()=>{
      let height = await this.getBlockHeight();
      if (height < 0) {
        await this.addBlock(new Block("First block in the chain - Genesis block"));
      }
      if (done) done();
    }).bind(this)();
  }

  // Removes all the keys in the database
  clearDb() {
    return new Promise((resolve, reject)=>{
      db.createKeyStream().on('data', key=>db.del(key))
                          .on('end', resolve);

    })
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
    newBlock.time = Blockchain.getTimestamp();
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
    const hashIdx = await this.getHashIdx();
    const addrIdx = await this.getAddrIdx();
    const body = newBlock.body;
    const address = body.address;
    
    //console.log('[addBlock] address:', address, '\nnewBlock:\n\t', newBlock);
    //console.log('[addBlock]1\n\t', hashIdx, '\n\t', addrIdx);

    if (address != undefined) {
      let blockList = addrIdx.get(address);

      if (blockList == undefined) blockList = new Map();

     //console.log('[addBlock] blockList:\n\t', blockList, typeof(blockList), blockList.toString());
      blockList.set(newBlock.height, newBlock.height);
      addrIdx.set(address, blockList);
    }

    hashIdx.set(newBlock.hash, newBlock.height);

    //console.log('[addBlock]\n\t', hashIdx, '\n\t', addrIdx);

    await this.addLevelDBData(newBlock.height, hashIdx, addrIdx, newBlock);
    const aBlock = await this.getBlock(newBlock.height);
    return aBlock;
   }

   async getHashIdx() {
    return new Promise((resolve,reject)=>{
      db.get(HASH_IDX, (err,data)=>{
        if (err) {
          resolve(new Map());
        } else {
          //console.log(`[getHashIdx] data: ${JSON.stringify(data)}`);
          resolve(this.jsonToMap(data));
        }
      })
    });
  }

  async getAddrIdx() {
    return new Promise((resolve,reject)=>{
      db.get(ADDR_IDX, (err,data)=>{
        if (err) {
          resolve(new Map());
        } else {
          resolve(this.jsonToMap(data));
        }
      })
    });
  }
// Add data to levelDB with key/value pair
  addLevelDBData(key,hashIdx, addrIdx, block){
    return new Promise((resolve, reject)=>{
      db.batch()
      .put(HEIGHT_KEY, key)
      .put(HASH_IDX, this.mapToJson(hashIdx))
      .put(ADDR_IDX, this.mapToJson(addrIdx))
      .put(key, JSON.stringify(block))
      .write(function(err) {
        if (err) {
          //console.log('Block ' + key + ' submission failed', err);
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
                     if (key !== HEIGHT_KEY && key !== ADDR_IDX && key !== HASH_IDX) h++;
                  })
                  .on('end', function(){
                    let height = h-1;
                    db.put(HEIGHT_KEY, height, function(err){
                      if (err) {
                        console.log('Error saving block height.', err);
                        reject(err);
                      }
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
    let block = await JSON.parse(data);
    //console.log(data);
    if (block.body.star !== undefined) {
      block.body.star.storyDecoded = StarRegistryBody.hexToString(block.body.star.story);
    }
    return block;
  }

  async getBlockByHash(hash){
    let hashIdx = await this.getHashIdx();
    const blockHeight = hashIdx.get(hash);
    //console.log('[getBlockByHash]', blockHeight);
    if (blockHeight == undefined) return null;
    return this.getBlock(blockHeight);
  }

  async getBlocksByAddress(address){
    let addrIdx = await this.getAddrIdx();
    //console.log('[getBlocksByAddress]', address, addrIdx);
    if (addrIdx == undefined) return null;

    let blockList = [];
    const heightList = addrIdx.get(address) || [];

    //console.log('heightList:', heightList);

    
    for (let [height] of heightList) {
      const block = await this.getBlock(height);
      //console.log('height:', height, 'block:\n\t', block);
      blockList.push(block);
    }

    //console.log('[getBlocksByAddress] blockList:\n\t', blockList);

    return blockList;
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
              //console.log('Block #'+blockHeight+' valid');
              return true;
            } else {
              //console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
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

  verifyId(address, signature, message) {

    //let address = '142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ'
    //let signature = 'IJtpSFiOJrw/xYeucFxsHvIRFJ85YSGP8S1AEZxM4/obS3xr9iz7H0ffD7aM2vugrRaCi/zxaPtkflNzt5ykbc0='
    //let message = '142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ:1532330740:starRegistry'

    const res = bitcoinMessage.verify(message, address, signature);

    //console.log('verifyId:', res);

    return res;
  }

  mapToJson(map) {
    const replacer = function(key,value){
      if (value instanceof Map) return JSON.stringify([...value], replacer);
      else if (value instanceof Set) return JSON.stringify([...value], replacer);
      return value;
    };

    return JSON.stringify([...map], replacer, ' ');
  }

  jsonToMap(jsonStr) {
    const reviver = function(key,value) {
      //console.log(value + ': ' + typeof(value));
      const rx = /,/;

      if (typeof(value) !== 'string') return value;

      let aux = value.split(rx);
      //console.log(`aux:(${aux.length}) ${aux}`);

      if (aux[0].charAt(0) == '[')
        return new Map(JSON.parse(value));
      else
        return value;
      
    };
    return new Map(JSON.parse(jsonStr, reviver));
  }
}

//var bc = new Blockchain();
//var amap = new Map();
//var amap2 = new Map();
//amap.set('addr1', new Set([1,2,3]));

//amap2.set('addr2_1', new Set([4,5,6]));
//amap2.set('addr2_2', new Set([7,8,9]));
//amap2.set('addr2_3', new Set([10,11,12,13,14,15,16]));
//amap.set('addr2', amap2);

//bc.jsonToMap(bc.mapToJson(amap));
//amap;

Blockchain.getTimestamp = function() {
  const ts = new Date().getTime().toString().slice(0,-3);
  //console.log(`ts:${ts} typeof(ts):${typeof(ts)}`);
  return ts;
}
module.exports = Blockchain