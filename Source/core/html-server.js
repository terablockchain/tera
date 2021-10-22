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


require("./crypto-library");
require("./log.js");

const crypto = require('crypto');
const os = require('os');

const http = require('http'), net = require('net'), url = require('url'), fs = require('fs'), querystring = require('querystring');

const zlib = require('zlib');


var ContenTypeMap = {};
ContenTypeMap["js"] = "application/javascript";
ContenTypeMap["css"] = "text/css";
ContenTypeMap["wav"] = "audio/wav";
ContenTypeMap["mp3"] = "audio/mpeg";
ContenTypeMap["mp4"] = "video/mp4";
ContenTypeMap["ico"] = "image/vnd.microsoft.icon";
ContenTypeMap["jpg"] = "image/jpeg";
ContenTypeMap["png"] = "image/png";
ContenTypeMap["gif"] = "image/gif";
ContenTypeMap["html"] = "text/html";
ContenTypeMap["txt"] = "text/plain";
ContenTypeMap["csv"] = "text/csv";
ContenTypeMap["svg"] = "image/svg+xml";


ContenTypeMap["zip"] = "application/zip";
ContenTypeMap["pdf"] = "application/pdf";
ContenTypeMap["exe"] = "application/octet-stream";
ContenTypeMap["msi"] = "application/octet-stream";
ContenTypeMap["woff"] = "application/font-woff";
ContenTypeMap["psd"] = "application/octet-stream";

ContenTypeMap["wasm"] = "application/wasm";

var DefaultContentType = "application/octet-stream";


var CacheMap = {};
CacheMap["sha3.js"] = 1000000;
CacheMap["sign-lib-min.js"] = 1000000;
CacheMap["marked.js"] = 1000000;
CacheMap["highlight.js"] = 1000000;
CacheMap["highlight-html.js"] = 1000000;
CacheMap["highlight-js.js"] = 1000000;

var AllowArr = ["text/javascript", "application/javascript", "application/json", "application/octet-stream", "application/font-woff",
    "text/css", "audio/wav", "audio/mpeg", "image/vnd.microsoft.icon", "image/jpeg", "image/png", "image/gif", "text/plain", "text/csv",
    "image/x-icon"];

var AllowMap = {};
for(var i = 0; i < AllowArr.length; i++)
    AllowMap[AllowArr[i]] = 1;

if(!global.WebApi2)
    global.WebApi2 = {};
global.HTTPCaller = {};
function DoCommand(request,response,Type,Path,params,remoteAddress)
{
    var Caller = HTTPCaller;
    var Method = params[0];

    var Path2 = Path;
    if(Path2.substring(0, 1) === "/")
        Path2 = Path2.substring(1);
    var ArrPath = Path2.split('/', 5);

    //console.log(ArrPath,Path);

    var APIv2 = 0;
    if(ArrPath[0] === "api")
    {
        if(ArrPath[1] === "v2")
        {
            APIv2 = 1;
            Caller = WebApi2;
        }
        Method = ArrPath[2];
        //console.log(Method,"PATH:", Path);
    }

    var F = Caller[Method];
    if(F)
    {
        if(Type !== "POST")
        {
            response.end();
            return;
        }


        var Headers = {'Content-Type':'text/plain'};

        var Ret = F(params[1], response);
        if(Ret === null)
        {
            response.writeHead(200, Headers);
            return;
        }

        try
        {
            var Str = JSON.stringify(Ret);
            SendGZipData(request, response, Headers, Str);
        }
        catch(e)
        {
            ToLog("ERR PATH:" + Path);
            ToLog(e);
            response.end();
        }
        return;
    }

    var method = params[0];
    method = method.toLowerCase();
    if(method === "dapp" && params.length === 2)
        method = "DappTemplateFile";

    var LongTime = undefined;
    switch(method)
    {
        case "":
            SendWebFile(request, response, "./HTML/wallet.html");
            break;

        case "file":
            SendBlockFile(request, response, params[1], params[2]);
            break;

        case "nft":
            SendNFTFile(request, response, params[1]);
            break;

        case "DappTemplateFile":
            DappTemplateFile(request, response, params[1]);
            break;
        case "smart":
            DappSmartCodeFile(response, params[1]);
            break;
        case "account":
            DappAccount(response, params[1]);
            break;
        case "client":
            DappClientCodeFile(response, params[1]);
            break;
        case "tx":
            DoGetTransactionByID(response, {TxID:params[1]});
            break;

        default:
        {
            if(Path.indexOf(".") ===  - 1)
                ToError("Error path:" + Path + "  remoteAddress=" + remoteAddress);

            var path = params[params.length - 1];
            if(typeof path !== "string")
                path = "ErrorPath";
            else
            if(Path.indexOf("..") >= 0 || path.indexOf("\\") >= 0 || path.indexOf("/") >= 0)
                path = "ErrorFilePath";

            if(path.indexOf(".") < 0)
                path += ".html";

            var type = Path.substr(Path.length - 3, 3);
            switch(type)
            {
                case ".js":
                case "asm":
                    if(params[0] === "HTML" && params[1] === "Ace")
                    {
                        LongTime = 1000000;
                        path = Path;
                    }
                    else
                    if(params[0] === "Ace")
                    {
                        LongTime = 1000000;
                        path = "./HTML/" + Path;
                    }
                    else
                    {
                        path = "./HTML/JS/" + path;
                    }
                    break;
                case "css":
                    path = "./HTML/CSS/" + path;
                    break;
                case "wav":
                case "mp3":
                    path = "./HTML/SOUND/" + path;
                    break;
                case "svg":
                case "png":
                case "gif":
                case "jpg":
                case "ico":
                    path = "./HTML/PIC/" + path;
                    break;

                case "pdf":
                case "zip":
                case "exe":
                case "msi":
                    path = "./HTML/FILES/" + path;
                    break;
                default:
                    path = "./HTML/" + path;
                    break;
            }

            SendWebFile(request, response, path, "", 0, LongTime);
            break;
        }
    }
}



