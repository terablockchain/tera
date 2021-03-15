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

global.HostingCaller = {};

var sessionid = GetHexFromArr(crypto.randomBytes(20));

HostingCaller.GetCurrentInfo = function (Params)
{
    if(typeof Params === "object" && Params.BlockChain == 1)
    {
        if(!global.USE_API_WALLET)
            return {result:0};
    }
    var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
    var TXBlockNum = COMMON_ACTS.GetLastBlockNumActWithReopen();
    
    var Ret = {result:1, VersionNum:global.START_CODE_VERSION_NUM, VersionUpd:global.UPDATE_CODE_VERSION_NUM, NETWORK:global.NETWORK,
        SHARD_NAME:global.SHARD_NAME, MaxNumBlockDB:MaxNumBlockDB, CurBlockNum:GetCurrentBlockNumByTime(), MaxAccID:ACCOUNTS.GetMaxAccount(),
        MaxDappsID:SMARTS.GetMaxNum(), TXBlockNum:TXBlockNum, CurTime:Date.now(), DELTA_CURRENT_TIME:DELTA_CURRENT_TIME, MIN_POWER_POW_TR:0,
        FIRST_TIME_BLOCK:FIRST_TIME_BLOCK, UPDATE_CODE_JINN:UPDATE_CODE_JINN, CONSENSUS_PERIOD_TIME:CONSENSUS_PERIOD_TIME, NEW_SIGN_TIME:NEW_SIGN_TIME,
        PRICE_DAO:PRICE_DAO(MaxNumBlockDB), GrayConnect:global.CLIENT_MODE, JINN_MODE:1, sessionid:sessionid, };
    
    if(typeof Params === "object" && Params.Diagram == 1)
    {
        var arrNames = ["MAX:ALL_NODES", "MAX:HASH_RATE_B"];
        Ret.arr = GET_STATDIAGRAMS(arrNames);
    }
    if(typeof Params === "object" && Params.BlockChain == 1)
    {
        Ret.BlockChain = NodeBlockChain;
    }
    
    if(typeof Params === "object" && Params.ArrLog == 1)
    {
        var CurTime = Date.now();
        
        var ArrLog = [];
        for(var i = ArrLogClient.length - 1; i >= 0; i--)
        {
            var Item = ArrLogClient[i];
            if(!Item.final || CurTime - Item.time > 600 * 1000)
                continue;
            ArrLog.push(Item);
            if(ArrLog.length >= 10)
                break;
        }
        Ret.ArrLog = ArrLog;
    }
    
    return Ret;
}

var MaxCountViewRows = global.HTTP_MAX_COUNT_ROWS;
HostingCaller.GetAccountList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    Params.CountNum = ParseNum(Params.CountNum);
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = ACCOUNTS.GetRowsAccounts(ParseNum(Params.StartNum), Params.CountNum);
    return {result:1, arr:arr};
}

HostingCaller.GetAccount = function (id)
{
    
    id = ParseNum(id);
    var arr = ACCOUNTS.GetRowsAccounts(id, 1);
    return {Item:arr[0], result:1};
}

HostingCaller.GetBlockList = function (Params,response)
{
    if(typeof Params !== "object")
        return {result:0};
    
    Params.StartNum = ParseNum(Params.StartNum);
    Params.CountNum = ParseNum(Params.CountNum);
    
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    return HTTPCaller.GetBlockList(Params, response);
}

HostingCaller.GetTransactionList = function (Params,response)
{
    Params.Param3 = Params.BlockNum;
    return HostingCaller.GetTransactionAll(Params, response);
}

HostingCaller.GetTransactionAll = function (Params,response)
{
    
    if(typeof Params !== "object")
        return {result:0};
    
    Params.Param3 = ParseNum(Params.Param3);
    Params.StartNum = ParseNum(Params.StartNum);
    Params.CountNum = ParseNum(Params.CountNum);
    
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    
    return HTTPCaller.GetTransactionAll(Params, response);
}

HostingCaller.GetDappList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    Params.CountNum = ParseNum(Params.CountNum);
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    var arr = SMARTS.GetRows(ParseNum(Params.StartNum), Params.CountNum, undefined, Params.Filter, 1);
    return {result:1, arr:arr};
}

