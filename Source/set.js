
global.MODE_RUN="MAIN_JINN";
global.DATA_PATH="../DATA";
global.CODE_PATH=process.cwd();

require("./core/constant");
require("./core/library");

CheckCreateDir(global.DATA_PATH);


//InitParamsArg(); было в require("./core/constant");
//InitParamsArg(); - зачем?

//ToLog("save to "+global.DATA_PATH);

SAVE_CONST(true);


CheckFinish(1);


function CheckFinish(bCheckFinish)
{
    if(!bCheckFinish)
        return;

    setTimeout(function ()
    {
        process.exit();
    },2000);
}