global.DappTemplateFile = DappTemplateFile;
function DappTemplateFile(request,response,StrNum)
{
    var Num = parseInt(StrNum);
    if(Num && Num <= SMARTS.GetMaxNum())
    {
        var Data = SMARTS.ReadSmart(Num);
        if(Data)
        {
            var Headers = {'Content-Type':'text/html', "X-Frame-Options":"sameorigin"};
            var Str = fs.readFileSync("HTML/dapp-frame.html", {encoding:"utf8"});
            Str = Str.replace(/#template-number#/g, Num);
            var StrIcon;
            if(Data.IconBlockNum)
                StrIcon="/file/" + Data.IconBlockNum + "/" + Data.IconTrNum;
            else
                StrIcon="/../Tera.svg";
            Str = Str.replace(/.\/tera.ico/g, StrIcon);

            SendGZipData(request, response, Headers, Str);
            return;
        }
    }

    response.writeHead(404, {'Content-Type':'text/html'});
    response.end();
}

global.DappSmartCodeFile = DappSmartCodeFile;
function DappSmartCodeFile(response,StrNum)
{
    var Num = parseInt(StrNum);
    if(Num && Num <= SMARTS.GetMaxNum())
    {
        var Data = SMARTS.ReadSmart(Num);
        if(Data)
        {
            response.writeHead(200, {'Content-Type':'application/javascript', "Access-Control-Allow-Origin":"*"});
            response.end(Data.Code);
            return;
        }
    }

    response.writeHead(404, {'Content-Type':'text/html'});
    response.end();
}
global.DappClientCodeFile = DappClientCodeFile;
function DappClientCodeFile(response,StrNum)
{
    var Num = parseInt(StrNum);
    if(Num && Num <= SMARTS.GetMaxNum())
    {
        var Data = SMARTS.ReadSmart(Num);
        if(Data)
        {
            response.writeHead(200, {'Content-Type':"text/plain", "X-Content-Type-Options":"nosniff"});
            response.end(Data.HTML);
            return;
        }
    }

    response.writeHead(404, {'Content-Type':'text/html'});
    response.end();
}

HTTPCaller.DappSmartHTMLFile = function (Params)
{
    var Data = SMARTS.ReadSmart(ParseNum(Params.Smart));
    if(Data)
    {
        if(global.DEV_MODE && Params.DebugPath)
        {
            ToLog("Load: " + Params.DebugPath);
            Data.HTML = fs.readFileSync(Params.DebugPath, {encoding:"utf8"});
        }
        return {result:1, Body:Data.HTML};
    }
    return {result:0};
}


global.SendBlockFile = SendBlockFile;
global.SendNFTFile = SendNFTFile;
function SendNFTFile(request,response,StrNum)
{
    var Num;
    if(StrNum && StrNum.length>15)
        Num = +StrNum.substr(StrNum.length-15);
    else
        Num = +StrNum;

    var BlockNum=Math.floor(Num/1000);
    var TrNum=Num%1000;
    //console.log(Num,"->",BlockNum,TrNum);
    return SendBlockFile(request, response, BlockNum, TrNum);
}

function SendBlockFile(request,response,BlockNum,TrNum)
{
    BlockNum = parseInt(BlockNum);
    TrNum = parseInt(TrNum);
    if(BlockNum && BlockNum <= SERVER.GetMaxNumBlockDB() && TrNum <= MAX_TRANSACTION_COUNT)
    {
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(Block && Block.arrContent)
        {
            SendToResponceFile(request, response, Block, TrNum);
            return;
        }
    }
    SendToResponce404(response);
}
function SendToResponceFile(request,response,Block,TrNum)
{

    var Body = Block.arrContent[TrNum];
    if(Body && Body.data)
        Body = Body.data;
    if(Body)
    {
        var Type=Body[0];

        if(Type === global.TYPE_TRANSACTION_FILE
            || Type === global.TYPE_TRANSACTION_SMART_RUN1
            || Type === global.TYPE_TRANSACTION_SMART_RUN2)
        {
            var Headers = {"X-Content-Type-Options":"nosniff"};
            Headers["Access-Control-Allow-Origin"]="*";

            var ContentType,Data;
            var TR = DApps.File.GetObjectTransaction(Body);
            if(Type === global.TYPE_TRANSACTION_FILE)
            {
                ContentType = TR.ContentType;
                Data=TR.Data;
            }
            else
            {
                ContentType = "text/plain";
                Data=TR.Params;
            }


            var StrType = ContentType.toLowerCase();

            if(AllowMap[StrType] || (Block.BlockNum < global.UPDATE_CODE_2 && StrType === "image/svg+xml"))
                Headers['Content-Type'] = ContentType;
            else
                Headers['Content-Type'] = "text/plain";

            SendGZipData(request, response, Headers, Data);
            return;
        }
    }

    SendToResponce404(response);
}

function SendToResponce404(response)
{
    var Headers = {"X-Content-Type-Options":"nosniff"};
    Headers["Access-Control-Allow-Origin"]="*";
    Headers["Content-Type"]="text/html";

    response.writeHead(404, Headers);
    response.end();
}

HTTPCaller.DappBlockFile = function (Params,response)
{
    Params.BlockNum = ParseNum(Params.BlockNum);
    Params.TrNum = ParseNum(Params.TrNum);
    if(!Params.TrNum)
        Params.TrNum = 0;
    if(Params.BlockNum && Params.BlockNum <= SERVER.GetMaxNumBlockDB() && Params.TrNum <= MAX_TRANSACTION_COUNT)
    {
        var Block = SERVER.ReadBlockDB(Params.BlockNum);
        if(Block && Block.arrContent)
        {
            SendToResponceDappFile(response, Block, Params.TrNum);
            return null;
        }
    }
    return {result:0};
}
function SendToResponceDappFile(response,Block,TrNum)
{
    var Result = {result:0};
    var Body = Block.arrContent[TrNum];
    if(Body)
    {

        var Type = Body[0];
        if(Type === global.TYPE_TRANSACTION_FILE)
        {
            var TR = DApps.File.GetObjectTransaction(Body);
            var Str = Buffer.from(TR.Data).toString('utf8');

            Result = {result:1, Type:Type, ContentType:TR.ContentType, Name:TR.Name, Body:Str};
        }
        else
        {
            var App = DAppByType[Type];
            if(App)
            {
                Body = JSON.parse(App.GetScriptTransaction(Body, Block.BlockNum, TrNum));
            }

            Result = {result:1, Type:Type, Body:Body};
        }
    }
    var Str = JSON.stringify(Result);
    response.end(Str);
}
function SendToResponceResult0(response)
{
    if(response)
        response.end("{\"result\":0}");
}

var glBlock0;
HTTPCaller.DappStaticCall = function (Params,response)
{
    var Result = RunStaticSmartMethod(ParseNum(Params.Account), Params.MethodName, Params.Params, Params.ParamsArr);
    var Str = JSON.stringify(Result);
    if(Str.length > 64000)
    {
        return {result:0, RetValue:"Error result length (more 64000)"};
    }

    response.end(Str);
    return null;
};

HTTPCaller.DappInfo = function (Params,responce,ObjectOnly)
{
    var SmartNum = ParseNum(Params.Smart);
    if(global.TX_PROCESS && global.TX_PROCESS.Worker)
        global.TX_PROCESS.Worker.send({cmd:"SetSmartEvent", Smart:SmartNum});

    var Account;
    var Smart = SMARTS.ReadSimple(SmartNum);
    if(Smart)
    {
        delete Smart.HTML;
        delete Smart.Code;

        Account = ACCOUNTS.ReadState(Smart.Account);
        try
        {
            Account.SmartState = BufLib.GetObjectFromBuffer(Account.Value.Data, Smart.StateFormat, {});
            if(typeof Account.SmartState === "object")
                Account.SmartState.Num = Account.Num;
        }
        catch(e)
        {
            if(!Account)
                Account = {};
            Account.SmartState = {};
        }
    }

    DeleteOldEvents(SmartNum);
    var Context = GetUserContext(Params);
    var EArr = GetEventArray(SmartNum, Context);
    var WLData = HTTPCaller.DappWalletList(Params);
    //console.log("WLData.arr=",WLData.arr)

    var ArrLog = [];
    for(var i = 0; i < ArrLogClient.length; i++)
    {
        var Item = ArrLogClient[i];
        if(!Item.final)
            continue;
        if(ArrLog.length > 100)
            break;
        ArrLog.push(Item);
    }

    var Ret = {result:1,
        DELTA_CURRENT_TIME:DELTA_CURRENT_TIME,
        FIRST_TIME_BLOCK:FIRST_TIME_BLOCK,
        UPDATE_CODE_JINN:UPDATE_CODE_JINN,
        CONSENSUS_PERIOD_TIME:CONSENSUS_PERIOD_TIME,
        PRICE_DAO:PRICE_DAO(SERVER.BlockNumDB),
        NEW_SIGN_TIME:NEW_SIGN_TIME,
        Smart:Smart,
        Account:Account,
        NETWORK:global.NETWORK,
        SHARD_NAME:global.SHARD_NAME,
        JINN_MODE:1,
        ArrWallet:WLData.arr,
        ArrEvent:EArr,
        ArrLog:ArrLog,
        COIN_STORE_NUM:global.COIN_STORE_NUM,
        BlockNumDB:SERVER.BlockNumDB,
    };

    if(global.WALLET)
    {
        Ret.WalletIsOpen = (WALLET.WalletOpen !== false);
        Ret.WalletCanSign = (WALLET.WalletOpen !== false && WALLET.KeyPair.WasInit);
        Ret.PubKey = WALLET.KeyPair.PubKeyStr;
    }

    if(!ObjectOnly)
    {
        Ret.CurTime = Date.now();
        Ret.CurBlockNum = GetCurrentBlockNumByTime();
        Ret.MaxAccID = ACCOUNTS.GetMaxAccount();
        Ret.MaxDappsID = SMARTS.GetMaxNum();
    }

    return Ret;
}

HTTPCaller.DappWalletList = function (Params)
{
    var arr0 = ACCOUNTS.GetWalletAccountsByMap(WALLET.AccountMap);
    var arr = [];
    for(var i = 0; i < arr0.length; i++)
    {
        if(Params.AllAccounts || arr0[i].Value.Smart === Params.Smart)
        {
            arr.push(arr0[i]);
        }
    }
    arr=UseRetFieldsArr(arr,Params.Fields);
    //console.log("arr",arr)
    var Ret = {result:1, arr:arr, };
    return Ret;
}

HTTPCaller.DappAccountList = function (Params)
{
    var arr = ACCOUNTS.GetRowsAccounts(Params.StartNum,  + Params.CountNum, undefined, 1,1);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}

global.DappAccount=function(response,StrNum)
{
    var Num = parseInt(StrNum);
    var arr = ACCOUNTS.GetRowsAccounts(Num, 1, undefined, 1,1);
    var Data = {Item:arr[0], result:1};
    response.writeHead(200, {'Content-Type':"text/plain", "X-Content-Type-Options":"nosniff"});
    response.end(JSON.stringify(Data));
}

HTTPCaller.DappSmartList = function (Params)
{
    var arr = SMARTS.GetRows(Params.StartNum,  + Params.CountNum, undefined, undefined, Params.GetAllData, Params.TokenGenerate,
        Params.AllRow);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}
HTTPCaller.DappBlockList = function (Params,response)
{
    Params.Filter = undefined;
    return HTTPCaller.GetBlockList(Params, response, 1);
}
HTTPCaller.DappTransactionList = function (Params,response)
{
    Params.Filter = undefined;
    Params.Param3 = Params.BlockNum;
    return HTTPCaller.GetTransactionAll(Params, response);
}



HTTPCaller.RestartNode = function (Params)
{
    global.RestartNode();
    return {result:1};
}


HTTPCaller.FindMyAccounts = function (Params)
{
    WALLET.FindMyAccounts(1);
    return {result:1};
}

HTTPCaller.GetAccount = function (id)
{
    id = parseInt(id);
    var arr = ACCOUNTS.GetRowsAccounts(id, 1,0,1,1);
    return {Item:arr[0], result:1};
}
HTTPCaller.DappGetBalance = function (Params)
{
    var Account=parseInt(Params.AccountID);
    var Currency=parseInt(Params.Currency);
    var ID=Params.ID;

    var Value = ACCOUNTS.GetBalance(Account,Currency,ID);
    return {Value:Value, result:1};
}




HTTPCaller.GetAccountList = function (Params)
{
    if(!( + Params.CountNum))
        Params.CountNum = 1;

    var arr = ACCOUNTS.GetRowsAccounts(Params.StartNum,  + Params.CountNum, Params.Filter, Params.GetState, Params.GetCoin);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}
HTTPCaller.GetDappList = function (Params)
{
    if(!( + Params.CountNum))
        Params.CountNum = 1;
    var arr = SMARTS.GetRows(Params.StartNum,  + Params.CountNum, Params.Filter, Params.Filter2, 1);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}
HTTPCaller.GetBlockList = function (Params,response,bOnlyNum)
{
    if(!( + Params.CountNum))
        Params.CountNum = 1;

    var arr = SERVER.GetRows(Params.StartNum,  + Params.CountNum, Params.Filter, !bOnlyNum, Params.ChainMode);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}
HTTPCaller.GetTransactionAll = function (Params,response)
{
    if(!( + Params.CountNum))
        Params.CountNum = 1;

    var BlockNum = Params.Param3;
    if(!BlockNum)
        BlockNum = 0;

    var arr = SERVER.GetTrRows(BlockNum, Params.StartNum,  + Params.CountNum, Params.ChainMode, Params.Filter);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}

HTTPCaller.GetActList = function (Params)
{
    return {arr:[], result:1};
}
HTTPCaller.GetJournalList = function (Params)
{
    var arr = JOURNAL_DB.GetScrollList(Params.StartNum,  + Params.CountNum);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}

HTTPCaller.FindJournalByBlockNum = function (Params)
{
    var Num = JOURNAL_DB.FindByBlockNum(Params.BlockNum);
    if(typeof Num === "number")
    {
        return {result:1, Num:Num};
    }
    else
    {
        return {result:0};
    }
}

HTTPCaller.GetCrossOutList = function (Params)
{
    var arr = SHARDS.GetCrossOutList(Params.StartNum,  + Params.CountNum);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}
HTTPCaller.GetCrossInList = function (Params)
{
    var arr = SHARDS.GetCrossInList(Params.StartNum,  + Params.CountNum);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}

HTTPCaller.GetShardList = function (Params)
{
    var arr = SHARDS.GetShardList(Params.StartNum,  + Params.CountNum);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}

HTTPCaller.FindActByBlockNum = function (Params)
{
    var Num = COMMON_ACTS.FindActByBlockNum(Params.BlockNum);
    return {Num:Num, result:1};
}

function FindCrossByBlockNum(FName,Params)
{
    var Item = SHARDS[FName](Params.BlockNum);
    if(Item)
    {
        Item.result = 1;
        return Item;
    }
    else
    {
        return {result:0};
    }
}
HTTPCaller.FindCrossOutByBlockNum = function (Params)
{
    return FindCrossByBlockNum("FindCrossOutByBlockNum", Params);
}
HTTPCaller.FindCrossInByBlockNum = function (Params)
{
    return FindCrossByBlockNum("FindCrossInByBlockNum", Params);
}

HTTPCaller.FindCrossRunByBlockNum = function (Params)
{
    return FindCrossByBlockNum("FindCrossRunByBlockNum", Params);
}

HTTPCaller.GetHashList = function (Params)
{
    var arr = ACCOUNTS.DBAccountsHash.GetRows(Params.StartNum,  + Params.CountNum, Params.Filter);
    for(var i = 0; i < arr.length; i++)
    {
        var item = arr[i];
        item.VerifyHTML = "";
        item.BlockNum = item.Num * PERIOD_ACCOUNT_HASH;
        var Block = SERVER.ReadBlockHeaderDB(item.BlockNum);
        if(Block && Block.MinerHash)
        {
            item.Miner = ACCOUNTS.GetMinerFromBlock(Block);
        }

        var Arr = SERVER.GetTrRows(item.BlockNum, 0, 65535, 0);
        for(var TxNum = 0; TxNum < Arr.length; TxNum++)
        {
            var Tx = Arr[TxNum];
            if(Tx && Tx.Type === global.TYPE_TRANSACTION_ACC_HASH || Tx.Type === TYPE_TRANSACTION_ACC_HASH_OLD)
            {
                item.VerifyHTML = Tx.VerifyHTML;
                break;
            }
        }
    }
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}

HTTPCaller.GetHistoryAct = function (Params)
{
    var arr = WALLET.GetHistory(Params.StartNum,  + Params.CountNum, Params.Filter);
    arr=UseRetFieldsArr(arr,Params.Fields);
    return {arr:arr, result:1};
}

if(!global.CHECK_POINT)
    global.CHECK_POINT = {};


HTTPCaller.GetWalletInfo = function (Params)
{

    var Constants = {};
    for(var i = 0; i < global.CONST_NAME_ARR.length; i++)
    {
        var key = global.CONST_NAME_ARR[i];
        Constants[key] = global[key];
    }

    var MaxHistory = 0;



    var TXBlockNum = COMMON_ACTS.GetLastBlockNumActWithReopen();
    var SysInfo=SYSCORE.GetInfo(SERVER.BlockNumDB);

    var Ret = {
        result:1,
        WalletOpen:WALLET.WalletOpen,
        WalletIsOpen:(WALLET.WalletOpen !== false),
        WalletCanSign:(WALLET.WalletOpen !== false && WALLET.KeyPair.WasInit),
        CODE_VERSION:CODE_VERSION,
        CodeVer:global.START_CODE_VERSION_NUM,
        VersionNum:global.UPDATE_CODE_VERSION_NUM,
        RelayMode:SERVER.RelayMode,
        NodeSyncStatus:SERVER.NodeSyncStatus,
        BlockNumDB:SERVER.BlockNumDB,
        BlockNumDBMin:SERVER.BlockNumDBMin,
        CurBlockNum:GetCurrentBlockNumByTime(),
        CurTime:Date.now(),
        IsDevelopAccount:IsDeveloperAccount(WALLET.PubKeyArr),
        AccountMap:WALLET.AccountMap,
        ArrLog:ArrLogClient,
        MaxAccID:ACCOUNTS.GetMaxAccount(),
        MaxActNum:0,
        MaxJournalNum:JOURNAL_DB.GetMaxNum(),
        MaxDappsID:SMARTS.GetMaxNum(),
        MaxCrossOutNum:SHARDS.GetMaxCrossOutNum(),
        MaxCrossInNum:SHARDS.GetMaxCrossInNum(),
        MaxShardNum:SHARDS.GetMaxShardNum(),
        NeedRestart:global.NeedRestart,
        ip:SERVER.ip,
        port:SERVER.port,
        HistoryMaxNum:MaxHistory,
        DELTA_CURRENT_TIME:DELTA_CURRENT_TIME,
        FIRST_TIME_BLOCK:FIRST_TIME_BLOCK,
        UPDATE_CODE_JINN:UPDATE_CODE_JINN,
        CONSENSUS_PERIOD_TIME:CONSENSUS_PERIOD_TIME,
        NEW_SIGN_TIME:NEW_SIGN_TIME,
        DATA_PATH:(DATA_PATH.substr(1, 1) === ":" ? DATA_PATH : GetNormalPathString(process.cwd() + "/" + DATA_PATH)),
        NodeAddrStr:SERVER.addrStr,
        STAT_MODE:global.STAT_MODE,
        HTTPPort:global.HTTP_PORT_NUMBER,
        HTTPPassword:HTTP_PORT_PASSWORD,
        CONSTANTS:Constants,
        CheckPointBlockNum:CHECK_POINT.BlockNum,
        MiningAccount:GetMiningAccount(),
        CountMiningCPU:GetCountMiningCPU(),
        CountRunCPU:global.ArrMiningWrk.length,
        MiningPaused:global.MiningPaused,
        HashRate:global.GetLastHashRate(),
        BLOCKCHAIN_VERSION:SysInfo.Active,
        PRICE_DAO:SysInfo,//PRICE_DAO(SERVER.BlockNumDB),
        //SYS_CORE:SysInfo,
        //FORMAT_SYS:FORMAT_SYS,
        NWMODE:global.NWMODE,
        PERIOD_ACCOUNT_HASH:PERIOD_ACCOUNT_HASH,
        MAX_ACCOUNT_HASH:ACCOUNTS.DBAccountsHash.GetMaxNum(),
        TXBlockNum:TXBlockNum,
        SpeedSignLib:global.SpeedSignLib,
        NETWORK:global.NETWORK,
        SHARD_NAME:global.SHARD_NAME,
        MaxLogLevel:global.MaxLogLevel,
        JINN_NET_CONSTANT:global.JINN_NET_CONSTANT,
        JINN_MODE:1,
        sessionid:GetSessionId(),
        COIN_STORE_NUM:global.COIN_STORE_NUM,
    };

    if(Params.Account)
        Ret.PrivateKey = GetHexFromArr(WALLET.GetPrivateKey(WALLET.AccountMap[Params.Account]));
    else
        Ret.PrivateKey = GetHexFromArr(WALLET.GetPrivateKey());
    Ret.PublicKey = WALLET.KeyPair.PubKeyStr;

    return Ret;
}
HTTPCaller.GetCurrentInfo = HTTPCaller.GetWalletInfo;

HTTPCaller.TestSignLib = function ()
{
    global.TestSignLib();
}

HTTPCaller.GetWalletAccounts = function ()
{
    var Ret = {result:1, arr:ACCOUNTS.GetWalletAccountsByMap(WALLET.AccountMap), };

    Ret.PrivateKey = WALLET.KeyPair.PrivKeyStr;
    Ret.PublicKey = WALLET.KeyPair.PubKeyStr;

    return Ret;
}
HTTPCaller.SetWalletKey = function (PrivateKeyStr)
{
    WALLET.SetPrivateKey(PrivateKeyStr, true);
    return {result:1};
}

HTTPCaller.SetWalletPasswordNew = function (Password)
{
    WALLET.SetPasswordNew(Password);
    return {result:1};
}
HTTPCaller.OpenWallet = function (Password)
{
    var res = WALLET.OpenWallet(Password);
    return {result:res};
}
HTTPCaller.CloseWallet = function ()
{
    var res = WALLET.CloseWallet();
    return {result:res};
}

HTTPCaller.GetSignTransaction = function (TR)
{
    var Sign = WALLET.GetSignTransaction(TR);
    return {Sign:Sign, result:1};
}
HTTPCaller.GetSignFromHEX = function (Params)
{
    var Arr = GetArrFromHex(Params.Hex);
    //console.log(Params.Account)

    var Sign;
    if(Params.Account)
        Sign = WALLET.GetSignFromArr(Arr, WALLET.AccountMap[Params.Account]);
    else
        Sign = WALLET.GetSignFromArr(Arr);

    return {Sign:Sign, result:1};
}

HTTPCaller.GetSignFromHash = function (Params)
{
    var Sign;
    var Hash = GetArrFromHex(Params.Hash);
    if(Params.Account)
        Sign = WALLET.GetSignFromHash(Hash, WALLET.AccountMap[Params.Account]);
    else
        Sign = WALLET.GetSignFromHash(Hash);

    return {Sign:Sign, result:1};
}

HTTPCaller.SendHexTx = function (Params,response)
{
    if(typeof Params === "object" && typeof Params.Hex === "string")
        Params.Hex += "000000000000000000000000";
    return HTTPCaller.SendTransactionHex(Params,response);
}

HTTPCaller.SendTransactionHex = function (Params,response)
{
    //console.log(JSON.stringify(Params));
    Params.Main=1;
    AddTransactionFromMain(Params,function (Err,Result)
    {
        //console.log(JSON.stringify(Result));
        response.end(JSON.stringify(Result));
    });

    return null;
}

HTTPCaller.SendDirectCode = function (Params,response)
{
    var Result;
    if(Params.TX || Params.WEB || Params.ST)
    {
        var RunProcess;
        if(Params.TX)
            RunProcess = global.TX_PROCESS;
        if(Params.WEB)
            RunProcess = global.WEB_PROCESS;

        if(RunProcess && RunProcess.RunRPC)
        {
            RunProcess.RunRPC("EvalCode", Params.Code, function (Err,Ret)
            {
                Result = {result:!Err, sessionid:GetSessionId(), text:Ret, };
                var Str = JSON.stringify(Result);
                response.end(Str);
            });
            return null;
        }
        else
        {
            Result = "No process for send call";
        }
    }
    else
    {
        try
        {
            Result = eval(Params.Code);
        }
        catch(e)
        {
            Result = "" + e;
        }
    }

    var Struct = {result:1, sessionid:GetSessionId(), text:Result};
    return Struct;
}

HTTPCaller.SetMining = function (MiningAccount)
{
    var Account = parseInt(MiningAccount);
    global.MINING_ACCOUNT = Account;
    SAVE_CONST(1);

    return {result:1};
}

function CheckCorrectDevKey()
{
    if(WALLET.WalletOpen === false)
    {
        var StrErr = "Not open wallet";
        ToLogClient(StrErr);
        return {result:0, text:StrErr};
    }

    if(!IsDeveloperAccount(WALLET.PubKeyArr))
    {
        var StrErr = "Not developer key";
        ToLogClient(StrErr);
        return {result:0, text:StrErr};
    }
    return true;
}



HTTPCaller.SetCheckPoint = function (BlockNum)
{
    var Ret = CheckCorrectDevKey();
    if(Ret !== true)
        return Ret;

    if(!BlockNum)
        BlockNum = SERVER.BlockNumDB;
    else
        BlockNum = parseInt(BlockNum);

    if(SetCheckPointOnBlock(BlockNum))
        return {result:1, text:"Set check point on BlockNum=" + BlockNum};
    else
        return {result:0, text:"Error on check point BlockNum=" + BlockNum};
}
function SetCheckPointOnBlock(BlockNum)
{
    if(WALLET.WalletOpen === false)
        return 0;

    var Block = SERVER.ReadBlockHeaderDB(BlockNum);
    if(!Block)
        return 0;

    var SignArr = arr2(Block.Hash, GetArrFromValue(Block.BlockNum));
    var Sign = secp256k1.sign(SHA3BUF(SignArr, Block.BlockNum), WALLET.KeyPair.getPrivateKey('')).signature;
    global.CHECK_POINT = {BlockNum:BlockNum, Hash:Block.Hash, Sign:Sign};
    SERVER.ResetNextPingAllNode();
    return 1;
}
global.SetCheckPointOnBlock = SetCheckPointOnBlock;

var idSetTimeSetCheckPoint;
HTTPCaller.SetAutoCheckPoint = function (Param)
{
    var Ret = CheckCorrectDevKey();
    if(Ret !== true)
        return Ret;

    if(idSetTimeSetCheckPoint)
        clearInterval(idSetTimeSetCheckPoint);
    idSetTimeSetCheckPoint = undefined;
    if(Param.Set)
        idSetTimeSetCheckPoint = setInterval(RunSetCheckPoint, Param.Period * 1000);

    return {result:1, text:"AutoCheck: " + Param.Set + " each " + Param.Period + " sec"};
}

var SumCheckPow = 0;
var CountCheckPow = 0;
function RunSetCheckPoint()
{
    if(!SERVER.BlockNumDB)
        return;
    if(SERVER.BlockNumDB < 2100000)
        return;
    var Delta = GetCurrentBlockNumByTime() - SERVER.BlockNumDB;
    if(Delta > 16)
        return;

    var BlockNum = SERVER.BlockNumDB - 20;
    var Block = SERVER.ReadBlockHeaderDB(BlockNum);
    if(Block)
    {
        var Power = GetPowPower(Block.PowHash);
        if(Power < 30)
        {
            ToLog("CANNOT SET CHECK POINT Power=" + Power + "  BlockNum=" + BlockNum);
            return;
        }

        CountCheckPow++;
        SumCheckPow += Power;
        var AvgPow = SumCheckPow / CountCheckPow;
        if(CountCheckPow > 10)
        {
            if(Power < AvgPow - 2)
            {
                ToLog("**************** CANNOT SET CHECK POINT Power=" + Power + "/" + AvgPow + "  BlockNum=" + BlockNum);
                return;
            }
        }

        SetCheckPointOnBlock(BlockNum);
        ToLog("SET CHECK POINT Power=" + Power + "/" + AvgPow + "  BlockNum=" + BlockNum);
    }
}

HTTPCaller.SetNewCodeVersion = function (Data)
{
    var Ret = CheckCorrectDevKey();
    if(Ret !== true)
        return Ret;

    var Ret = SERVER.SetNewCodeVersion(Data, WALLET.KeyPair.getPrivateKey(''));

    SERVER.ResetNextPingAllNode();

    return {result:1, text:Ret};
}

HTTPCaller.SetCheckNetConstant = function (Data)
{
    var Ret = CheckCorrectDevKey();
    if(Ret !== true)
        return Ret;

    if(!Data || !Data.JINN)
    {
        ToLogClient("Data JINN not set");
        return {result:0, text:"Data JINN not set"};
    }

    var Num = GetCurrentBlockNumByTime();
    var BlockNum = GetCurrentBlockNumByTime() + Math.floor(10 * 1000 / global.CONSENSUS_PERIOD_TIME);
    var DataJinn = Data.JINN;
    if(!DataJinn.NetConstVer)
        DataJinn.NetConstVer = Num;
    if(!DataJinn.NetConstStartNum)
        DataJinn.NetConstStartNum = BlockNum;
    var SignArr = Engine.GetSignCheckNetConstant(DataJinn);
    DataJinn.NET_SIGN = secp256k1.sign(SHA3BUF(SignArr), WALLET.KeyPair.getPrivateKey('')).signature;
    Engine.CheckNetConstant(DataJinn);

    return {result:1, text:"Set NET_CONSTANT BlockNum=" + BlockNum};
}

HTTPCaller.SetCheckDeltaTime = function (Data)
{
    var Ret = CheckCorrectDevKey();
    if(Ret !== true)
        return Ret;

    if(!Data || !Data.Num)
    {
        ToLogClient("Num not set");
        return {result:0};
    }

    var SignArr = SERVER.GetSignCheckDeltaTime(Data);
    Data.Sign = secp256k1.sign(SHA3BUF(SignArr), WALLET.KeyPair.getPrivateKey('')).signature;
    global.CHECK_DELTA_TIME = Data;

    SERVER.ResetNextPingAllNode();

    return {result:1, text:"Set check time Num=" + Data.Num};
}

var idAutoCorrTime;
HTTPCaller.SetAutoCorrTime = function (bSet)
{
    var Ret = CheckCorrectDevKey();
    if(Ret !== true)
        return Ret;

    if(idAutoCorrTime)
        clearInterval(idAutoCorrTime);
    idAutoCorrTime = undefined;
    if(bSet)
        idAutoCorrTime = setInterval(RunAutoCorrTime, 1000);

    return {result:1, text:"Auto correct: " + bSet};
}

var StartCheckTimeNum = 0;
function RunAutoCorrTime()
{
    if(WALLET.WalletOpen === false)
        return;

    if(GetCurrentBlockNumByTime() > StartCheckTimeNum && Math.abs(global.DELTA_CURRENT_TIME) >= 120)
    {
        var AutoDelta =  - Math.trunc(global.DELTA_CURRENT_TIME);
        var Data = {Num:GetCurrentBlockNumByTime(), bUse:1, bAddTime:1};
        if(AutoDelta < 0)
        {
            AutoDelta =  - AutoDelta;
            Data.bAddTime = 0;
        }
        Data.DeltaTime = 40;
        Data.StartBlockNum = Data.Num + 5;
        Data.EndBlockNum = Data.StartBlockNum + Math.trunc(AutoDelta / Data.DeltaTime);

        var SignArr = SERVER.GetSignCheckDeltaTime(Data);
        Data.Sign = secp256k1.sign(SHA3BUF(SignArr), WALLET.KeyPair.getPrivateKey('')).signature;
        global.CHECK_DELTA_TIME = Data;

        SERVER.ResetNextPingAllNode();

        StartCheckTimeNum = Data.EndBlockNum + 1;
        ToLog("Auto corr time Num:" + Data.Num + " AutoDelta=" + AutoDelta);
    }
}

HTTPCaller.SaveConstant = function (SetObj)
{
    var WasUpdate = global.USE_AUTO_UPDATE;
    for(var key in SetObj)
    {
        global[key] = SetObj[key];
    }
    SAVE_CONST(true);
    SERVER.DO_CONSTANT();

    if(!WasUpdate && global.USE_AUTO_UPDATE && CODE_VERSION.VersionNum && global.UPDATE_CODE_VERSION_NUM < CODE_VERSION.VersionNum)
    {
        SERVER.UseCode(CODE_VERSION.VersionNum, true);
    }

    if(SetObj.DoRestartNode)
        global.RestartNode();
    else
    {
        if(SetObj.DoMining)
            global.RunStopPOWProcess();
    }

    return {result:1};
}

HTTPCaller.SetHTTPParams = function (SetObj)
{
    global.HTTP_PORT_NUMBER = SetObj.HTTPPort;
    global.HTTP_PORT_PASSWORD = SetObj.HTTPPassword;
    SAVE_CONST(true);

    if(SetObj.DoRestartNode)
        global.RestartNode();

    return {result:1};
}

HTTPCaller.SetNetMode = function (SetObj)
{
    global.JINN_IP = SetObj.ip;
    global.JINN_PORT = SetObj.port;
    global.AUTODETECT_IP = SetObj.AutoDetectIP;

    SAVE_CONST(true);

    if(SetObj.DoRestartNode)
        global.RestartNode();

    return {result:1};
}


HTTPCaller.GetAccountKey = function (Num)
{
    var Result = {};
    Result.result = 0;

    var KeyPair = WALLET.GetAccountKey(Num);
    if(KeyPair)
    {
        Result.result = 1;
        Result.PubKeyStr = GetHexFromArr(KeyPair.getPublicKey('', 'compressed'));
    }
    return Result;
}

HTTPCaller.GetNodeData = function (Param)
{
    var Item = SERVER.FindNodeByID(Param.ID);
    if(!Item)
        return {};

    if(global.GetJinnNode)
    {
        return global.GetJinnNode(Item);
    }

    return GetCopyNode(Item, 0);
}

HTTPCaller.GetHotArray = function (Param)
{
    var ArrTree = SERVER.GetTransferTree();
    if(!ArrTree)
        return {result:0};

    for(var Level = 0; Level < ArrTree.length; Level++)
    {
        var arr = ArrTree[Level];
        if(!arr)
            continue;

        for(var n = 0; n < arr.length; n++)
        {
            arr[n] = GetCopyNode(arr[n], 1);
        }
    }

    var Ret = {result:1, ArrTree:ArrTree, JINN_MODE:1};
    return Ret;
}

function SortNodeHot(a,b)
{
    var HotA = 0;
    var HotB = 0;
    if(a.Hot)
        HotA = 1;
    if(b.Hot)
        HotB = 1;

    if(HotB !== HotA)
        return HotB - HotA;

    if(b.BlockProcessCount !== a.BlockProcessCount)
        return b.BlockProcessCount - a.BlockProcessCount;

    if(a.DeltaTime !== b.DeltaTime)
        return a.DeltaTime - b.DeltaTime;

    return a.id - b.id;
}

function GetCopyNode(Node,bSimple)
{
    if(!Node)
        return;

    if(bSimple)
    {
        var Item = {ID:Node.id, ip:Node.ip, Active:Node.Active, CanHot:Node.CanHot, Hot:Node.Hot, IsCluster:Node.IsCluster, Cross:Node.Cross,
            Level:Node.Level, BlockProcessCount:Node.BlockProcessCount, TransferCount:Node.TransferCount, DeltaTime:Node.DeltaTime, Name:Node.Name,
            Debug:Node.Debug, CurrentShard:Node.CurrentShard, };
        return Item;
    }

    if(Node.Socket && Node.Socket.Info)
    {
        Node.Info += Node.Socket.Info + "\n";
        Node.Socket.Info = "";
    }
    if(!Node.PrevInfo)
        Node.PrevInfo = "";

    var Item = {ID:Node.id, ip:Node.ip, VersionNum:Node.VersionNum, NetConstVer:Node.NetConstVer, VERSION:Node.VERSIONMAX, LoadHistoryMode:Node.LoadHistoryMode,
        BlockNumDBMin:Node.BlockNumDBMin, BlockNumDB:Node.BlockNumDB, LevelsBit:Node.LevelsBit, NoSendTx:Node.NoSendTx, GetNoSendTx:Node.GetNoSendTx,
        DirectMAccount:Node.DirectMAccount, portweb:Node.portweb, port:Node.port, TransferCount:Node.TransferCount, LevelCount:Node.LevelCount,
        LevelEnum:Node.LevelEnum, TimeTransfer:GetStrOnlyTimeUTC(new Date(Node.LastTimeTransfer)), BlockProcessCount:Node.BlockProcessCount,
        DeltaTime:Node.DeltaTime, DeltaTimeM:Node.DeltaTimeM, DeltaGlobTime:Node.DeltaGlobTime, PingNumber:Node.PingNumber, NextConnectDelta:Node.NextConnectDelta,
        NextGetNodesDelta:Node.NextGetNodesDelta, NextHotDelta:Node.NextHotDelta, Name:Node.Name, addrStr:Node.addrStr, CanHot:Node.CanHot,
        Active:Node.Active, Hot:Node.Hot, LogInfo:Node.PrevInfo + Node.LogInfo, InConnectArr:Node.WasAddToConnect, Level:Node.Level,
        TransferBlockNum:Node.TransferBlockNum, TransferSize:Node.TransferSize, TransferBlockNumFix:Node.TransferBlockNumFix, CurBlockNum:Node.CurBlockNum,
        WasBan:Node.WasBan, ErrCountAll:Node.ErrCountAll, ADDRITEM:Node.ADDRITEM, INFO:Node.INFO, STATS:Node.STATS, };

    return Item;
}



HTTPCaller.GetBlockchainStat = function (Param)
{
    var Result = global.Engine.GetBlockchainStatForMonitor(Param);

    Result.result = 1;
    Result.sessionid = GetSessionId();
    return Result;
}

HTTPCaller.GetAllCounters = function (Params,response)
{
    let Result = GET_STATS();
    Result.result = 1;
    Result.sessionid = GetSessionId();
    Result.STAT_MODE = global.STAT_MODE;

    if(!global.TX_PROCESS || !global.TX_PROCESS.RunRPC)
        return Result;

    global.TX_PROCESS.RunRPC("GET_STATS", "", function (Err,Params)
    {
        Result.result = !Err;
        if(Result.result)
        {
            AddStatData(Params, Result, "TX");
        }

        if(global.WEB_PROCESS && global.WEB_PROCESS.RunRPC)
        {
            global.WEB_PROCESS.RunRPC("GET_STATS", "", function (Err,Params)
            {
                Result.result = !Err;
                if(Result.result)
                {
                    AddStatData(Params, Result, "WEB");
                }
                response.end(JSON.stringify(Result));
            });
        }
        else
        {
            response.end(JSON.stringify(Result));
        }
    });

    return null;
}

function AddStatData(Params,Result,Prefix)
{
    for(var name in Params.stats)
    {
        for(var key in Params.stats[name])
        {
            var Item = Params.stats[name][key];
            Result.stats[name][key + "-" + Prefix] = Item;
        }
    }
}

HTTPCaller.SetStatMode = function (flag)
{
    if(flag)
        StartCommonStat();

    global.STAT_MODE = flag;
    SAVE_CONST(true);
    global.TX_PROCESS.RunRPC("LOAD_CONST");

    return {result:1, sessionid:GetSessionId(), STAT_MODE:global.STAT_MODE};
}
HTTPCaller.ClearStat = function ()
{
    global.ClearCommonStat();

    if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
    {
        global.TX_PROCESS.RunRPC("ClearCommonStat", "", function (Err,Params)
        {
        });
    }
    if(global.WEB_PROCESS && global.WEB_PROCESS.RunRPC)
    {
        global.WEB_PROCESS.RunRPC("ClearCommonStat", "", function (Err,Params)
        {
        });
    }

    return {result:1, sessionid:GetSessionId(), STAT_MODE:global.STAT_MODE};
}

HTTPCaller.RewriteAllTransactions = function (Param)
{
    SERVER.RewriteAllTransactions();

    return {result:1, sessionid:GetSessionId()};
}

HTTPCaller.RewriteTransactions = function (Param)
{
    var Ret = REWRITE_DAPP_TRANSACTIONS(Param.BlockCount);
    return {result:Ret, sessionid:GetSessionId()};
}
HTTPCaller.TruncateBlockChain = function (Param)
{
    var StartNum = SERVER.BlockNumDB - Param.BlockCount;
    if(StartNum < 15)
        StartNum = 15;

    SERVER.TruncateBlockDB(StartNum);
    return {result:1, sessionid:GetSessionId()};
}

HTTPCaller.ClearDataBase = function (Param)
{
    SERVER.ClearDataBase();
    return {result:1, sessionid:GetSessionId()};
}

HTTPCaller.CleanChain = function (Param)
{
    if(global.CleanChain)
    {

        var StartNum = SERVER.BlockNumDB - Param.BlockCount;
        global.CleanChain(StartNum);
        return {result:1, sessionid:GetSessionId()};
    }
    return {result:0, sessionid:GetSessionId()};
}

HTTPCaller.StartLoadNewCode = function (Param)
{
    global.NoStartLoadNewCode = 1;
    require("../update");

    global.StartLoadNewCode(1);
    return {result:1, sessionid:GetSessionId()};
}

HTTPCaller.AddSetNode = function (AddrItem)
{
    if(!Engine.NodesTree.find(AddrItem))
        Engine.AddNodeAddr(AddrItem);
    var Find = Engine.NodesTree.find(AddrItem);
    if(Find)
    {
        Find.System = 1;
        Find.Score = AddrItem.Score;
        Engine.SaveAddrNodes();

        return {result:1, sessionid:GetSessionId()};
    }
    else
    {
        return {result:0, sessionid:GetSessionId()};
    }
}


HTTPCaller.GetArrStats = function (Keys,response)
{
    var arr = GET_STATDIAGRAMS(Keys);
    let Result = {result:1, sessionid:GetSessionId(), arr:arr, STAT_MODE:global.STAT_MODE};

    if(!global.TX_PROCESS || !global.TX_PROCESS.RunRPC)
        return Result;

    var Keys2 = [];
    for(var i = 0; i < Keys.length; i++)
    {
        var Str = Keys[i];
        if(Str.substr(Str.length - 3) == "-TX")
            Keys2.push(Str.substr(0, Str.length - 3));
    }
    global.TX_PROCESS.RunRPC("GET_STATDIAGRAMS", Keys2, function (Err,Arr)
    {
        Result.result = !Err;
        if(Result.result)
        {
            for(var i = 0; i < Arr.length; i++)
            {
                var Item = Arr[i];
                Item.name = Item.name + "-TX";
                Result.arr.push(Item);
            }
        }

        var Str = JSON.stringify(Result);
        response.end(Str);
    });

    return null;
}


HTTPCaller.GetBlockChain = function (type)
{
    if(!global.SERVER || !SERVER.LoadedChainList)
    {
        return {result:0};
    }

    var MainChains = {};
    for(var i = 0; i < SERVER.LoadedChainList.length; i++)
    {
        var chain = SERVER.LoadedChainList[i];
        if(chain && !chain.Deleted)
            MainChains[chain.id] = true;
    }

    var arrBlocks = [];
    var arrLoadedChainList = [];
    var arrLoadedBlocks = [];

    for(var key in SERVER.BlockChain)
    {
        var Block = SERVER.BlockChain[key];
        if(Block)
        {
            arrBlocks.push(CopyBlockDraw(Block, MainChains));
        }
    }

    AddChainList(arrLoadedChainList, SERVER.LoadedChainList, true);
    AddMapList(arrLoadedBlocks, type, SERVER.MapMapLoaded, MainChains);

    var ArrLoadedChainList = global.HistoryBlockBuf.LoadValue("LoadedChainList", 1);
    if(ArrLoadedChainList)
        for(var List of ArrLoadedChainList)
        {
            AddChainList(arrLoadedChainList, List);
        }

    var ArrMapMapLoaded = global.HistoryBlockBuf.LoadValue("MapMapLoaded", 1);
    if(ArrMapMapLoaded)
        for(var List of ArrMapMapLoaded)
        {
            AddMapList(arrLoadedBlocks, type, List);
        }

    var obj = {LastCurrentBlockNum:SERVER.GetLastCorrectBlockNum(), CurrentBlockNum:SERVER.CurrentBlockNum, LoadedChainList:arrLoadedChainList,
        LoadedBlocks:arrLoadedBlocks, BlockChain:arrBlocks, port:SERVER.port, DELTA_CURRENT_TIME:DELTA_CURRENT_TIME, memoryUsage:process.memoryUsage(),
        IsDevelopAccount:IsDeveloperAccount(WALLET.PubKeyArr), LoadedChainCount:SERVER.LoadedChainList.length, StartLoadBlockTime:SERVER.StartLoadBlockTime,
        sessionid:GetSessionId(), result:1};

    arrBlocks = [];
    arrLoadedChainList = [];
    arrLoadedBlocks = [];

    return obj;
}

HTTPCaller.GetHistoryTransactions = function (Params)
{

    if(typeof Params === "object" && Params.AccountID)
    {
        var Account = ACCOUNTS.ReadState(Params.AccountID);
        if(!Account)
            return {result:0};

        if(!Params.Count)
            Params.Count = 100;

        if(global.PROCESS_NAME !== "MAIN")
            Params.GetPubKey = 0;

        var arr = ACCOUNTS.GetHistory(Params.AccountID, Params.Count, Params.NextPos, 0, Params.GetPubKey);
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
                        Item.Description = TR.Description;
                }
            }
        }
        var Result = {
            Value:{SumCOIN:Account.Value.SumCOIN, SumCENT:Account.Value.SumCENT}, Name:Account.Name, Currency:Account.Currency,
            MaxBlockNum:GetCurrentBlockNumByTime(),
            FIRST_TIME_BLOCK:FIRST_TIME_BLOCK,
            UPDATE_CODE_JINN:UPDATE_CODE_JINN,
            CONSENSUS_PERIOD_TIME:CONSENSUS_PERIOD_TIME,
            NETWORK:global.NETWORK,
            SHARD_NAME:global.SHARD_NAME,
            result:arr.length > 0 ? 1 : 0, History:arr};
        if(Params.GetBalanceArr)
        {
            if(Account.Currency)
                Account.CurrencyObj = SMARTS.ReadSimple(Account.Currency, 1);
            Result.BalanceArr = ACCOUNTS.ReadBalanceArr(Account);
        }

        return Result;
    }
    return {result:0};
}


