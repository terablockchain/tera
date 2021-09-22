/*
 * @project: TERA
 * @version: 2
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

'use strict';

const fs = require('fs');
const os = require('os');
const cluster = require('cluster');
if (cluster.isWorker)
{
    require("./web-process.js");
    return;
}


global.PROCESS_NAME = "MAIN";

require("../core/constant");
const crypto = require('crypto');

global.START_SERVER = 1;
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);

console.log("RUN MODE: " + global.MODE_RUN);
console.log("DATA DIR: " + global.DATA_PATH);
console.log("PROGRAM DIR: " + global.CODE_PATH);

require("../core/library");
require("../core/crypto-library");
require("../core/upnp.js");

ToLog("==================================================================");
ToLog(os.platform() + " (" + os.arch() + ") " + os.release());
ToLog("==================================================================");

global.CURRENT_OS_IS_LINUX = (os.platform() === "linux");

var VerArr = process.versions.node.split('.');

ToLog("nodejs: " + process.versions.node);

if(VerArr[0] < 8)
{
    ToError("Error version of NodeJS=" + VerArr[0] + "  Pls, download new version from www.nodejs.org and update it. The minimum version must be 8");
    process.exit();
}

require("../core/tests");


global.DEF_PERIOD_SIGN_LIB = 100;
setTimeout(function ()
{
    TestSignLib(DEF_PERIOD_SIGN_LIB);
}
, 4000);



global.glCurNumFindArr = 0;
global.ArrReconnect = [];
global.ArrConnect = [];

global.SERVER = undefined;
global.NeedRestart = 0;

process.on('uncaughtException', function (err)
{
    console.log("--------------------uncaughtException--------------------");
    console.log(err.code);
    console.log("---------------------------------------------------------");
    switch(err.code)
    {
        case "ENOTFOUND":
        case "ECONNRESET":
        case "EPIPE":
        case "ETIMEDOUT":
            break;
        case "ERR_IPC_CHANNEL_CLOSED":
            //ToLogTrace("");
            break;


        default:
        {

            if(global.PROCESS_NAME !== "MAIN")
            {
                process.send({cmd:"log", message:err});
            }

            if(err)
            {
                var Str = err.stack;
                if(!Str)
                    Str = err;
                ToLog(Str);
                ToError(Str);
            }

            TO_ERROR_LOG("APP", 666, err);
            ToLog("-----------------EXIT------------------");
            process.exit();
        }
    }
}
);
process.on('error', function (err)
{
    console.log("--------------------error--------------------");
    
    var stack = err.stack;
    if(!stack)
        stack = "" + err;
    
    ToError(stack);
    ToLog(stack);
}
);
process.on('unhandledRejection', function (reason,p)
{
    console.log("--------------------unhandledRejection--------------------");
    ToLog('Unhandled Rejection at:' + p + 'reason:' + reason);
    ToError('Unhandled Rejection at:' + p + 'reason:' + reason);
}
);



require("../core/mining");
require("../rpc/api-common");
require("../core/html-server");

var JinnLib = require("../jinn/tera");
require("../system");

require("./childs-run");



require("../core/wallet");

RunServer();


var idRunOnce;
function RunServer()
{
    if(global.NOT_RUN)
    {
        global.StopNetwork = true;
    }
    
    idRunOnce = setInterval(RunOnce, 1000);
    ToLog("NETWORK: " + global.NETWORK);
    ToLog("VERSION: " + global.UPDATE_CODE_VERSION_NUM);
    
    CheckConstFile();
    
    StartJinn();
}

function StartJinn()
{
    if(global.AUTODETECT_IP)
        global.JINN_IP = "";
    
    if(!global.JINN_IP)
        global.JINN_IP = "0.0.0.0";
    StartPortMapping(global.JINN_IP, global.JINN_PORT, function (ip)
    {
        JinnLib.Create();
        SERVER.CanSend = 2;
        global.WALLET.Start();
        setTimeout(SERVER.CheckStartedBlocks, 800);
    });
}

function RunOnce()
{
    if(global.SERVER && global.SERVER.CheckOnStartComplete)
    {
        clearInterval(idRunOnce);
        
        require("../core/update-db");
        RunOnUpdate();
        
        setTimeout(function ()
        {
            StartAllProcess(1);
        }, 1000);
        
        if(global.RESTART_PERIOD_SEC)
        {
            var Period = (random(600) + global.RESTART_PERIOD_SEC);
            ToLog("SET RESTART NODE AFTER: " + Period + " sec");
            setInterval(function ()
            {
                RestartNode();
            }, Period * 1000);
        }
        
        setTimeout(function ()
        {
            RunStopPOWProcess();
        }, 10000);
    }
}

function CheckConstFile()
{
    if(!fs.existsSync(GetDataPath("const.lst")))
    {
        SAVE_CONST(1);
    }
}
var glPortDebug = 49800;
function RunFork(Path,ArrArgs,bWeb)
{

    var child_process = require('child_process');
    //if(os.platform()=="win32")        bWeb=0;
    if(bWeb && global.HTTP_HOSTING_PROCESS)
    {
        return cluster.fork().process;
    }


    ArrArgs = ArrArgs || [];
    
    ArrArgs.push("MODE:" + global.MODE_RUN);
    
    if(global.LOCAL_RUN)
    {
        ArrArgs.push("LOCALRUN");
        ArrArgs.push("SHARD_NAME=" + global.SHARD_NAME);
    }
    else
        if(global.TEST_NETWORK)
            ArrArgs.push("TESTRUN");
    
    if(global.TEST_JINN)
        ArrArgs.push("TESTJINN");
    
    ArrArgs.push("STARTNETWORK:" + global.START_NETWORK_DATE);
    
    ArrArgs.push("PATH:" + global.DATA_PATH);
    ArrArgs.push("HOSTING:" + global.HTTP_HOSTING_PORT);
    if(!global.USE_PARAM_JS)
        ArrArgs.push("NOPARAMJS");
    
    if(global.NWMODE)
        ArrArgs.push("NWMODE");
    if(global.NOALIVE)
        ArrArgs.push("NOALIVE");
    if(global.DEV_MODE)
        ArrArgs.push("DEV_MODE");
    if(global.NOHTMLPASSWORD)
        ArrArgs.push("NOPSWD");
    glPortDebug++;
    var execArgv = [];

    var Worker;
    try
    {
        Worker = child_process.fork(Path, ArrArgs, {execArgv:execArgv});
    }
    catch(e)
    {
        ToError("" + e);
        return undefined;
    }
    return Worker;
}

global.RunFork = RunFork;
