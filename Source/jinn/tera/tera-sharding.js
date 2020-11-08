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

const ITEM_LIST_DEPTH = 10000;
const ITEM_LIST_COUNT = 1000;
const LIST_DEPTH_START = 0;

const LIST_DEPTH_CROSS = 1;

function Init(Engine)
{
    
    var bReadOnly = (global.PROCESS_NAME !== "MAIN");
    SERVER.CrossReceive = new CDBCrossTx("cross-receive", bReadOnly);
    
    SERVER.StartTeraShardingRun = Date.now();
    
    Engine.CROSSMSG_RET = {result:"byte", Reserve:"uint", MaxRowNum:"uint", Arr:[{BlockNum:"uint32", RowNum:"uint", Hash:"hash",
            Msg:FORMAT_CROSS_MSG}]};
    Engine.CrossVBlockTree = new RBTree(function (a,b)
    {
        if(a.BlockNum !== b.BlockNum)
            return a.BlockNum - b.BlockNum;
        return CompareArr(a.Hash, b.Hash);
    });
    Engine.CheckShardItem = function (Child)
    {
        if(!Child.ShardItem)
            Child.ShardItem = SHARDS.FindShard(Child.ShardName);
    };
    
    Engine.GetCrossMessageStatus = function (Child)
    {
        Engine.CheckShardItem(Child);
        if(!Child.ShardItem)
            return undefined;
        
        var MaxItem = SERVER.CrossReceive.GetMaxRowIteration(Child.ShardItem.Num);
        return MaxItem;
    };
    
    Engine.DeleteCrossMsg = function (ShardNum,MaxRowNum)
    {
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
                SERVER.CrossReceive.WriteInit(ShardNum, MaxItem.Shard, 0);
            }
            else
            {
                DEBUG_CROSS && ToLog("Set last pos on " + LastItem.RowNum + "/" + MaxItem.RowNum + " Need=" + MaxRowNum);
                SERVER.CrossReceive.SetLastPos(ShardNum, LastItem.Position);
            }
        }
    };
    
    Engine.DoResultCrossMsg = function (Child,Ret)
    {
        var RecalcHash;
        Engine.CheckShardItem(Child);
        if(!Child.ShardItem)
            return;
        
        if(Ret.result === 100)
        {
            SERVER.CrossReceive.Ready = 0;
            return;
        }
        
        var ShardNum = Child.ShardItem.Num;
        
        DEBUG_CROSS && ToLog(JSON.stringify(Ret));
        
        var MaxItem = SERVER.CrossReceive.GetMaxRowIteration(ShardNum);
        if(Ret.result)
        {
            if(Ret.result === 2)
            {
                DEBUG_CROSS && ToLog("WriteInit " + ShardNum + "." + Child.ShardName);
                SERVER.CrossReceive.WriteInit(ShardNum, Child.ShardName, 0);
                
                MaxItem.RowNum = 0;
            }
            else
            {
                Engine.DeleteCrossMsg(ShardNum, Ret.MaxRowNum);
                MaxItem = SERVER.CrossReceive.GetMaxRowIteration(ShardNum);
            }
            
            var LastRowNum = MaxItem.RowNum;
            for(var i = 0; i < Ret.Arr.length; i++)
            {
                var Item = Ret.Arr[i];
                if(Item.RowNum > MaxItem.RowNum)
                {
                    DEBUG_CROSS && ToLog("Write RowNum=" + Item.RowNum);
                    delete Item.Position;
                    
                    if(Ret.result === 2 && i === 0)
                        RecalcHash = 0;
                    else
                        RecalcHash = 1;
                    
                    SERVER.CrossReceive.Write(Child.ShardName, Item, Engine.CurrentBlockNum, RecalcHash);
                    
                    LastRowNum = Item.RowNum;
                }
            }
            
            SERVER.CrossReceive.Ready = (LastRowNum === Ret.MaxRowNum);
        }
        else
        {
            SERVER.CrossReceive.Ready = 0;
            if(Ret.MaxRowNum < MaxItem.RowNum)
                MaxItem.RowNum = Ret.MaxRowNum;
            else
                MaxItem.RowNum -= ITEM_LIST_COUNT;
            if(MaxItem.RowNum < 0)
                MaxItem.RowNum = 0;
            Engine.DeleteCrossMsg(ShardNum, MaxItem.RowNum);
        }
    };
    Engine.DoGetCrossMsg = function (Child,RowNum,Hash)
    {
        SERVER.UpdateAllDB();
        if(SERVER.GetTXDelta() > 10)
            return {result:100, text:"Busy", MaxRowNum:0, Arr:[]};
        
        Engine.CheckShardItem(Child);
        
        if(!Child.ShardItem)
            return {result:0, text:"Not found shard " + Child.ShardName, MaxRowNum:0, Arr:[]};
        
        var Item = SHARDS.CrossSend.Read(Child.ShardItem.Num);
        if(!Item)
        {
            return {result:0, MaxRowNum:0, Arr:[]};
        }
        
        var MaxRowNum = Item.RowNum;
        
        DEBUG_CROSS && ToLog("DoGetCrossMsg: RowNum=" + RowNum + " Hash=" + GetHexFromArr(Hash));
        
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
                if(IsEqArr(Item.Hash, Hash))
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
    SERVER.GetCrossVBlockTxArr = function (BlockNum,Context)
    {
        SERVER.UpdateAllDB();
        
        var Arr = [];
        
        var Iter = Engine.CrossVBlockTree.lowerBound({BlockNum:BlockNum, Hash:ZERO_ARR_32});
        Iter.prev();
        
        var Item;
        while((Item = Iter.next()) !== null)
        {
            if(Item.BlockNum > BlockNum)
                break;
            if(Item.bInner)
            {
                var Body = SerializeLib.GetBufferFromObject(Item.VBlock, FORMAT_VBLOCK, WorkStructVBlock);
                Arr.push({body:Body});
                for(var i = 0; i < Item.RunTxArr.length; i++)
                {
                    var Tx = Item.RunTxArr[i];
                    var Body = SerializeLib.GetBufferFromObject(Tx, FORMAT_RUN_TX, WorkStructRunTx);
                    Arr.push({body:Body});
                }
            }
        }
        
        return Arr;
    };
    SERVER.GetCrossVBlockMap = function (BlockNum,Context)
    {
        
        var ShardMap = {};
        
        if(!SERVER.CrossReceive.Ready)
        {
            return ShardMap;
        }
        
        Context.ShardMap = {};
        var ShardMapDB = SERVER.GetLocalShardsMapDB();
        MNextShard:
        for(var ShardName in ShardMapDB)
        {
            var ShardDB = ShardMapDB[ShardName];
            var MsgItem = SERVER.CrossReceive.Read(ShardDB.Num);
            if(ShardDB && MsgItem)
            {
                var LastVBlock = ShardDB.VBlockLocal;
                if(!IsZeroArr(LastVBlock.RowHash))
                {
                    if(!SERVER.CrossReceive.FindItemByHash(ShardDB.Num, LastVBlock.RowHash, JINN_CONST.MAX_CROSS_MSG_COUNT))
                    {
                        ToLog("Not find Local Hash=" + GetHexFromArr(LastVBlock.RowHash).substr(0, 10) + " - Set zero VBlock", 3);
                        LastVBlock.RowHash = ZERO_ARR_32;
                        LastVBlock.Height = 0;
                        LastVBlock.RowNum = 0;
                        LastVBlock.BlockNum = 0;
                        LastVBlock.TxNum = 0;
                    }
                }
                
                if(IsZeroArr(LastVBlock.RowHash))
                {
                    if(!IsZeroArr(ShardDB.VBlockLider.RowHash))
                        if(SERVER.CrossReceive.FindItemByHash(ShardDB.Num, ShardDB.VBlockLider.RowHash, JINN_CONST.MAX_CROSS_MSG_COUNT))
                            LastVBlock = ShardDB.VBlockLider;
                }
                
                var RowNum = LastVBlock.RowNum;
                var Hash = LastVBlock.RowHash;
                
                var Arr = [];
                while(MsgItem && MsgItem.RowNum >= RowNum)
                {
                    if(MsgItem.RowNum === RowNum)
                    {
                        if(IsEqArr(MsgItem.Hash, Hash))
                        {
                            break;
                        }
                        else
                        {
                            ToLog("GetCrossVBlockList: Error hash cross msg on RowNum=" + RowNum + " Block.Hash=" + GetHexFromArr(Hash).substr(0, 10) + "  MsgItem.Hash=" + GetHexFromArr(MsgItem.Hash).substr(0,
                            10), 3);
                            continue MNextShard;
                        }
                    }
                    Arr.unshift(MsgItem);
                    
                    MsgItem = SERVER.CrossReceive.ReadPrevItem(MsgItem);
                }
                
                if(Arr.length > JINN_CONST.MAX_CROSS_MSG_COUNT)
                    Arr.length = JINN_CONST.MAX_CROSS_MSG_COUNT;
                
                if(Arr.length)
                {
                    var LastRow = Arr[Arr.length - 1];
                    Hash = LastRow.Hash;
                    RowNum = LastRow.RowNum;
                    
                    if(LastVBlock.RowNum === 0 && Arr[0].RowNum !== 1)
                        continue;
                }
                
                if(IsZeroArr(Hash))
                    continue;
                
                if(IsEqArr(ShardDB.BlockHash, LastVBlock.BlockHash))
                {
                    var StartItem = SHARDS.FindMaxCrossStartItem(ShardDB.Name);
                    if(Arr.length === 0 && !StartItem)
                    {
                        continue;
                    }
                }
                var Height, PrevHash;
                if(LastVBlock.BlockNum)
                {
                    var PrevBlock = SHARDS.CrossVBlockNum.Find(LastVBlock);
                    if(!PrevBlock)
                    {
                        ToLog("TRVBlock: Error find Prev VBlock by LastVBlock", 3);
                        continue;
                    }
                    
                    Height = PrevBlock.Height;
                    PrevHash = PrevBlock.Hash;
                }
                else
                {
                    Height = 0;
                    PrevHash = ZERO_ARR_32;
                }
                
                var VBlockItem = {Type:TYPE_TRANSACTION_VBLOCK, Shard:ShardDB.Name, PrevHash:PrevHash, CrossTx:Arr, Height:Height + 1, RowNum:RowNum,
                    RowHash:Hash, };
                
                ShardMap[VBlockItem.Shard] = VBlockItem;
                if(VBlockItem.Height > ShardDB.VBlockLider.Height)
                    Context.ShardMap[VBlockItem.Shard] = VBlockItem;
            }
        }
        return ShardMap;
    };
    SERVER.GetCrossRunMap = function (BlockNum,Context)
    {
        var ShardMap = {};
        
        if(!Context.ShardMap)
            return ShardMap;
        
        var WasCount = 0;
        var count = JINN_CONST.MAX_CROSS_RUN_COUNT;
        var it = SHARDS.CrossWorkMinerStart.Iterator(), Item;
        while((Item = it.next()) !== null)
        {
            
            var VBlockItem = Context.ShardMap[Item.Shard];
            if(!VBlockItem)
                continue;
            
            if(VBlockItem.Height < Item.HeightStart)
            {
                continue;
            }
            
            var Tx = {Type:TYPE_TRANSACTION_RUN_TX, Shard:Item.Shard, Height:Item.Height, HeightStart:Item.HeightStart, BlockNum:Item.BlockNum,
                TxNum:Item.TxNum, MsgNum:Item.MsgNum, DataHash:Item.DataHash};
            
            var Arr = ShardMap[Tx.Shard];
            if(!Arr)
            {
                Arr = [];
                ShardMap[Tx.Shard] = Arr;
            }
            Arr.push(Tx);
            WasCount++;
            
            count--;
            if(count <= 0)
                break;
        }
        
        return ShardMap;
    };
    
    SERVER.GetLocalShardsMapDB = function ()
    {
        var MapDB = {};
        var MaxNum = SHARDS.GetMaxShardNum();
        for(var s = 0; s <= MaxNum; s++)
        {
            var ShardDB = SHARDS.DBShard.Read(s);
            var MsgItem = SERVER.CrossReceive.Read(s);
            if(ShardDB && MsgItem)
            {
                MapDB[ShardDB.Name] = ShardDB;
            }
        }
        return MapDB;
    };
    SERVER.FindReceiveCrossMsg = function (ShardNum,Tx)
    {
        
        var Delta = Date.now() - SERVER.StartTeraShardingRun;
        if(Delta < 30 * 1000)
        {
            return 2;
        }
        
        var RowNum = Tx.RowNum;
        var Hash = Tx.Hash;
        
        var MsgItem = SERVER.CrossReceive.Read(ShardNum);
        
        if(MsgItem)
        {
            if(MsgItem.RowNum - ITEM_LIST_DEPTH >= RowNum)
                return 0;
            SERVER.CheckTreeCrossMsg();
            
            var ITEM = {ShardNum:ShardNum, RowNum:RowNum, Hash:Hash};
            var Find = SERVER.TreeCrossMsg.find(ITEM);
            if(Find)
            {
                return IsEqArr(Find.Hash, Hash);
            }
            
            var Count = ITEM_LIST_DEPTH;
            while(MsgItem && MsgItem.RowNum >= RowNum)
            {
                Count--;
                if(Count < 0)
                    break;
                
                var CURITEM = {ShardNum:ShardNum, RowNum:MsgItem.RowNum, Hash:MsgItem.Hash};
                var Find = SERVER.TreeCrossMsg.find(CURITEM);
                if(!Find)
                {
                    SERVER.TreeCrossMsg.insert(CURITEM);
                }
                else
                {
                }
                
                if(MsgItem.RowNum === RowNum)
                {
                    if(IsEqArr(MsgItem.Hash, Hash))
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
            
            return 0;
        }
        
        return 0;
    };
    SERVER.CheckTreeCrossMsg = function ()
    {
        if(!SERVER.TreeCrossMsgDate)
            SERVER.TreeCrossMsgDate = 0;
        var Now = Date.now();
        var Delta = Now - SERVER.TreeCrossMsgDate;
        if(Delta > 100 * 1000)
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
    Engine.PrepareCrossTx = function ()
    {
        var BlockNum = Engine.CurrentBlockNum - 1;
        if(Engine.WasPrepareCrossBlockNum === BlockNum)
            return;
        if(BlockNum % DELTA_CROSS_CREATE !== 0)
            return;
        var TXBlockNum = COMMON_ACTS.GetLastBlockNumActWithReopen();
        if(TXBlockNum <= BlockNum - DELTA_CROSS_CREATE)
            return;
        if(!SERVER.CrossReceive.Ready)
            return;
        Engine.WasPrepareCrossBlockNum = BlockNum;
        var Context = {};
        
        var VBlockList = SERVER.GetCrossVBlockMap(BlockNum, Context);
        var VRunList = SERVER.GetCrossRunMap(BlockNum, Context);
        
        var TxArr = [];
        for(var Shard in VBlockList)
        {
            var VBlock = VBlockList[Shard];
            var Item = {Type:TYPE_TRANSACTION_CROSS_BUNDLE, BlockNum:BlockNum, VBlock:VBlock, RunTxArr:VRunList[VBlock.Shard], };
            var Body = SerializeLib.GetBufferFromObject(Item, FORMAT_CROSS_BUNDLE, WorkStructCrossBundle);
            
            var Tx = Engine.GetTx(Body, BlockNum);
            TxArr.push(Tx);
            TxArr.push(Engine.GetTx(SerializeLib.GetBufferFromObject(Item.VBlock, FORMAT_VBLOCK, WorkStructVBlock), BlockNum));
            for(var i = 0; Item.RunTxArr && i < Item.RunTxArr.length; i++)
            {
                TxArr.push(Engine.GetTx(SerializeLib.GetBufferFromObject(Item.RunTxArr[i], FORMAT_RUN_TX, WorkStructRunTx), BlockNum));
            }
        }
        
        if(TxArr.length)
        {
            Engine.AddCurrentProcessingTx(BlockNum, TxArr, 1);
        }
    };
    Engine.RunVTX_Bundle = function (Tx,BlockNum,bInner)
    {
        
        Engine.CheckSizeCrossVBlockTree();
        
        var Find = Engine.CrossVBlockTree.find({BlockNum:BlockNum, Hash:Tx.HASH});
        if(Find)
        {
            if(bInner)
                Find.bInner = bInner;
        }
        else
        {
            var VBundle = SerializeLib.GetObjectFromBuffer(Tx.body, FORMAT_CROSS_BUNDLE, WorkStructCrossBundle);
            VBundle.Hash = Tx.HASH;
            VBundle.bInner = bInner;
            Engine.CrossVBlockTree.insert(VBundle);
        }
    };
    Engine.CheckSizeCrossVBlockTree = function ()
    {
        var MinBlockNum = Engine.CurrentBlockNum - JINN_CONST.STEP_CLEAR_MEM;
        while(1)
        {
            var MinItem = Engine.CrossVBlockTree.min();
            if(!MinItem || MinItem.BlockNum >= MinBlockNum)
                break;
            Engine.CrossVBlockTree.remove(MinItem);
        }
    };
    if(!bReadOnly)
        SERVER.CrossReceive.Clear();
}