function GetCopyBlock(Block)
{
    var Result = {BlockNum:Block.BlockNum, TreeHash:GetHexFromAddres(Block.TreeHash), AddrHash:GetHexFromAddres(Block.AddrHash),
        PrevHash:GetHexFromAddres(Block.PrevHash), SumHash:GetHexFromAddres(Block.SumHash), SumPow:Block.SumPow, TrDataLen:Block.TrDataLen,
        SeqHash:GetHexFromAddres(Block.SeqHash), Hash:GetHexFromAddres(Block.Hash), Power:GetPowPower(Block.PowHash), TrCount:Block.TrCount,
        arrContent:Block.arrContent, };
    return Result;
}



var AddrLength = 16;
function GetHexFromAddresShort(Hash)
{
    return GetHexFromAddres(Hash).substr(0, AddrLength);
}
function GetHexFromStrShort(Str)
{
    if(Str === undefined)
        return Str;
    else
        return Str.substr(0, AddrLength);
}

var glid = 0;
function GetGUID(Block)
{
    if(!Block)
        return "------";
    if(!Block.guid)
    {
        glid++;
        Block.guid = glid;
    }
    return Block.guid;
}
function CopyBlockDraw(Block,MainChains)
{
    var MinerID = 0;
    var MinerName = "";
    if(Block.AddrHash)
    {
        var Num = ReadUintFromArr(Block.AddrHash, 0);
        MinerID = Num;
        if(Num)
        {
            var Item = ACCOUNTS.ReadState(Num);
            if(Item && typeof Item.Name === "string")
            {
                MinerName = Item.Name.substr(0, 8);
            }
        }
    }

    var CheckPoint = 0;
    if(Block.BlockNum === CHECK_POINT.BlockNum)
        CheckPoint = 1;

    var Mining;
    if(SERVER.MiningBlock === Block)
        Mining = 1;
    else
        Mining = 0;

    GetGUID(Block);
    var Item = {guid:Block.guid, Active:Block.Active, Prepared:Block.Prepared, BlockNum:Block.BlockNum, Hash:GetHexFromAddresShort(Block.Hash),
        SumHash:GetHexFromAddresShort(Block.SumHash), SeqHash:GetHexFromAddresShort(Block.SeqHash), TreeHash:GetHexFromAddresShort(Block.TreeHash),
        AddrHash:GetHexFromAddresShort(Block.AddrHash), MinerID:MinerID, MinerName:MinerName, SumPow:Block.SumPow, Info:Block.Info,
        TreeLoaded:Block.TreeEq, AddToLoad:Block.AddToLoad, LoadDB:Block.LoadDB, FindBlockDB:Block.FindBlockDB, TrCount:Block.TrCount,
        ArrLength:0, TrDataLen:Block.TrDataLen, Power:GetPowPower(Block.PowHash), CheckPoint:CheckPoint, Mining:Mining, TransferSize:Block.TransferSize,
        HasErr:Block.HasErr, };
    if(Block.chain)
        Item.chainid = Block.chain.id;
    if(Block.arrContent)
        Item.TrCount = Block.arrContent.length;

    Item.BlockDown = GetGUID(Block.BlockDown);

    if(MainChains && Item.chainid)
    {
        Item.Main = MainChains[Item.chainid];
    }

    return Item;
}
function CopyChainDraw(Chain,bWasRecursive,bMain)
{
    if(!Chain)
        return Chain;

    GetGUID(Chain);

    var Item = {guid:Chain.guid, id:Chain.id, chainid:Chain.id, FindBlockDB:Chain.FindBlockDB, GetFindDB:Chain.GetFindDB(), BlockNum:Chain.BlockNumStart,
        Hash:GetHexFromAddresShort(Chain.HashStart), StopSend:Chain.StopSend, SumPow:0, Info:Chain.Info, IsSum:Chain.IsSum, Main:bMain,
    };
    if(Chain.IsSumStart)
    {
        Item.SumHash = Item.Hash;
        Item.Hash = "-------";
    }
    if(Chain.RootChain)
    {
        var rootChain = Chain.GetRootChain();
        if(rootChain)
        {
            Item.rootid = rootChain.id;
            if(!bWasRecursive)
                Item.root = CopyChainDraw(rootChain, true);
        }
    }
    else
        Item.rootid = "";
    if(Chain.BlockHead)
    {
        Item.HashMaxStr = GetGUID(Chain.BlockHead);
        Item.BlockNumMax = Chain.BlockHead.BlockNum;
    }
    else
    {
        Item.HashMaxStr = "------";
    }

    return Item;
}

