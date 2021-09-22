/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Starting point of the launch. Setting default constants.
 *
**/
'use strict';

if(typeof global !== "object")
    global = window;
if(!global.ZERO_ARR_32)
    global.ZERO_ARR_32 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
if(!global.MAX_ARR_32)
    global.MAX_ARR_32 = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];

global.JINN_MODULES = [];

if(typeof window !== "object" || global.NWMODE)
{
    
    if(!global.sha3)
        require("../extlib/sha3.js");
    
    if(!global.SerializeLib)
        require("../extlib/terabuf.js");
    require("./jinn-log.js");
    require("./jinn-stat.js");
    
    require("./lib/cache-block.js");
    require("./lib/time-sync");
    if(global.EMULATE_FILE)//set global.CDBBase (not use for TERA)
        require("./db/jinn-db-base.js");
    require("./db/jinn-db-row.js");
    require("./db/jinn-db-item.js");
    require("./db/jinn-db-item-fixed.js");
    require("./db/jinn-db-chain.js");
    require("./db/cache-db.js");
    require("./db/jinn-db-cache-body.js");
    require("./db/jinn-db-cache-block.js");
    
    require("./jinn-block-db.js");
    
    require("./jinn-connect-score.js");
    require("./jinn-connect.js");
    require("./jinn-connect-item.js");
    require("./jinn-connect-handshake.js");
    require("./jinn-connect-speed.js");
    require("./jinn-connect-addr.js");
    require("./jinn-connect-hot.js");
    
    require("./jinn-session.js");
    require("./jinn-ticket.js");
    require("./jinn-tx.js");
    require("./jinn-tx-err.js");
    require("./jinn-tx-priority.js");
    require("./jinn-tx-control.js");
    require("./jinn-tx-resend.js");
    
    require("./jinn-block.js");
    require("./jinn-block-mining.js");
    
    require("./jinn-consensus-chain.js");
    require("./jinn-consensus.js");
    require("./jinn-consensus-boost.js");
    require("./jinn-net-cache.js");
    require("./jinn-startup-loader.js");
    
    require("./jinn-net.js");
    require("./jinn-serialize.js");
    require("./jinn-zip.js");
    require("./jinn-filter.js");
    require("./jinn-net-socket.js");
    
    require("./jinn-timing.js");
    require("./jinn-time-sync.js");
    require("./jinn-sharding.js");
}

global.JINN_WARNING = 0;
global.DEBUG_ID = 0;
if(global.DEBUG_TRAFFIC === undefined)
    global.DEBUG_TRAFFIC = 1;


global.JINN_EXTERN = {GetCurrentBlockNumByTime:function ()
    {
        return 0;
    }};

if(global.DELTA_CURRENT_TIME === undefined)
    global.DELTA_CURRENT_TIME = 0;

global.JINN_NET_CONSTANT = {NetConstVer:0};
global.CODE_VERSION = {VersionNum:0};


global.SHARD_STR_TYPE = "str8";
global.JINN_CONST = {};

JINN_CONST.MULT_TIME_PERIOD = 1;

JINN_CONST.UNIQUE_IP_MODE = 0;


JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME = 10;
JINN_CONST.CORRECT_TIME_TRIGGER = 1000;
JINN_CONST.CORRECT_TIME_VALUE = 100;
JINN_CONST.INFLATION_TIME_VALUE = 20;

JINN_CONST.START_CHECK_BLOCKNUM = 20;
JINN_CONST.START_ADD_TX = 20;

JINN_CONST.CONSENSUS_PERIOD_TIME = 1000;



JINN_CONST.MAX_BLOCK_SIZE = 230 * 1024;
JINN_CONST.MAX_TX_SIZE = 64000;
JINN_CONST.BLOCK_GENESIS_COUNT = 16;
JINN_CONST.START_BLOCK_NUM = JINN_CONST.BLOCK_GENESIS_COUNT + 4;
JINN_CONST.DELTA_BLOCKS_FOR_CREATE = 5;
JINN_CONST.NETWORK_NAME = "JINN";
JINN_CONST.PROTOCOL_MODE = 0;
JINN_CONST.SHARD_NAME = "SHARD";



JINN_CONST.MAX_CONNECT_COUNT = 20;
JINN_CONST.MAX_LEVEL_CONNECTION = 6;
JINN_CONST.EXTRA_SLOTS_COUNT = 3;

JINN_CONST.MAX_LEVEL_NODES = 100;

JINN_CONST.MAX_RET_NODE_LIST = 100;

if(!global.ADD_EXTRA_SLOTS)
    global.ADD_EXTRA_SLOTS = 0;

JINN_CONST.MAX_LEVEL_ALL = function ()
{
    return JINN_CONST.MAX_LEVEL_CONNECTION + JINN_CONST.EXTRA_SLOTS_COUNT + global.ADD_EXTRA_SLOTS;
}

JINN_CONST.MAX_ERR_PROCESS_COUNT = 30;
JINN_CONST.RECONNECT_MIN_TIME = 300;
JINN_CONST.MAX_CONNECT_TIMEOUT = 30;


JINN_CONST.MAX_PACKET_SIZE = 256 * 1024;
JINN_CONST.MAX_PACKET_SIZE_RET_DATA = Math.floor(JINN_CONST.MAX_PACKET_SIZE / 2);

JINN_CONST.MAX_WAIT_PERIOD_FOR_STATUS = 10 * 1000;

JINN_CONST.METHOD_ALIVE_TIME = 5 * 1000;


JINN_CONST.MAX_LEADER_COUNT = 4;


JINN_CONST.CACHE_PERIOD_FOR_INVALIDATE = 5;


