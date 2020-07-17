
global.MODE_RUN="MAIN_JINN";
global.DATA_PATH="../DATA";
global.CODE_PATH=process.cwd();

require("./core/constant");
require("./core/library");

CheckCreateDir(global.DATA_PATH);


InitParamsArg();



SAVE_CONST(true);


process.exit();