function AddChainList(arrLoadedChainList,LoadedChainList,bMain)
{
    for(var chain of LoadedChainList)
    {
        if(chain)
        {
            arrLoadedChainList.push(CopyChainDraw(chain, false, bMain));
        }
    }
}
function AddMapList(arrLoadedBlocks,type,MapMapLoaded,MainChains)
{
    for(var key in MapMapLoaded)
    {
        var map = MapMapLoaded[key];
        if(map)
        {
            for(var key in map)
            {
                var Block = map[key];
                if(key.substr(1, 1) === ":")
                    continue;

                if(!Block.Send || type === "reload")
                {
                    arrLoadedBlocks.push(CopyBlockDraw(Block, MainChains));
                    Block.Send = true;
                }
            }
        }
    }
}

var MapFileHTML5 = {};
function SendWebFile(request,response,name,StrCookie,bParsing,Long)
{
    var type = name.substr(name.length - 4, 4);
    var index1 = type.indexOf(".");
    type = type.substr(index1 + 1);

    var Path;
    if(name.substr(0, 2) !== "./" && name.substr(1, 1) !== ":")
        Path = "./" + name;
    else
        Path = name;

    var bErr = 0;
    var FStat = undefined;
    if(!fs.existsSync(Path))
        bErr = 1;
    else
    {
        FStat = fs.lstatSync(Path);
        if(!FStat.isFile())
            bErr = 1;
    }

    if(bErr)
    {
        if(!global.DEV_MODE || type === "ico")
        {
            response.writeHead(404, {'Content-Type':'text/html'});
            response.end();
            return;
        }
        response.end("Not found: " + name);
        return;
    }

    var StrContentType = ContenTypeMap[type];
    if(!StrContentType)
        StrContentType = DefaultContentType;

    var Headers = {};
    if(StrContentType === "text/html")
    {
        Headers['Content-Type'] = 'text/html';

        if(Path !== "./HTML/web3-wallet.html")
            Headers["X-Frame-Options"] = "sameorigin";

        if(StrCookie)
            Headers['Set-Cookie'] = StrCookie;
    }
    else
    {
        if(StrContentType === "application/font-woff")
        {
            Headers['Content-Type'] = StrContentType;
            Headers['Access-Control-Allow-Origin'] = "*";
        }
        else
        {
            Headers['Content-Type'] = StrContentType;
        }
    }

    var ArrPath = Path.split('/', 5);
    var ShortName = ArrPath[ArrPath.length - 1];
    var Long2 = CacheMap[ShortName];
    if(Long2)
        Long = Long2;

    if(global.DEV_MODE)
        Long = 1;

    if(Long)
    {
        Headers['Cache-Control'] = "max-age=" + Long;
    }

    if(bParsing && StrContentType === "text/html")
    {
        var data = GetFileHTMLWithParsing(Path);
        SendGZipData(request, response, Headers, data);
        return;
    }
    else
    if("image/jpeg,image/vnd.microsoft.icon,image/svg+xml,image/png,application/javascript,text/css,text/html".indexOf(StrContentType) >  - 1)
    {
        response.writeHead(200, Headers);

        var data = GetFileSimpleBin(Path);
        SendGZipData(request, response, Headers, data);
        return;
    }
    const stream = fs.createReadStream(Path);
    let acceptEncoding = request.headers['accept-encoding'];
    if(!global.HTTP_USE_ZIP || !acceptEncoding)
    {
        acceptEncoding = '';
    }

    if(/\bdeflate\b/.test(acceptEncoding))
    {
        Headers['Content-Encoding'] = 'deflate';
        response.writeHead(200, Headers);
        stream.pipe(zlib.createDeflate({level:zlib.constants.Z_BEST_SPEED})).pipe(response);
    }
    else
    if(/\bgzip\b/.test(acceptEncoding))
    {
        Headers['Content-Encoding'] = 'gzip';
        response.writeHead(200, Headers);
        stream.pipe(zlib.createGzip({level:zlib.constants.Z_BEST_SPEED})).pipe(response);
    }
    else
    if(/\bbr\b/.test(acceptEncoding))
    {
        Headers['Content-Encoding'] = 'br';
        response.writeHead(200, Headers);
        stream.pipe(zlib.createBrotliCompress()).pipe(response);
    }
    else
    {
        response.writeHead(200, Headers);

        var TimePeriod = 30 * 60 * 1000;
        if(type === "zip")
            TimePeriod += Math.floor(FStat.size / 100000) * 1000;

        setTimeout(function ()
        {

            stream.close();
            stream.push(null);
            stream.read(0);
        }, TimePeriod);

        stream.pipe(response);
    }
}

