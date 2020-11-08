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
//chard engine

class SmartShard extends require("./smart-scroll")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        
        const FORMAT_ROW = {BlockNum:"uint", Name:"str5", Pos:"uint", Reserve:"arr83", };
        this.DBShard = new CDBRow("shard", FORMAT_ROW, bReadOnly, "Num", 10)
    }
    
    CloseShardDB()
    {
        this.DBShard.Close()
    }
    ClearShardDB()
    {
        this.DBShard.Clear()
    }
    
    TRNewShard(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(BlockNum < UPDATE_CODE_SHARDING)
            return "Error block num";
        
        if(!ContextFrom)
            return "Pay context required";
        
        if(Body.length < 26)
            return "Error length transaction (min size)";
        
        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_NEW_SHARD, WorkStructNewShard);
        if(!TR.ShardName.trim())
            return "Shard name required";
        
        var Price = PRICE_DAO(BlockNum).NewShard;
        if(!(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID === 0 && ContextFrom.To[0].SumCOIN >= Price))
        {
            return "No money in the transaction";
        }
        
        var Item = {Name:TR.ShardName.toUpperCase(), BlockNum:BlockNum, Pos:0, Reserve:TR.Reserve, };
        
        var Map = this.GetAllShardsMap();
        if(Map[Item.Name])
        {
            return "The shard with name " + Item.Name + " is already registered";
        }
        
        this.DBShard.Write(Item)
        return true;
    }
    
    DeleteShardTR(BlockNum)
    {
        this.DBShard.DeleteFromBlock(BlockNum)
    }
    
    GetAllShardsMap()
    {
        if(this.DBShard.WasUpdate)
        {
            this.DBShard.WasUpdate = 0
            this.ShardMap = {}
            for(var num = 0; true; num++)
            {
                var Data = this.DBShard.Read(num);
                if(!Data)
                    break;
                
                this.ShardMap[Data.Name] = Data
            }
        }
        
        return this.ShardMap;
    }
};

module.exports = SmartShard;