HostingCaller.GetNodeList = function (Params)
{
    var arr = [];
    var List;
    if(typeof Params === "object" && Params.All)
        List = AllNodeList;
    else
        List = HostNodeList;
    
    var MaxNodes = 50;
    var len = List.length;
    var UseRandom = 0;
    if(len > MaxNodes)
    {
        UseRandom = 1;
        len = MaxNodes;
    }
    
    var bGeo = 0;
    if(typeof Params === "object" && Params.Geo)
        bGeo = 1;
    
    var mapWasAdd = {};
    for(var i = 0; i < len; i++)
    {
        var Item;
        if(UseRandom)
        {
            var num = random(List.length);
            Item = List[num];
            if(mapWasAdd[Item.ip])
            {
                continue;
            }
            mapWasAdd[Item.ip] = 1;
        }
        else
        {
            Item = List[i];
        }
        var Value = {ip:Item.ip, port:Item.portweb, };
        
        if(bGeo)
        {
            if(!Item.Geo)
                SetGeoLocation(Item);
            
            Value.latitude = Item.latitude;
            Value.longitude = Item.longitude;
            Value.name = Item.name;
            Value.port = Item.port;
        }
        
        arr.push(Value);
    }
    
    var Result = {result:1, arr:arr, VersionNum:global.UPDATE_CODE_VERSION_NUM, NETWORK:global.NETWORK, SHARD_NAME:global.SHARD_NAME,
    };
    return Result;
}

var AccountKeyMap = {};
var LastMaxNum = 0;

setInterval(function ()
{
    AccountKeyMap = {};
    LastMaxNum = 0;
}
, 3600 * 1000);

HostingCaller.GetAccountListByKey = function (Params,aaa,bbb,bRet)
{
    if(typeof Params !== "object" || !Params.Key)
        return {result:0, arr:[]};
    
    if(!global.USE_API_WALLET)
        return {result:0};
    
    var Accounts = ACCOUNTS;
    for(var num = LastMaxNum; true; num++)
    {
        if(Accounts.IsHole(num))
            continue;
        
        var Data = Accounts.ReadState(num);
        if(!Data)
            break;
        var StrKey = GetHexFromArr(Data.PubKey);
        Data.Next = AccountKeyMap[StrKey];
        AccountKeyMap[StrKey] = Data;
    }
    LastMaxNum = num;
    
    var arr = [];
    var Item = AccountKeyMap[Params.Key];
    while(Item)
    {
        var Data = Accounts.ReadState(Item.Num);
        if(!Data)
            continue;
        
        if(!Data.PubKeyStr)
            Data.PubKeyStr = GetHexFromArr(Data.PubKey);
        
        if(Data.Currency)
            Data.CurrencyObj = SMARTS.ReadSimple(Data.Currency, 1);
        if(Data.Value.Smart)
        {
            Data.SmartObj = SMARTS.ReadSimple(Data.Value.Smart);
            try
            {
                Data.SmartState = BufLib.GetObjectFromBuffer(Data.Value.Data, Data.SmartObj.StateFormat, {});
                if(typeof Data.SmartState === "object")
                    Data.SmartState.Num = Item.Num;
            }
            catch(e)
            {
                Data.SmartState = {};
            }
        }
        arr.unshift(Data);
        Item = Item.Next;
        if(arr.length >= global.HTTP_MAX_COUNT_ROWS)
            break;
    }
    
    var Ret = {result:1, arr:arr};
    if(bRet)
    {
        return Ret;
    }
    
    var Context = GetUserContext(Params);
    var StrInfo = JSON.stringify(Ret);
    if(Params.AllData === "0")
        Params.AllData = 0;
    
    if(!Params.AllData && Context.PrevAccountList === StrInfo)
    {
        return {result:0, cache:1};
    }
    Context.PrevAccountList = StrInfo;
    Context.NumAccountList++;
    
    return StrInfo;
}

var CategoryMap = {};
var CategoryArr = [];
var CategoryDappMaxNumWas = 0;
HostingCaller.GetDappCategory = function (Params,response)
{
    CheckDappCategoryMap();
    
    return {result:1, arr:CategoryArr};
}

function CheckDappCategoryMap()
{
    var MaxNumNow = SMARTS.GetMaxNum();
    if(MaxNumNow !== CategoryDappMaxNumWas)
    {
        for(var Num = CategoryDappMaxNumWas; Num <= MaxNumNow; Num++)
        {
            var Item = SMARTS.ReadSimple(Num);
            for(var n = 1; n <= 3; n++)
            {
                var Name = "Category" + n;
                var Value = Item[Name];
                if(Value)
                {
                    var DappMap = CategoryMap[Value];
                    if(!DappMap)
                    {
                        DappMap = {};
                        CategoryMap[Value] = DappMap;
                        CategoryArr.push(Value);
                    }
                    DappMap[Num] = 1;
                }
            }
        }
        CategoryDappMaxNumWas = MaxNumNow;
    }
}


