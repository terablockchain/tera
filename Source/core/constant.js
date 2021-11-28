"use strict";
const fs = require('fs');


global.UPDATE_CODE_VERSION_NUM = 2645;
global.MIN_JINN_VERSION_NUM = 0;

global.DEBUG_TRAFFIC = 0;

global.CONST_NAME_ARR = ["IP_VERSION", "JINN_IP", "JINN_PORT", "AUTODETECT_IP", "CLIENT_MODE", "WALLET_NAME", "WALLET_DESCRIPTION",
    "COMMON_KEY", "NODES_NAME", "CLUSTER_TIME_CORRECT", "CLUSTER_LEVEL_START", "CLUSTER_HOT_ONLY", "STAT_MODE", "MAX_STAT_PERIOD",
    "LOG_LEVEL", "COUNT_VIEW_ROWS", "ALL_VIEW_ROWS", "START_HISTORY", "SUM_PRECISION", "LISTEN_IP", "HTTP_PORT_NUMBER", "HTTP_PORT_PASSWORD",
    "HTTP_IP_CONNECT", "USE_API_WALLET", "USE_API_V1", "USE_API_MINING", "USE_HARD_API_V2", "MAX_TX_FROM_WEB_IP",

    "HTTP_HOSTING_PORT",
    "HTTPS_HOSTING_DOMAIN", "HTTPS_HOSTING_EMAIL", "HTTP_MAX_COUNT_ROWS", "HTTP_ADMIN_PASSWORD", "HTTP_START_PAGE", "HTTP_CACHE_LONG",
    "HTTP_USE_ZIP", "WEB_LOG",
    "HTTP_HOSTING_PROCESS",

    "USE_MINING", "USE_MINING_SHARDS", "MINING_ACCOUNT", "MINING_START_TIME", "MINING_PERIOD_TIME",
    "POW_MAX_PERCENT", "COUNT_MINING_CPU", "SIZE_MINING_MEMORY", "POW_RUN_COUNT", "USE_AUTO_UPDATE", "JINN_MAX_MEMORY_USE", "RESTART_PERIOD_SEC",
    "WATCHDOG_DEV", "NOT_RUN", "DELTA_CURRENT_TIME", "USE_EDIT_ACCOUNT","USE_BLOCK_SEND_TX","ADD_EXTRA_SLOTS"];

global.AUTO_CORRECT_TIME = 1;
global.CLUSTER_TIME_CORRECT = 0;
global.MINING_ACCOUNT = 0;
global.GENERATE_BLOCK_ACCOUNT = 0;

global.ADD_EXTRA_SLOTS = 0;

//old mode

global.AUTODETECT_IP = 0;
global.CLUSTER_HOT_ONLY = 0;
global.CLUSTER_LEVEL_START = 0;
global.NOT_RUN = 0;
global.WEB_LOG = 1;


global.JINN_MAX_MEMORY_USE = 500;
global.JINN_DEBUG_INFO = 0;



global.JINN_IP = "";
global.JINN_PORT = 30000;
global.IP_VERSION = 4;
global.CLIENT_MODE = 0;


global.DEBUG_EXIT_ON_BADS = 0;


global.UPDATE_CODE_SHARDING = 0;


global.NETWORK = "NONE";
global.SHARD_NAME = "NONE";
global.START_NETWORK_DATE = 0;
global.CONSENSUS_PERIOD_TIME = 3000;

global.SHARD_PARAMS = {};
global.PERIOD_ACCOUNT_HASH = 20;
global.START_BLOCK_ACCOUNT_HASH = 1;
global.START_BLOCK_ACCOUNT_HASH3 = 1;
global.SMART_BLOCKNUM_START = 0;
global.START_MINING = 100;
global.REF_PERIOD_END = 0;
global.REF_PERIOD_MINING = 10;
global.MIN_POWER_POW_ACC_CREATE = 0;
global.NEW_ACCOUNT_INCREMENT = 1;
global.NEW_BLOCK_REWARD1 = 1;
global.NEW_FORMULA_START = 1;
global.NEW_FORMULA_KTERA = 3;
global.NEW_FORMULA_TARGET1 = 0;
global.NEW_FORMULA_TARGET2 = 1;
global.NEW_SIGN_TIME = 0;
global.START_BAD_ACCOUNT_CONTROL = 0;
global.BLOCKNUM_TICKET_ALGO = 0;

global.UPDATE_CODE_JINN = 0;
global.UPDATE_CODE_1 = 0;
global.UPDATE_CODE_2 = 0;
global.UPDATE_CODE_3 = 0;
global.UPDATE_CODE_4 = 0;
global.UPDATE_CODE_5 = 0;
global.UPDATE_CODE_6 = 0;
global.UPDATE_CODE_7 = 0;

global.UPDATE_CODE_NEW_ACCHASH = 1;
global.UPDATE_CODE_JINN = 0;
global.UPDATE_CODE_JINN_KTERA = 0;
global.NEW_FORMULA_JINN_KTERA = 3 * 3;
global.UPDATE_CODE_SHARDING = 0;
global.TEST_MINING = 0;
global.BLOCK_CREATE_INTERVAL = 1;
global.START_HISTORY = 10;

