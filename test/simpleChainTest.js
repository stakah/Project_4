'use strict';
const fetch  = require('node-fetch');
const assert = require('assert');
const bitcoin = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')
const fixtures = require('./fixtures/SimpleChain');
const StarRegistryBody = require('../StarRegistryBody');

describe ('SimpleChainTest', function() {

    async function requestEndpoint(url, method, body) {
        if (method == 'POST')
            return fetch(url, {
                method: method,
                headers: {'Content-Type':'application/json; charset=utf-8'},
                body: JSON.stringify(body)
            });
        else if (method == 'GET')
        return fetch(url, {
            method: method
        });
}

    async function requestValidation(body) {
        const url = `${fixtures.baseUrl}/requestValidation`;

        return requestEndpoint(url, 'POST', body);
    }

    async function messageSignatureValidate(body) {
        const url = `${fixtures.baseUrl}/message-signature/validate`;

        return requestEndpoint(url, 'POST', body);
    }

    async function postStarRegistry(body) {
        const url = `${fixtures.baseUrl}/block`;

        return requestEndpoint(url, 'POST', body);
    }

    async function getBlock(height) {
        const url = `${fixtures.baseUrl}/block/${height}`;

        return requestEndpoint(url, 'GET', {});
    }

    async function getStarByHash(hash) {
        const url = `${fixtures.baseUrl}/stars/hash:${hash}`;

        return requestEndpoint(url, 'GET', {});
    }

    function rng () { return Buffer.from('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz') }
    
    function sleep(ms){
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }

    describe('requestValidation endpoint', function() {
        it('should accept request', async function() {
            const body = {
                address: fixtures.address
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            assert(j.address, 'Response with address');
            assert(j.requestTimestamp, 'Response with requestTimestamp');
            assert(j.validationWindow, 'Response with validationWindow');
            assert(j.message, 'Response with message');
    
        })

        it('should reject request', async function() {
            const body = {
                foo: 'bar'
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            assert.equal(j.statusCode, 400, 'Error status code');
            assert.equal(j.error, 'Bad Request','Error type');
            assert.equal(j.message, 'Invalid request payload input','Error message');
    
        })
    })


    describe('message-signature/validate endpoint', function() {
        it('should validate message signature', async function() {

            const keyPair = bitcoin.ECPair.makeRandom({ rng: rng })
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })
            
            const body = {
                address: address
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            const message = j.message;
    
            const sign = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
            const signature = sign.toString('base64');
    
            const signBody = {
                address: address,
                signature: signature
            }
    
            let sr = await messageSignatureValidate(signBody);
            let sj = await sr.json();
                
            assert.ok(sj.registerStar, 'Can register a star');
            assert(sj.status, 'Have a status object');
            assert.equal(sj.status.address, address, 'Address')
            assert(sj.status.requestTimestamp, 'Status with validation requestTimestamp')
            assert.equal(sj.status.message, message, 'Status with message')
            assert(sj.status.validationWindow, 'Status with validation window')
            assert.equal(sj.status.messageSignature, 'valid', 'Valid signature')
    
        })

        it('should reject with "Invalid address <address>"', async function() {
            const signBody = {
                address: 'address',
                signature: 'signature'
            }
    
            let sr = await messageSignatureValidate(signBody);
            let sj = await sr.json();

            assert(sj.error, 'Returns error object');
            assert.equal(sj.error.code, 400, 'Bad request');
            assert(sj.error.message, 'Invalid address');
        })

        it('should reject with "Validation window timed out."', async function() {
            const keyPair = bitcoin.ECPair.makeRandom({ rng: rng })
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })
            
            const body = {
                address: address
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            const message = j.message;
    
            const sign = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
            const signature = sign.toString('base64');
    
            const signBody = {
                address: address,
                signature: signature
            }
    
            await sleep(20); // waits 20 ms

            let sr = await messageSignatureValidate(signBody);
            let sj = await sr.json();

            assert(sj.error, 'Returns error object');
            assert.equal(sj.error.code, 400, 'Bad request');
            assert(sj.error.message);
        })
    })

    describe('POST /block endpoint', function() {
        it('should reject with "Unknown blockchainId"', async function() {
            const body = {
                address: 'address',
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            const r = await postStarRegistry(body);
            const j = await r.json();

            assert(j.error, 'Rejected with error object');
            assert.equal(j.error.code, 400, 'Bad request');
            assert(j.error.message.startsWith('Unknown blockchainId'));
            
        })

        it('should reject with "Invalid blockchainId"', async function() {
            let body = {
                address: 'address'
            }

            let r = await requestValidation(body);

            body = {
                address: 'address',
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            r = await postStarRegistry(body);
            const j = await r.json();

            assert(j.error, 'Rejected with error object');
            assert.equal(j.error.code, 400, 'Bad request');
            assert(j.error.message.startsWith('Invalid blockchainId'));
            
        })

        it('should reject with "BlockchainId validity timed out"', async function() {
            const keyPair = bitcoin.ECPair.makeRandom({ rng: rng })
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })
            
            let body = {
                address: address
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            const message = j.message;
    
            const sign = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
            const signature = sign.toString('base64');
    
            const signBody = {
                address: address,
                signature: signature
            }
    
            let sr = await messageSignatureValidate(signBody);

            body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            await sleep(20); // wait 20ms

            r = await postStarRegistry(body);
            j = await r.json();


            assert(j.error, 'Rejected with error object');
            assert.equal(j.error.code, 400, 'Bad request');
            assert(j.error.message.startsWith('BlockchainId validity timed out'));
            
        })

        it('should reject with "Story must be limited to 250 words / 500 bytes."', async function() {
            const keyPair = bitcoin.ECPair.makeRandom({ rng: rng })
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })
            
            let body = {
                address: address
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            const message = j.message;
    
            const sign = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
            const signature = sign.toString('base64');
    
            const signBody = {
                address: address,
                signature: signature
            }
    
            let sr = await messageSignatureValidate(signBody);

            let story = '';
            for (let i=0; i<251; i++) story += 'a ';

            body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: story
                }
            }

            r = await postStarRegistry(body);
            j = await r.json();


            assert(j.error, 'Rejected with error object');
            assert.equal(j.error.code, 400, 'Bad request');
            assert(j.error.message.startsWith('Story must be limited to 250 words / 500 bytes.'));
            
            
        })

        it('should reject with "Story must be limited to 250 words / 500 bytes."', async function() {
            const keyPair = bitcoin.ECPair.makeRandom({ rng: rng })
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })
            
            let body = {
                address: address
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            const message = j.message;
    
            const sign = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
            const signature = sign.toString('base64');
    
            const signBody = {
                address: address,
                signature: signature
            }
    
            let sr = await messageSignatureValidate(signBody);

            let story = '';
            for (let i=0; i<501; i++) story += 'a';

            body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: story
                }
            }

            r = await postStarRegistry(body);
            j = await r.json();


            assert(j.error, 'Rejected with error object');
            assert.equal(j.error.code, 400, 'Bad request');
            assert(j.error.message.startsWith('Story must be limited to 250 words / 500 bytes.'));
                        
        })

        it('should accept a star registry', async function() {
            const keyPair = bitcoin.ECPair.makeRandom({ rng: rng })
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })
            
            let body = {
                address: address
            };
    
            let r = await requestValidation(body);
            let j = await r.json();
    
            const message = j.message;
    
            const sign = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
            const signature = sign.toString('base64');
    
            const signBody = {
                address: address,
                signature: signature
            }
    
            let sr = await messageSignatureValidate(signBody);

            body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            r = await postStarRegistry(body);
            j = await r.json();


            assert(j.hash, 'Accept star registry');
            assert.equal(j.body.address, address);
            assert(j.body.star, 'Block with a star registry');
            assert.equal(j.body.star.ra, body.star.ra);
            assert.equal(j.body.star.dec, body.star.dec);
            assert.equal(j.body.star.story, StarRegistryBody.stringToHex(body.star.story));
        })
    })

    describe('/stars/hash:{HASH} endpoint', function() {
        it('should return a star registry', async function() {
            const height = 1;
            const block = await getBlock(height);

            const r = await getStarByHash(block.hash);
            const j = await r.json();

            assert.equal(j.hash, block.hash, 'Block with the hash');
            assert.equal(j.star, block.star);
        })

        it('should reject with "Star with specified hash not found"', async function() {
            const hash = "hash";

            const r = await getStarByHash(hash);
            const j = await r.json();

            assert(j.error, "Return an error object");
            assert.equal(j.error.code, 404);
            assert.equal(j.error.message, 'Star with specified hash not found.')
        })
    })
})
