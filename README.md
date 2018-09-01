# Blockchain Data

Blockchain has the potential to change the way that the world approaches data. Develop Blockchain skills by understanding the data model behind Blockchain by developing your own simplified private blockchain.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Installing Node and NPM is pretty straightforward using the installer package available from the [Node.js® web site](https://nodejs.org/en/).

### Configuring your project

- Use NPM to initialize your project.
```
npm install
```

## Testing

To test code:

1) Open a command prompt or shell terminal after install node.js.

2) Run the web server with the command:
```
node server.js
```
3) Open browser and access the address [http://localhost:8000/block/0](http://localhost:8000/block/0) to get
the block at block height 0 - the genesis block

4) Or, use another command prompt or shell terminal and run the `curl` tool
```
curl http://localhost:8000/block/0
```
5) To create and add a new block in the blockchain, do an HTTP POST using `curl`

On a MacOS X/linux machine:
```
curl -X "POST" "http://localhost:8000/block" -H 'Content-Type: application/json' -d $'{"body":"block body contents"}'
```

On a Windows machine:
```
curl -X "POST" "http://localhost:8000/block" -H "Content-Type: application/json" -d "{\"body\":\"block body contents\"}"
```

## Endpoints documentation

> The endpoints documentation can also be viewed at [http://localhost:8000/docs](http://localhost:8000/docs).


### GET /block/{BLOCK_HEIGHT}

Gets a block using the `BLOCK_HEIGHT` as the path parameter. Returns a JSON formatted block content.

* URL: `/block/{BLOCK_HEIGHT}`
* method: `GET`
* response: JSON formatted block content.

#### Response example

```
curl http://localhost:8000/block/0
{"hash":"9695500836e92049f3fcc6f04fb13fda41ee9b42daa6a86347e26fc062dab51a","height":0,"body":"First block in the chain - Genesis block","time":"1535763291","previousBlockHash":""}

```
#### Error response
A 404 response will be returned containing an error object if the blockchain does not contain a block with the given `BLOCK_HEIGHT`.

```
curl http://localhost:8000/block/1000
{"error":{"code":404,"message":"Key not found in database [1000]"}}
```

### POST /block

Creates and adds a new block in the blockchain. The request must contain a JSON formatted request body. Returns
a JSON formatted block content.

* URL: `/block`
* method: `POST`
* response: JSON formatted block content.

#### Response example

```
curl -X "POST" "http://localhost:8000/block" -H 'Content-Type: application/json' -d $'{"body":"block body contents"}'
{"hash":"f1b282f27696d6d53492deee7cd2424153eff5679404429c97b4089ca11d2886","height":5,"body":" ","time":"1535768385","previousBlockHash":"568e0f3e164b5a6e5514346e5c898f293af453355ed8b8a2578ea1be7c984d4b"}
```