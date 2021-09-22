/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Initial loading of the blockchain "from the beginning"
 *
 **/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Loader"});

const DELTA_FOR_LOAD = 10;

function DoNode(Engine)
{
    if(Engine.TickNum % 10 !== 0)
        return;
    
    if(Engine.ROOT_NODE)
        return 0;
}

function InitClass(Engine)
{
    
    Engine.LoaderTask = [];
    
    Engine.AddNewLoaderTask = function ()
    {
        var StartNum = Engine.GetMaxNumBlockDB();
        var EndNum = Engine.GetCurrentBlockNumByTime();
        var DeltaNum = EndNum - StartNum;
        if(DeltaNum >= DELTA_FOR_LOAD)
        {
        }
    };
    
    Engine.LOADBLOCK_SEND = {BlockNum:"uint32", Hash:"zhash", IncludeBody:"byte", };
    Engine.LOADBLOCK_RET = {result:"byte", Arr:[{BlockNum:"uint32", PrevSumPow:"uint", LinkSumHash:"hash", SysTreeHash:"zhash",
            TreeHash:"zhash", MinerHash:"hash", ArrFull:[{body:"tr"}], }], };
    Engine.LOADBLOCK = function (Child,Data)
    {
        if(!Data)
            return;
    };
}
