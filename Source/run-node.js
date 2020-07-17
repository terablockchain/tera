
if(!global.MODE_RUN)
    global.MODE_RUN="MAIN_JINN";
const fs = require('fs');
const os = require('os');
if(!global.DATA_PATH || global.DATA_PATH==="")
    global.DATA_PATH="../DATA";
global.CODE_PATH=process.cwd();
global.HTTP_PORT_NUMBER = 8000;
if(global.LOCAL_RUN===undefined)
    global.LOCAL_RUN=0;

require('./process/main-process');