var MapIPSend = {};
HostingCaller.SendHexTx = function (Params,response,ArrPath,request)
{
    if(typeof Params === "object" && typeof Params.Hex === "string")
        Params.Hex += "000000000000000000000000";
    return HostingCaller.SendTransactionHex(Params, response, ArrPath, request);
}

HostingCaller.SendTransactionHex = function (Params,response,ArrPath,request)
{
    if(typeof Params !== "object" || !Params.Hex)
        return {result:0, text:"object required"};
    
    var ip = request.socket.remoteAddress;
    var Item = MapIPSend[ip];
    if(!Item)
    {
        Item = {StartTime:0, Count:0};
        MapIPSend[ip] = Item;
    }
    
    var Delta = Date.now() - Item.StartTime;
    if(Delta > 600 * 1000)
    {
        Item.StartTime = Date.now();
        Item.Count = 0;
    }
    Item.Count++;
    if(Item.Count > global.MAX_TX_FROM_WEB_IP)
    {
        var Str = "Too many requests from the user. Count=" + Item.Count;
        ToLogOne("AddTransactionFromWeb: " + Str + " from ip: " + ip);
        
        var Result = {result:0, text:Str};
        response.end(JSON.stringify(Result));
        return null;
    }
    
    process.RunRPC("AddTransactionFromWeb", {HexValue:Params.Hex}, function (Err,Data)
    {
        var Result = Data.Result;
        var text = TR_MAP_RESULT[Result];
        
        var Result2 = {result:(Result > 0 ? 1 : 0), text:text, _BlockNum:Data._BlockNum, _TxID:Data._TxID};
        var Str = JSON.stringify(Result2);
        response.end(Str);
    });
    return null;
}



HostingCaller.DappSmartHTMLFile = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    return HTTPCaller.DappSmartHTMLFile(Params);
}
HostingCaller.DappBlockFile = function (Params,responce)
{
    if(typeof Params !== "object")
        return {result:0};
    
    return HTTPCaller.DappBlockFile(Params, responce);
}

HostingCaller.DappInfo = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    var SmartNum = ParseNum(Params.Smart);
    process.send({cmd:"SetSmartEvent", Smart:SmartNum});
    
    var Context = GetUserContext(Params);
    
    var Ret = HTTPCaller.DappInfo(Params, undefined, 1);
    Ret.PubKey = undefined;
    
    var StrInfo = JSON.stringify(Ret);
    if(!Params.AllData && Context.PrevDappInfo === StrInfo)
    {
        Ret = {result:2, cache:1, Session:Context.Session};
    }
    else
    {
        Context.PrevDappInfo = StrInfo;
        Context.NumDappInfo++;
        Context.LastTime = Date.now();
    }
    
    Ret.NumDappInfo = Context.NumDappInfo;
    Ret.CurTime = Date.now();
    Ret.CurBlockNum = GetCurrentBlockNumByTime();
    Ret.MaxAccID = ACCOUNTS.GetMaxAccount();
    Ret.MaxDappsID = SMARTS.GetMaxNum();
    
    return Ret;
}

HostingCaller.DappWalletList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    var Ret = HostingCaller.GetAccountListByKey(Params, undefined, undefined, 1);
    
    var Smart = ParseNum(Params.Smart);
    
    var arr = [];
    for(var i = 0; i < Ret.arr.length; i++)
    {
        if(Params.AllAccounts || Ret.arr[i].Value.Smart === Smart)
        {
            arr.push(Ret.arr[i]);
        }
    }
    Ret.arr = arr;
    
    return Ret;
}
HTTPCaller.DappWalletList = HostingCaller.DappWalletList;


HostingCaller.DappAccountList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    Params.CountNum = ParseNum(Params.CountNum);
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    var arr = ACCOUNTS.GetRowsAccounts(ParseNum(Params.StartNum), Params.CountNum, undefined, 1);
    return {arr:arr, result:1};
}

function DappAccount(response,StrNum)
{
    var Num = parseInt(StrNum);
    var arr = ACCOUNTS.GetRowsAccounts(Num, 1, undefined, 1);
    var Data = {Item:arr[0], result:1};
    response.writeHead(200, {'Content-Type':"text/plain", "X-Content-Type-Options":"nosniff"});
    response.end(JSON.stringify(Data));
}

HostingCaller.DappSmartList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    Params.CountNum = ParseNum(Params.CountNum);
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    var arr = SMARTS.GetRows(ParseNum(Params.StartNum), Params.CountNum, undefined, undefined, Params.GetAllData, Params.TokenGenerate,
    Params.AllRow);
    return {arr:arr, result:1};
}