function SendGZipData(request,response,Headers,data0)
{
    if(!data0)
        data0 = [];
    var data = Buffer.from(data0);

    let acceptEncoding = request.headers['accept-encoding'];
    if(!global.HTTP_USE_ZIP || !acceptEncoding)
    {
        acceptEncoding = '';
    }

    if(/\bgzip\b/.test(acceptEncoding))
    {
        Headers['Content-Encoding'] = 'gzip';
        response.writeHead(200, Headers);

        var gzip = zlib.createGzip({level:zlib.constants.Z_BEST_SPEED});
        gzip.pipe(response);
        gzip.on('error', function (err)
        {
            ToLog(err);
        });
        gzip.write(data);
        gzip.end();
    }
    else
    {
        response.writeHead(200, Headers);
        response.end(data);
    }
}

function GetFileHTMLWithParsing(Path,bZip)
{
    if(bZip)
    {
        var data = GetFileHTMLWithParsing(Path, 0);

        return data;
    }
    else
    {
        var data = global.SendHTMLMap[Path];
        if(!data)
        {
            global.SendHTMLMap[Path] = "-recursion-";

            data = String(fs.readFileSync(Path));

            data = ParseTag(data, "File", 0);
            data = ParseTag(data, "Edit", 1);

            global.SendHTMLMap[Path] = data;
        }
        return data;
    }
}

