/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';

global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Stat"});

var StatKeys = {BlockTx:"BlockTx", TXSend:"TxSend", TTSend:"TtSend", HeaderLoad:"HeaderLoad", BodyLoad:"BodyLoad", BodyTxSend:"BodyTx",
    DBDelta:"-DB-Delta", MaxSumPow:"-SumPow", ReadRowsDB:"Reads", WriteRowsDB:"Writes", TeraReadRowsDB:"-TReads", TeraWriteRowsDB:"-TWrites",
    ReadBlock:"ReadBlock", WriteBlock:"WriteBlock", ReadBody:"ReadBody", WriteBody:"WriteBody", MAXChainHeight:"Chains", MAXCacheBodyLength:"-CacheB",
    MAXCacheLength:"-Cache", CacheErrDB:"CacheErr", FindHeadCount:"-FHead", MAXFindHeadCount:"MFHead", FindEmptyCount:"-FEmpty",
    MAXFindEmptyCount:"MFEmpty", HotCount:"Hots", MINHots:"-MinHots", ActiveCount:"-Connects", AddrCount:"Addrs", NoValidateTx:0,
    AddToTreeTx:"-AddTreeTx", WasSendOnAddTxToTree:0, NotAddTxToTree:0, ErrorCount:"NetErr", MaxReqAll:"-MaxReqAll", MaxLoadAll:"-MaxLoadAll",
    MaxReqErr:"-MaxReqErr", MaxIteration:"-MaxIteration", MaxLoad:"-MaxLoad", WantHeader:"-WantHeader", UploadHeader:"-UploadHeader",
    WantBody:"-WantBody", UploadBody:"-UploadBody", ErrProcessBlock:"-ErrProcessBlock", SkipMethod:"-SkipMethod", TtReceive:"-TtReceive",
    TxReceive:"-TxReceive", TxReceiveErr:"-TxReceiveErr", BanCount:"-BanCount", MainDelta:"MainDelta", ErrTt1:"-ErrTt1", ErrTt2:"-ErrTt2",
    ErrTx1:"-ErrTx1", ErrTx2:"-ErrTx2", TxCache1:"-TxCache1", TxCache2:"-TxCache2", TxCacheErr:"-TxCacheErr", TTTXSend:"-TTTXSend",
    TTTXReceive:"-TtTxReceive", ErrTxSend:"-ErrTxSend", TXReq:"-TxReq", BreakUploadTime:"-BreakUploadTime", MinDTransfer:"-MinDTransfer",
    MaxDTransfer:"-MaxDTransfer", HeaderLoadOK:"HeaderLoadOK", MaxHeaderLoad:"MaxHeaderLoad", MaxSendCountItem:"MaxSendCountItem",
};

for(var num = 1; num <= 10; num++)
    StatKeys["GetTx" + num] = "-GetTx" + num;

for(var num = 0; num <= 7; num++)
    StatKeys["TtReceive" + num] = "-TtReceive" + num;
for(var num = 0; num <= 7; num++)
    StatKeys["TtSend" + num] = "-TtSend" + num;

for(var num = 0; num <= 7; num++)
    StatKeys["TxReceive" + num] = "-TxReceive" + num;

if(typeof process === "object")
{
}

global.JINN_STAT = {};
JINN_STAT.Methods = {};
JINN_STAT.Keys = StatKeys;

global.JINN_STATCopy = {};
JINN_STAT.Clear = function ()
{
    CopyObjKeys(global.JINN_STATCopy, global.JINN_STAT);
    for(var key in StatKeys)
    {
        JINN_STAT[key] = 0;
    }
    
    JINN_STAT.AllTraffic = 0;
    JINN_STAT.MINHots =  - 1;
    
    JINN_STAT.Methods = {};
}
JINN_STAT.Clear();
global.GetJinnStatInfo = GetJinnStatInfo;
function GetJinnStatInfo(JinnStat)
{
    if(!JinnStat)
        JinnStat = JINN_STAT;
    
    var Traffic = (JinnStat.AllTraffic / 1024).toFixed(1);
    var Str = "Traffic:" + Traffic + " Kb";
    
    for(var key in StatKeys)
    {
        var Name = StatKeys[key];
        if(Name && Name.substr(0, 1) !== "-")
        {
            var StatNum = JinnStat[key];
            StatNum = Math.floor(StatNum);
            Str += "\n" + Name + ":" + StatNum;
        }
    }
    
    return Str;
}

//Engine context
function DoNode(Engine)
{
    if(Engine.Del)
        return;
    if(Engine.ROOT_NODE)
        return;
    
    var StatNum = Math.floor(Engine.TickNum / 10);
    if(Engine.LastStatNum === StatNum)
        return;
    Engine.LastStatNum = StatNum;
    
    var BlockNum = Engine.CurrentBlockNum - JINN_CONST.STEP_LAST;
    
    JINN_STAT.ActiveCount += Engine.ConnectArray.length;
    if(Engine.GetBlockHeaderDB)
    {
        var Block = Engine.GetBlockHeaderDB(BlockNum);
        if(Block)
            JINN_STAT.BlockTx = Block.TxCount;
    }
    
    var CurHotCounts = 0;
    for(var n = 0; n < Engine.LevelArr.length; n++)
    {
        var Child = Engine.LevelArr[n];
        if(Child && Child.IsHot())
        {
            CurHotCounts++;
        }
    }
    JINN_STAT.HotCount += CurHotCounts;
    if(JINN_STAT.MINHots ===  - 1 || JINN_STAT.MINHots > CurHotCounts)
        JINN_STAT.MINHots = CurHotCounts;
    
    JINN_STAT.AddrCount = Engine.NodesTree.size;
}

function InitClass(Engine)
{
    Engine.AddMethodStatTime = function (Method,deltaTime,bIsStartTime)
    {
        if(bIsStartTime)
        {
            var Time = process.hrtime(deltaTime);
            deltaTime = Time[0] * 1000 + Time[1] / 1e6;
        }
        
        var Name = "TIME:" + Method;
        if(!JINN_STAT.Methods[Name])
            JINN_STAT.Methods[Name] = 0;
        JINN_STAT.Methods[Name] += deltaTime;
        
        if(!JINN_STAT.Methods[Method])
            JINN_STAT.Methods[Method] = 0;
        JINN_STAT.Methods[Method]++;
    };
    
    Engine.AddMethodTraffic = function (Child,Method,Length)
    {
        var Name = "SIZE:" + Method;
        if(!JINN_STAT.Methods[Name])
            JINN_STAT.Methods[Name] = 0;
        JINN_STAT.Methods[Name] += Length / 1024;
    };
    
    Engine.AddMethodStatRead = function (Method,deltaRead)
    {
        
        var Name = "READ:" + Method;
        if(!JINN_STAT.Methods[Name])
            JINN_STAT.Methods[Name] = 0;
        JINN_STAT.Methods[Name] += deltaRead;
    };
}
