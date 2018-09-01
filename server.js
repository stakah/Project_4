'use strict';

const Hapi     = require('hapi');     // REST
const showdown = require('showdown'); // Convert MD <-> HTML
const fs       = require('fs');       // File System
const Joi      = require('joi');      // Schema validation

const DEBUG_ALL = { request: ['*'], log: ['*']}; // To log debug messages
const DEBUG_OFF = false;                         // hide debug messages

const server = Hapi.server({
    port: 8000,
    host: 'localhost',
    debug: DEBUG_ALL //DEBUG_OFF
});

server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
        const converter = new showdown.Converter(),
              path      = "./README.md";
        let   text      = fs.readFileSync(path, 'utf8');
        converter.setFlavor('github');
        const converted = converter.makeHtml(text);
        let html;

        return h.view('README', { converted: converted});
    },
    options: {
        plugins: {
            lout: false
        }
    }
});

const init = async () => {
    await server.register(require('inert'));  // Static content
    await server.register(require('vision')); // Templating
    await server.register(require('lout'));   // Endpoint docs
    await server.register({
        plugin: require('hapi-pino'),        // Logger
        options: {
            prettyPrint: true,
            logEvents: ['response']
        }
    });
    await server.register(require('./simpleChainPlugin')); // Private Blockchain

    server.views({
        engines: {
            html: require('handlebars')
        },
        relativeTo: __dirname,
        path: 'templates'
    });

    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();