var glEditNum = 0;
function ParseTag(Str,TagName,bEdit)
{
    var bWasInject = 0;
    var data = "";
    var index = 0;
    while(index >= 0)
    {
        index = Str.indexOf("{{" + TagName + "=", index);
        if(index >= 0)
        {
            var index2 = Str.indexOf("}}", index + 3 + TagName.length);
            if(index2 < 0)
            {
                ToLog("Error teg " + TagName + " in " + Path);
                break;
            }
            var Delta = index2 - index;
            if(Delta > 210)
            {
                ToLog("Error length (more 200) teg File in " + Path);
                break;
            }
            var Path2 = Str.substring(index + 3 + TagName.length, index + Delta);

            data += Str.substring(0, index);
            if(bEdit)
            {
                if(!bWasInject)
                {
                    data = data + GetFileSimple("./SITE/JS/web-edit.html");
                    bWasInject = 1;
                }
                glEditNum++;

                data += "<DIV class='' id='idEdit" + glEditNum + "'>";
                data += GetFileHTMLFromMarkdown(Path2);
                data += "</DIV>";
                data += "<script>AddNewEditTag('idEdit" + glEditNum + "','" + Path2 + "');</script>";
            }
            else
            {
                data += GetFileHTMLWithParsing(Path2);
            }
            Str = Str.substring(index2 + 2);
            index = 0;
        }
    }
    data += Str;
    return data;
}

