'use strict';
const chai = require('chai');
const expect = chai.expect;

//const fetch  = require('node-fetch');
//const assert = require('assert');
//const bitcoin = require('bitcoinjs-lib')
//const bitcoinMessage = require('bitcoinjs-message')
//const fixtures = require('./fixtures/SimpleChain');
//const StarRegistryBody = require('../StarRegistryBody');
const Blockchain = require('../simpleChain')
const StarRegistryBody = require('../StarRegistryBody')
const Block = require('../block')

describe ('SimpleChainTest', function() {
    function sleep(ms){
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }

    after(async function(){
        const bc = new Blockchain();

        await bc.clearDb();
    });

    describe('Clear DB', function() {
        it('should clear DB', async function() {
            const bc = new Blockchain();

            await bc.clearDb();

            let h = await bc.getBlockHeight();

            expect(h).to.be.equal(-1);
        })
    })

    describe('StarRegistryBody', function(){
        it('should create new StarRegistryBody', async function(){
            const body = {
                address:'1234567890',
                star:{
                    ra:'star Right Ascension',
                    dec:'star Declination',
                    story:'star story',
                    magnitude:'star magnitude',
                    constellation:'star constellation'
                }
            }
            const srb = new StarRegistryBody(body);

            let bc;
            let p = new Promise((resolve,reject)=>{
                bc = new Blockchain(resolve);
            })
            
            await p.then();

            const res = await bc.addBlock(new Block({address:srb.address, star:srb.star}));

            expect(res).to.have.property('hash');
            expect(res.body).to.have.property('address');
            expect(res.body.address).to.be.equal(body.address);
            expect(res.body).to.have.property('star');
        });
    });

    describe('Blockchain', function() {
        it('should get block height', async function(){
            const bc = new Blockchain();

            let h = await bc.getBlockHeight();

            expect(h).to.be.equal(1);
        });

        it('should get the Genesis block', async function(){
            const bc = new Blockchain();

            let b = await bc.getBlock(0);

            expect(b).to.have.property('hash');
            expect(b.body).to.be.equal('First block in the chain - Genesis block');
        })

        it('should get star by hash', async function() {
            const bc = new Blockchain();

            let b = await bc.getBlock(1);

            b = await bc.getBlockByHash(b.hash);

            expect(b).to.have.property('hash');
            expect(b).to.have.property('body');
            expect(b.body).to.have.property('address');
            expect(b.body).to.have.property('star');
        })

        it('should get stars by address', async function() {
            const bc = new Blockchain();

            let b = await bc.getBlock(1);

            let arr = await bc.getBlocksByAddress(b.body.address);

            expect(arr).to.be.instanceOf(Array);
            expect(arr.length).to.be.gt(0);

            for (let i=0; i<arr.length; i++) {
                expect(arr[i]).to.have.property('hash');
                expect(arr[i]).to.have.property('body');
                expect(arr[i].body).to.have.property('address');
                expect(arr[i].body).to.have.property('star');
            }
        })
    });
});

