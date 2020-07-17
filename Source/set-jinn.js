
global.MODE_RUN="TEST_JINN";
global.TEST_NETWORK = 1;
global.TEST_JINN=1;
global.JINN_MODE=1;
global.DATA_PATH="../DATA-JINN";
global.CODE_PATH=process.cwd();

require("./core/constant");
require("./core/library");

CheckCreateDir(global.DATA_PATH);

InitParamsArg();
SAVE_CONST(true);


process.exit();
