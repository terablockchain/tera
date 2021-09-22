/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
/**
 *
 * The module is designed for exchanging network constants
 *
 **/

module.exports.Init = Init;

const FORMAT_NET_CONSTANT = {NetConstVer:"uint", NetConstStartNum:"uint", PROTOCOL_MODE:"uint", MAX_TRANSACTION_COUNT:"uint16",
    __RESRV000:"uint16", __RESRV00:"uint32", MIN_COUNT_FOR_CORRECT_TIME:"uint", CORRECT_TIME_TRIGGER:"uint16", CORRECT_TIME_VALUE:"uint16",
    INFLATION_TIME_VALUE:"byte", __RESRV01:"uint", MAX_LEADER_COUNT:"byte", MAX_ITEMS_FOR_LOAD:"uint32", MAX_PACKET_SIZE:"uint32",
    MAX_PACKET_SIZE_RET_DATA:"uint32", MAX_BLOCK_SIZE:"uint32", MAX_TX_SIZE:"uint", MAX_ERR_PROCESS_COUNT:"uint", RECONNECT_MIN_TIME:"uint",
    MAX_LEVEL_CONNECTION:"byte", EXTRA_SLOTS_COUNT:"byte", MAX_CONNECT_TIMEOUT:"uint32", MAX_CONNECT_COUNT:"uint16", __RESRV03:"uint32",
    MAX_LEVEL_NODES:"byte", MAX_RET_NODE_LIST:"uint16", MAX_CACHE_BODY_LENGTH:"uint32", MAX_DEPTH_FOR_SECONDARY_CHAIN:"uint32",
    MAX_DELTA_PROCESSING:"byte", METHOD_ALIVE_TIME:"uint32", __RESRV04:"uint", __RESRV041:"uint", __RESRV042:"uint16", __RESRV043:"byte",
    STEP_ADDTX:"uint16", STEP_TICKET:"uint16", STEP_TX:"uint16", STEP_NEW_BLOCK:"uint16", STEP_SAVE:"uint16", STEP_LAST:"uint16",
    STEP_CLEAR_MEM:"uint16", STEP_RESEND:"uint16", COUNT_RESEND:"uint16", _ReservT5:"uint16", UNIQUE_IP_MODE:"uint16", _ReservT6:"uint",
    CHECK_POINT_HASH:"hash", __RESRV05:"uint32", __RESRV006:"uint16", __RESRV0006:"uint16", __RESRV06:"uint16", TEST_COUNT_BLOCK:"uint32",
    TEST_COUNT_TX:"uint32", __RESRV07:"uint32", TEST_DELTA_TIMING_HASH:"uint32", TEST_DIV_TIMING_HASH:"uint32", TEST_NDELTA_TIMING_HASH:"uint32",
    MAX_TRANSFER_TX:"uint32", RUN_RESET:"uint16", HOT_BLOCK_DELTA:"uint16", TX_PRIORITY_MODE:"byte", __RESRV08:"byte", TX_PRIORITY_LENGTH:"uint16",
    TX_BASE_VALUE:"uint", TX_FREE_COUNT:"uint16", TEST_MODE_1:"uint16", TEST_MODE_2:"uint16", TEST_MODE_3:"uint16", TX_FREE_BYTES_MAX:"uint32",
    TX_CHECK_OPERATION_ID:"byte", TX_CHECK_SIGN_ON_ADD:"uint16", TX_CHECK_SIGN_ON_TRANSFER:"uint16", MAX_ONE_NODE_TX:"uint32",
    MIN_TIME_SEND_TT_PERIOD:"uint16", MAX_TIME_SEND_TT_PERIOD:"uint16", DELTA_TIME_NEW_BLOCK:"uint16", MAX_CHILD_PROCESS_TIME:"uint16",
    BLOCK_CREATE_INTERVAL:"uint16", MAX_CROSS_MSG_COUNT:"uint16", MAX_CROSS_RUN_COUNT:"uint16", RESERVE_DATA:"arr313", NET_SIGN:"arr64"};

var FormatForSign = CopyNetConstant({}, FORMAT_NET_CONSTANT, 1);

