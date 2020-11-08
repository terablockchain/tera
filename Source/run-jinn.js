
global.MODE_RUN="TEST_JINN";
const fs = require('fs');
const os = require('os');
if(!global.DATA_PATH || global.DATA_PATH==="")
    global.DATA_PATH="../DATA-JINN";
global.CODE_PATH=process.cwd();
global.HTTP_PORT_NUMBER = 8800;
global.TEST_JINN=1;
global.JINN_MODE=1;
global.LOCAL_RUN=0;
global.TEST_NETWORK=1;

//global.START_PORT_NUMBER = 33000;

//new
global.JINN_PORT=30000;

require('./process/main-process');