JINN_CONST.TT_TICKET_HASH_LENGTH = 6;
JINN_CONST.MAX_TRANSACTION_COUNT = 3000;
JINN_CONST.MAX_TRANSFER_TX = 400;

JINN_CONST.MAX_TRANSFER_TT = 10 * JINN_CONST.MAX_TRANSFER_TX;


JINN_CONST.MAX_CACHE_BODY_LENGTH = 50;

if(!global.JINN_MAX_MEMORY_USE)
    global.JINN_MAX_MEMORY_USE = 500;

JINN_CONST.MAX_ITEMS_FOR_LOAD = 100;
JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN = 100;


JINN_CONST.LINK_HASH_PREV_HASHSUM = 0;
JINN_CONST.LINK_HASH_DELTA = 1;

JINN_CONST.MAX_DELTA_PROCESSING = 1;


JINN_CONST.STEP_ADDTX = 0;
JINN_CONST.STEP_TICKET = 1;
JINN_CONST.STEP_TX = 1;
JINN_CONST.STEP_NEW_BLOCK = 2;
JINN_CONST.STEP_SAVE = 3;
JINN_CONST.STEP_LAST = 4;
JINN_CONST.STEP_CLEAR_MEM = 20;

JINN_CONST.STEP_RESEND = 5;
JINN_CONST.COUNT_RESEND = 5;

JINN_CONST.STEP_CALC_POW_LAST = 1;
JINN_CONST.STEP_CALC_POW_FIRST = 8;



JINN_CONST.TEST_COUNT_BLOCK = 0;
JINN_CONST.TEST_COUNT_TX = 0;



JINN_CONST.TEST_DELTA_TIMING_HASH = 1;
JINN_CONST.TEST_DIV_TIMING_HASH = 3;
JINN_CONST.TEST_NDELTA_TIMING_HASH = 1;

JINN_CONST.RUN_RESET = 0;
JINN_CONST.HOT_BLOCK_DELTA = 8;


JINN_CONST.TX_PRIORITY_MODE = 1;
JINN_CONST.TX_PRIORITY_RND_SENDER = 0;
JINN_CONST.TX_PRIORITY_LENGTH = 100;

JINN_CONST.TX_BASE_VALUE = 1e9;
JINN_CONST.TX_FREE_COUNT = 10;
JINN_CONST.TX_FREE_BYTES_MAX = 16000;

JINN_CONST.TX_CHECK_OPERATION_ID = 1;
JINN_CONST.TX_CHECK_SIGN_ON_ADD = 1;
JINN_CONST.TX_CHECK_SIGN_ON_TRANSFER = 0;

JINN_CONST.MAX_ONE_NODE_TX = 0;

JINN_CONST.TEST_MODE_1 = 0;
JINN_CONST.TEST_MODE_2 = 0;
JINN_CONST.TEST_MODE_3 = 0;

JINN_CONST.MIN_TIME_SEND_TT_PERIOD = 500;
JINN_CONST.MAX_TIME_SEND_TT_PERIOD = 1500;
JINN_CONST.DELTA_TIME_NEW_BLOCK = 500;

JINN_CONST.MAX_CHILD_PROCESS_TIME = 10;

JINN_CONST.BLOCK_CREATE_INTERVAL = global.BLOCK_CREATE_INTERVAL;


JINN_CONST.MAX_CROSS_MSG_COUNT = 300;
JINN_CONST.MAX_CROSS_RUN_COUNT = 300;



global.MAX_BUSY_VALUE = 200;
global.MAX_SHA3_VALUE = 300;


function CreateNodeEngine(Engine,MapName)
{
    
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(MapName && (!module.Name || !MapName[module.Name]))
            continue;
        
        module.USE_MODULE = 1;
        if(module.InitClass)
            module.InitClass(Engine);
    }
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(MapName && (!module.Name || !MapName[module.Name]))
            continue;
        if(module.InitAfter)
            module.InitAfter(Engine);
    }
}


function NextRunEngine(NetNodeArr)
{
    
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(!module.USE_MODULE)
            continue;
        
        if(module.DoRun)
            module.DoRun();
        
        if(module.DoNodeFirst)
        {
            if(NetNodeArr.ID !== undefined)
                module.DoNodeFirst(NetNodeArr);
            else
                for(var n = 0; n < NetNodeArr.length; n++)
                {
                    var Node = NetNodeArr[n];
                    if(!Node.Del)
                        module.DoNodeFirst(Node);
                }
        }
    }
    
    for(var i = 0; i < global.JINN_MODULES.length; i++)
    {
        var module = global.JINN_MODULES[i];
        if(!module.USE_MODULE)
            continue;
        
        if(module.DoNode)
        {
            var startTime;
            if(typeof process === "object")
                startTime = process.hrtime();
            
            if(NetNodeArr.ID !== undefined)
                module.DoNode(NetNodeArr);
            else
                for(var n = 0; n < NetNodeArr.length; n++)
                {
                    var Node = NetNodeArr[n];
                    if(!Node.Del)
                        module.DoNode(Node);
                }
            
            if(typeof process === "object")
            {
                var Time = process.hrtime(startTime);
                var deltaTime = Time[0] * 1000 + Time[1] / 1e6;
                
                var Name = "DONODE:" + module.Name;
                if(!JINN_STAT.Methods[Name])
                    JINN_STAT.Methods[Name] = 0;
                JINN_STAT.Methods[Name] += deltaTime;
                JINN_STAT.DoNode += deltaTime;
            }
        }
    }
}

global.CreateNodeEngine = CreateNodeEngine;
global.NextRunEngine = NextRunEngine;
