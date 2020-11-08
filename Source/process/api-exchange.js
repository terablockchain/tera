/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


const crypto = require('crypto');


WebApi2.GenerateKeys = function (Params)
{
    var KeyPair = crypto.createECDH('secp256k1');
    var PrivKey = sha3(crypto.randomBytes(32));
    KeyPair.setPrivateKey(Buffer.from(PrivKey));
    var PubKey = KeyPair.getPublicKey('', 'compressed');
    
    return {result:1, PrivKey:GetHexFromArr(PrivKey), PubKey:GetHexFromArr(PubKey), Meta:Params ? Params.Meta : undefined};
}

WebApi2.CreateAccount = function (Params,response)
{
    if(typeof Params === "object" && Params.Name && Params.PrivKey)
    {
        var KeyPair = crypto.createECDH('secp256k1');
        KeyPair.setPrivateKey(Buffer.from(GetArrFromHex(Params.PrivKey)));
        var PubKey = KeyPair.getPublicKey('', 'compressed');
        var TR = {Type:TYPE_TRANSACTION_CREATE, Currency:Params.Currency, PubKey:PubKey, Name:Params.Name, Smart:Params.Smart, };
        var Body = BufLib.GetBufferFromObject(TR, FORMAT_CREATE, 1000, {}, 1);
        Body = Body.slice(0, Body.len + 12);
        
        if(Params.Confirm === undefined)
            Params.Confirm = 8;
        
        var Confirm = ParseNum(Params.Confirm);
        
        SendTransaction(Body, TR, Confirm, function (result,text)
        {
            var Result = {result:result, text:text, TxID:TR._TxID, BlockNum:TR._BlockNum, Meta:Params.Meta, };
            if(typeof Params.F === "function")
                Params.F(Result);
            if(!Confirm || !result)
            {
                response.end(JSON.stringify(Result));
            }
            else
            {
                var DeltaTime = Confirm * global.CONSENSUS_PERIOD_TIME;
                setTimeout(function ()
                {
                    var RetFind = GetTransactionByID(Result);
                    
                    if(RetFind.result)
                        response.end(JSON.stringify(Result));
                    else
                        response.end(JSON.stringify({result:0, Meta:Params.Meta}));
                }, DeltaTime);
            }
        });
        
        return null;
    }
    
    return {result:0, Meta:Params ? Params.Meta : undefined};
}


var MapSendID = {};
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
    
    if(Params.Confirm === undefined)
        Params.Confirm = 8;
    
    var Confirm = ParseNum(Params.Confirm);
    
    var ToPubKeyArr = [];
    var ToID = 0;
    if(typeof Params.ToID === "string" && Params.ToID.length === 66)
        ToPubKeyArr = GetArrFromHex(Params.ToID);
    else
        ToID = ParseNum(Params.ToID);
    
    var DataFrom = ACCOUNTS.ReadState(FromNum);
    if(!DataFrom)
        return {result:0, Meta:Params.Meta, text:"Error read account: " + FromNum};
    
    var OperationID;
    if(!MapSendID[FromNum])
    {
        OperationID = DataFrom.Value.OperationID + 10;
        MapSendID[FromNum] = {};
    }
    else
    {
        OperationID = MapSendID[FromNum].OperationID;
        if((new Date() - MapSendID[FromNum].Date) > 8 * 1000)
        {
            OperationID += 20;
        }
        OperationID = Math.max(DataFrom.Value.OperationID, OperationID);
    }
    OperationID++;
    MapSendID[FromNum].OperationID = OperationID;
    MapSendID[FromNum].Date = Date.now();
    
    var TR = {Type:111, Version:4, OperationID:OperationID, FromID:FromNum, Old:0, To:[{PubKey:ToPubKeyArr, ID:ToID, SumCOIN:Coin.SumCOIN,
            SumCENT:Coin.SumCENT}], Description:Params.Description, Body:[], };
    
    if(nJsonRet === 1)
        return {result:1, Tx:TR};
    
    if(!Params.FromPrivKey)
        return {result:0, Meta:Params.Meta, text:"Params.FromPrivKey required"};
    TR.Sign = ACCOUNTS.GetSignTransferTx(TR, GetArrFromHex(Params.FromPrivKey));
    
    var Body = BufLib.GetBufferFromObject(TR, FORMAT_MONEY_TRANSFER3, GetTxSize(TR), {}, 1);
    Body = Body.slice(0, Body.len + 12);
    
    if(nJsonRet === 2)
    {
        PrepareTxID(TR, Body);
        return {result:1, Tx:TR, Body:Body};
    }
    
    SendTransaction(Body, TR, Confirm, function (result,text)
    {
        var TxID = TR._TxID;
        var Result = {result:result, text:text, TxID:TxID, BlockNum:TR._BlockNum, Meta:Params.Meta, };
        if(typeof Params.F === "function")
            Params.F(Result);
        if(!Confirm || !result)
        {
            response.end(JSON.stringify(Result));
        }
        else
        {
            var DeltaTime = Confirm * global.CONSENSUS_PERIOD_TIME;
            setTimeout(function ()
            {
                var RetFind = GetTransactionByID(Result);
                
                if(RetFind.result)
                    response.end(JSON.stringify(Result));
                else
                    response.end(JSON.stringify({result:0, Meta:Params.Meta}));
            }, DeltaTime);
        }
    });
    
    return null;
}

WebApi2.GetBalance = function (Params,response)
{
    if(typeof Params === "object")
    {
        var arr = ACCOUNTS.GetRowsAccounts(ParseNum(Params.AccountID), 1);
        if(arr.length)
        {
            var Account = arr[0];
            var Value = Account.Value;
            var Result = {result:1, SumCOIN:Value.SumCOIN, SumCENT:Value.SumCENT, Currency:Account.Currency, PubKey:GetHexFromArr(Account.PubKey),
                Meta:Params.Meta, };
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
        
        SendTransaction(Body, TR, Params.Wait, function (result,text)
        {
            var Result = {result:result, text:text, TxID:TR._TxID, BlockNum:TR._BlockNum, Meta:Params.Meta, };
            
            var Str = JSON.stringify(Result);
            response.end(Str);
        });
        
        return null;
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

function SendTransaction(Body,TR,Wait,F)
{
    if(Body.length > 16000)
    {
        TR._result = 0;
        TR._text = "Error length transaction =" + Body.length + " (max size=16000)";
        F(1, TR, Body);
        return;
    }
    
    if(!global.GlobalRunID)
    {
        global.GlobalRunID = 1e9;
        global.GlobalRunMap = {};
    }
    
    global.GlobalRunID++;
    let WebID = global.GlobalRunID;
    let FCALLBACK = F;
    
    var Params = {WebID:WebID, HexValue:GetHexFromArr(Body)};
    if(!process.RunRPC)
    {
        var Data = AddTransactionFromWeb(Params);
        DoResult(0, Data);
    }
    else
    {
        process.RunRPC("AddTransactionFromWeb", Params, DoResult);
    }
    
    function DoResult(Err,Data)
    {
        var Result = Data.Result;
        var text = TR_MAP_RESULT[Result];
        
        if(Data._TxID)
            TR._TxID = Data._TxID;
        if(Data._BlockNum)
            TR._BlockNum = Data._BlockNum;
        TR._result = (Result > 0) ? 1 : 0;
        TR._text = text;
        
        if(Wait && TR._result)
        {
            global.GlobalRunMap[WebID] = FCALLBACK;
        }
        else
        {
            F(TR._result, text);
        }
    };
}
