/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';

const MAX_SPEED_CACHE_CLEAR = 1000;


function CompareNumIndex(a,b)
{
    return a.CacheIndex - b.CacheIndex;
}

class CCache
{
    constructor(MaxCacheSize, FCompare)
    {
        this.MaxCacheSize = MaxCacheSize
        this.SaveVersionNum = 1
        if(!FCompare)
            FCompare = CompareNumIndex
        
        this.CacheDBTree = new RBTree(FCompare)
        this.VersionDBTree = new RBTree(function (a,b)
        {
            return a.SaveVersionNum - b.SaveVersionNum;
        })
    }
    
    SetMaxSizeCache(MaxCacheSize)
    {
        if(typeof MaxCacheSize !== "number")
            ToLogTrace("Error type of MaxCacheSize = " + MaxCacheSize)
        this.MaxCacheSize = MaxCacheSize
    }
    
    Clear()
    {
        this.SaveVersionNum = 1
        this.CacheDBTree.clear()
        this.VersionDBTree.clear()
    }
    
    ClearCacheDBTree(StartNum)
    {
        while(1)
        {
            var Block = this.CacheDBTree.max();
            if(!Block || Block.CacheIndex <= StartNum)
                break;
            
            this.CacheDBTree.remove(Block)
            this.VersionDBTree.remove(Block)
        }
    }
    
    CheckDBBlockCacheSize(Size)
    {
        var MaxCount = MAX_SPEED_CACHE_CLEAR;
        var WasSize = this.VersionDBTree.size;
        JINN_STAT.MAXCacheLength = Math.max(JINN_STAT.MAXCacheLength, WasSize)
        while(this.VersionDBTree.size > Size)
        {
            var OldItem = this.VersionDBTree.min();
            this.VersionDBTree.remove(OldItem)
            this.CacheDBTree.remove(OldItem)
            
            MaxCount--
            if(MaxCount <= 0)
                break;
        }
        
        return WasSize;
    }
    
    AddItemToCache(Block)
    {
        var Find = this.CacheDBTree.find(Block);
        if(Find)
        {
            this.CacheDBTree.remove(Find)
            this.VersionDBTree.remove(Find)
        }
        
        this.SaveVersionNum++
        Block.SaveVersionNum = this.SaveVersionNum
        this.CacheDBTree.insert(Block)
        this.VersionDBTree.insert(Block)
        
        this.CheckDBBlockCacheSize(this.MaxCacheSize)
        
        if(typeof process === "object" && this.CacheDBTree.size % 10 === 0 && (this.CacheDBTree.size > 1000 || this.CacheDBTree.size > this.MaxCacheSize / 4))
        {
            var Mem = process.memoryUsage().heapTotal / 1024 / 1024;
            if(Mem > global.JINN_MAX_MEMORY_USE)
            {
                var NewSize = Math.floor(this.CacheDBTree.size / 2);
                this.CheckDBBlockCacheSize(NewSize)
            }
        }
    }
    
    FindItemInCache(CacheIndex)
    {
        
        var Find = this.CacheDBTree.find({CacheIndex:CacheIndex});
        if(Find)
        {
            this.VersionDBTree.remove(Find)
            
            this.SaveVersionNum++
            Find.SaveVersionNum = this.SaveVersionNum
            this.VersionDBTree.insert(Find)
            return Find;
        }
        
        JINN_STAT.CacheErrDB++
        
        var CacheControlNum = 0;
        if(CacheControlNum)
        {
            if(!this.CacheErrorList || JINN_STAT.CacheErrDB === 1)
                this.CacheErrorList = []
            this.CacheErrorList.push(CacheIndex)
            
            if(JINN_STAT.CacheErrDB === CacheControlNum)
            {
                var Item = this.CacheDBTree.max();
                ToLogTrace("CacheErrDB: MAX=" + Item.CacheIndex + " Arr=" + this.CacheErrorList)
            }
        }
        
        return undefined;
    }
};

global.CCache = CCache;
