
global.MODE_RUN="MAIN_JINN";
global.DATA_PATH="../DATA";
global.CODE_PATH=process.cwd();

require("./core/constant");
require("./core/library");

CheckCreateDir(global.DATA_PATH);


//InitParamsArg(); было в require("./core/constant");
InitParamsArg();

//ToLog("save to "+global.DATA_PATH);

SAVE_CONST(true);


process.exit();



