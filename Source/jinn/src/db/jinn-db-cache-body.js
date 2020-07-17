/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

class CDBBodyCache extends global.CDBChain
{
    constructor(EngineID, FCalcBlockHash)
    {
        super(EngineID, FCalcBlockHash)
        this.CacheBody = new CCache(JINN_CONST.MAX_CACHE_BODY_LENGTH, function (a,b)
        {
            return CompareArr(a.CacheIndex, b.CacheIndex);
        })
    }
    DoNode()
    {
        super.DoNode()
        
        this.CacheBody.SetMaxSizeCache(JINN_CONST.MAX_CACHE_BODY_LENGTH)
        
        var Size = this.CacheBody.CheckDBBlockCacheSize(JINN_CONST.MAX_CACHE_BODY_LENGTH);
        JINN_STAT.MAXCacheBodyLength = Math.max(JINN_STAT.MAXCacheBodyLength, Size)
    }
    Clear()
    {
        super.Clear()
        this.CacheBody.Clear()
    }
    
    SetTxDataCache(TreeHash, TxData)
    {
        if(!IsZeroArr(TreeHash) && TxData)
        {
            this.CacheBody.AddItemToCache({CacheIndex:TreeHash, TxData:TxData})
        }
    }
    
    GetTxDataCache(TreeHash)
    {
        if(!TreeHash || IsZeroArr(TreeHash))
            return undefined;
        
        var Find = this.CacheBody.FindItemInCache(TreeHash);
        if(Find && Find.TxData)
        {
            return Find.TxData;
        }
        return undefined;
    }
    
    WriteBlock(Block)
    {
        this.SetTxDataCache(Block.TreeHash, Block.TxData)
        
        return super.WriteBlock(Block);
    }
    
    SetTxData(BlockNum, TreeHash, TxData)
    {
        if(IsZeroArr(TreeHash))
            return 0;
        
        this.SetTxDataCache(TreeHash, TxData)
        
        var Result = super.SetTxData(BlockNum, TreeHash, TxData);
        return Result;
    }
    
    LoadBlockTx(Block)
    {
        if(!Block || !Block.TreeHash || IsZeroArr(Block.TreeHash))
            return 0;
        
        var Find = this.CacheBody.FindItemInCache(Block.TreeHash);
        if(Find && Find.TxData)
        {
            Block.TxData = Find.TxData
            return 1;
        }
        
        var Ret = super.LoadBlockTx(Block);
        
        if(Ret)
            this.SetTxDataCache(Block.TreeHash, Block.TxData)
        
        return Ret;
    }
};

global.CDBBodyCache = CDBBodyCache;
