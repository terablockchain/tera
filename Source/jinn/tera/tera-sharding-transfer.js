/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

const CDBCrossTx = require("./db/tera-db-cross");

module.exports.Init = Init;

const DEBUG_CROSS = 0;


global.ITEM_LIST_DEPTH = 10000;
const ITEM_LIST_COUNT = 1000;
var LIST_DEPTH_START = 5;
if(global.LOCAL_RUN)
    LIST_DEPTH_START = 0;

const DELTA_TIME_CLEAR_TREE = 30;
var START_TIME_DELTA = 30;
if(global.LOCAL_RUN)
    START_TIME_DELTA = 5;

function Init(Engine)
{
    
    var bReadOnly = (global.PROCESS_NAME !== "MAIN");
    SERVER.CrossReceive = new CDBCrossTx("cross-receive", bReadOnly);
    SERVER.CrossReceive.Ready = 100;
    
    SERVER.StartTeraShardingRun = Date.now();
    
    Engine.CROSSMSG_RET = {Reserve:"uint", result:"byte", ChannelArr:[{ChannelName:"str20", result:"byte", MaxRowNum:"uint", Arr:[{BlockNum:"uint32",
                RowNum:"uint", RowHash:"hash", Msg:FORMAT_CROSS_MSG}]}]};
    
    Engine.GetCrossStatusForSend = function (Child)
    {
        Engine.CheckCrossReceiveSize();
        
        var Arr = [];
        var MaxNum = SERVER.CrossReceive.GetMaxNum();
        for(var Num = 0; Num <= MaxNum; Num++)
        {
            var Item = SERVER.CrossReceive.ReadHead(Num);
            if(!Item)
            {
                ToLog("Error read shard num=" + Num, 3);
                continue;
            }
            if(Item.ShardName === SHARD_NAME)
                continue;
            
            if(!Item.LastPos || !SERVER.CrossReceive.ReadBodyToItem(Item, Item.LastPos))
            {
                Item.RowNum = 0;
                Item.RowHash = ZERO_ARR_32;
            }
            
            Arr.push(Item);
        }
        
        return {ChannelArr:Arr};
    };
    
    Engine.DoCrossMsgOnReceive = function (Child,Data)
    {
        DEBUG_CROSS && ToLog(JSON.stringify(Data));
        
        if(Data.result === 100)
        {
            if(Data.ChannelArr.length > 0 || SERVER.CrossReceive.Ready !== 100)
                SERVER.CrossReceive.Ready = 0;
            return;
        }
        
        for(var i = 0; i < Data.ChannelArr.length; i++)
        {
            var Channel = Data.ChannelArr[i];
            var ChannelName = GetChannelName(Child, Channel.ChannelName);
            var ShardItem = SHARDS.FindChannel(ChannelName);
            if(!ShardItem)
                continue;
            
            Engine.DoCrossMsgItem(ShardItem, Channel);
        }
    };
    
    Engine.DoCrossMsgItem = function (ShardItem,Ret)
    {
        var MaxItem = SERVER.CrossReceive.GetMaxRowIteration(ShardItem.Num);
        if(Ret.result)
        {
            if(Ret.result === 2)
            {
                DEBUG_CROSS && ToLog("WriteInit " + ShardItem.Num + "." + ShardItem.ChannelName);
                SERVER.CrossReceive.WriteInit(ShardItem, 0);
                
                MaxItem.RowNum = 0;
            }
            else
            {
                Engine.DeleteCrossMsg(ShardItem, Ret.MaxRowNum);
                MaxItem = SERVER.CrossReceive.GetMaxRowIteration(ShardItem.Num);
            }
            
            var LastRowNum = MaxItem.RowNum;
            for(var i = 0; i < Ret.Arr.length; i++)
            {
                var Item = Ret.Arr[i];
                if(Item.RowNum > MaxItem.RowNum)
                {
                    DEBUG_CROSS && ToLog("Write RowNum=" + Item.RowNum);
                    delete Item.Position;
                    
                    var RecalcHash;
                    if(Ret.result === 2 && i === 0)
                        RecalcHash = 0;
                    else
                        RecalcHash = 1;
                    
                    SERVER.CrossReceive.Write(ShardItem.ChannelName, Item, Engine.CurrentBlockNum, RecalcHash);
                    
                    LastRowNum = Item.RowNum;
                }
            }
            SERVER.CrossReceive.Ready = (LastRowNum === Ret.MaxRowNum ? 1 : 0);
        }
        else
            if(Ret.MaxRowNum > 0)
            {
                SERVER.CrossReceive.Ready = 0;
                if(Ret.MaxRowNum < MaxItem.RowNum)
                    MaxItem.RowNum = Ret.MaxRowNum;
                else
                    MaxItem.RowNum -= ITEM_LIST_COUNT;
                if(MaxItem.RowNum < 0)
                    MaxItem.RowNum = 0;
                Engine.DeleteCrossMsg(ShardItem, MaxItem.RowNum);
            }
    };
    
    Engine.DeleteCrossMsg = function (ShardItem,MaxRowNum)
    {
        var ShardNum = ShardItem.Num;
        var LastItem = undefined;
        var Item = SERVER.CrossReceive.Read(ShardNum);
        var MaxItem = Item;
        if(!MaxItem || MaxItem.RowNum <= MaxRowNum)
            return;
        while(Item && Item.RowNum >= MaxRowNum)
        {
            LastItem = Item;
            
            Item = SERVER.CrossReceive.ReadPrevItem(Item);
        }
        
        if(LastItem && LastItem.RowNum !== MaxItem.RowNum)
        {
            if(MaxRowNum < LastItem.RowNum)
            {
                DEBUG_CROSS && ToLog("Init");
                SERVER.CrossReceive.WriteInit(ShardItem, 0);
            }
            else
            {
                DEBUG_CROSS && ToLog("Set last pos on " + LastItem.RowNum + "/" + MaxItem.RowNum + " Need=" + MaxRowNum);
                SERVER.CrossReceive.SetLastPos(ShardNum, LastItem.Position);
            }
        }
    };
    
    Engine.PrepareResultCrossMsg = function (Child,Data)
    {
        
        SERVER.UpdateAllDB();
        if(SERVER.GetTXDelta() > 10)
            return {result:100, text:"Busy", ChannelArr:[]};
        
        var Arr = [];
        for(var i = 0; i < Data.ChannelArr.length; i++)
        {
            var Channel = Data.ChannelArr[i];
            var ChannelName = GetChannelName(Child, Channel.ChannelName);
            var ShardItem = SHARDS.FindChannel(ChannelName);
            if(!ShardItem)
                continue;
            
            var Item = SHARDS.CrossSend.Read(ShardItem.Num);
            var ResItem;
            if(!Item)
            {
                ResItem = {result:0, MaxRowNum:0, Arr:[]};
            }
            else
            {
                ResItem = Engine.PrepareResultCrossItem(Item, Channel.RowNum, Channel.RowHash);
            }
            
            ResItem.ChannelName = ChannelName;
            Arr.push(ResItem);
        }
        
        return {result:1, ChannelArr:Arr};
    };
    
    Engine.PrepareResultCrossItem = function (Item,RowNum,RowHash)
    {
        
        var MaxRowNum = Item.RowNum;
        
        if(MaxRowNum < RowNum)
        {
            return {result:1, MaxRowNum:MaxRowNum, Arr:[]};
        }
        var Arr = [];
        var Count = ITEM_LIST_DEPTH;
        while(Item && Item.RowNum >= RowNum && Count > 0)
        {
            Count--;
            
            if(Item.RowNum === RowNum)
            {
                if(IsEqArr(Item.RowHash, RowHash))
                {
                    Arr.length = Math.min(ITEM_LIST_COUNT, Arr.length);
                    return {result:1, MaxRowNum:MaxRowNum, Count:Arr.length, Arr:Arr};
                }
                else
                {
                    return {result:0, MaxRowNum:MaxRowNum, Arr:[]};
                }
            }
            
            if(Item.BlockNum <= Engine.CurrentBlockNum - LIST_DEPTH_START)
                Arr.unshift(Item);
            
            Item = SHARDS.CrossSend.ReadPrevItem(Item);
        }
        
        Arr.length = Math.min(ITEM_LIST_COUNT, Arr.length);
        return {result:2, MaxRowNum:MaxRowNum, Count:Arr.length, Arr:Arr};
    };
    SERVER.FindReceiveCrossMsg = function (ShardNum,RowNum,RowHash)
    {
        
        var Delta = Date.now() - SERVER.StartTeraShardingRun;
        if(Delta < START_TIME_DELTA * 1000)
        {
            return 2;
        }
        SERVER.CheckTreeCrossMsg();
        var ITEM = {ShardNum:ShardNum, RowNum:RowNum, RowHash:RowHash};
        var Find = SERVER.TreeCrossMsg.find(ITEM);
        if(Find)
        {
            return IsEqArr(Find.RowHash, RowHash);
        }
        
        var MsgItem = SERVER.CrossReceive.Read(ShardNum);
        if(MsgItem)
        {
            if(MsgItem.RowNum - ITEM_LIST_DEPTH >= RowNum)
                return 0;
            
            var Count = ITEM_LIST_DEPTH;
            while(MsgItem && MsgItem.RowNum >= RowNum)
            {
                Count--;
                if(Count < 0)
                    break;
                
                var CURITEM = {ShardNum:ShardNum, RowNum:MsgItem.RowNum, RowHash:MsgItem.RowHash};
                var Find = SERVER.TreeCrossMsg.find(CURITEM);
                if(!Find)
                {
                    SERVER.TreeCrossMsg.insert(CURITEM);
                }
                
                if(MsgItem.RowNum === RowNum)
                {
                    if(IsEqArr(MsgItem.RowHash, RowHash))
                    {
                        return 1;
                    }
                    else
                    {
                        return 0;
                    }
                }
                MsgItem = SERVER.CrossReceive.ReadPrevItem(MsgItem);
            }
        }
        
        return 0;
    };
    SERVER.CheckTreeCrossMsg = function ()
    {
        if(!SERVER.TreeCrossMsgDate)
            SERVER.TreeCrossMsgDate = 0;
        var Now = Date.now();
        var Delta = Now - SERVER.TreeCrossMsgDate;
        if(Delta > DELTA_TIME_CLEAR_TREE * 1000)
            SERVER.TreeCrossMsg = undefined;
        
        if(!SERVER.TreeCrossMsg)
        {
            SERVER.TreeCrossMsgDate = Now;
            SERVER.TreeCrossMsg = new RBTree(function (a,b)
            {
                if(a.ShardNum !== b.ShardNum)
                    return a.ShardNum - b.ShardNum;
                return a.RowNum - b.RowNum;
            });
        }
    };
    Engine.CheckCrossReceiveSize = function ()
    {
        var MaxNum1 = SERVER.CrossReceive.GetMaxNum();
        var MaxNum2 = SHARDS.DBChannel.GetMaxNum();
        for(var Num = MaxNum1 + 1; Num <= MaxNum2; Num++)
        {
            var Item = SHARDS.DBChannel.Read(Num);
            if(Item)
            {
                SERVER.CrossReceive.WriteInit(Item, Item.BlockNum);
            }
        }
    };
    Engine.InitCrossReceive = function ()
    {
        if(bReadOnly)
            return;
        
        if(SERVER.CrossReceive.GetMaxNum() > 0)
            SERVER.CrossReceive.Clear();
        Engine.CheckCrossReceiveSize();
    };
    Engine.InitCrossReceive();
}

function GetChannelName(Child,ChannelName)
{
    var Index = ChannelName.indexOf(":");
    var ShardName = ChannelName.substr(0, Index);
    var ConfirmsStr = ChannelName.substr(Index);
    
    if(ShardName === SHARD_NAME || ShardName === Child.ShardName)
        ChannelName = Child.ShardName + ConfirmsStr;
    
    return ChannelName;
}