var MarkLib;
function GetFileHTMLFromMarkdown(Path)
{
    var data = global.SendHTMLMap[Path];
    if(!data)
    {
        if(MarkLib === undefined)
            MarkLib = require("../HTML/JS/marked.js");
        var Str = "";
        if(fs.existsSync(Path))
            Str = String(fs.readFileSync(Path));
        data = MarkLib(Str);
        global.SendHTMLMap[Path] = data;
    }
    return data;
}
function GetFileSimple(Path)
{
    var Key = "GetFileSimple-" + Path;
    var data = global.SendHTMLMap[Key];
    if(!data)
    {
        data = String(fs.readFileSync(Path));
        global.SendHTMLMap[Key] = data;
    }
    return data;
}
global.GetFileSimpleBin = function (Path)
{
    var Key = "GetFileSimpleBin-" + Path;
    var data = global.SendHTMLMap[Key];
    if(!data)
    {
        data = fs.readFileSync(Path);
        global.SendHTMLMap[Key] = data;
    }
    return data;
};

function SaveFileSimple(Path,Str)
{
    global.SendHTMLMap = {};

    var Key = "GetFileSimple-" + Path;
    global.SendHTMLMap[Key] = Str;
    SaveToFile(Path, Str);
}

global.SendHTMLMap = {};
global.SendWebFile = SendWebFile;
global.GetFileHTMLWithParsing = GetFileHTMLWithParsing;
global.GetFileHTMLFromMarkdown = GetFileHTMLFromMarkdown;
global.GetFileSimple = GetFileSimple;
global.SaveFileSimple = SaveFileSimple;

function ReloaSenddBufer()
{
    global.SendHTMLMap = {};
}

setInterval(ReloaSenddBufer, 60 * 1000);
if(global.DEV_MODE)
    setInterval(ReloaSenddBufer, 1 * 1000);

function GetStrTime(now)
{
    if(!now)
        now = GetCurrentTime(0);

    var Str = "" + now.getHours().toStringZ(2);
    Str = Str + ":" + now.getMinutes().toStringZ(2);
    Str = Str + ":" + now.getSeconds().toStringZ(2);
    return Str;
}

function OnGetData(arg)
{
    var response = {end:function ()
        {
        }, writeHead:function ()
        {
        }, };

    var Path = arg.path;
    var obj = arg.obj;

    if(Path.substr(0, 1) === "/")
        Path = Path.substr(1);
    var params = Path.split('/', 5);

    var Ret;
    var F = HTTPCaller[params[0]];
    if(F)
    {

        if(obj)
            Ret = F(obj);
        else
            Ret = F(params[1], params[2], params[3]);
    }
    else
    {
        Ret = {result:0};
    }
    return Ret;
}

