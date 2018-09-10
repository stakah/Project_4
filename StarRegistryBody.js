'use strict';

//const Buffer = require('buffer');

class StarRegistryBody {
    constructor(body) {
        this.address = body.address;
        this.star = {
            ra: body.star.ra,
            dec: body.star.dec,
            story: StarRegistryBody.stringToHex(body.star.story),
            magnitude: body.star.magnitude, // optional
            constellation: body.star.constellation // optional
        }

    }
}

StarRegistryBody.stringToHex = function(str) {
    return Buffer.from(str, 'utf8').toString('hex')
}

StarRegistryBody.hexToString = function(hex) {
    return hex.toString('utf-8');
}

module.exports = StarRegistryBody