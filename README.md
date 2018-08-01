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

2) Enter a node session, also known as REPL (Read-Evaluate-Print-Loop).
```
node
```
3) Copy and paste your code into your node session

4) Instantiate blockchain with blockchain variable
```
let blockchain = new Blockchain();
```
5) Generate 10 blocks using a for loop
```
(async function loop () {
  for (let i=1; i<=10; i++) {
    console.log('creating block ' + i);
    await blockchain.addBlock(new Block('test data' + i));
  }
})();
````
6) Check generated blocks
```
(async function loop () {
  let h = await blockchain.getBlockHeight();
  console.log('Blockchain height: ' + h);
  for (let i=0; i<=h; i++) {
    let b = await blockchain.getBlock(i);
    console.log('block #' + i + ' - ' + b.body);
  }
})();
```
7) Validate blockchain
```
blockchain.validateChain();
```
8) Induce errors by changing block data
```
(async function loop() {
  let inducedErrorBlocks = [2,4,7];
  for (let i=0; i<3; i++) {
    let key = inducedErrorBlocks[i];
    let b = await blockchain.getBlock(key)
                    .then(block => {
                      block.data = 'induced chain error';
                      db.put(key, JSON.stringify(block), function(err) {
                        if (err) console.log(err);
                      })
          });
  }
})();

```
9) Validate blockchain. The chain should now fail with blocks 2,4, and 7.
```
blockchain.validateChain();
```