global.HTTP_USE_ZIP = 0;


global.USE_API_WALLET = 1;
global.USE_API_V1 = 1;
global.USE_HARD_API_V2 = 0;
global.MAX_TX_FROM_WEB_IP = 20;

global.TX_ID_HASH_LENGTH = 10;


global.WATCHDOG_DEV = 0;

global.DEBUG_WALLET = 0;
global.USE_EDIT_ACCOUNT = 0;
global.USE_BLOCK_SEND_TX = 1;
global.COIN_STORE_NUM=0;//multi-coin support, Account for coin store
global.COIN_SMART_NUM=0;//multi-coin smart num - (это разрешение смарту на запись истории транзакций в БД)



global.CHECK_GLOBAL_TIME = 1;

global.DELTA_CURRENT_TIME = 0;

global.NODES_NAME = "";
global.COMMON_KEY = "";
global.SERVER_PRIVATE_KEY_HEX = undefined;
global.USE_NET_FOR_SERVER_ADDRES = 1;

global.STAT_MODE = 0;
global.MAX_STAT_PERIOD = 600;
global.WALLET_NAME = "WALLET";
global.WALLET_DESCRIPTION = "";
global.USE_MINING = 0;
global.USE_API_MINING = 0;
global.USE_MINING_SHARDS = 1;

global.POW_MAX_PERCENT = 50;


global.POW_RUN_COUNT = 5000;
global.POWRunPeriod = 1;

global.LOG_LEVEL = 1;

global.LIMIT_SEND_TRAFIC = 0;
global.COUNT_VIEW_ROWS = 20;

global.MIN_VER_STAT = 0;

global.STOPGETBLOCK = 0;
global.RESTART_PERIOD_SEC = 0;



global.MINING_START_TIME = "";
global.MINING_PERIOD_TIME = "";

global.CHECK_RUN_MINING = 21 * 1000;
global.CHECK_STOP_CHILD_PROCESS = 100 * 1000;
global.COUNT_MINING_CPU = 0;
global.SIZE_MINING_MEMORY = 0;

global.HTTP_HOSTING_PROCESS=0;
global.HTTP_HOSTING_PORT = 80;
global.HTTPS_HOSTING_DOMAIN = "";
global.HTTPS_HOSTING_EMAIL = "";
global.HTTP_MAX_COUNT_ROWS = 20;
global.HTTP_ADMIN_PASSWORD = "";
global.HTTP_START_PAGE = "";
global.HTTP_CACHE_LONG = 24 * 3600;

global.MIN_POWER_POW_HANDSHAKE = 12;


global.SUM_PRECISION = 9;
global.ALL_VIEW_ROWS = 0;
global.COUNT_BLOCK_PROOF = 100;



global.BLOCK_PROCESSING_LENGTH = 8;
global.BLOCK_PROCESSING_LENGTH2 = BLOCK_PROCESSING_LENGTH * 2;
global.BLOCK_GENESIS_COUNT = BLOCK_PROCESSING_LENGTH2;



global.MAX_TRANSACTION_COUNT = 2000;
global.TOTAL_SUPPLY_TERA = 1e9;

if(!global.MAX_ACTS_LENGTH)
    global.MAX_ACTS_LENGTH = 10 * 1000 * 1000;

global.MAX_SIZE_LOG = 200 * 1024 * 1024;

var ZERO_ARR_32_0 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var MAX_ARR_32_0 = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];
Object.freeze(ZERO_ARR_32_0);
Object.freeze(MAX_ARR_32_0);
Object.defineProperty(global, "ZERO_ARR_32", {writable:false, value:ZERO_ARR_32_0});
Object.defineProperty(global, "MAX_ARR_32", {writable:false, value:MAX_ARR_32_0});


global.READ_ONLY_DB = 0;


global.GETVERSION = function (BlockNum)
{
    return SYSCORE.GetActive(BlockNum);
};

global.PRICE_DAO = function (BlockNum)
{
    return SYSCORE.GetInfo(BlockNum);
    // if(BlockNum >= UPDATE_CODE_SHARDING)
    //     return {NewAccount:10, NewSmart:100, NewTokenSmart:1000, NewShard:10000, Storage:0.01};
    // else
    //     return {NewAccount:10, NewSmart:100, NewTokenSmart:10000, NewShard:0, Storage:0};
};


global.STANDART_PORT_NUMBER = 30000;

global.InitParamsArg = InitParamsArg;
require("./startlib.js");
InitParamsArg();



if(global.DATA_PATH === undefined)
    global.DATA_PATH = "../DATA";

var ShardParamPath = GetDataPath("shard.js");
if(fs.existsSync(ShardParamPath))//Shard init values
    runcode(ShardParamPath);
else
    require("./const-mode.js");

