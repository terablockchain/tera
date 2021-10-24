/*
 * @project: TERA
 * @version: 2
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

"use strict";

const crypto = require('crypto');


WebApi2.GenerateKeys = function (Params)
{
    var KeyPair = crypto.createECDH('secp256k1');
    var PrivKey = sha3(crypto.randomBytes(32));
    KeyPair.setPrivateKey(Buffer.from(PrivKey));
    var PubKey = KeyPair.getPublicKey('', 'compressed');
    
    return {result:1, PrivKey:GetHexFromArr(PrivKey), PubKey:GetHexFromArr(PubKey), Meta:Params ? Params.Meta : undefined};
};

WebApi2.CreateAccount = function (Params,response)
{
    if(typeof Params === "object" && Params.Name && Params.PrivKey)
    {
        var KeyPair = crypto.createECDH('secp256k1');
        KeyPair.setPrivateKey(Buffer.from(GetArrFromHex(Params.PrivKey)));
        var PubKey = KeyPair.getPublicKey('', 'compressed');
        var TR = {Type:TYPE_TRANSACTION_CREATE, Currency:Params.Currency, PubKey:PubKey, Name:Params.Name, Smart:Params.Smart, };
        var Body = BufLib.GetBufferFromObject(TR, FORMAT_ACC_CREATE, 1000, {}, 1);
        Body = Body.slice(0, Body.len + 12);
        
        return SendTransactionAndResponce(Params, Body, TR, response);
    }
    
    return {result:0, Meta:Params ? Params.Meta : undefined};
};


var MapSendID = {};
function PrepareOperationID(Params,FromNum)
{
    var OperationID;
    var DataFrom = ACCOUNTS.ReadState(FromNum);
    if(!DataFrom)
        return {result:0, Meta:Params.Meta, text:"Error read account: " + FromNum};

    var Item=MapSendID[FromNum];
    if(!Item)
    {
        OperationID = DataFrom.Value.OperationID + 10;
        Item={};
        MapSendID[FromNum] = Item;
    }
    else
    {
        OperationID = Item.OperationID;
        if((Date.now() - Item.Date) > 8 * 1000)
        {
            OperationID += 20;
        }
        OperationID = Math.max(DataFrom.Value.OperationID, OperationID);
    }
    OperationID++;
    Item.Currency=DataFrom.Currency;
    Item.OperationID = OperationID;
    Item.Date = Date.now();

    return OperationID;
}


WebApi2.Send = function (Params,response,A,request,nJsonRet)
{
    if(typeof Params !== "object")
        return {result:0};

    var Coin;
    if(typeof Params.Amount === "number")
        Coin = COIN_FROM_FLOAT2(Params.Amount);
    else
        Coin = Params.Amount;

    var FromNum = ParseNum(Params.FromID);

    if(!Coin)
        return {result:0, Meta:Params.Meta, text:"Params.Amount required"};
    if(!FromNum)
        return {result:0, Meta:Params.Meta, text:"Params.FromID required"};
    if(!Params.ToID)
        return {result:0, Meta:Params.Meta, text:"Params.ToID required"};

    var ToPubKeyArr = [];
    var ToID = ParseNum(Params.ToID);
    // if(typeof Params.ToID === "string" && Params.ToID.length === 66)
    //     ToPubKeyArr = GetArrFromHex(Params.ToID);
    // else
    //     ToID = ParseNum(Params.ToID);


    var OperationID=PrepareOperationID(Params,FromNum);
    if(typeof OperationID==="object")//error
        return  OperationID;

    var TR,Format;
    var CurBlockNum=GetCurrentBlockNumByTime();
    var BVersion=GETVERSION(CurBlockNum);
    if(BVersion<2)
    {
        Format=FORMAT_MONEY_TRANSFER3;
        TR = {
            Type: TYPE_TRANSACTION_TRANSFER3, Version: 4, OperationID: OperationID, FromID: FromNum, DeprecatedOperationID: global.START_CODE_VERSION_NUM, To: [{
                PubKey: ToPubKeyArr, ID: ToID, SumCOIN: Coin.SumCOIN,
                SumCENT: Coin.SumCENT
            }], Description: Params.Description, Body: [],
        };
    }
    else
    {
        Format=FORMAT_MONEY_TRANSFER5;
        TR = {
            Type: TYPE_TRANSACTION_TRANSFER5,
            Version: 4,
            OperationID: OperationID,
            FromID: FromNum,
            TxTicks:Params.TxTicks?Params.TxTicks:35000,
            TxMaxBlock:Params.TxMaxBlock?Params.TxMaxBlock:CurBlockNum+120,
            ToID:ToID,
            Amount:Coin,
            Currency:Params.Currency,
            TokenID:Params.TokenID,
            Description: Params.Description,
            CodeVer:global.START_CODE_VERSION_NUM,
            Body: [],
            Sign: [],
        };

        var Data=MapSendID[FromNum];
        if(Data && Data.Currency==Params.Currency)//if tokengenerate mode
        {
            TR.Currency=0;
            TR.TokenID="";
        }


    }

    if(nJsonRet === 1)
        return {result:1, Tx:TR};

    if(!Params.FromPrivKey)
        return {result:0, Meta:Params.Meta, text:"Params.FromPrivKey required"};
    TR.Sign = ACCOUNTS.GetSignTransferTx(TR, GetArrFromHex(Params.FromPrivKey));


    var Body = BufLib.GetBufferFromObject(TR, Format, GetTxSize(TR), {}, 1);
    Body = Body.slice(0, Body.len + 12);

    if(nJsonRet === 2)
    {
        PrepareTxID(TR, Body);
        return {result:1, Tx:TR, Body:Body};
    }

    return SendTransactionAndResponce(Params, Body, TR, response);
};

// function TokenProcessing(Params,response,request)
// {
//     if(typeof Params !== "object")
//         return {result:0};
//     var Arr=["FromID","ToID","Token","TokenID","Amount","FromPrivKey"];
//     for(var i=0;i<Arr.length;i++)
//         if(!Params[Arr[i]])
//             return {result:0, Meta:Params.Meta, text:"Params."+Arr[i]+" required"};
//
//     Params.ToID = global.COIN_STORE_NUM;
//     Params.MethodName="Call";
//     return  WebApi2.SendCall(Params,response,undefined,request);
// }
//
// WebApi2.SendToken = function (Params,response,A,request)
// {
//     if(typeof Params !== "object")
//         return {result:0};
//     Params.Params=
//         {
//             cmd:"Transfer",
//             Token:Params.Token,
//             ID:Params.TokenID,
//             To:ParseNum(Params.ToID),
//             Amount:ParseNum(Params.Amount),
//             Description:Params.Description,
//         };
//
//     return TokenProcessing(Params,response,request);
// }

// WebApi2.SendTokenMint = function (Params,response,A,request)
// {
//     if(typeof Params !== "object")
//         return {result:0};
//     var MParams=
//         {
//             cmd:typeof Params.TokenID==="object"?"MintNFT":"Mint",
//             Account:ParseNum(Params.ToID),
//             Token:Params.Token,
//             Amount:ParseNum(Params.Amount),
//         };
//
//     if(MParams.cmd==="MintNFT")
//     {
//         CopyObjKeys(MParams,Params.TokenID);
//         Params.TokenID=1;//not required
//     }
//     else
//     {
//         MParams.ID=Params.TokenID;
//     }
//
//     Params.Params=MParams;
//
//     return TokenProcessing(Params,response,request);
// }
// WebApi2.SendTokenBurn = function (Params,response,A,request)
// {
//     if(typeof Params !== "object")
//         return {result:0};
//     Params.Params=
//         {
//             cmd:"Burn",
//             Token:Params.Token,
//             ID:Params.TokenID,
//             Amount:ParseNum(Params.Amount),
//         };
//     Params.ToID=1;//not required
//     return TokenProcessing(Params,response,request);
// }


WebApi2.SendCall = function (Params,response,A,request)
{
    if(typeof Params !== "object")
        return {result:0};
    var Arr=["ToID","FromPrivKey","MethodName","Params"];
    for(var i=0;i<Arr.length;i++)
        if(!Params[Arr[i]])
            return {result:0, Meta:Params.Meta, text:"Params."+Arr[i]+" required"};

    var ToNum = ParseNum(Params.ToID);
    var FromNum = ParseNum(Params.FromID);
    var OperationID=PrepareOperationID(Params,FromNum);
    if(typeof OperationID==="object")//error
        return  OperationID;

    if(typeof Params.ParamsArr!=="object")
        Params.ParamsArr=[];
    var TR = {Type:135, Account: ToNum, MethodName:Params.MethodName, Params:JSON.stringify(Params.Params), FromNum:FromNum, OperationID:OperationID, Version:4, ParamsArr:Params.ParamsArr};
    TR.Sign = SMARTS.GetSignTransferTx(TR, GetArrFromHex(Params.FromPrivKey));
    var Body = BufLib.GetBufferFromObject(TR, FORMAT_SMART_RUN1, GetTxSize(TR), {} ,1);
    Body = Body.slice(0, Body.len + 12);

    return SendTransactionAndResponce(Params, Body, TR, response);
}






WebApi2.GetBalance = function (Params,response)
{
    if(typeof Params === "object")
    {
        var AccountID=parseInt(Params.AccountID);
        var Currency=parseInt(Params.Currency);
        var ID=Params.ID;

        if(Currency && !Params.GetArr)
        {
            var Value = ACCOUNTS.GetBalance(AccountID,Currency,ID);
            Value.result=1;
            Value.AccountID=AccountID;
            Value.Meta=Params.Meta;
            return Value;
        }

        var arr = ACCOUNTS.GetRowsAccounts(AccountID, 1,0,0,Params.GetArr);
        if(arr.length)
        {
            var Account = arr[0];
            var Value = Account.Value;
            var Result;
            if(Params.GetArr)
            {
                Result = {result: 1, Meta: Params.Meta, Arr:Account.BalanceArr};
                //console.log("Account:",Account);
            }
            else
            {
                Result = {
                    result: 1,
                    AccountID:AccountID,
                    SumCOIN: Value.SumCOIN,
                    SumCENT: Value.SumCENT,
                    Currency: Account.Currency,
                    PubKey: GetHexFromArr(Account.PubKey),
                    Meta: Params.Meta
                };
            }


            return Result;
        }
    }
    
    return {result:0, Meta:Params ? Params.Meta : undefined};
}



WebApi2.GetTransaction = function (Params)
{
    
    if(typeof Params === "object" && Params.TxID)
    {
        return GetTransactionByID(Params);
    }
    else
    {
        if(typeof Params === "object" && Params.BlockNum && Params.TrNum !== undefined)
        {
            var Block = SERVER.ReadBlockDB(Params.BlockNum);
            if(Block && Block.arrContent)
            {
                var Body = Block.arrContent[Params.TrNum];
                if(Body)
                {
                    return GetTransactionFromBody(Params, Block, Params.TrNum, Body);
                }
            }
        }
    }
    
    return {result:0, Meta:Params ? Params.Meta : undefined};
}

WebApi2.GetHistoryTransactions = function (Params)
{
    if(typeof Params === "object" && Params.AccountID)
    {
        if(!Params.Count)
            Params.Count = 100;
        if(Params.Confirm === undefined)
            Params.Confirm = 8;
        var arr = ACCOUNTS.GetHistory(Params.AccountID, Params.Count, Params.NextPos, Params.Confirm);
        if(Params.GetTxID || Params.GetDescription)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var Item = arr[i];
                var Block = SERVER.ReadBlockDB(Item.BlockNum);
                if(!Block || (!Block.arrContent))
                    continue;
                var Body = Block.arrContent[Item.TrNum];
                if(!Body)
                    continue;
                if(Params.GetTxID)
                {
                    Item.TxID = GetHexFromArr(GetTxID(Item.BlockNum, Body));
                }
                if(Params.GetDescription && Item.Description === undefined)
                {
                    var TR = ACCOUNTS.GetObjectTransaction(Body);
                    if(TR)
                    {
                        Item.Description = TR.Description;
                    }
                }
            }
        }
        
        var Result = {result:arr.length > 0 ? 1 : 0, History:arr, Tail:ACCOUNTS.DBStateHistory.Read(Params.AccountID), Meta:Params ? Params.Meta : undefined};
        return Result;
    }
    
    return {result:0, Meta:Params ? Params.Meta : undefined};
}

WebApi2.CreateRawTransaction = function (Params)
{
    if(typeof Params === "object")
    {
        var Ret = WebApi2.Send(Params, undefined, undefined, undefined, 1);
        
        TxArrToHex(Ret.Tx);
        Ret.Meta = Params.Meta;
        return Ret;
    }
    return {result:0, Meta:Params ? Params.Meta : undefined};
}

WebApi2.SignRawTransaction = function (Params)
{
    if(typeof Params === "object" && Params.Tx)
    {
        
        if(!Params.FromPrivKey)
            return {result:0, Meta:Params.Meta, text:"Params.FromPrivKey required"};
        if(typeof Params.Tx !== "object")
            return {result:0, Meta:Params.Meta, text:"Params.Tx required"};
        if(!Params.Tx.To || !Params.Tx.To.length)
            return {result:0, Meta:Params.Meta, text:"Params.Tx.To required"};
        
        var TR = Params.Tx;
        TxHexToArr(TR);
        TR.Sign = ACCOUNTS.GetSignTransferTx(TR, GetArrFromHex(Params.FromPrivKey));
        TxArrToHex(TR);
        
        var Ret = {result:1, Tx:TR, Meta:Params ? Params.Meta : undefined};
        return Ret;
    }
    return {result:0, Meta:Params ? Params.Meta : undefined};
}

WebApi2.SendRawTransaction = function (Params,response)
{
    if(typeof Params === "object" && Params.Tx)
    {
        if(typeof Params.Tx !== "object")
            return {result:0, Meta:Params.Meta, text:"Params.Tx required"};
        if(!Params.Tx.To || !Params.Tx.To.length)
            return {result:0, Meta:Params.Meta, text:"Params.Tx.To required"};
        if(!Params.Tx.Sign)
            return {result:0, Meta:Params.Meta, text:"Params.Tx.Sign required"};
        
        var TR = Params.Tx;
        TxHexToArr(TR);
        var Body = BufLib.GetBufferFromObject(TR, FORMAT_MONEY_TRANSFER3, GetTxSize(TR), {}, 1);
        Body = Body.slice(0, Body.len + 12);
        
        return SendTransactionAndResponce(Params, Body, TR, response);
    }
    return {result:0, Meta:Params ? Params.Meta : undefined};
}

function TxArrToHex(TR)
{
    if(TR && TR.To && TR.To[0].PubKey)
    {
        if(TR.To[0].PubKey.length)
            TR.To[0].PubKey = GetHexFromArr(TR.To[0].PubKey);
        else
            TR.To[0].PubKey = "";
        if(TR.Sign && TR.Sign.length)
            TR.Sign = GetHexFromArr(TR.Sign);
        else
            TR.Sign = "";
        TR.Body = undefined;
        TR.Reserve = undefined;
    }
}
function TxHexToArr(TR)
{
    TR.Body = [];
    if(TR.Sign && TR.Sign.length)
        TR.Sign = GetArrFromHex(TR.Sign);
    else
        TR.Sign = [];
    
    for(var i = 0; i < TR.To.length; i++)
    {
        TR.To[i].PubKey = GetArrFromHex(TR.To[i].PubKey);
    }
}

function GetBlockNumTr(arr)
{
    var BlockNum = GetCurrentBlockNumByTime(0);
    return BlockNum;
}

function PrepareTxID(TR,arr)
{
    var BlockNum = GetBlockNumTr(arr);
    var TxID = CreateTxID(arr.slice(0, arr.length - 12), BlockNum);
    TR._TxID = GetHexFromArr(TxID);
    TR._BlockNum = BlockNum;
    return 0;
}

function SendTransaction(Body,TR,Confirm,F)
{
    var Params = {HexValue:GetHexFromArr(Body),Confirm:Confirm,F:1};
    if(process.RunRPC)
    {
        process.RunRPC("AddTransactionFromWeb", Params, F);
    }
    else
    {
        AddTransactionFromWeb(Params,F);
    }
}

function SendTransactionAndResponce(Params,Body,TR,response)
{
    if(Body.length > 64000)
    {
        TR._result = 0;
        TR._text = "Error length transaction =" + Body.length;

        return {result:0, Meta:Params ? Params.Meta : undefined, text:TR._text};
    }


    if(Params.Confirm === undefined)
        Params.Confirm = 8;

    SendTransaction(Body, TR, ParseNum(Params.Confirm), function (Err,Data)//(result,text)
    {

        //console.log("=Data=",JSON.stringify(Data,"",4))
        if(Data._TxID)
            TR._TxID = Data._TxID;
        if(Data._BlockNum)
            TR._BlockNum = Data._BlockNum;

        TR._text = Data.text;
        TR._result = Data.result;

        var Result = {result:Data.result, text:Data.text, TxID:TR._TxID, BlockNum:Data.BlockNum?Data.BlockNum:TR._BlockNum,TrNum:Data.TrNum, Meta:Params.Meta};
        if(typeof Params.F === "function")
            Params.F(Result);

        response.end(JSON.stringify(Result));
    });
    
    return null;
}

