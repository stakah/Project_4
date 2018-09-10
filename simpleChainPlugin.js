'use strict';

const Joi                       = require('joi');                           // Schema validation
const Blockchain                = require('./simpleChain')                  // Private Blockchain
const Block                     = require('./Block');                       // Block object
const BlockchainId              = require('./blockchain-id');               // Blockchain Id
const RequestValidationResponse = require('./request-validation-response'); // requestValidation Response
const StartRegistryBody         = require('./StarRegistryBody');            // StarRegistry body

// A hapi plugin to implement the RESTful Web API for the Private Blockchain
const simpleChainPlugin = {
    name: 'simpleChainPlugin',
    version: '0.0.1',

    register: async function(server, options) {
         // validation timeout window in milliseconds (default: 300,000ms -> 5 min)
         const VALIDATION_WINDOW = options.validationWindow ? parseInt(options.validationWindow, 10) : 300000;


        server.route({
            method: 'GET',
            path: '/block/{BLOCK_HEIGHT}',
            handler: async (request, h) => {
                // request.log(['a', 'name'], "Request name");
                // or
                //request.logger.info(`In handler ${request.method} ${request.path}`);
                const blockHeight = request.params.BLOCK_HEIGHT;

                try {
                    const block = await this.blockchain.getBlock(blockHeight);
                    return block;
                } catch (e) {
                    let resp = h.response({
                            "error":{
                                "code":404,
                                "message":e.message
                            }
                        });
                    resp.code(404);
                    resp.type('application/json');
                    return resp;
                }

            },
            options: {
                validate: {
                    params: Joi.object({
                        BLOCK_HEIGHT: Joi.number().integer().min(0).required()
                    })
                },
                tags: ['api'],
                description: `Gets a JSON object of a Block from the Blockchain.
                Expects the BLOCK_HEIGHT as a path parameter.`,
                notes: `<h3>CURL example</h3>
                <pre>curl "http://localhost:8000/block/0"</pre>'
                <h3>Response example</h3>
                <pre>
{
    "hash":"b3b6024da1705341353a74e109f5d7402a372b9af31d2648ab8ddb810d7f3423",
    "height":0,
    "body":"First block in the chain - Genesis block",
    "time":"1535748190",
    "previousBlockHash":""
}
                </pre>
                
                <p>A 404 response will be returned containing an error object if the blockchain does not contain 
                a block with the given <code>BLOCK_HEIGHT</code></p>
                <pre>{"error":{"code":404,"message":"Key not found in database [1000]"}}</pre> `

            }
        });
        
        server.route({
            method: 'POST',
            path: '/block',
            handler: async (request, h) => {
                // request.log(['a', 'name'], "Request name");
                // or
                //request.logger.info(`In handler ${request.method} ${request.path}`);
                
                const payload = request.payload;
                const address = payload.address;
                const bcId = this.blockchainIdPool.get(address);

                let errMsg = '';

                if      (bcId == undefined)   errMsg = 'Unknown address.';
                else if (bcId.valid == false) errMsg = 'Invalid address.';
                else {
                    const validationWindow = getValidationWindow(bcId.timestamp, VALIDATION_WINDOW);
                    if (validationWindow <= 0) errMsg = 'Validation window time out.';
                }
                
                const story = payload.star.story;
                const storyBytes = Buffer.from(story, 'utf-8');
                const storyWords = story.split(/\s/);

                if (storyWords.length > 250 || storyBytes.length > 500) errMsg = 'Story must be limited to 250 words / 500 bytes.';

                if (errMsg.length > 0) {
                    let resp = h.response({
                        "error":{
                            "code":400,
                            "message":`${errMsg} address:${address}`
                        }
                    });
                    resp.code(400);
                    resp.type('application/json');
                    return resp;
    
                } 
                else {
                    const startRegistryBody = new StartRegistryBody(payload);
                    const body = {'address': startRegistryBody.address, 'star': startRegistryBody.star};

                    const newBlock = await this.blockchain.addBlock( new Block(body));
                
                    //console.log(request.payload, body, newBlock);
                    return newBlock;
                }
            },
            options: {
                validate: {
                    payload: Joi.object()
                                .keys({
                         address: Joi.string().empty('').required(),
                            star: Joi.object()
                                     .keys({
                                  dec: Joi.string().empty('').required(),
                                   ra: Joi.string().empty('').required(),
                                story: Joi.string().empty('').required(),
                            magnitude: Joi.string(),
                        constellation: Joi.string()
                                    })
                              })
                },
                tags: ['api'],
                description: `Adds a new Block into the Blockchain containing a star registry.
                Expects a JSON object with the 'address' key with the Blockchain Id and a 'star' key with
                a star registry.`,
                notes: `On Mac OSX/*nix machines.<br>
                <pre>curl -X "POST" "http://localhost:8000/block" -H 'Content-Type: application/json' -d $'{"address":"blockchain Id", "star": {"ra":"Right Ascencion", "dec":"Declination", "story":"small description"}}'</pre>
                <br><br>
                On Windows Machines<br>
                <pre>curl -X "POST" "http://localhost:8000/block" -H "Content-Type: application/json" -d "{\\"address\\":\\"blockchain Id\\", \\"star\\": {\\"ra\\":\\"Right Ascencion\\", \\"dec\\":\\"Declination\\", \\"story\\":\\"small description\\"}\\"}"</pre>
                <h3>Response example</h3>
                <pre>
{
    "hash":"062855d12a88316af170114c744b8e7e0d0f64d6bd8d2cbd28f1f75207da9920",
    "height":5,
    "body":"block body contents",
    "time":"1535750857",
    "previousBlockHash":"c0f2a0629750dd0df328682ac29825bdaac33130369464fa565857332dbb76a6"
}
                </pre>`
            }
        });

        server.route({
            method:'POST',
            path:'/requestValidation',
            handler: async (request, h)=>{
                
                const address = request.payload.address;
                console.log('address:', address);

                let bcId = this.blockchainIdPool.get(address);

                if (bcId == undefined) {
                    bcId = new BlockchainId(address);
                    this.blockchainIdPool.set(address, bcId);
                }

                let validationWindow = getValidationWindow(bcId.timestamp, VALIDATION_WINDOW);

                if (validationWindow <= 0) {
                    // Validation expired. Create new one.
                    bcId.timestamp = +Date.now();
                    this.blockchainIdPool.set(address, bcId);
                    validationWindow = getValidationWindow(bcId.timestamp, VALIDATION_WINDOW);
                }
                
                const resp = new RequestValidationResponse(bcId.address, bcId.timestamp, validationWindow);

                return resp;
            },
            options: {
                validate: {
                    payload: Joi.object()
                                .keys({
                                    address: Joi.string().empty('').required()
                                })
                },
                tags: ['api'],
                description: `Endpoint for requesting Blockchain ID validation. To validate the Blockchain ID, the 'message'
                must be signed by the wallet containing the Blockchain ID (wallet address) and POSTed to the
                /message-signature/validate endpoint within the validationWindow.`
            }
        });
        
        server.route({
            method:'POST',
            path:'/message-signature/validate',
            handler: async (request, h)=>{
                
                const address   = request.payload.address;
                const signature = request.payload.signature;

                try {
    
                    let bcId = this.blockchainIdPool.get(address);
    
                    let errMsg = '';
    
                    if (bcId == undefined) errMsg = 'Unknown address.';
                    else {
                        const validationWindow = getValidationWindow(bcId.timestamp, VALIDATION_WINDOW);
                        if (validationWindow <= 0) {
                            errMsg = 'Validation window time out.';
                            // Removing Blockchain ID from the pool
                            this.blockchainIdPool.delete(bcId.address);
                        }
                    }
    
                    if (errMsg.length > 0) throw Error(errMsg);

                    const message = RequestValidationResponse.genereateMessage(address, bcId.timestamp);
    
                    const valid = this.blockchain.verifyId(address, signature, message);
                    bcId.valid = true;

                    let resp = {
                        registerStar : valid,
                        status: {
                            address: bcId.address,
                            requestTimestamp: bcId.timestamp,
                            message: message,
                            validationWindow: getValidationWindow(bcId.timestamp, VALIDATION_WINDOW),
                            messageSignature: valid ? 'valid' : 'invalid'
                        }
                    }
                    this.blockchainIdPool.set(bcId.address, bcId);

                    return resp;
                }
                catch (err) {
                    let resp = h.response({
                        "error":{
                            "code":400,
                            "message":`${err.message}`,
                            "address": `${address}`
                        }
                    });
                    resp.code(400);
                    resp.type('application/json');
                    return resp;
                }
            },
            options: {
                validate: {
                    payload: Joi.object()
                                .keys({
                                    address: Joi.string().empty('').required(),
                                    signature: Joi.string().empty('').required()
                                })
                },
                tags: ['api'],
                description: `Endpoint for validating the Blockchain ID by receiving the blockchain ID
                (wallet address) and the message signed from the "/requestValidation" endpoint.`
            }
        });

        server.route({
            method: 'GET',
            path: '/stars/address:{ADDRESS}',
            handler: async (request, h) => {
                const address = request.params.ADDRESS;

                console.log('address', address);

                const starsList = await this.blockchain.getBlocksByAddress(address);

                return starsList;
            },
            options: {
                validate: {
                    params: Joi.object({
                        ADDRESS: Joi.string().empty('').required()
                    })
                },
                tags: ['api'],
                description: `Stars lookup by Blockchain ID (wallet address).
                Returns an array of blocks with stars registered with the Blockchain ID.`
            }
        });

        server.route({
            method: 'GET',
            path: '/stars/hash:{HASH}',
            handler: async (request, h) => {
                const hash = request.params.HASH;

                console.log('hash', hash);

                const block = await this.blockchain.getBlockByHash(hash);

                console.log('block', block);

                if (block == null) {
                    let resp = h.response({
                        "error":{
                            "code":404,
                            "message":`Block not found.`
                        }
                    });
                    resp.code(404);
                    resp.type('application/json');
                    return resp;    
                }
                return block;

            },
            options: {
                validate: {
                    params: Joi.object({
                        HASH: Joi.string().empty('').required()
                    })
                },
                tags: ['api'],
                description: `Stars lookup by Blockchain ID (wallet address).
                Returns a block containing the star registered with the Blockchain ID.`
            }
        });

    },

    blockchain: new Blockchain(),

    blockchainIdPool: new Map()
}

function getValidationWindow(timestamp, maxValidationWindow) {    
    let validationWindow = Math.ceil((timestamp + maxValidationWindow - Date.now()) / 1000);
    console.log(timestamp, maxValidationWindow, +Date.now(), validationWindow);

    validationWindow = validationWindow > 0 ? validationWindow : 0;
    return validationWindow;
}

module.exports = simpleChainPlugin