CheckCreateDir(global.DATA_PATH);
CheckCreateDir(global.DATA_PATH + "/DB");
if(!global.START_NETWORK_DATE)
    global.START_NETWORK_DATE = FindBlockchainStartTime(1);

global.START_CODE_VERSION_NUM = UPDATE_CODE_VERSION_NUM;
global.FIRST_TIME_BLOCK = START_NETWORK_DATE;
global.START_BLOCK_RUN = 0;

global.NETWORK_ID = global.NETWORK + "." + global.SHARD_NAME;

if(global.LISTEN_IP === undefined)
    global.LISTEN_IP = "0.0.0.0";


if(global.HTTP_PORT_PASSWORD === undefined)
    global.HTTP_PORT_PASSWORD = "";
if(global.HTTP_IP_CONNECT === undefined)
    global.HTTP_IP_CONNECT = "";


if(global.USE_AUTO_UPDATE === undefined)
    global.USE_AUTO_UPDATE = 1;
if(global.USE_PARAM_JS === undefined)
    global.USE_PARAM_JS = 1;

if(global.LOCAL_RUN === undefined)
    global.LOCAL_RUN = 0;
if(global.CODE_PATH === undefined)
    global.CODE_PATH = process.cwd();

if(global.DEBUG_MODE === undefined)
    global.DEBUG_MODE = 0;

global.DEBUG_MODE = 0;

if(typeof window === 'object')
{
    window.RUN_CLIENT = 0;
    window.RUN_SERVER = 1;
}
global.RUN_CLIENT = 0;
global.RUN_SERVER = 1;

function InitParamsArg()
{
    for(var i = 1; i < process.argv.length; i++)
    {
        var str = process.argv[i];

        var STR = str.toUpperCase();
        var indexConst = str.indexOf("=");
        if(indexConst > 0)
        {
            var name = str.substr(0, indexConst).toUpperCase();
            var value = str.substr(indexConst + 1);
            if(typeof global[name] === "number")
                value = Number(value);

            global[name] = value;
            console.log("set "+name+"="+global[name]);
        }
        else
        if(STR.substr(0, 9) == "HTTPPORT:")
        {
            global.HTTP_PORT_NUMBER = parseInt(STR.substr(9));
        }
        else
        if(STR.substr(0, 9) == "PASSWORD:")
        {
            global.HTTP_PORT_PASSWORD = str.substr(9);
        }
        else
        if(STR.substr(0, 5) == "PATH:")
            global.DATA_PATH = str.substr(5);
        else
        if(STR.substr(0, 5) == "PORT:")
        {
            global.JINN_PORT = parseInt(str.substr(5));
        }
        else
        if(STR.substr(0, 3) == "IP:")
        {
            global.JINN_IP = str.substr(3);
        }
        else
        if(STR.substr(0, 7) == "LISTEN:")
        {
            global.LISTEN_IP = str.substr(7);
        }
        else
        if(STR.substr(0, 8) == "HOSTING:")
        {
            global.HTTP_HOSTING_PORT = parseInt(str.substr(8));
        }
        else
        if(STR.substr(0, 13) == "STARTNETWORK:")
        {
            var StartDate = str.substr(13);
            if(StartDate === "CONTINUE")
                global.START_NETWORK_DATE = FindBlockchainStartTime();
            else
                global.START_NETWORK_DATE = parseInt(StartDate);
        }
        else
        if(STR.substr(0, 5) == "MODE:")
        {
            global.MODE_RUN = str.substr(5);
        }
        else
        if(STR.substr(0, 5) == "FROM:")
        {
            var Addres = str.substr(5);
            var LoadShardParams = require("./loader").LoadShardParams;
            LoadShardParams(Addres);
        }
        else
        {
            switch(STR)
            {
                case "TESTJINN":
                    global.TEST_JINN = 1;
                    break;
                case "LOCALRUN":
                    global.LOCAL_RUN = 1;
                    break;
                case "TESTRUN":
                    global.TEST_NETWORK = 1;
                    break;
                case "NOLOCALRUN":
                    global.LOCAL_RUN = 0;
                    break;

                case "NOAUTOUPDATE":
                    global.USE_AUTO_UPDATE = 0;
                    break;
                case "NOPARAMJS":
                    global.USE_PARAM_JS = 0;
                    break;
                case "READONLYDB":
                    global.READ_ONLY_DB = 1;
                    break;
                case "NWMODE":
                    global.NWMODE = 1;
                    break;
                case "NOALIVE":
                    global.NOALIVE = 1;
                    break;
                case "DEV_MODE":
                    global.DEV_MODE = 1;
                    break;
                case "API_V2":
                    global.USE_HARD_API_V2 = 1;
                    break;

                case "NOPSWD":
                    global.NOHTMLPASSWORD = 1;
                    break;
            }
        }
    }
}


global.GetMiningAccount = function ()
{
    if(global.MINING_ACCOUNT)
        return global.MINING_ACCOUNT;
    else//old mode
        return global.GENERATE_BLOCK_ACCOUNT;
}
