'use strict';
const chai = require('chai')
const chaiHttp = require('chai-http')

chai.use(chaiHttp);

const expect = chai.expect;

const server = require('../server');

const bitcoin = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')
const fixtures = require('./fixtures/SimpleChain');
const StarRegistryBody = require('../StarRegistryBody');
const Blockchain = require('../simpleChain')


const REQUEST_VALIDATION_URL = '/requestValidation';
const MESSAGE_SIGNATURE_VALIDATE_URL = '/message-signature/validate';
const BLOCK_URL = '/block';
const STARS_URL = '/stars';

describe ('SimpleChainAPITest', function() {
    
    function sleep(ms){
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }

    function getKeys() {
        function rng () { return Buffer.from('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz') }

        const keyPair = bitcoin.ECPair.makeRandom({ rng: rng })
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey })

        return [keyPair, address];
    }

    function getSignBody(message, keyPair, address) {
        const sign = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
        const signature = sign.toString('base64');

        const signBody = {
            address: address,
            signature: signature
        }

        return signBody;
    }

    async function getMessage(address) {
        const body = {
            address: address
        };
        
        return await chai.request(server.listener)
            .post(REQUEST_VALIDATION_URL)
            .send(body)
            .then(function(res){
                return res.body.message;
            })
    }


    before(async function() {
        const argv = [];
        argv[2] = 1000;
        await server.init(argv);
    });

    describe('requestValidation endpoint', function() {
  
        it('should accept request', function(done) {
            const body = {
                address: fixtures.address
            };
    
            chai.request(server.listener)
                .post(REQUEST_VALIDATION_URL)
                .send(body)
                .end(function(err, res){
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('address');
                    expect(res.body).to.have.property('requestTimestamp');
                    expect(res.body).to.have.property('validationWindow');
                    expect(res.body).to.have.property('message');
                    done();
                })
        });

        it('should reject request',  function(done) {
            const body = {
                foo: 'bar'
            };
            
            chai.request(server.listener)
                .post(REQUEST_VALIDATION_URL)
                .send(body)
                .end(function(err, res){
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error').equal('Bad Request');
                    expect(res.body).to.have.property('message').equal('Invalid request payload input');
                    done();
                })
        });

    });

    describe('message-signature/validate endpoint', function() {

        it('should validate message signature',  async function() {

            const [keyPair, address] = getKeys();
                
            let message= await getMessage(address);
            expect(message).to.be.not.null;

            const signBody = getSignBody(message, keyPair, address);

            return chai.request(server.listener)
                .post(MESSAGE_SIGNATURE_VALIDATE_URL)
                .send(signBody)
                .then(function(res){
                    const body = res.body;

                    expect(res.body).to.have.property('registerStar').equal(true);
                    expect(res.body).to.have.property('status');
                    expect(res.body.status).to.have.property('address');
                    expect(res.body.status.address).to.be.equal(address);
                    expect(res.body.status).to.have.property('requestTimestamp');
                    expect(res.body.status).to.have.property('message');
                    expect(res.body.status).to.have.property('validationWindow');
                    expect(res.body.status).to.have.property('messageSignature').equal('valid');
                    return true;
                })
        });

        it('should reject with "Invalid address <address>"', function(done) {
            const signBody = {
                address: 'address',
                signature: 'signature'
            }
            
            chai.request(server.listener)
                .post(MESSAGE_SIGNATURE_VALIDATE_URL)
                .send(signBody)
                .end(function(err, res){
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error.code).to.be.equal(400);
                    expect(res.body.error.message).to.be.equal('Unknown address.');
                    done();
                })
        });

        it('should reject with "Validation window time out."', async function() {
            const [keyPair, address] = getKeys();
    
            const message = await getMessage(address);
            expect(message).to.be.not.null;
    
            await sleep(1000); // waits 20 ms
    
            const signBody = getSignBody(message, keyPair, address);
    
            it('should reject with "Validation window time out."', function(done) {
                chai.request(server.listener)
                    .post(MESSAGE_SIGNATURE_VALIDATE_URL)
                    .send(signBody)
                    .end(function(err, res){
                        expect(res).to.have.status(400);
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).to.be.equal(400);
                        expect(res.body.error.message).to.be.equal('Validation window time out.');
                        done();
                    })
            });
        });
    
    });

    describe('POST /block endpoint', function() {
        it('should reject with "Unknown address"', function() {
            const body = {
                address: 'address',
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            return chai.request(server.listener)
                       .post(BLOCK_URL)
                       .send(body)
                       .then(function(res){
                         expect(res).to.have.status(400);
                         expect(res.body).to.have.property('error');
                         expect(res.body.error.code).to.be.equal(400);
                         expect(res.body.error.message).to.be.equal('Unknown address.');
                       })
            
        });

        it('should reject with "Invalid address"', async function() {

            const message = await getMessage('address');

            const body = {
                address: 'address',
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            return chai.request(server.listener)
                       .post(BLOCK_URL)
                       .send(body)
                       .then(function(res){
                         expect(res.body).to.contain.property('error');
                         expect(res.body.error.code).to.be.equal(400);
                         expect(res.body.error.message).to.be.equal('Invalid address.');
                       })
            
        });

        it('should reject second star registry with "Unknown address"', async function() {
            const [keyPair, address] = getKeys();

            const message = await getMessage(address);
            
            const signBody = getSignBody(message, keyPair, address);
            
            await chai.request(server.listener)
                      .post(MESSAGE_SIGNATURE_VALIDATE_URL)
                      .send(signBody)
                      .then(function(res){
                        expect(res.body).to.have.property('registerStar').equal(true);
                        expect(res.body).to.have.property('status');
                        expect(res.body.status).to.have.property('messageSignature').equal('valid');
                      })

            let body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            await  chai.request(server.listener)
                       .post(BLOCK_URL)
                       .send(body)
                       .then(function(res){
                           expect(res.body).to.contain.property('body');
                           expect(res.body.body).to.have.property('address');
                           expect(res.body.body.address).to.be.equal(address);
                           expect(res.body.body).to.contain.property('star');
                       })
            
            return chai.request(server.listener)
                       .post(BLOCK_URL)
                       .send(body)
                       .then(function(res){
                           expect(res).to.have.status(400);
                           expect(res.body).to.contain.property('error');
                           expect(res.body.error.message).to.be.equal(`Unknown address.`);
                           expect(res.body.error).to.have.property('info');
                           expect(res.body.error.info).to.be.instanceOf(Array);
                           expect(res.body.error.info[0]).to.have.property('name').to.be.equal('address');
                           expect(res.body.error.info[0]).to.have.property('value').to.be.equal(address);
                       })
            
        });

        it('should reject with "Story must be limited to 250 words / 500 bytes."', async function() {
            const [keyPair, address] = getKeys();
            const message = await getMessage(address);
            const signBody = getSignBody(message, keyPair, address);

            let story = '';
            for (let i=0; i<251; i++) story += 'a ';

            const body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: story
                }
            }

            return chai.request(server.listener)
                       .post(BLOCK_URL)
                       .send(body)
                       .then(function(res){
                           expect(res).to.have.status(400);
                           expect(res.body).to.have.property('error');
                           expect(res.body.error.message).to.be
                           .equal(`Story must be limited to 250 words / 500 bytes.`);
                           expect(res.body.error).to.have.property('info');
                           expect(res.body.error.info).to.be.instanceOf(Array);
                           expect(res.body.error.info[0]).to.have.property('name').to.be.equal('address');
                           expect(res.body.error.info[0]).to.have.property('value').to.be.equal(address);
                       })
        });

        it('should reject with "Story must be limited to 250 words / 500 bytes."', async function() {
            const [keyPair, address] = getKeys();
            const message = await getMessage(address);
            const signBody = getSignBody(message, keyPair, address);

            let story = '';
            for (let i=0; i<501; i++) story += 'a';

            const body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: story
                }
            }

            return chai.request(server.listener)
            .post(BLOCK_URL)
            .send(body)
            .then(function(res){
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('error');
                expect(res.body.error.message).to.be
                .equal(`Story must be limited to 250 words / 500 bytes.`);
                expect(res.body.error).to.have.property('info');
                expect(res.body.error.info).to.be.instanceOf(Array);
                expect(res.body.error.info[0]).to.have.property('name').to.be.equal('address');
                expect(res.body.error.info[0]).to.have.property('value').to.be.equal(address);
 })
                        
        });

        it('should accept a star registry', async function() {
            const [keyPair, address] = getKeys();
            const message = await getMessage(address);
            const signBody = getSignBody(message, keyPair, address);
    
            await chai.request(server.listener)
                      .post(MESSAGE_SIGNATURE_VALIDATE_URL)
                      .send(signBody)
                      .then(function(res){
                          expect(res).to.have.status(200);
                          expect(res.body).to.have.property('registerStar').equal(true);
                          expect(res.body).to.have.property('status');
                          expect(res.body.status).to.have.property('messageSignature').equal('valid');
                        })

            const body = {
                address: address,
                star: {
                    dec: 'dec',
                    ra: 'ra',
                    story: 'story'
                }
            }

            return chai.request(server.listener)
            .post(BLOCK_URL)
            .send(body)
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('body');
                expect(res.body.body).to.have.property('address');
                expect(res.body.body.address).to.be.equal(address);
                expect(res.body.body).to.have.property('star');
            })

        });


    });

    describe('/stars/hash:{HASH} endpoint', function() {
        it('should return a star registry', async function() {
            const height = 1;
            
            let hash;
            await chai.request(server.listener)
                       .get(`${BLOCK_URL}/${height}`)
                       .then(function(res){
                           expect(res).to.have.status(200);
                           expect(res.body).to.have.property('hash');
                           expect(res.body.body).to.have.property('address');
                           expect(res.body.body).to.have.property('star');
                           hash = res.body.hash;
                       })
        
            return chai.request(server.listener)
                       .get(`${STARS_URL}/hash:${hash}`)
                       .then(function(res){
                           expect(res).to.have.status(200);
                           expect(res.body).to.have.property('hash');
                           expect(res.body.hash).to.be.equal(hash);
                           expect(res.body.body).to.have.property('star');
                           expect(res.body.body.star).to.have.property('storyDecoded');
                       })
        })

        it('should reject with "Block not found."', async function() {
            const hash = "hash";

            return chai.request(server.listener)
                       .get(`${STARS_URL}/hash:${hash}`)
                       .then(function(res){
                           expect(res).to.have.status(404);
                           expect(res.body).to.have.property('error');
                           expect(res.body.error.message).to.be.equal('Block not found.');
                           expect(res.body.error).to.have.property('info');
                           expect(res.body.error.info).to.be.instanceOf(Array);
                           expect(res.body.error.info[0]).to.have.property('name').to.be.equal('hash');
                           expect(res.body.error.info[0]).to.have.property('value').to.be.equal(hash);
                       })
        })
    });

    describe('/stars/address:{ADDRESS} endpoint', function() {
        it('should return a star registry', async function() {
            const height = 1;
            
            let address;
            await chai.request(server.listener)
                       .get(`${BLOCK_URL}/${height}`)
                       .then(function(res){
                           expect(res).to.have.status(200);
                           expect(res.body).to.have.property('hash');
                           expect(res.body.body).to.have.property('address');
                           expect(res.body.body).to.have.property('star');
                           address = res.body.body.address;
                       })
        
            return chai.request(server.listener)
                       .get(`${STARS_URL}/address:${address}`)
                       .then(function(res){
                           expect(res).to.have.status(200);
                           expect(res.body).to.be.instanceof(Array);
                           expect(res.body.length).to.be.gte(1);
                       })
        })

        it('should return empty array."', async function() {
            const address = "address";

            return chai.request(server.listener)
                       .get(`${STARS_URL}/address:${address}`)
                       .then(function(res){
                           expect(res).to.have.status(200);
                           expect(res.body).to.be.instanceOf(Array);
                           expect(res.body.length).to.be.equal(0);
                       })
        })
    });

})
