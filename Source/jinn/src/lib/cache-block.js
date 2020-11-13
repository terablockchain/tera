/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

var GlTreeCacheCounter = 0;
var AllTreeCacheItem = new RBTree(function (a,b)
{
    return a.ID - b.ID;
}
);

class CTimeCache
{
    
    constructor(FCompare)
    {
        
        this.DataTree = new RBTree(FCompare)
        this.TimeTree = new RBTree(function (a,b)
        {
            if(a.TimeNum !== b.TimeNum)
                return a.TimeNum - b.TimeNum;
            return FCompare(a, b);
        })
        GlTreeCacheCounter++
        this.ID = GlTreeCacheCounter
        AllTreeCacheItem.insert(this)
    }
    
    Clear()
    {
        this.DataTree.clear()
        this.TimeTree.clear()
    }
    
    RemoveTo(ToNum)
    {
        while(1)
        {
            var Item = this.TimeTree.min();
            if(!Item || Item.TimeNum > ToNum)
                break;
            
            this.DataTree.remove(Item)
            this.TimeTree.remove(Item)
            
            if(this.DataTree.size !== this.TimeTree.size)
                ToLog("#1 Error trees size: " + this.DataTree.size + "/" + this.TimeTree.size + " Item=" + JSON.stringify(Item), 3)
        }
    }
    
    AddItemToCache(Item)
    {
        if(typeof Item.TimeNum !== "number")
            ToLogTrace("Error type Item.TimeNum=" + Item.TimeNum)
        var Find = this.DataTree.find(Item);
        if(Find)
        {
            this.DataTree.remove(Find)
            this.TimeTree.remove(Find)
        }
        else
        {
            var Find2 = this.TimeTree.find(Item);
            if(Find2)
            {
                ToLog("Error TimeTree find TimeTree tree")
            }
        }
        this.DataTree.insert(Item)
        this.TimeTree.insert(Item)
    }
    
    FindItemInCache(Item)
    {
        return this.DataTree.find(Item);
    }
};

class CBlockCache extends CTimeCache
{
    AddItemToCache(Item)
    {
        Item.TimeNum = Item.BlockNum
        return super.AddItemToCache(Item);
    }
}
global.AllCacheTreeRemoveTo = function (ToNum)
{
    var it = AllTreeCacheItem.iterator(), Item;
    while((Item = it.next()) !== null)
    {
        Item.RemoveTo(ToNum);
    }
}


global.AllCacheTreeRemoveItem = function (Item)
{
    AllTreeCacheItem.remove(Item);
}

global.CTimeCache = CTimeCache;
global.CBlockCache = CBlockCache;