function parseCookies(rc)
{
    var list = {};

    rc && rc.split(';').forEach(function (cookie)
    {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

global.SetSafeResponce = SetSafeResponce;
function SetSafeResponce(response)
{
    if(!response.Safe)
    {
        response.Safe = 1;
        response.StopSend = 0;
        response._end = response.end;
        response._writeHead = response.writeHead;

        if(response.socket && response.socket._events && response.socket._events.error.length < 2)
        {
            response.socket.on("error", function (err)
            {
            });
        }

        response.on('error', function (err)
        {
            console.log("Error " + err);
        });

        response.writeHead = function ()
        {
            try
            {
                response._writeHead.apply(response, arguments);
            }
            catch(e)
            {
                ToError("H##2");
                ToError(e);
            }
        };
        response.end = function ()
        {

            try
            {
                if(global.STAT_MODE === 2 && arguments && arguments[0] && arguments[0].length)
                {
                    ADD_TO_STAT("HTTP_SEND", arguments[0].length);
                    if(response.DetailStatName)
                        ADD_TO_STAT("HTTP_SEND" + response.DetailStatName, arguments[0].length);
                }

                response._end.apply(response, arguments);
            }
            catch(e)
            {

                ToError("H##1");
                ToError(e);
            }
        };
    }
}

if(global.HTTP_PORT_NUMBER)
{
    var glStrToken = GetHexFromArr(crypto.randomBytes(16));
    var ClientTokenHashMap = {};
    var ClientIPMap = {};
    var ClientIPMap2 = {};
    setInterval(function ()
    {
        ClientTokenHashMap = {};
    }, 24 * 3600 * 1000);

    var MaxTimeEmptyAccess = 600;
    var CountPswdPls = 0;
    var TimeStartServer = Date.now();

    var port = global.HTTP_PORT_NUMBER;
    var HTTPServer = http.createServer(function (request,response)
    {
        if(!request.headers)
            return;
        if(!request.socket || !request.socket.remoteAddress)
            return;

        if(request.socket._events && request.socket._events.error.length < 2)
            request.socket.on("error", function (err)
            {
                if(err.code === "EPIPE")
                    return;
                console.log("HTML socket.error code=" + err.code);
                ToLog(err.stack, 3);
            });

        var remoteAddress = request.socket.remoteAddress.replace(/^.*:/, '');

        if(remoteAddress === "1")
            remoteAddress = "127.0.0.1";

        var fromURL = url.parse(request.url);
        var Path = querystring.unescape(fromURL.path);

        if(!ClientIPMap[remoteAddress])
        {
            ClientIPMap[remoteAddress] = 1;
            ToLog("TRY CONNECT FOR HTTP ACCESS FROM: " + remoteAddress, 0);
            ToLog("Path: " + Path, 0);
        }

        var Password = global.HTTP_PORT_PASSWORD;

        var CheckPassword = 1;
        if(global.NOHTMLPASSWORD)
            if(global.HTTP_IP_CONNECT || remoteAddress === "127.0.0.1")
                CheckPassword = 0;

        if(CheckPassword && !Password)
        {
            if(remoteAddress !== "127.0.0.1")
                return;
            if(!global.NWMODE)
            {
                var Delta = Date.now() - TimeStartServer;
                if(Delta > MaxTimeEmptyAccess * 1000)
                    Password = GetHexFromArr(crypto.randomBytes(16));
                else
                if(Delta > (MaxTimeEmptyAccess - 10) * 1000)
                {
                    CountPswdPls++;
                    if(CountPswdPls <= 5)
                        ToLog("PLEASE, SET PASSWORD FOR ACCCES TO FULL NODE");
                }
            }
        }

        if(global.HTTP_IP_CONNECT && remoteAddress !== "127.0.0.1" && global.HTTP_IP_CONNECT.indexOf(remoteAddress) < 0)
            return;

        SetSafeResponce(response);

        if(!global.SERVER || !global.SERVER.CanSend)
        {
            response.writeHead(404, {'Content-Type':'text/html'});
            response.end("");
            return;
        }

        if(global.NWMODE)
        {
            Path = Path.replace("HTML/HTML", "HTML");
            if("/HTML/" + global.NW_TOKEN === Path)
            {
                if(!Password)
                {
                    SendWebFile(request, response, "/HTML/wallet.html", "NW_TOKEN=" + global.NW_TOKEN + ";path=/");
                    return;
                }
                else
                {
                    Path = "/HTML/wallet.html";
                }
            }

            if(!Password)
            {
                var cookies = parseCookies(request.headers.cookie);
                if(cookies["NW_TOKEN"] === global.NW_TOKEN)
                {
                    CheckPassword = 0;
                }
                else
                {
                    return;
                }
            }
        }

        if(CheckPassword && Password)
        {
            var StrPort = "";
            if(global.HTTP_PORT_NUMBER !== 80)
                StrPort = global.HTTP_PORT_NUMBER;

            var cookies = parseCookies(request.headers.cookie);

            var cookies_hash = cookies["hash" + StrPort];

            var bSendPSW = 0;
            if(cookies_hash && !ClientTokenHashMap[cookies_hash])
            {
                var hash = GetCookieHash(cookies_hash, Password);

                if(hash && hash === cookies_hash)
                {
                    ClientTokenHashMap[cookies_hash] = 1;
                }
                else
                {
                    bSendPSW = 1;
                }
            }
            else
            if(!ClientIPMap2[remoteAddress] && !cookies_hash)
            {
                bSendPSW = 1;
            }

            if(Path === "/password.html")
                bSendPSW = 1;

            if(bSendPSW)
            {
                SendPasswordFile(request, response, Path, StrPort);
                return;
            }
            else
            if(request.method === "POST")
            {
                var TokenHash = request.headers.tokenhash;

                if(!TokenHash || !ClientTokenHashMap[TokenHash])
                {
                    var hash2;
                    if(TokenHash)
                        hash2 = GetCookieHash(TokenHash, Password + "-api");

                    if(TokenHash && hash2 && hash2 === TokenHash)
                    {
                        ClientTokenHashMap[TokenHash] = 1;
                    }
                    else
                    {
                        if(TokenHash && hash2)
                            ToLog("Invalid API token: " + request.method + "   path: " + Path + "  token:" + TokenHash + "/" + hash2);
                        response.writeHead(203, {'Content-Type':'text/html'});
                        response.end("Invalid API token");
                        return;
                    }
                }
            }
        }
        if(!ClientIPMap2[remoteAddress])
        {
            ClientIPMap2[remoteAddress] = 1;
            ToLog("OK CONNECT TO HTTP ACCESS FROM: " + remoteAddress, 0);
            ToLog("Path: " + Path, 0);
        }

        var params = Path.split('/', 6);
        params.splice(0, 1);
        var Type = request.method;
        if(Type === "POST")
        {
            let Response = response;
            let Params = params;
            let postData = "";
            request.addListener("data", function (postDataChunk)
            {
                if(postData.length < 130000 && postDataChunk.length < 130000)
                    postData += postDataChunk;
            });

            request.addListener("end", function ()
            {
                var Data;
                try
                {
                    Data = JSON.parse(postData);
                }
                catch(e)
                {
                    ToError("--------Error data parsing : " + Params[0] + " " + postData.substr(0, 200));
                    Response.writeHead(405, {'Content-Type':'text/html'});
                    Response.end("Error data parsing");
                    return;
                }

                if(Params[0] === "HTML")
                    DoCommand(request, response, Type, Path, [Params[1], Data], remoteAddress);
                else
                    DoCommand(request, response, Type, Path, [Params[0], Data], remoteAddress);
            });
        }
        else
        {
            DoCommand(request, response, Type, Path, params, remoteAddress);
        }
    }).listen(port, LISTEN_IP, function ()
    {
        global.HTTP_SERVER_START_OK = 1;
        ToLog("Run HTTP-server on " + LISTEN_IP + ":" + port);
    });

    HTTPServer.on('error', function (err)
    {
        ToError("H##3");
        ToError(err);
    });
}

function SendPasswordFile(request,response,Path,StrPort)
{
    if(!Path || Path === "/" || Path.substr(Path.length - 4, 4) === "html")
    {

        SendWebFile(request, response, "./HTML/password.html", "token" + StrPort + "=" + glStrToken + ";path=/;SameSite=Strict;");
    }
    else
    {
        response.writeHead(203, {'Content-Type':'text/html'});
        response.end("");
    }
}

if(global.ELECTRON)
{
    const ipcMain = require('electron').ipcMain;

    ipcMain.on('GetData', function (event,arg)
    {
        event.returnValue = OnGetData(arg);
    });
}
exports.SendData = OnGetData;

global.RunConsole=RunConsole;
function RunConsole(StrRun)
{
    var Str = fs.readFileSync("./EXPERIMENTAL/_run-console.js", {encoding:"utf8"});
    if(StrRun)
        Str += "\n" + StrRun;

    try
    {
        var ret = eval(Str);
    }
    catch(e)
    {
        ret = e.message + "\n" + e.stack;
    }
    return ret;
}


var WebWalletUser = {};
function GetUserContext(Params)
{
    if(typeof Params.Key !== "string")
        Params.Key = "" + Params.Key;

    var StrKey = Params.Key + "-" + Params.Session;
    var Context = WebWalletUser[StrKey];
    if(!Context)
    {
        Context = {NumDappInfo:0, PrevDappInfo:"", NumAccountList:0, PrevAccountList:"", LastTime:0, FromEventNum:0};
        Context.Session = Params.Session;
        Context.Key = StrKey;
        WebWalletUser[StrKey] = Context;
    }
    return Context;
}
global.GetUserContext = GetUserContext;


global.EventNum = 0;
global.EventMap = {};

function AddDappEventToGlobalMap(Data)
{
    global.EventNum++;
    Data.EventNum = global.EventNum;
    Data.EventDate = Date.now();

    var Arr = global.EventMap[Data.Smart];
    if(!Arr)
    {
        Arr = [];
        global.EventMap[Data.Smart] = Arr;
    }
    if(Arr.length < 1000)
    {
        Arr.push(Data);
    }
}
global.AddDappEventToGlobalMap = AddDappEventToGlobalMap;

function DeleteOldEvents(SmartNum)
{
    var CurDate = Date.now();
    var Arr = global.EventMap[SmartNum];

    while(Arr && Arr.length)
    {
        var Event = Arr[0];
        if(!Event || CurDate - Event.EventDate < 5000)
        {
            break;
        }
        Arr.splice(0, 1);
    }
}

function GetEventArray(SmartNum,Context)
{
    var Arr = global.EventMap[SmartNum];
    if(!Arr || Arr.length === 0)
    {
        return [];
    }

    var FromEventNum = Context.FromEventNum;
    var ArrRet = [];
    for(var i = 0; i < Arr.length; i++)
    {
        var Event = Arr[i];
        if(Event.EventNum >= FromEventNum)
            ArrRet.push(Event);
    }
    if(ArrRet.length)
    {
        Context.FromEventNum = ArrRet[ArrRet.length - 1].EventNum + 1;
    }

    return ArrRet;
}



HTTPCaller.GetHashRate = function (ArrParams)
{
    var CurBlockNum = GetCurrentBlockNumByTime();
    var ResArr = [];
    var DeltaMinute = 0;
    for(var i = 0; i < ArrParams.length; i++)
    {
        var bMinutes = (i === ArrParams.length - 1);

        var Item = ArrParams[i];
        if(!Item)
        {
            ResArr[i] = undefined;
            continue;
        }

        if(Item.BlockNum1 < 0)
            Item.BlockNum1 = 0;
        if(Item.BlockNum2 > CurBlockNum)
            Item.BlockNum2 = CurBlockNum;
        var Delta = Item.BlockNum2 - Item.BlockNum1;
        var Count = Delta;
        if(Count > 20 && !bMinutes)
            Count = 20;
        else
        if(Count <= 0)
            Count = 1;
        var StepDelta = Math.floor(Delta / Count);
        if(StepDelta < 1)
            StepDelta = 1;
        if(bMinutes)
            DeltaMinute = Delta;
        var CountAvg = 3;

        var StepDeltaAvg = Math.floor(StepDelta / CountAvg);
        if(StepDeltaAvg < 1)
            StepDeltaAvg = 1;

        var ItervalArr = [];
        for(var Num = Item.BlockNum1; Num < Item.BlockNum2; Num += StepDelta)
        {
            var Power;
            var Sum = 0;
            var CountSum = 0;
            for(var d = 0; d < CountAvg; d++)
            {
                var BlockNum = Num + d * StepDeltaAvg;
                var Block = Engine.GetBlockHeaderDB(BlockNum);
                if(Block)
                {
                    CountSum++;
                    if(Item.UseMaxChainHash)
                    {
                        var MaxPower = 0;
                        var ArrChain = Engine.DB.GetChainArrByNum(BlockNum);
                        for(var m = 0; m < ArrChain.length; m++)
                        {
                            if(MaxPower < ArrChain[m].Power)
                                MaxPower = ArrChain[m].Power;
                        }
                        Sum += MaxPower;
                    }
                    else
                    {
                        Sum += Block.Power;
                    }
                }
                if(StepDelta / CountAvg <= 1)
                    break;
            }
            if(CountSum)
            {
                Power = Math.floor(Sum / CountSum);
            }
            else
            {
                Power = 0;
            }

            ItervalArr.push(Power);
        }
        ResArr[i] = ItervalArr;
    }

    var Ret = {result:1, ItervalArr:ResArr};
    Ret.MaxHashStatArr = Engine.GetTimePowerArr(GetCurrentBlockNumByTime() - DeltaMinute);
    return Ret;
}

function DoGetTransactionByID(response,Params)
{
    var result = GetTransactionByID(Params);
    response.writeHead(200, {'Content-Type':'text/html'});
    response.end(JSON.stringify(result));
}
HTTPCaller.GetTransaction = function (Params,response)
{
    var result;
    if(typeof Params === "object" && Params.TxID)
    {
        result = GetTransactionByID(Params);
    }
    else
    {
        result = {result:0};
    }
    response.writeHead(200, {'Content-Type':'text/plain'});
    response.end(JSON.stringify(result));
    return null;
}

global.GetTransactionByID = GetTransactionByID;
function GetTransactionByID(Params)
{
    //SERVER.RefreshAllDB();

    var BlockNum;
    if(typeof Params.TxID === "string")
    {
        var Arr = GetArrFromHex(Params.TxID);
        var Arr1 = Arr.slice(0, TX_ID_HASH_LENGTH);
        BlockNum = ReadUintFromArr(Arr, TX_ID_HASH_LENGTH);

        for(var n=0;n<100;n++)//max 100 blocks
        {
            var Block = SERVER.ReadBlockDB(BlockNum+n);
            if(Block && Block.TxData)
            {
                for(var i = 0; i < Block.TxData.length; i++)
                {
                    var Tx = Block.TxData[i];
                    if(CompareArr(Tx.HASH.slice(0, TX_ID_HASH_LENGTH), Arr1) === 0)
                    {
                        return GetTransactionFromBody(Params, Block, i, Tx.body);
                    }
                }
            }

        }
    }
    return {result:0, Meta:Params ? Params.Meta : undefined, BlockNum:BlockNum};
}

global.GetTransactionFromBody = GetTransactionFromBody;
function GetTransactionFromBody(Params,Block,TrNum,Body)
{
    var TR = ACCOUNTS.GetObjectTransaction(Body);
    if(TR)
    {
        ConvertBufferToStr(TR);
        TR.Meta = Params.Meta;
        TR.result = GetVerifyTransaction(Block, TrNum);
        if(TR.result===undefined)//не успела обновиться информация
            TR.result = 1;

        TR.BlockNum = Block.BlockNum;
        TR.TrNum = TrNum;
        return TR;
    }
    return {result:0, BlockNum:Block.BlockNum, Meta:Params ? Params.Meta : undefined};
}

function GetCookieHash(cookies_hash,Password)
{
    if(!cookies_hash || cookies_hash.substr(0, 4) !== "0000")
    {
        return undefined;
    }

    var nonce = 0;
    var index = cookies_hash.indexOf("-");
    if(index > 0)
    {
        nonce = parseInt(cookies_hash.substr(index + 1));
        if(!nonce)
            nonce = 0;
    }

    var hash = CalcClientHash(glStrToken + "-" + Password, nonce);

    return hash;
}

global.GetFormatTx=function (Params)
{
    var BlockNum=GetCurrentBlockNumByTime();
    var RetData=
        {
            CodeVer:global.START_CODE_VERSION_NUM,
            BLOCKCHAIN_VERSION:GETVERSION(BlockNum),
            PRICE:PRICE_DAO(BlockNum),

            FORMAT_SYS:FORMAT_SYS,
            FORMAT_SMART_CREATE1:FORMAT_SMART_CREATE1,
            FORMAT_SMART_CREATE2:FORMAT_SMART_CREATE2,
            FORMAT_SMART_RUN1:FORMAT_SMART_RUN1,
            FORMAT_SMART_RUN2:FORMAT_SMART_RUN2,
            FORMAT_SMART_CHANGE:FORMAT_SMART_CHANGE,
            FORMAT_ACC_CREATE:FORMAT_ACC_CREATE,
            FORMAT_ACC_CHANGE:FORMAT_ACC_CHANGE,
            FORMAT_MONEY_TRANSFER3:FORMAT_MONEY_TRANSFER3,
            FORMAT_MONEY_TRANSFER5:FORMAT_MONEY_TRANSFER5,
            FORMAT_FILE_CREATE:FORMAT_FILE_CREATE,
            FORMAT_SMART_SET:FORMAT_SMART_SET,

            TYPE_SYS:TYPE_TRANSACTION_SYS,
            TYPE_SMART_CREATE1:TYPE_TRANSACTION_SMART_CREATE1,
            TYPE_SMART_CREATE2:TYPE_TRANSACTION_SMART_CREATE2,
            TYPE_SMART_RUN1:TYPE_TRANSACTION_SMART_RUN1,
            TYPE_SMART_RUN2:TYPE_TRANSACTION_SMART_RUN2,
            TYPE_SMART_CHANGE:TYPE_TRANSACTION_SMART_CHANGE,
            TYPE_ACC_CREATE:TYPE_TRANSACTION_CREATE,
            TYPE_ACC_CHANGE:TYPE_TRANSACTION_ACC_CHANGE,
            TYPE_MONEY_TRANSFER3:TYPE_TRANSACTION_TRANSFER3,
            TYPE_MONEY_TRANSFER5:TYPE_TRANSACTION_TRANSFER5,
            TYPE_TRANSACTION_FILE:TYPE_TRANSACTION_FILE,
            TYPE_SMART_SET:TYPE_TRANSACTION_SMART_SET,
        };

    return RetData;
};
HTTPCaller.GetFormatTx = GetFormatTx;

global.UseRetFieldsArr=UseRetFieldsArr;
function UseRetFieldsArr(Arr,Fields)
{
    if(!Fields)
        return Arr;
    var Arr2=[];
    for(var i=0;i<Arr.length;i++)
    {
        var Item=Arr[i];
        var Item2={};
        for(var n=0;n<Fields.length;n++)
            Item2[Fields[n]]=Item[Fields[n]];
        Arr[i]=Item2;
    }

    return Arr;
}


require("../rpc/api-v2-exchange.js");


