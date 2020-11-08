
global.MODE_RUN="TEST";
const fs = require('fs');
const os = require('os');
if(!global.DATA_PATH || global.DATA_PATH==="")
    global.DATA_PATH="../DATA-TEST";
global.CODE_PATH=process.cwd();
global.HTTP_PORT_NUMBER = 8080;
//global.START_PORT_NUMBER = 40000;
global.JINN_PORT=40000;
if(global.LOCAL_RUN===undefined)
    global.LOCAL_RUN=0;

global.TEST_NETWORK = 1;

require('./process/main-process');