HostingCaller.DappBlockList = function (Params,response)
{
    if(typeof Params !== "object")
        return {result:0};
    
    Params.StartNum = ParseNum(Params.StartNum);
    Params.CountNum = ParseNum(Params.CountNum);
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    return HTTPCaller.DappBlockList(Params, response);
}

HostingCaller.DappTransactionList = function (Params,response)
{
    if(typeof Params !== "object")
        return {result:0};
    
    Params.BlockNum = ParseNum(Params.BlockNum);
    Params.StartNum = ParseNum(Params.StartNum);
    Params.CountNum = ParseNum(Params.CountNum);
    
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    return HTTPCaller.DappTransactionList(Params, response);
}

HostingCaller.DappStaticCall = function (Params,response)
{
    if(typeof Params !== "object")
        return {result:0};
    
    return HTTPCaller.DappStaticCall(Params, response);
}


HostingCaller.GetHistoryTransactions = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    return HTTPCaller.GetHistoryTransactions(Params);
}

HostingCaller.GetSupplyCalc = function (Params)
{
    var BlockNum = GetCurrentBlockNumByTime();
    var BlockNum0 = 63538017;
    var RestAcc0 = 359939214;
    var Delta = BlockNum - BlockNum0;
    var DeltaReward = Math.floor(Delta * NEW_FORMULA_JINN_KTERA * RestAcc0 / TOTAL_SUPPLY_TERA);
    return TOTAL_SUPPLY_TERA - RestAcc0 + DeltaReward;
}

HostingCaller.GetSupply = function (Params)
{
    if(global.NOT_RUN)
    {
        return HostingCaller.GetSupplyCalc(Params);
    }
    
    var Data = ACCOUNTS.ReadState(0);
    if(!Data)
        return "";
    else
    {
        return "" + (global.TOTAL_SUPPLY_TERA - Data.Value.SumCOIN);
    }
}

HostingCaller.GetTotalSupply = function (Params)
{
    return "" + global.TOTAL_SUPPLY_TERA;
}

//Mining RPC


HostingCaller.GetWork = function (Params)
{
    if(!global.USE_API_MINING)
        return {result:0, text:"Need set const USE_API_MINING:1"};
    
    if(!GlMiningBlock)
        return {result:0};
    
    var Period = Date.now() - GlMiningBlock.Time;
    if(Period < 0 || Period > global.CONSENSUS_PERIOD_TIME)
        return {result:0};
    
    var RetData = CopyObjKeys({}, GlMiningBlock);
    RetData.result = 1;
    RetData.Period = Period;
    RetData.Time =  + GetCurrentTime();
    RetData.FIRST_TIME_BLOCK = FIRST_TIME_BLOCK;
    RetData.CONSENSUS_PERIOD_TIME = CONSENSUS_PERIOD_TIME;
    
    return RetData;
}

HostingCaller.SubmitWork = function (Params)
{
    
    if(!global.USE_API_MINING)
        return {result:0, text:"Need set const USE_API_MINING:1"};
    if(!GlMiningBlock || GlMiningBlock.BlockNum !== Params.BlockNum)
        return {result: - 1, text:"Bad BlockNum"};
    
    if(GlMiningBlock.SeqHash !== Params.SeqHash)
        return {result: - 1, text:"Bad SeqHash"};
    
    var Period = Date.now() - GlMiningBlock.Time;
    if(Period < 0 || Period > global.CONSENSUS_PERIOD_TIME)
        return {result: - 1, text:"Bad Period"};
    
    if(!HexToArr(Params, "PrevHash"))
        return {result: - 1, text:"Bad format PrevHash"};
    if(!HexToArr(Params, "SeqHash"))
        return {result: - 1, text:"Bad format SeqHash"};
    if(!HexToArr(Params, "AddrHash"))
        return {result: - 1, text:"Bad format AddrHash"};
    
    var msg = {cmd:"POW", BlockNum:Params.BlockNum, PrevHash:Params.PrevHash, SeqHash:Params.SeqHash, AddrHash:Params.AddrHash,
    };
    
    process.send(msg);
    
    return {result:1};
}

HostingCaller.SubmitHashrate = function (Params)
{
    return {result:0};
}

function HexToArr(Params,Name)
{
    var Str = Params[Name];
    if(typeof Str === "string" && Str.length === 64)
    {
        var Arr = GetArrFromHex(Str);
        if(Arr.length === 32)
        {
            Params[Name] = Arr;
            return 1;
        }
    }
    return 0;
}
