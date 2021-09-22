/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

module.exports.Init = Init;


const DELTA_BLOCK_SEARCH_CROSS_TX = 100;

function Init(Engine)
{
    Engine.VBlockChannelList = {};
    
    Engine.UpdateVBlockChannelList = function ()
    {
        var MapDB = Engine.VBlockChannelList;
        var MaxNum = SHARDS.GetMaxShardNum();
        for(var s = 0; s <= MaxNum; s++)
        {
            var ShardDB = SHARDS.DBChannel.Read(s);
            var MsgItem = SERVER.CrossReceive.Read(s);
            if(ShardDB && MsgItem)
            {
                var ShardData = MapDB[ShardDB.ChannelName];
                if(!ShardData)
                {
                    ShardData = {Num:ShardDB.Num, VBlockArr:[], ShardName:ShardDB.ShardName, ChannelName:ShardDB.ChannelName, Confirms:ShardDB.Confirms,
                        StartRowHash:ZERO_ARR_32, };
                    MapDB[ShardDB.ChannelName] = ShardData;
                }
                ShardData.ShardDB = ShardDB;
            }
            else
            {
                delete MapDB[ShardDB.ChannelName];
            }
        }
    };
    
    Engine.IsCorrectTxData = function (CheckBlockNum)
    {
        SERVER.RefreshAllDB();
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
    Engine.FindCrossHeadBlock = function (ShardData)
    {
        var MsgItem = SERVER.CrossReceive.Read(ShardData.Num);
        if(MsgItem)
        {
            while(MsgItem)
            {
                var Find = SHARDS.CrossRowHashBlock.Find({RowHash:MsgItem.RowHash});
                if(Find)
                    return Find;
                
                MsgItem = SERVER.CrossReceive.ReadPrevItem(MsgItem);
            }
        }
        return {RowNum:0, RowHash:ZERO_ARR_32};
    };
    
    Engine.FindFirstVBlock = function (ShardData,BlockNum)
    {
        var VBlockFirst = ShardData.VBlockArr[0];
        if(VBlockFirst)
        {
            if(ShardData.ShardDB.MaxVBlock.Height >= VBlockFirst.Height && IsEqArr(ShardData.ShardDB.MaxVBlock.RowHash, VBlockFirst.RowHash))
            {
                var VBlock = ShardData.VBlockArr.shift();
                return Engine.FindFirstVBlock(ShardData, BlockNum);
            }
        }
        return VBlockFirst;
    };
    
    Engine.StopSendCrossVBlock = function (ShardData,VBlock)
    {
        
        var MaxVBlock = ShardData.ShardDB.MaxVBlock;
        var Item = SERVER.CrossReceive.Read(ShardData.Num);
        if(Item && IsEqArr(MaxVBlock.Hash, VBlock.Hash))
        {
            
            Item.DataHash = GetDataHashMsg(Item.Msg);
            if(SHARDS.CrossDataHashRun.Find(Item))
                return 1;
        }
        
        return 0;
    };
}

global.VBlockInfo = function (VBlock)
{
    if(!VBlock)
        return "{-}";
    
    return "[" + VBlock.BlockNumAdd + ": " + GetHexFromArr(VBlock.PrevRowHash).substr(0, 6) + "<-" + GetHexFromArr(VBlock.RowHash).substr(0,
    6) + " TX:" + (VBlock.CrossTx ? VBlock.CrossTx.length : 0) + "]";
}
