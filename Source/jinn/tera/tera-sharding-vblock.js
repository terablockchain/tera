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

const DELTA_CROSS_WORK_TX = 5;
const DELTA_CROSS_ADD_TO_VBLOCK = 2;

var MAX_VBLOCK_DEPTH = 10;

const DELTA_BLOCK_SEARCH = 10;
const MAX_DELTA_NUM_FOR_RUN_CROSS_TX = 100;

function Init(Engine)
{
    Engine.VBlockShardList = {};
    Engine.UpdateVBlockShardList = function ()
    {
        var MapDB = Engine.VBlockShardList;
        var MaxNum = SHARDS.GetMaxShardNum();
        for(var s = 0; s <= MaxNum; s++)
        {
            var ShardDB = SHARDS.DBShard.Read(s);
            var MsgItem = SERVER.CrossReceive.Read(s);
            if(ShardDB && MsgItem)
            {
                var ShardData = MapDB[ShardDB.Name];
                if(!ShardData)
                {
                    ShardData = {Num:ShardDB.Num, VBlockArr:[], Shard:ShardDB.Name, StartRowHash:ZERO_ARR_32, };
                    MapDB[ShardDB.Name] = ShardData;
                    Engine.FindStartRowHash(ShardData);
                }
                ShardData.ShardDB = ShardDB;
            }
            else
            {
                delete MapDB[ShardDB.Name];
            }
        }
    };
    Engine.IsCorrectTxData = function (CheckBlockNum)
    {
        SERVER.UpdateAllDB();
        var Item = JOURNAL_DB.GetLastBlockNumItem();
        if(!Item)
            return  - 1;
        
        var MaxNumBlockDB = Engine.GetMaxNumBlockDB();
        if(CheckBlockNum && MaxNumBlockDB !== CheckBlockNum)
            return  - 2;
        else
            if(!CheckBlockNum && !MaxNumBlockDB)
                return  - 3;
        
        var BlockDB = Engine.GetBlockHeaderDB(MaxNumBlockDB);
        if(!BlockDB)
            return  - 4;
        if(BlockDB.BlockNum !== Item.BlockNum)
            return  - 5;
        if(!IsEqArr(BlockDB.Hash, Item.SumHash))
            return  - 6;
        
        return 1;
    };
    
    Engine.CanCreateNewBlock = function (BlockNumNew)
    {
        if(!global.USE_MINING_SHARDS)
            return 1;
        if(Engine.LastNumCreateNewBlock !== Engine.CurrentBlockNum)
        {
            Engine.LastNumCreateNewBlock = Engine.CurrentBlockNum;
            Engine.LastCountCreateNewBlock = 0;
        }
        Engine.LastCountCreateNewBlock++;
        
        if(Engine.IsCorrectTxData(BlockNumNew - 1) > 0)
            return 1;
        if(Engine.LastCountCreateNewBlock >= 10)
        {
            return 1;
        }
        
        return 0;
    };
    
    Engine.FindFirstVBlock = function (ShardData)
    {
        var VBlockFirst = ShardData.VBlockArr[0];
        if(VBlockFirst)
        {
            if(IsEqArr(ShardData.ShardDB.LastHash, VBlockFirst.Hash))
            {
                var VBlock = ShardData.VBlockArr.shift();
                return Engine.FindFirstVBlock(ShardData);
            }
        }
        return VBlockFirst;
    };
    
    Engine.ItemInChainMaxVBlock = function (ShardData,VBlockItem)
    {
        
        var MaxVBlock = ShardData.ShardDB.MaxVBlock;
        
        var LastBlock = VBlockItem;
        for(var i = ShardData.VBlockArr.length - 1; i >= 0; i--)
        {
            var Current = ShardData.VBlockArr[i];
            if(!IsEqArr(Current.Hash, LastBlock.PrevHash))
            {
                ToLog("Not find correct prev block", 3);
                return 0;
            }
            LastBlock = Current;
        }
        if(!IsEqArr(MaxVBlock.Hash, LastBlock.PrevHash))
        {
            ToLog("Not find correct prev block with MaxVBlock", 3);
            return 0;
        }
        
        return 1;
    };
    
    Engine.StopSendCrossVBlock = function (ShardData,VBlock)
    {
        if(!Engine.ItemInChainMaxVBlock(ShardData, VBlock))
            return 0;
        
        var MaxVBlock = ShardData.ShardDB.MaxVBlock;
        if(IsEqArr(MaxVBlock.Hash, ShardData.ShardDB.LastHash))
        {
            var CountTx = VBlock.CrossTx.length + VBlock.RunTxArr.length;
            for(var i = 0; i < ShardData.VBlockArr.length; i++)
            {
                var Item = ShardData.VBlockArr[i];
                if(Item)
                {
                    CountTx += Item.CrossTx.length;
                    CountTx += Item.RunTxArr.length;
                }
            }
            
            if(CountTx === 0)
            {
                if(Engine.FindNotRunningTx(ShardData) === 0)
                {
                    return 1;
                }
            }
        }
        
        return 0;
    };
    SERVER.GetCrossVBlockTxArr = function (Block)
    {
        if(!global.USE_MINING_SHARDS)
            return [];
        
        if(Engine.IsCorrectTxData(Block.BlockNum - 1) !== 1)
            return [];
        
        var BlockNum = Block.BlockNum;
        
        Engine.UpdateVBlockShardList();
        
        var Arr = [];
        for(var Shard in Engine.VBlockShardList)
        {
            var ShardData = Engine.VBlockShardList[Shard];
            
            var VBlockFirst = Engine.FindFirstVBlock(ShardData);
            if(!VBlockFirst)
                continue;
            if(VBlockFirst.BlockNumAdd > BlockNum)
                continue;
            
            var Find1 = SHARDS.CrossRowHash.Find({Shard:ShardData.Shard, RowHash:VBlockFirst.PrevRowHash});
            var Find2 = SHARDS.CrossRowHash.Find({Shard:ShardData.Shard, RowHash:VBlockFirst.RowHash});
            if(!Find1 && VBlockFirst.PrevRowNum || Find2 && VBlockFirst.RowNum > Find2.RowNum)
            {
                if(!Find1 && VBlockFirst.PrevRowNum)
                    ToLog("PrevRowHash not saved");
                if(Find2 && VBlockFirst.RowNum > Find2.RowNum)
                    ToLog("Last RowHash was saved");
                ShardData.VBlockArr.length = 0;
                continue;
            }
            if(Find1)
            {
                var PrevBlock = SHARDS.CrossVBlockNum.Find({BlockNum:Find1.BlockNumVote, TxNum:Find1.TxNumVote});
                if(!PrevBlock)
                {
                    ToLog("Not find prev block by RowHash=" + GetHexFromArr12(Find1.RowHash) + " RowNum=" + Find1.RowNum, 3);
                    continue;
                }
                if(!IsEqArr(VBlockFirst.PrevHash, PrevBlock.Hash))
                {
                    ToLog("Bad VBlock PrevHash=" + GetHexFromArr8(VBlockFirst.PrevHash) + " need " + GetHexFromArr8(PrevBlock.Hash), 3);
                    ShardData.VBlockArr.length = 0;
                    continue;
                }
            }
            if(VBlockFirst.RunTxArr.length > 0 && VBlockFirst.Height <= ShardData.ShardDB.MaxVBlock.Height)
            {
                ToLog("Cannt run tx on this vblock", 3);
                VBlockFirst.RunTxArr.length = 0;
            }
            
            LOG_LEVEL >= 4 && ToLog("CREATE: " + VBlockInfo(VBlockFirst) + " on BlockNum=" + BlockNum);
            
            Arr.push({body:VBlockFirst._Body});
            for(var i = 0; i < VBlockFirst.RunTxArr.length; i++)
            {
                var Tx = VBlockFirst.RunTxArr[i];
                Arr.push({body:Tx._Body});
            }
        }
        
        return Arr;
    };
    Engine.PrepareCrossTx = function (BlockNum)
    {
        if(!global.USE_MINING || !global.WasStartMiningProcess || !global.USE_MINING_SHARDS)
            return [];
        if(SERVER.CrossReceive.Ready === 100)
            return [];
        
        if(Engine.IsCorrectTxData() !== 1)
            return  - 2;
        
        if(!SERVER.CrossReceive.Ready)
            return  - 3;
        
        Engine.UpdateVBlockShardList();
        
        var TxArr = [];
        for(var Shard in Engine.VBlockShardList)
        {
            var ShardData = Engine.VBlockShardList[Shard];
            var HeadNum = ShardData.VBlockArr.length;
            if(HeadNum > 2)
            {
                HeadNum = 2;
                ShardData.VBlockArr.length = HeadNum;
            }
            
            var VBlockFirst = ShardData.VBlockArr[HeadNum - 1];
            var VBlock = Engine.GetCrossNewVBlock(ShardData, VBlockFirst);
            if(!VBlock)
                continue;
            
            var RunTxArr = Engine.GetStartRunningArr(ShardData, VBlock);
            if(RunTxArr.length)
            {
                for(var i = ShardData.VBlockArr.length - 1; i >= 0; i--)
                {
                    var Item = ShardData.VBlockArr[i];
                    if(Item.RunTxArr.length)
                    {
                        var LastRunTx = Item.RunTxArr[Item.RunTxArr.length - 1];
                        for(var j = 0; j < RunTxArr.length; j++)
                        {
                            var CurTx = RunTxArr[j];
                            if(IsEqArr(CurTx.RowHash, LastRunTx.RowHash))
                            {
                                RunTxArr.splice(0, j + 1);
                                break;
                            }
                        }
                        
                        break;
                    }
                }
            }
            VBlock.RunTxArr = RunTxArr;
            if(Engine.StopSendCrossVBlock(ShardData, VBlock))
                continue;
            
            ShardData.VBlockArr.push(VBlock);
            VBlock.BlockNumAdd = BlockNum;
            TxArr.push(VBlock);
            for(var i = 0; RunTxArr && i < RunTxArr.length; i++)
            {
                TxArr.push(RunTxArr[i]);
            }
            if(LOG_LEVEL >= 4)
            {
                var Str = "INFO: ";
                for(var i = 0; i < ShardData.VBlockArr.length; i++)
                {
                    var VBlock = ShardData.VBlockArr[i];
                    Str += VBlockInfo(VBlock);
                }
                ToLog(Str);
            }
        }
        
        return TxArr;
    };
    Engine.GetCrossNewVBlock = function (ShardData,VBlockFirst)
    {
        var RowNum, RowHash, Height, PrevHash;
        var ShardMap = {};
        var ShardDB = ShardData.ShardDB;
        var MsgItem = SERVER.CrossReceive.Read(ShardData.Num);
        if(ShardDB && MsgItem)
        {
            if(VBlockFirst)
            {
                Height = VBlockFirst.Height;
                RowNum = VBlockFirst.RowNum;
                RowHash = VBlockFirst.RowHash;
                PrevHash = VBlockFirst.Hash;
            }
            else
            {
                Height = 0;
                RowNum = 0;
                RowHash = ZERO_ARR_32;
                PrevHash = ZERO_ARR_32;
            }
            var bNeedFindFistBlock = !VBlockFirst;
            
            var Arr = [];
            while(MsgItem && MsgItem.RowNum >= RowNum)
            {
                if(bNeedFindFistBlock)
                {
                    var Find = SHARDS.CrossRowHash.Find({Shard:ShardData.Shard, RowHash:MsgItem.RowHash});
                    if(Find)
                    {
                        RowNum = Find.RowNum;
                        RowHash = Find.RowHash;
                        
                        var PrevBlock = SHARDS.CrossVBlockNum.Find({BlockNum:Find.BlockNumVote, TxNum:Find.TxNumVote});
                        if(!PrevBlock)
                        {
                            ToLog("Not find prev block by RowHash=" + GetHexFromArr12(RowHash) + " RowNum=" + RowNum, 3);
                            return undefined;
                        }
                        
                        Height = PrevBlock.Height;
                        PrevHash = PrevBlock.Hash;
                        bNeedFindFistBlock = 0;
                    }
                }
                
                if(MsgItem.RowNum === RowNum)
                {
                    if(IsEqArr(MsgItem.RowHash, RowHash))
                    {
                        break;
                    }
                    else
                    {
                        ToLog("GetCrossNewVBlock: Error RowHash cross msg on RowNum=" + RowNum + " RowHash=" + GetHexFromArr12(RowHash) + "  MsgItem.RowHash=" + GetHexFromArr12(MsgItem.RowHash),
                        3);
                        return undefined;
                    }
                }
                
                if(MsgItem.BlockNum <= Engine.CurrentBlockNum - DELTA_CROSS_ADD_TO_VBLOCK)
                    Arr.unshift(MsgItem);
                
                MsgItem = SERVER.CrossReceive.ReadPrevItem(MsgItem);
            }
            if(Arr.length > JINN_CONST.MAX_CROSS_MSG_COUNT)
                Arr.length = JINN_CONST.MAX_CROSS_MSG_COUNT;
            
            var PrevRowHash = RowHash;
            var PrevRowNum = RowNum;
            
            if(Arr.length)
            {
                var LastRow = Arr[Arr.length - 1];
                RowHash = LastRow.RowHash;
                RowNum = LastRow.RowNum;
                
                if(Arr[0].RowNum !== PrevRowNum + 1)
                    return undefined;
            }
            
            if(IsZeroArr(RowHash))
                return undefined;
            
            var VBlockItem = {Type:TYPE_TRANSACTION_VBLOCK, Shard:ShardDB.Name, PrevHash:PrevHash, CrossTx:Arr, Height:Height + 1, PrevRowHash:PrevRowHash,
                PrevRowNum:PrevRowNum, RowNum:RowNum, RowHash:RowHash, };
            
            ShardMap[VBlockItem.Shard] = VBlockItem;
            
            VBlockItem._Body = SerializeLib.GetBufferFromObject(VBlockItem, FORMAT_VBLOCK, WorkStructVBlock);
            VBlockItem.body = VBlockItem._Body;
            VBlockItem.Hash = sha3(VBlockItem._Body);
            
            return VBlockItem;
        }
        
        return undefined;
    };
    Engine.GetStartRunningArr = function (ShardData,VBlockItem)
    {
        
        var MaxVBlock = ShardData.ShardDB.MaxVBlock;
        if(VBlockItem.Height <= MaxVBlock.Height)
            return [];
        
        if(!Engine.ItemInChainMaxVBlock(ShardData, VBlockItem))
            return [];
        
        var Arr = [];
        var count = JINN_CONST.MAX_CROSS_RUN_COUNT;
        var it = SHARDS.CrossRowHash.FindBoundIter({Shard:ShardData.Shard, RowHash:ShardData.StartRowHash});
        it.prev();
        
        var Item;
        while((Item = it.next()) !== null)
        {
            if(Item.Shard !== ShardData.Shard)
                break;
            if(VBlockItem.Height < Item.HeightStart)
            {
                break;
            }
            
            var Find = SHARDS.CrossWorkHash.Find(Item);
            if(!Find)
            {
                ToLog("Not found Msg by DataHash", 3);
                continue;
            }
            if(Find.RunBlockNum)
            {
                var Delta = Engine.CurrentBlockNum - Find.RunBlockNum;
                if(Delta > MAX_DELTA_NUM_FOR_RUN_CROSS_TX)
                {
                    ShardData.StartRowHash = Item.RowHash;
                }
                continue;
            }
            var Result = SHARDS.CrossTxInVBlockChain(MaxVBlock, Item);
            if(typeof Result === "string")
            {
                ToLog(Result, 3);
                continue;
            }
            
            var Tx = {Type:TYPE_TRANSACTION_RUN_TX, Shard:ShardData.Shard, RowHash:Item.RowHash, RowNum:Item.RowNum};
            
            Tx._Body = SerializeLib.GetBufferFromObject(Tx, FORMAT_RUN_TX, WorkStructRunTx);
            Tx.body = Tx._Body;
            Arr.push(Tx);
            
            count--;
            if(count <= 0)
                break;
        }
        
        Arr.sort(function (a,b)
        {
            return a.RowNum - b.RowNum;
        });
        return Arr;
    };
    Engine.FindStartRowHash = function (ShardData)
    {
        var it = SHARDS.CrossRowHash.FindBoundIter({Shard:ShardData.Shard, RowHash:MAX_ARR_32});
        if(!it)
            return;
        
        var Item;
        while((Item = it.prev()) !== null)
        {
            if(Item.Shard !== ShardData.Shard)
                break;
            var Find = SHARDS.CrossWorkHash.Find(Item);
            if(!Find)
            {
                continue;
            }
            if(Find.RunBlockNum)
            {
                var Delta = Engine.CurrentBlockNum - Find.RunBlockNum;
                if(Delta > MAX_DELTA_NUM_FOR_RUN_CROSS_TX)
                {
                    ShardData.StartRowHash = Item.RowHash;
                    break;
                }
                continue;
            }
        }
    };
    Engine.FindNotRunningTx = function (ShardData)
    {
        var MaxVBlock = ShardData.ShardDB.MaxVBlock;
        var it = SHARDS.CrossRowHash.FindBoundIter({Shard:ShardData.Shard, RowHash:MAX_ARR_32});
        if(!it)
            return 0;
        
        var CountNotRun = 0;
        var Item;
        while((Item = it.prev()) !== null)
        {
            if(Item.Shard !== ShardData.Shard)
                break;
            var Find = SHARDS.CrossWorkHash.Find(Item);
            if(!Find)
            {
                continue;
            }
            if(Find.RunBlockNum)
            {
                var Delta = Engine.CurrentBlockNum - Find.RunBlockNum;
                if(Delta > MAX_DELTA_NUM_FOR_RUN_CROSS_TX)
                {
                    return 0;
                }
                continue;
            }
            var Result = SHARDS.CrossTxInVBlockChain(MaxVBlock, Item);
            if(typeof Result === "string")
            {
                continue;
            }
            
            return 1;
        }
        
        return 0;
    };
    
    function VBlockInfo(VBlock)
    {
        if(!VBlock)
            return "{-}";
        
        var DBStr = "";
        
        return "[" + VBlock.Height + "-" + VBlock.BlockNumAdd + ":" + GetHexFromArr(VBlock.PrevHash).substr(0, 4) + "<-" + GetHexFromArr(VBlock.Hash).substr(0,
        6) + " TX:" + VBlock.CrossTx.length + ":" + VBlock.RunTxArr.length + " RH:" + GetHexFromArr(VBlock.RowHash).substr(8, 6) + DBStr + "]";
    };
}
