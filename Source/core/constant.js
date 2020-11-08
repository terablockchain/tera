/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


"use strict";


global.UPDATE_CODE_VERSION_NUM = 2424;
global.MIN_JINN_VERSION_NUM = 2177;

global.MIN_CODE_VERSION_NUM = 0;
global.MINING_VERSION_NUM = 0;
global.DEBUG_TRAFFIC = 0;

global.FORK_MODE = 0;
global.NETWORK = "NONE";
global.START_NETWORK_DATE = 1530446400000;
global.CONSENSUS_PERIOD_TIME = 3000;

//Fork init values
try
{
    require("../../fork-run.js");
}
catch(e)
{
}

global.InitParamsArg = InitParamsArg;

global.CONST_NAME_ARR = ["IP_VERSION", "JINN_IP", "JINN_PORT", "AUTODETECT_IP", "CLIENT_MODE", "WALLET_NAME", "WALLET_DESCRIPTION",
"COMMON_KEY", "NODES_NAME", "CLUSTER_LEVEL_START", "CLUSTER_HOT_ONLY", "STAT_MODE", "MAX_STAT_PERIOD", "LOG_LEVEL", "COUNT_VIEW_ROWS",
"ALL_VIEW_ROWS", "START_HISTORY", "LISTEN_IP", "HTTP_PORT_NUMBER", "HTTP_PORT_PASSWORD", "HTTP_IP_CONNECT", "USE_API_WALLET",
"USE_API_V1", "MAX_TX_FROM_WEB_IP", "USE_HARD_API_V2", "HTTP_HOSTING_PORT", "HTTPS_HOSTING_DOMAIN", "HTTPS_HOSTING_EMAIL",
"HTTP_MAX_COUNT_ROWS", "HTTP_ADMIN_PASSWORD", "HTTP_START_PAGE", "HTTP_CACHE_LONG", "HTTP_USE_ZIP", "WEB_LOG", "USE_MINING",
"USE_MINING_SHARDS", "MINING_ACCOUNT", "MINING_START_TIME", "MINING_PERIOD_TIME", "POW_MAX_PERCENT", "COUNT_MINING_CPU", "SIZE_MINING_MEMORY",
"POW_RUN_COUNT", "USE_AUTO_UPDATE", "JINN_MAX_MEMORY_USE", "RESTART_PERIOD_SEC", "WATCHDOG_DEV", "DEBUG_WALLET", "NOT_RUN",
"DELTA_CURRENT_TIME", "CLUSTER_TIME_CORRECT", ];

global.SHARD_NAME = "TERA";

global.AUTO_CORRECT_TIME = 1;
global.CLUSTER_TIME_CORRECT = 0;
global.MINING_ACCOUNT = 0;
global.GENERATE_BLOCK_ACCOUNT = 0;
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


global.UPDATE_CODE_SHARDING = 1000000000;

// Code updates for JINN

global.UPDATE_CODE_JINN = 1000000000;
global.UPDATE_CODE_JINN_KTERA = global.UPDATE_CODE_JINN;
global.NEW_FORMULA_JINN_KTERA = 3;


global.UPDATE_CODE_1 = 36000000;
global.UPDATE_CODE_2 = 40000000;
global.UPDATE_CODE_3 = 43000000;
global.UPDATE_CODE_4 = 57000000;
global.UPDATE_CODE_5 = 60000000;
global.UPDATE_CODE_6 = global.UPDATE_CODE_JINN;
global.UPDATE_CODE_7 = 64000000;
global.UPDATE_CODE_NEW_ACCHASH = 0;
global.EXPERIMENTAL_CODE = 0;

global.HTTP_USE_ZIP = 0;


global.UNIQUE_IP_MODE = 0;


global.USE_API_WALLET = 1;
global.USE_API_V1 = 1;
global.USE_HARD_API_V2 = 0;
global.MAX_TX_FROM_WEB_IP = 20;

global.START_HISTORY = 16;

global.TX_TICKET_HASH_LENGTH = 10;
global.BLOCKNUM_TICKET_ALGO = 16070000;

global.START_BAD_ACCOUNT_CONTROL = 200000;
global.WATCHDOG_DEV = 0;


global.REST_BLOCK_SCALE = 1000;

global.DEBUG_WALLET = 0;



global.CHECK_GLOBAL_TIME = 1;

global.DELTA_CURRENT_TIME = 0;

global.NODES_NAME = "";
global.COMMON_KEY = "";
global.SERVER_PRIVATE_KEY_HEX = undefined;
global.USE_NET_FOR_SERVER_ADDRES = 1;

global.STAT_MODE = 0;
global.MAX_STAT_PERIOD = 600;
global.WALLET_NAME = "TERA";
global.WALLET_DESCRIPTION = "";
global.USE_MINING = 0;
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

