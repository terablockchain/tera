
global.MODE_RUN="TEST";
global.TEST_NETWORK = 1;
global.DATA_PATH="../DATA-TEST";
global.CODE_PATH=process.cwd();

require("./core/constant");
require("./core/library");

CheckCreateDir(global.DATA_PATH);

InitParamsArg();
SAVE_CONST(true);


process.exit();
