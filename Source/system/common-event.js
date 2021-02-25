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

var CurTrackItem;
var CurTxKey;
function SetCurTrackItem(HASH)
{
    var StrHex = GetHexFromArr(HASH);
    CurTxKey = StrHex;
    
    if(global.TreeFindTX)
    {
        CurTrackItem = global.TreeFindTX.LoadValue(StrHex);
    }
    else
    {
        CurTrackItem = undefined;
    }
}

function SendUserEvent(Obj)
{
    if(CurTrackItem && typeof Obj === "string")
        SendTrack(Obj, 2);
    
    if(global.DebugEvent)
        DebugEvent(Obj);
}

function SendTrackResult(Block,TxNum,Body,SetResult,Result)
{
    if(!CurTrackItem)
        return;
    
    var ResultStr = SetResult;
    if(SetResult)
    {
        var type = Body[0];
        ResultStr = "Add to blockchain on Block " + Block.BlockNum;
        if(type === global.TYPE_TRANSACTION_FILE)
            ResultStr += ": file/" + Block.BlockNum + "/" + TxNum;
    }
    else
    {
        ResultStr = Result;
    }
    
    SendTrack(ResultStr, SetResult ? 1 :  - 1);
}

function SendTrack(Str,bFinal)
{
    if(!CurTrackItem)
        return;
    
    CurTrackItem.cmd = "RetFindTX";
    CurTrackItem.ResultStr = Str;
    CurTrackItem.bFinal = bFinal;
    CurTrackItem.Result = Str;
    
    process.send(CurTrackItem);
}

global.GetCurTxKey = function ()
{
    return CurTxKey;
}

global.SendUserEvent = SendUserEvent;
global.SetCurTrackItem = SetCurTrackItem;
global.SendTrackResult = SendTrackResult;
