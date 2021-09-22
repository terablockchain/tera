/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Info from node for debug
 *
 **/
'use strict';
module.exports.Init = Init;

function Init(Engine)
{
    
    Engine.INFO_SEND = "";
    Engine.INFO_RET = undefined;
    Engine.INFO = function (Child,Data,bTest)
    {
        if(!global.JINN_DEBUG_INFO && !bTest)
            return undefined;
        
        var Ret = {RunVersionNum:UPDATE_CODE_VERSION_NUM, Autoupdate:USE_AUTO_UPDATE, BusySha3:global.glBusySha3, BusyTime:global.glBusyTime,
            SendTraffic:Engine.SendTraffic, ReceiveTraffic:Engine.ReceiveTraffic, ErrorCount:JINN_STATCopy.ErrorCount, CountConnectedNode:global.CountConnectedNode,
            CountAllNode:global.CountAllNode, MemoryUsage:global.glMemoryUsage, FreeMem:global.glFreeMem, CurNumBlock:GetCurrentBlockNumByTime(),
            MaxNumDB:global.glMaxNumDB, Header1:Engine.Header1, Header2:Engine.Header2, Block1:Engine.Block1, Block2:Engine.Block2, };
        if(!bTest)
            CopyObjKeys(Ret, JINN_STATCopy);
        return Ret;
    };
    
    Engine.SendGetInfo = function (Child)
    {
        return;
        
        if(!Child || !Child.IsOpen())
            return;
        
        Engine.Send("INFO", Child, {}, function (Child,Data)
        {
            if(!Data)
                return;
            
            delete Data.Reserv;
            Child.STAT_DATA = Data;
            if(!Child.INFO_DATA)
                Child.INFO_DATA = {};
            Child.INFO_DATA.DeltaCurNumBlock = GetCurrentBlockNumByTime() - Data.CurNumBlock;
            Child.INFO_DATA.DeltaMaxNumDB = global.glMaxNumDB - Data.MaxNumDB;
            Child.INFO_DATA.DeltaMaxSumPow = JINN_STATCopy.MaxSumPow - Data.MaxSumPow;
        });
    };
    Engine.INFO_RET = {};
    
    var Test = Engine.INFO(undefined, undefined, 1);
    
    var Count = 0;
    for(var key in Test)
    {
        Count++;
        Engine.INFO_RET[key] = "uint";
    }
    
    for(var key in JINN_STAT.Keys)
    {
        Count++;
        Engine.INFO_RET[key] = "uint";
    }
    var LengthReserv = (100 - Count) * 6;
    if(LengthReserv > 0)
        Engine.INFO_RET.Reserv = "arr" + LengthReserv;
}
