/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Cache the last entries of the database of the blockchain
 *
**/
'use strict';

var HEADER_FORMAT_CACHE = CopyObjKeys({}, global.DB_HEADER_FORMAT);


HEADER_FORMAT_CACHE.Hash = "hash";
HEADER_FORMAT_CACHE.PowHash = "hash";
HEADER_FORMAT_CACHE.SumHash = "hash";
HEADER_FORMAT_CACHE.Power = "uint";
HEADER_FORMAT_CACHE.SumPow = "uint";


HEADER_FORMAT_CACHE.DataHash = "hash";

HEADER_FORMAT_CACHE.SysTreeHash = "hash";

const WORKSTRUCT_CACHE = {};

class CDBBlockCache extends global.CDBBodyCache
{
    constructor(EngineID, FCalcBlockHash)
    {
        super(EngineID, FCalcBlockHash)
        
        this.CacheBlock = new CCache(100000)
        this.CacheMainIndex = new CCache(200000)
        this.CacheChainIndex = new CCache(200000)
    }
    
    DoNode()
    {
        super.DoNode()
    }
    WriteBlock(Block)
    {
        var Result = super.WriteBlock(Block);
        if(Result)
        {
            this.AddBlockToCache(Block)
        }
        return Result;
    }
    ReadBlock(Position, bRaw)
    {
        var Block;
        var Find = this.CacheBlock.FindItemInCache(Position);
        if(Find)
        {
            var Block = ArrToBlock(Find);
            Block.Position = Position
        }
        else
        {
            Block = super.ReadBlock(Position, bRaw)
            if(!Block)
                return undefined;
            
            this.AddBlockToCache(Block)
        }
        
        if(!bRaw && (!Block.Hash || IsZeroArr(Block.Hash)))
        {
            this.CalcBlockHash(Block)
            this.AddBlockToCache(Block)
        }
        
        return Block;
    }
    AddBlockToCache(Block)
    {
        var Block2 = BlockToArr(Block);
        Block2.CacheIndex = Block.Position
        this.CacheBlock.AddItemToCache(Block2)
    }
    ReadIndex(BlockNum)
    {
        if(BlockNum > this.GetMaxIndex())
            return undefined;
        
        var Find = this.CacheChainIndex.FindItemInCache(BlockNum);
        if(Find)
            return Find;
        
        var Item = super.ReadIndex(BlockNum);
        if(Item)
        {
            Item.CacheIndex = BlockNum
            this.CacheChainIndex.AddItemToCache(Item)
        }
        
        return Item;
    }
    
    WriteIndex(Item)
    {
        var Result = super.WriteIndex(Item);
        if(Result)
        {
            Item.CacheIndex = Item.BlockNum
            this.CacheChainIndex.AddItemToCache(Item)
        }
        return Result;
    }
    ReadMainIndex(BlockNum)
    {
        if(BlockNum > this.GetMaxMainIndex())
            return undefined;
        
        var Find = this.CacheMainIndex.FindItemInCache(BlockNum);
        if(Find)
            return Find;
        
        var Item = super.ReadMainIndex(BlockNum);
        if(Item)
        {
            Item.CacheIndex = BlockNum
            this.CacheMainIndex.AddItemToCache(Item)
        }
        
        return Item;
    }
    
    WriteMainIndex(BlockNum, Position)
    {
        var Result = super.WriteMainIndex(BlockNum, Position);
        if(Result)
        {
            this.CacheMainIndex.AddItemToCache({CacheIndex:BlockNum, BlockNum:BlockNum, MainPosition:Position})
        }
        return Result;
    }
    
    TruncateMain(LastBlockNum)
    {
        super.TruncateMain(LastBlockNum)
        this.CacheMainIndex.ClearCacheDBTree(LastBlockNum)
    }
    
    TruncateIndex(LastBlockNum)
    {
        super.TruncateIndex(LastBlockNum)
        this.CacheChainIndex.ClearCacheDBTree(LastBlockNum)
    }
    
    Clear()
    {
        super.Clear()
        this.CacheBlock.Clear()
        this.CacheMainIndex.Clear()
        this.CacheChainIndex.Clear()
    }
};

global.CDBBlockCache = CDBBlockCache;

function BlockToArr(Block)
{
    var Arr = SerializeLib.GetBufferFromObject(Block, HEADER_FORMAT_CACHE, WORKSTRUCT_CACHE, 1);
    return Arr;
}

function ArrToBlock(Arr)
{
    var Block = SerializeLib.GetObjectFromBuffer(Arr, HEADER_FORMAT_CACHE, WORKSTRUCT_CACHE);
    
    if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
    {
        Block.LinkSumHash = ZERO_ARR_32;
    }
    else
    {
        Block.LinkSumHash = Block.PrevSumHash;
    }
    
    return Block;
}