function Init(Engine)
{
    global.JINN_NET_CONSTANT = CopyNetConstant({}, JINN_CONST);
    JINN_NET_CONSTANT.NetConstVer = 0;
    JINN_NET_CONSTANT.NetConstStartNum = 0;
    
    Engine.NETCONSTANT_SEND = {NetConstVer:"uint"};
    Engine.NETCONSTANT_RET = FORMAT_NET_CONSTANT;
    
    Engine.ProcessNetConstant = function (Child,NetConstVer)
    {
        Child.NetConstVer = NetConstVer;
        if(NetConstVer > JINN_NET_CONSTANT.NetConstVer)
        {
            Engine.StartGetNetConstant(Child, NetConstVer);
        }
    };
    
    Engine.StartGetNetConstant = function (Child,Version)
    {
        if(Version > GetCurrentBlockNumByTime() + 3000)
            return;
        
        var Delta = Date.now() - Child.LastGetNetConstant;
        if(Delta < 15000)
            return;
        
        Child.LastGetNetConstant = Date.now();
        
        Engine.Send("NETCONSTANT", Child, {NetConstVer:Version}, function (Child,Data)
        {
            if(!Data)
                return;
            
            Child.LastGetNetConstant = Date.now();
            
            if(Data.NetConstVer > JINN_NET_CONSTANT.NetConstVer)
            {
                if(!Engine.CheckNetConstant(Data))
                {
                    Engine.AddCheckErrCount(Child, 1, "Error check sign net const: " + Data.NetConstVer, 1);
                }
            }
        });
    };
    
    Engine.NETCONSTANT = function (Child,Data)
    {
        var RetData = CopyNetConstant({}, JINN_NET_CONSTANT);
        return RetData;
    };
    
    Engine.CheckNetConstant = function (Data)
    {
        if(!Data)
            return;
        
        var SignArr = Engine.GetSignCheckNetConstant(Data);
        if(!CheckDevelopSign(SignArr, Data.NET_SIGN))
        {
            return 0;
        }
        
        var CurBlockNum = GetCurrentBlockNumByTime();
        var Delta = Data.NetConstStartNum - CurBlockNum;
        if(Delta < 1)
            Delta = 1;
        
        ToLog("Got NEW NetConstant (wait " + Delta + " blocks) Ver: " + Data.NetConstVer, 2);
        
        CopyNetConstant(JINN_NET_CONSTANT, Data);
        
        if(Engine.idTimerSetConst)
            clearTimeout(Engine.idTimerSetConst);
        Engine.idTimerSetConst = setTimeout(function ()
        {
            Engine.DoNetConst();
            Engine.idTimerSetConst = 0;
        }, Delta * global.CONSENSUS_PERIOD_TIME);
        
        return 1;
    };
    
    Engine.GetSignCheckNetConstant = function (Data)
    {
        var Buf = SerializeLib.GetBufferFromObject(Data, FormatForSign, {});
        return sha3(Buf, 12);
    };
    
    Engine.DoNetConst = function ()
    {
        ToLog("DoNetConstant: " + JINN_NET_CONSTANT.NetConstVer, 2);
        
        var WasConst = CopyNetConstant({}, JINN_CONST);
        
        CopyNetConstant(JINN_CONST, JINN_NET_CONSTANT);
        
        if(!JINN_CONST.MAX_TX_SIZE)
            JINN_CONST.MAX_TX_SIZE = 64000;
        var CountCreate = JINN_NET_CONSTANT.TEST_COUNT_BLOCK + JINN_NET_CONSTANT.NetConstStartNum - Engine.CurrentBlockNum;
        if(JINN_NET_CONSTANT.TEST_COUNT_BLOCK && CountCreate > 0)
        {
            ToLog("*************CountBlockCreate: " + CountCreate + " witch TX=" + JINN_CONST.TEST_COUNT_TX, 2);
            var Num = 10 + random(ACCOUNTS.GetMaxAccount() - 10);
            global.SendTestCoin(Num, Num, 1, JINN_CONST.TEST_COUNT_TX, CountCreate, 1);
        }
        if(JINN_NET_CONSTANT.RUN_RESET && (JINN_NET_CONSTANT.NetConstStartNum + 1) >= Engine.CurrentBlockNum)
        {
            
            if(JINN_NET_CONSTANT.RUN_RESET === 5)
            {
                ToLog("****REWRITE_DAPP_TRANSACTIONS*****", 2);
                if(!global.DEV_MODE)
                    REWRITE_DAPP_TRANSACTIONS(5000);
            }
            if(JINN_NET_CONSTANT.RUN_RESET === 10)
            {
                ToLog("****ClearCommonStat*****", 2);
                global.ClearCommonStat();
            }
            if(JINN_NET_CONSTANT.RUN_RESET === 20)
            {
                ToLog("****RewriteAllTransactions*****", 2);
                if(!global.DEV_MODE)
                    SERVER.RewriteAllTransactions();
            }
            if(JINN_NET_CONSTANT.RUN_RESET === 30)
            {
                ToLog("****Exit*****", 2);
                if(!global.DEV_MODE)
                    global.RestartNode(1);
            }
        }
        
        if(WasConst.TX_PRIORITY_MODE !== JINN_CONST.TX_PRIORITY_MODE || WasConst.TX_PRIORITY_LENGTH !== JINN_CONST.TX_PRIORITY_LENGTH)
        {
            ToLog("InitPriorityTree", 2);
            Engine.InitPriorityTree();
        }
        JINN_CONST.MAX_TRANSFER_TT = 10 * JINN_CONST.MAX_TRANSFER_TX;
    };
}

function CopyNetConstant(Dst,Src,bNotSign)
{
    for(var key in FORMAT_NET_CONSTANT)
    {
        if(bNotSign && key === "NET_SIGN")
            continue;
        Dst[key] = Src[key];
    }
    
    return Dst;
}
