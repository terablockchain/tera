/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Module with cross-transaction exchange Protocol inside a trusted node cluster
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Sharding", DoNode:DoNode});

//Engine context
function DoNode(Engine)
{
    if(Engine.ROOT_NODE)
        return 0;
    
    if(Engine.TickNum % 20 !== 0)
        return;
    
    if(global.UPDATE_CODE_SHARDING && GetCurrentBlockNumByTime() < global.UPDATE_CODE_SHARDING)
        return;
    
    Engine.SendCrossTx();
}

function InitClass(Engine)
{
    Engine.CrossLevelArr = [];
    
    Engine.CanShardConnect = function (Child,ShardName)
    {
        if(!Child.IsCluster && ShardName !== JINN_CONST.SHARD_NAME)
            return 0;
        else
            return 1;
    };
    Engine.SetShardName = function (Child,ShardName)
    {
        if(!ShardName)
            ShardName = JINN_CONST.SHARD_NAME;
        
        Child.ShardName = ShardName;
        
        var Find = Engine.NodesTree.find(Child);
        if(Find)
        {
            Find.ShardName = ShardName;
        }
    };
    
    Engine.GetLevelArr = function (Child)
    {
        if(Child.IsCluster && Child.ShardName !== JINN_CONST.SHARD_NAME)
            return Engine.CrossLevelArr;
        else
            return Engine.LevelArr;
    };
    
    Engine.SendCrossTx = function ()
    {
        
        var CurrentStatus = {};
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.IsCluster && Child.IsOpen())
            {
                Engine.SendCrossTxOneNode(Child, CurrentStatus);
            }
        }
        
        for(var i = 0; i < Engine.CrossLevelArr.length; i++)
        {
            var Child = Engine.CrossLevelArr[i];
            if(Child && Child.IsCluster && Child.IsOpen())
            {
                Engine.SendCrossTxOneNode(Child, CurrentStatus);
            }
        }
    };
    
    Engine.SendCrossTxOneNode = function (Child,Object)
    {
        var MsgStatus = Engine.GetCrossStatusForSend(Child);
        if(MsgStatus)
        {
            Engine.Send("CROSSMSG", Child, MsgStatus, OnCrossTxResult);
        }
        
        function OnCrossTxResult(Child,Data)
        {
            if(!Data)
                return;
            if(!Child.IsCluster)
                return;
            Engine.DoCrossMsgOnReceive(Child, Data);
        };
    };
    
    Engine.CROSSMSG_SEND = {Reserve:"uint", ChannelArr:[{ChannelName:"str20", Reserve:"uint", RowNum:"uint", RowHash:"hash"}]};
    Engine.CROSSMSG_RET = {Reserve:"uint", result:"byte", ChannelArr:[{ChannelName:"str20", result:"byte", MaxRowNum:"uint", Arr:[{BlockNum:"uint32",
                RowNum:"uint", RowHash:"hash", Msg:{}}]}]};
    
    Engine.CROSSMSG = function (Child,Data)
    {
        
        if(!Data)
            return;
        
        if(!Child.IsCluster)
            return;
        
        if(!Child.FirstTransferTime)
            Child.FirstTransferTime = Date.now();
        
        Child.LastTransferTime = Date.now();
        
        return Engine.PrepareResultCrossMsg(Child, Data);
    };
    Engine.GetCrossStatusForSend = function (Child)
    {
        return {ChannelArr:[]};
    };
    Engine.PrepareResultCrossMsg = function (Child,Data)
    {
        return {result:0, ChannelArr:[]};
    };
    Engine.DoCrossMsgOnReceive = function (Child,Ret)
    {
    };
}