global.HTTP_HOSTING_PORT = 0;
global.HTTPS_HOSTING_DOMAIN = "";
global.HTTPS_HOSTING_EMAIL = "";
global.HTTP_MAX_COUNT_ROWS = 20;
global.HTTP_ADMIN_PASSWORD = "";
global.HTTP_START_PAGE = "";
global.HTTP_CACHE_LONG = 24 * 3600;



require("./startlib.js");
global.MIN_POWER_POW_HANDSHAKE = 12;


global.ALL_VIEW_ROWS = 0;
global.COUNT_BLOCK_PROOF = 100;


global.PROTOCOL_VER = 0;
global.PROTOCOL_MODE = 0;
global.MAX_LEVEL = 25;
global.MIN_NODES_FOR_DOUBLE_MODE = 16;


global.MAX_LEVEL_SPECIALIZATION = 24;
global.MIN_CONNECT_CHILD = 2;
global.MAX_CONNECT_CHILD = 7;


global.TR_LEN = 100;
global.BLOCK_PROCESSING_LENGTH = 8;
global.BLOCK_PROCESSING_LENGTH2 = BLOCK_PROCESSING_LENGTH * 2;
global.MAX_BLOCK_SIZE = 130 * 1024;
global.BLOCK_GENESIS_COUNT = BLOCK_PROCESSING_LENGTH2;


global.MAX_TRANSACTION_SIZE = 65535;
global.MIN_TRANSACTION_SIZE = 32;
global.MAX_TRANSACTION_COUNT = 2000;
global.MAX_TRANSACTION_LIMIT = 250;


global.MIN_POWER_POW_TR = 10;

if(global.MIN_POWER_POW_BL === undefined)
    global.MIN_POWER_POW_BL = 5;
global.TOTAL_SUPPLY_TERA = 1e9;

if(!global.MAX_ACTS_LENGTH)
    global.MAX_ACTS_LENGTH = 10 * 1000 * 1000;
global.MIN_POWER_POW_ACC_CREATE = 16;

global.START_MINING = 2 * 1000 * 1000;
global.REF_PERIOD_MINING = 1 * 1000 * 1000;
global.REF_PERIOD_END = 30 * 1000 * 1000;

global.PERIOD_ACCOUNT_HASH = 50;

global.START_BLOCK_ACCOUNT_HASH = 14500000;
global.START_BLOCK_ACCOUNT_HASH3 = 24015000;

global.NEW_ACCOUNT_INCREMENT = 22305000;
global.NEW_BLOCK_REWARD1 = 22500000;


global.NEW_FORMULA_START = 32000000;
global.NEW_FORMULA_KTERA = 3;
global.NEW_FORMULA_TARGET1 = 43000000;
global.NEW_FORMULA_TARGET2 = 45000000;


global.BLOCK_COUNT_IN_MEMORY = 40;
global.HISTORY_BLOCK_COUNT = 40;
global.MAX_SIZE_LOG = 200 * 1024 * 1024;

global.ZERO_ARR_32 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
global.MAX_ARR_32 = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];


global.READ_ONLY_DB = 0;

global.SMART_BLOCKNUM_START = 10000000;

global.PRICE_DAO = function (BlockNum)
{
    if(BlockNum >= UPDATE_CODE_SHARDING)
        return {NewAccount:10, NewSmart:100, NewTokenSmart:1000, NewShard:10000};
    else
        return {NewAccount:10, NewSmart:100, NewTokenSmart:10000, NewShard:0};
}

if(global.LOCAL_RUN)
{
    var Num = Date.now();
    Num = Num - 300 * 1000;
    global.START_NETWORK_DATE = Math.trunc(Num / 1000) * 1000;
}

if(global.START_NETWORK_DATE_FORCE)
    global.START_NETWORK_DATE = global.START_NETWORK_DATE_FORCE;

global.NEW_SIGN_TIME = 25500000;
global.STANDART_PORT_NUMBER = 30000;

InitParamsArg();
require("./const-mode.js");

global.START_CODE_VERSION_NUM = UPDATE_CODE_VERSION_NUM;
global.FIRST_TIME_BLOCK = START_NETWORK_DATE;
global.START_BLOCK_RUN = 0;

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

if(global.DATA_PATH === undefined)
    global.DATA_PATH = "";

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
                                            
                                            ToLog(STR);
                                        }
                                        else
                                            if(STR.substr(0, 5) == "MODE:")
                                            {
                                                global.MODE_RUN = str.substr(5);
                                            }
                                            else
                                            {
                                                switch(STR)
                                                {
                                                    case "CHILDPOW":
                                                        global.CHILD_POW = true;
                                                        break;
                                                    case "ADDRLIST":
                                                        global.ADDRLIST_MODE = true;
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
                                                        
                                                    case "TESTJINN":
                                                        global.TEST_JINN = 1;
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
