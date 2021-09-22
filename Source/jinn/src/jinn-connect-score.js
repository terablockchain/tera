/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/



'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Score"});

function InitClass(Engine)
{
    
    Engine.AddChildScoreByHash = function (Child,ArrNeedHash,Hash1,Hash2)
    {
        for(var i = 0; i < ArrNeedHash.length; i++)
        {
            var Hash = ArrNeedHash[i];
            if((Hash1 && IsEqArr(Hash, Hash1)) || (Hash2 && IsEqArr(Hash, Hash2)))
            {
                Engine.AddChildScore(Child, 1);
                break;
            }
        }
    };
    
    Engine.AddChildScore = function (Child,Count)
    {
        var Amount = 20 - Math.floor(Child.RetDeltaTime / 100);
        if(Amount < 0)
            return;
        
        if(Child.AddrItem)
        {
            if(!Child.AddrItem.Score)
                Child.AddrItem.Score = 0;
            Child.AddrItem.Score += Count * Amount / 20;
        }
    };
    
    Engine.DecrChildScore = function (Child,Count)
    {
        if(Child.AddrItem)
            Child.AddrItem.Score -= Count;
    };
    
    Engine.GetNodesArrByLevelScore = function (L)
    {
        var Arr2 = [];
        var Arr = Engine.NodesArrByLevel[L];
        if(Arr)
        {
            for(var i = 0; i < Arr.length; i++)
                Arr2[i] = Arr[i];
            Engine.SortAddrArrByScore(Arr2);
        }
        return Arr2;
    };
    
    Engine.SortAddrArrByScore = function (Arr)
    {
        Arr.sort(function (a,b)
        {
            var OpenA = 0;
            if(a.IsOpen)
                OpenA = a.IsOpen();
            var OpenB = 0;
            if(b.IsOpen)
                OpenB = b.IsOpen();
            if(OpenA !== OpenB)
                return OpenB - OpenA;
            if(a.Score !== b.Score)
                return b.Score - a.Score;
            return a.ID - b.ID;
        });
    };
    
    Engine.GetChildInHotWithMinScore = function ()
    {
        var MinScore =  - 1e9;
        var MinChild = undefined;
        for(var L = 0; L < JINN_CONST.MAX_LEVEL_ALL(); L++)
        {
            var CurChild = Engine.LevelArr[L];
            if(CurChild && CurChild.AddrItem && CurChild.AddrItem.Score < MinScore)
            {
                MinChild = CurChild;
                MinScore = CurChild.AddrItem.Score;
            }
        }
        
        return MinChild;
    };
}
