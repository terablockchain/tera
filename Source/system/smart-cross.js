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

//support cross-tx engine
const DELTA_CROSS_CREATE = 10;

const CDBCrossTx = require("../jinn/tera/cross-tx-db");

class SmartCrossTX extends require("./smart-scroll")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        
        this.CrossTxOutDB = new CDBCrossTx("cross-out")
        this.CrossTxInDB = new CDBCrossTx("cross-in")
        this.CrossTxRunDB = new CDBCrossTx("cross-run")
    }
    
    CloseCrossDB()
    {
        this.CrossTxOutDB.Close()
        this.CrossTxInDB.Close()
        this.CrossTxRunDB.Close()
    }
    ClearCrossDB()
    {
        
        this.CrossTxOutDB.Clear()
        this.CrossTxInDB.Clear()
        this.CrossTxRunDB.Clear()
    }
    TRCrossTX(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num";
        
        if(ContextFrom)
            return "Only the transaction of miners is expected";
        
        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_CROSS_TX, WorkStructCrossTx);
        
        if(TR.ShardTo !== JINN_CONST.SHARD_NAME)
        {
            return "Error ShardTo: " + TR.ShardTo;
        }
        
        TR.Status = 0
        var DBChanges = GET_TR_CHANGES();
        DBChanges.TRCrossRun.push(TR)
        
        return true;
    }
    
    TRVoteTX(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num";
        return 0;
        
        if(ContextFrom)
            return "Only the transaction of miners is expected";
        
        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_VOTE_TX, WorkStructVoteTx);
        
        return true;
    }
    
    TRRunTX(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num";
        return 0;
        
        if(ContextFrom)
            return "Only the transaction of miners is expected";
        
        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_RUN_TX, WorkStructRunTx);
        
        if(TR.ShardTo !== JINN_CONST.SHARD_NAME)
        {
            return "Error ShardTo: " + TR.ShardTo;
        }
        
        var BlockNumFrom = BlockNum - DELTA_CROSS_CREATE;
        if(TR.ShardFrom === JINN_CONST.SHARD_NAME && TR.BlockNumFrom !== BlockNumFrom)
        {
            return "Error BlockNumFrom: " + TR.BlockNumFrom;
        }
        
        var Account = DApps.Accounts.ReadStateTR(TR.AccountTo);
        if(!Account)
            return "TRCrossTX: Error account: " + TR.AccountTo;
        if(!Account.Value.Smart)
            return "TRCrossTX: No smart on account: " + TR.AccountTo;
        
        ContextFrom = {}
        try
        {
            var Params = JSON.parse(TR.Params);
            RunSmartMethod(Block, TR, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, TR.MethodName, Params, 2)
        }
        catch(e)
        {
            return e;
        }
        
        return true;
    }
    
    GetCrossTxArray(BlockNum)
    {
        this.SyncCrossTx()
        
        var CrossDB = this.CrossTxInDB;
        
        var BlockNumFrom = BlockNum - DELTA_CROSS_CREATE;
        var Arr = [];
        if(BlockNumFrom > 0)
        {
            var Item = CrossDB.DBHeader.FindItemFromMax(BlockNumFrom);
            if(Item)
            {
                Item = CrossDB.Read(Item.Num)
                while(Item && Item.BlockNum === BlockNumFrom)
                {
                    var Body = this.GetCrossTxBody(Item);
                    Arr.unshift({body:Body})
                    
                    Item = CrossDB.Read(Item.Num + 1)
                }
            }
        }
        
        return Arr;
    }
    
    GetCrossTxBody(Item)
    {
        Item.Type = TYPE_TRANSACTION_CROSS_TX
        Item.BlockNumFrom = Item.BlockNum
        var Body = SerializeLib.GetBufferFromObject(Item, FORMAT_CROSS_TX, WorkStructCrossTx);
        return Body;
    }
    
    SyncCrossTx()
    {
        this.CrossTxInDB = this.CrossTxOutDB
    }
    
    AddCrossMsg(BlockNumFrom, TrNumFrom, AccountFrom, Iteration, Mode, ShardPath, MethodName, Params)
    {
        
        if(!ShardPath || typeof ShardPath !== "string")
            throw "Error cross shard path: " + ShardPath;
        
        var Index = ShardPath.indexOf(":");
        if(Index < 4)
            throw "Error cross shard name in path: " + ShardPath;
        var ShardTo = ShardPath.substr(0, Index);
        var AccountTo = ParseNum(ShardPath.substr(Index + 1));
        if(!AccountTo)
            throw "Error cross shard account number in path: " + ShardPath;
        
        if(!MethodName || typeof MethodName !== "string" || MethodName.length > 40)
            throw "Error cross method name: " + MethodName;
        
        var StrParams = JSON.stringify(Params);
        if(StrParams.length > 400)
            throw "Error cross params length: " + StrParams.length;
        
        var DBChanges = GET_TR_CHANGES();
        DBChanges.TRCrossMsg.push({BlockNumFrom:BlockNumFrom, TrNumFrom:TrNumFrom, ShardFrom:JINN_CONST.SHARD_NAME, AccountFrom:AccountFrom,
            Mode:Mode, Iteration:Iteration, ShardTo:ShardTo, AccountTo:AccountTo, MethodName:MethodName, Params:StrParams})
    }
    
    DeleteCrossTR(BlockNum)
    {
        this.CrossTxOutDB.DeleteFromBlock(BlockNum)
        this.CrossTxRunDB.DeleteFromBlock(BlockNum)
    }
    WriteCrossTR(Block)
    {
        var DBChanges = GET_TR_CHANGES();
        for(var i = 0; i < DBChanges.BlockCrossMsg.length; i++)
        {
            var Item = DBChanges.BlockCrossMsg[i];
            Item.BlockNum = Block.BlockNum
        }
        
        for(var i = 0; i < DBChanges.BlockCrossRun.length; i++)
        {
            var Item = DBChanges.BlockCrossRun[i];
            Item.BlockNum = Block.BlockNum
        }
        this.CrossTxOutDB.WriteArr(DBChanges.BlockCrossMsg)
        this.CrossTxRunDB.WriteArr(DBChanges.BlockCrossRun)
    }
};

module.exports = SmartCrossTX;
