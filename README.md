db-to-smw-page-schemas
======================

Nodejs Utility to read (mysql) schemas and import them to smw page schemas for class generation

set idKeys if you're reliably using _id key indications in your database.

define these:

local.js:

    GLOBAL.mysqlUser = 'root';
    GLOBAL.mysqlDB = 'dbname';
    GLOBAL.mysqlPassword = 'password';

wikiConfig.js:
    {
    	"protocol": "https",
    	"port": 443,
    	"server": "server.tld",
    	"path": "/mw",
    	"debug": false,
    	"username": "Bot",
    	"password": "something"
}
