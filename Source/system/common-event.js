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

function SendUserEvent(Obj,Mode,Smart,BlockNum,TrNum)
{
    if(Mode==="History" && typeof Obj === "object" && Smart===global.COIN_SMART_NUM)
    {
        if(typeof Obj === "object")
        {
            var Data = Obj;
            var Amount=Data.Amount;
            if(typeof Amount==="number")
                Amount=COIN_FROM_FLOAT2(Amount);
            //console.log(Amount);

            var HistoryObj = {
                BlockNum: BlockNum,
                TrNum: TrNum,

                Token: Data.Token,
                ID: Data.ID,

                SumCOIN: Amount.SumCOIN,
                SumCENT: Amount.SumCENT,
                Description: Data.Description,

                SmartMode: 3
            };

            HistoryObj.Direct = "-";
            HistoryObj.CorrID = Data.To;
            if(Data.From)
                ACCOUNTS.WriteHistoryTR(Data.From, HistoryObj);

            HistoryObj.Direct = "+";
            HistoryObj.CorrID = Data.From;
            if(Data.To)
                ACCOUNTS.WriteHistoryTR(Data.To, HistoryObj);

            return;
        }
        ToLog("Error type history obj in Block="+Obj.BlockNum,3);
    }


    if(CurTrackItem && typeof Obj === "string")
        SendTrack(BlockNum,TrNum,1, Obj, 2, 1);
    if(global.DebugEvent)
        DebugEvent(Obj,BlockNum,TrNum);


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
        if(typeof Result==="object")
        {
            if(Result.message)
                ResultStr=Result.message;
            else
                ResultStr=JSON.stringify(Result);

        }
        else
            ResultStr = Result;
    }
    
    SendTrack(Block.BlockNum,TxNum,SetResult, ResultStr, SetResult ? 1 :  - 1);
}

function SendTrack(BlockNum,TrNum,Result,Str,bFinal,bEvent)
{
    //console.log("CurTrackItem:"+CurTrackItem,"Str="+Str)
    //console.log(Result,Str);
    if(!CurTrackItem)
        return;


    CurTrackItem.ResultStr = Str;
    CurTrackItem.bFinal = bFinal;
    CurTrackItem.Result = Result;
    CurTrackItem.bEvent = bEvent;
    CurTrackItem.BlockNum = BlockNum;
    CurTrackItem.TrNum = TrNum;


    var msg=CopyObjKeys({},CurTrackItem);
    delete msg.F;

    if(bEvent || !CurTrackItem.F)
    {
        //это чтобы ходили события в кошелек (не только дапп)
        msg.cmd = "WalletEvent";
        process.send(msg);
    }
    else
    {
        CurTrackItem.F(0,msg);
    }


    //msg.cmd = "retcall";
    // var F=CurTrackItem.F;
    // if(F)
    // {
    //     delete CurTrackItem.F;
    //     F(0,CurTrackItem);
    // }
    // else
    // {
    //     // CurTrackItem.cmd = "RetFindTX";
    //     // process.send(CurTrackItem);
    // }
}

global.GetCurTxKey = function ()
{
    return CurTxKey;
};

global.SendUserEvent = SendUserEvent;
global.SetCurTrackItem = SetCurTrackItem;
global.SendTrackResult = SendTrackResult;
