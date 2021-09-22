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
//shard engine

const ShardCross = require("./shard-cross-db");

const TYPE_TRANSACTION_NEW_SHARD = 60;
global.FORMAT_NEW_SHARD = {Type:"byte", ShardName:SHARD_STR_TYPE, Description:"str40", Confirms:"uint32", Reserve:"arr6", };
global.WorkStructNewShard = {};

var CROSS_MSG_VBLOCK = CopyObjKeys({}, FORMAT_CROSS_MSG);
delete CROSS_MSG_VBLOCK.ShardFrom;
delete CROSS_MSG_VBLOCK.ShardTo;


global.TYPE_TRANSACTION_VBLOCK = 201;
global.FORMAT_VBLOCK = {Type:"byte", ShardName:SHARD_STR_TYPE, Confirms:"uint32", PrevRowHash:"hash", PrevRowNum:"uint", CrossTx:[{Msg:CROSS_MSG_VBLOCK}],
    StartRun:"byte", Reserve:"arr4", };
global.WorkStructVBlock = {};

class ShardApp extends ShardCross
{
    constructor()
    {
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        super(bReadOnly)
        
        const FORMAT_ROW = {BlockNum:"uint", ShardName:SHARD_STR_TYPE, Confirms:"uint32", ChannelName:"str20", Description:"str40",
            Work:"byte", MaxVBlock:{BlockNum:"uint32", TxNum:"uint16", Height:"uint32", RowNum:"uint", RowHash:"hash", Hash:"hash", },
            LastHash:"hash", Reserve:"arr9", };
        
        this.DBChannel = new CDBRow("cross-channel", FORMAT_ROW, bReadOnly, "Num", 10, 0, 0)
        REGISTER_TR_DB(this.DBChannel, 50)
    }
    
    Name()
    {
        return "Shard";
    }
    
    Close()
    {
        this.ShardMap = {}
        this.DBChannel.Close()
        this.CloseCrossDB()
    }
    ClearDataBase()
    {
        this.ShardMap = {}
        
        this.DBChannel.Clear()
        this.ClearCrossDB()
    }
    
    OnDeleteBlock(BlockNum)
    {
        if(BlockNum > 0)
        {
            this.DeleteShardTR(BlockNum)
            this.DeleteCrossTR(BlockNum)
        }
    }
    
    OnProcessBlockStart(Block)
    {
        this.OnProcessCrossBlockStart(Block)
    }
    
    OnProcessBlockFinish(Block)
    {
        this.OnProcessCrossBlockFinish(Block)
    }
    
    OnProcessTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];
        
        var Result = false;
        switch(Type)
        {
            case TYPE_TRANSACTION_NEW_SHARD:
                Result = this.TRNewShard(Block, Body, BlockNum, TrNum, ContextFrom)
                break;
                
            case TYPE_TRANSACTION_VBLOCK:
                Result = this.TRVBlock(Block, Body, BlockNum, TrNum, ContextFrom)
                break;
        }
        
        return Result;
    }
    
    GetFormatTransaction(Type)
    {
        var format;
        switch(Type)
        {
            case TYPE_TRANSACTION_NEW_SHARD:
                format = FORMAT_NEW_SHARD
                break;
                
            case TYPE_TRANSACTION_VBLOCK:
                format = FORMAT_VBLOCK
                break;
                
            default:
                format = ""
        }
        return format;
    }
    
    TRNewShard(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num for new shard tx";
        
        if(!ContextFrom)
            return "Pay context required";
        
        if(Body.length < 26)
            return "Error length transaction (min size)";
        
        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_NEW_SHARD, WorkStructNewShard);
        var ShardName = TR.ShardName.toUpperCase().trim();
        
        var Result = IsCorrectShardName(ShardName);
        if(Result !== 1)
            return Result;
        
        var Price = PRICE_DAO(BlockNum).NewShard;
        if(!(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID === 0 && ContextFrom.To[0].SumCOIN >= Price))
        {
            return "No money in the transaction";
        }
        
        var Item = {BlockNum:BlockNum, ShardName:ShardName, Confirms:TR.Confirms, ChannelName:ShardName + ":" + TR.Confirms, Description:TR.Description,
            Reserve:TR.Reserve, };
        
        if(this.FindChannel(Item.ChannelName))
        {
            return "The channel with name " + Item.ChannelName + " is already registered";
        }
        
        this.DBChannel.Write(Item)
        this.CrossSend.WriteInit(Item, Item.BlockNum)
        
        return true;
    }
    
    DeleteShardTR(BlockNum)
    {
        this.DBChannel.DeleteFromBlock(BlockNum)
    }
    
    ReadChannel(Value)
    {
        if(typeof Value === "number")
            return this.DBChannel.Read(Value);
        else
            return this.FindChannel(Value);
    }
    
    FindChannel(ChannelName)
    {
        for(var num = 0; true; num++)
        {
            var Data = this.DBChannel.Read(num);
            if(!Data)
                break;
            
            if(ChannelName === Data.ChannelName)
                return Data;
        }
        return undefined;
    }
    GetMaxShardNum()
    {
        return this.DBChannel.GetMaxNum();
    }
    
    GetShardList(start, count)
    {
        var Arr = this.GetScrollList(this.DBChannel, start, count);
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            var Receive = SERVER.CrossReceive.ReadHead(Item.Num);
            if(Receive)
            {
                Item.CheckTime = Receive.CheckTime
            }
        }
        
        return Arr;
    }
};

function IsCorrectShardName(Name)
{
    if(!Name || Name.length < 3)
        return "Error shard name: " + Name + " Length must be min 3 letters";
    const SHARD_LETTER = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    for(var i = 0; i < Name.length; i++)
    {
        var Index = SHARD_LETTER.indexOf(Name.substr(i, 1));
        if(Index < 0)
            return "Error shard name: " + Name + " Letters must be between A-Z or 0-9";
        if(i === 0 && Index < 10)
            return "Error shard name: " + Name + " First letters must be between A-Z";
    }
    
    return 1;
}

module.exports = ShardApp;

var App = new ShardApp;
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_NEW_SHARD);

REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_VBLOCK);
