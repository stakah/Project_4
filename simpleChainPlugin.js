'use strict';

const Joi        = require('joi'); // Schema validation
const Blockchain = require('./simpleChain') // Private Blockchain
const Block      = require('./Block'); // Block object

// A hapi plugin to implement the RESTful Web API for the Private Blockchain
const simpleChainPlugin = {
    name: 'simpleChainPlugin',
    version: '0.0.1',

    register: async function(server, options) {

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
                const body = payload.body;
                const newBlock = await this.blockchain.addBlock( new Block(body));
                
                //console.log(request.payload, body, newBlock);
                return newBlock;
            },
            options: {
                validate: {
                    payload: Joi.object()
                                .keys({
                                    body: Joi.any().empty('').required()
                                })
                },
                tags: ['api'],
                description: `Adds a new Block into the Blockchain.
                Expects a JSON object with the 'body' key containing the Block body text.`,
                notes: `On Mac OSX/*nix machines.<br>
                <pre>curl -X "POST" "http://localhost:8000/block" -H 'Content-Type: application/json' -d $'{"body":"block body contents"}'</pre>
                <br><br>
                On Windows Machines<br>
                <pre>curl -X "POST" "http://localhost:8000/block" -H "Content-Type: application/json" -d "{\\"body\\":\\"block body contents\\"}"</pre>
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
        
    },

    blockchain: new Blockchain()
}

module.exports = simpleChainPlugin
