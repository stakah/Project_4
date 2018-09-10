'use strict';

class RequestValidationResponse {
    constructor(address, requestTimestamp, validationWindow) {
        this.address = address;
        this.requestTimestamp = requestTimestamp;
        this.validationWindow = validationWindow;
        this.message = RequestValidationResponse.genereateMessage(address, requestTimestamp);
    }


}

RequestValidationResponse.genereateMessage = function (address, requestTimestamp) {
    return `${address}:${requestTimestamp}:starRegistry`;
}

module.exports = RequestValidationResponse;