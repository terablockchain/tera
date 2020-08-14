/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/




global.PROCESS_NAME = "WEB";

const crypto = require('crypto');
const http = require('http'), net = require('net'), url = require('url'), fs = require('fs'), querystring = require('querystring');

global.MAX_STAT_PERIOD = 600;
require("../core/constant");
global.MAX_STAT_PERIOD = 600;
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);

require("../core/library");
require("../core/geo");

require("./child-process");

var sessionid = GetHexFromArr(crypto.randomBytes(20));

global.READ_ONLY_DB = 1;
global.MAX_STAT_PERIOD = 600;

var HostNodeList = [];
var AllNodeList = [];
var NodeBlockChain = [];



process.on('message', function (msg)
{
    switch(msg.cmd)
    {
        case "Stat":
            ADD_TO_STAT(msg.Name, msg.Value);
            break;
        case "NodeList":
            AllNodeList = msg.ValueAll;
            HostNodeList = GetArrWithWebOnly(AllNodeList);
            break;
        case "NodeBlockChain":
            NodeBlockChain = msg.Value;
            break;
            
        case "DappEvent":
            {
                AddDappEventToGlobalMap(msg.Data);
                break;
            }
            
        case "ToLogClient":
            {
                ToLogClient0(msg.Str, msg.StrKey, msg.bFinal);
                break;
            }
            
        case "RetFindTX":
            {
                if(msg.WebID)
                {
                    var F = global.GlobalRunMap[msg.WebID];
                    if(F)
                    {
                        delete global.GlobalRunMap[msg.WebID];
                        F(msg.Result, msg.ResultStr);
                        break;
                    }
                }
                
                global.ArrLogCounter++;
                ArrLogClient.push({id:global.ArrLogCounter, text:msg.ResultStr, key:msg.TX, final:msg.bFinal, time:Date.now(), });
                
                break;
            }
    }
}
);

var RedirectServer;
var HostingServer;

global.OnExit = function ()
{
    if(RedirectServer)
        RedirectServer.close();
    if(HostingServer)
        HostingServer.close();
}

if(!global.HTTP_HOSTING_PORT)
{
    ToLogTrace("global.HTTP_HOSTING_PORT=" + global.HTTP_HOSTING_PORT);
    OnExit();
    process.exit();
}

var JinnLib = require("../jinn/tera");
var Map = {"Block":1, "BlockDB":1, "Log":1, };
JinnLib.Create(Map);

global.HTTP_PORT_NUMBER = 0;
require("../core/html-server");
require("../system");

global.STAT_MODE = 1;
setInterval(PrepareStatEverySecond, 1000);

var bWasRun = 0;

if(global.HTTPS_HOSTING_DOMAIN && HTTP_HOSTING_PORT === 443)
{
    var file_sert = GetDataPath("sertif.lst");
    
    CheckCreateDir(GetDataPath("tmp"));
    
    var greenlock = require('greenlock').create({version:'draft-12', server:'https://acme-v02.api.letsencrypt.org/directory', configDir:GetDataPath('tmp'),
    });
    
    var redir = require('redirect-https')();
    RedirectServer = require('http').createServer(greenlock.middleware(redir));
    RedirectServer.on('error', function (err)
    {
        ToError('RedirectServer: ' + err.code);
    });
    RedirectServer.listen(80);
    
    var GetNewSert = 1;
    if(fs.existsSync(file_sert))
    {
        
        var certs = LoadParams(file_sert, {});
        
        var Delta = certs.expiresAt - Date.now();
        if(Delta >= 20 * 24 * 3600 * 1000)
        {
            ToLog("*************** USE EXIST SERT. ExpiresAt: " + new Date(certs.expiresAt));
            
            GetNewSert = 0;
            var tlsOptions = {key:certs.privkey, cert:certs.cert + '\r\n' + certs.chain};
            HostingServer = require('https').createServer(tlsOptions, MainHTTPFunction);
            RunListenServer();
        }
    }
    
    if(GetNewSert)
    {
        ToLog("*************** START GET NEW SERT", 0);
        
        var opts = {domains:[global.HTTPS_HOSTING_DOMAIN], email:'progr76@gmail.com', agreeTos:true, communityMember:true, };
        
        greenlock.register(opts).then(function (certs)
        {
            SaveParams(file_sert, certs);
            
            var tlsOptions = {key:certs.privkey, cert:certs.cert + '\r\n' + certs.chain};
            HostingServer = require('https').createServer(tlsOptions, MainHTTPFunction);
            
            if(!bWasRun)
                RunListenServer();
        }, function (err)
        {
            ToError(err);
        });
    }
}
else
{
    HostingServer = http.createServer(MainHTTPFunction);
    RunListenServer();
}

function MainHTTPFunction(request,response)
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
            console.log("WEB socket.error code=" + err.code);
            ToLog(err.stack, 3);
        });
    
    SetSafeResponce(response);
    
    var DataURL = url.parse(request.url);
    var Params = querystring.parse(DataURL.query);
    var Path = querystring.unescape(DataURL.pathname);
    
    var ip = request.socket.remoteAddress;
    global.WEB_LOG && ToLogWeb("" + ip + " Get Path:" + Path);
    if(global.STAT_MODE === 2)
    {
        ADD_TO_STAT("HTTP_ALL");
        response.DetailStatName = ":" + Path;
    }
    
    var Type = request.method;
    if(Type === "POST")
    {
        let Response = response;
        let postData = "";
        request.addListener("data", function (postDataChunk)
        {
            if(postData.length <= 12000 && postDataChunk.length <= 12000)
                postData += postDataChunk;
            else
            {
                var Str = "Error postDataChunk.length=" + postDataChunk.length;
                ToLog(Str, 0);
                Response.writeHead(405, {'Content-Type':'text/html'});
                Response.end(Str);
                return;
            }
        });
        
        request.addListener("end", function ()
        {
            var Data;
            if(postData && postData.length)
            {
                try
                {
                    Data = JSON.parse(postData);
                }
                catch(e)
                {
                    Response.writeHead(405, {'Content-Type':'text/html'});
                    Response.end("Error data parsing");
                    return;
                }
            }
            DoCommandNew(request, response, Type, Path, Data);
        });
    }
    else
    {
        DoCommandNew(request, response, Type, Path, Params);
    }
}

var TimeToRerun = 3000;
function RunListenServer()
{
    HostingServer.on('error', function (err)
    {
        if(err.code === 'EADDRINUSE')
        {
            TimeToRerun = Math.floor(TimeToRerun * 1.5);
            if(TimeToRerun > 1000000 * 1000)
                return;
            ToLog('Port ' + global.HTTP_HOSTING_PORT + ' in use, retrying...');
            if(HostingServer.Server)
                HostingServer.Server.close();
            setTimeout(function ()
            {
                RunListenServer();
            }, TimeToRerun);
            return;
        }
        
        ToError("H##6");
        ToError(err);
    });
    
    ToLog("Prepare to run WEB-server on port: " + global.HTTP_HOSTING_PORT);
    HostingServer.listen(global.HTTP_HOSTING_PORT, LISTEN_IP, function ()
    {
        if(!bWasRun)
            ToLog("Run WEB-server on " + LISTEN_IP + ":" + global.HTTP_HOSTING_PORT);
        bWasRun = 1;
    });
}

var IndexName = "index.html";
if(global.HTTP_START_PAGE)
    IndexName = global.HTTP_START_PAGE;
else
{
    var SiteFolder = GetNormalPathString("./SITE");
    if(!fs.existsSync(SiteFolder))
    {
        IndexName = "web-wallet.html";
    }
}

var LangPathMap = {};
LangPathMap["ru"] = 1;
LangPathMap["cn"] = 1;
LangPathMap["de"] = 1;
LangPathMap["blog"] = 1;
LangPathMap["docs"] = 1;

LangPathMap["game"] = 1;

var WalletFileMap = {};
WalletFileMap["coinlib.js"] = 1;
WalletFileMap["client.js"] = 1;
WalletFileMap["diagram.js"] = 1;
WalletFileMap["sha3.js"] = 1;
WalletFileMap["terabuf.js"] = 1;
WalletFileMap["terahashlib.js"] = 1;
WalletFileMap["wallet-web.js"] = 1;
WalletFileMap["wallet-lib.js"] = 1;

WalletFileMap["sign-lib-min.js"] = 1;

WalletFileMap["crypto-client.js"] = 1;
WalletFileMap["dapp-inner.js"] = 1;
WalletFileMap["dapp-outer.js"] = 1;
WalletFileMap["smart-vm.js"] = 1;
WalletFileMap["smart-play.js"] = 1;

WalletFileMap["lexer.js"] = 1;

WalletFileMap["marked.js"] = 1;
WalletFileMap["highlight.js"] = 1;
WalletFileMap["highlight-js.js"] = 1;
WalletFileMap["highlight-html.js"] = 1;
WalletFileMap["codes.css"] = 1;

WalletFileMap["buttons.css"] = 1;
WalletFileMap["style.css"] = 1;
WalletFileMap["wallet.css"] = 1;

WalletFileMap["history.html"] = 1;
WalletFileMap["blockviewer.html"] = 1;
WalletFileMap["web-wallet.html"] = 1;

WalletFileMap["address_book.png"] = 1;

WalletFileMap["mobile-wallet.html"] = 1;
WalletFileMap["mobile-wallet.js"] = 1;
WalletFileMap["mobile-wallet.css"] = 1;
WalletFileMap["reload.svg"] = 1;
WalletFileMap["T.svg"] = 1;
WalletFileMap["B.svg"] = 1;
WalletFileMap["blank.svg"] = 1;
WalletFileMap["info.svg"] = 1;

WalletFileMap["info.svg"] = 1;
WalletFileMap["check.svg"] = 1;
WalletFileMap["right-arrow.svg"] = 1;
WalletFileMap["down-arrow.svg"] = 1;
WalletFileMap["glass.svg"] = 1;

WalletFileMap["up.png"] = 1;
WalletFileMap["down.png"] = 1;

WalletFileMap["dapp-edit.html"] = 1;
WalletFileMap["_test-api.html"] = 1;


WalletFileMap["TeraLogo.svg"] = 1;

WalletFileMap["mobile-wallet.html"] = "web-wallet.html";
WalletFileMap["viewer.png"] = 1;
WalletFileMap["smart.png"] = 1;

if(!global.WebApi2)
    global.WebApi2 = {};
if(!global.WebApi1)
{
    global.WebApi1 = {};
}

global.HostingCaller = {};
function DoCommandNew(request,response,Type,Path,Params)
{
    if(Path.substring(0, 1) === "/")
        Path = Path.substring(1);
    
    if(global.HTTP_START_PAGE && !Path)
    {
        Path = global.HTTP_START_PAGE;
    }
    
    var ArrPath = Path.split('/', 7);
    
    if(global.AddonCommand)
    {
        if(!global.AddonCommand(request, response, Type, Path, Params, ArrPath))
            return;
    }
    
    var Caller = HostingCaller;
    var Method = ArrPath[0];
    var APIv2 = 0;
    if(ArrPath[0] === "api")
    {
        if(ArrPath[1] === "v2")
        {
            APIv2 = 1;
            if(!global.USE_HARD_API_V2)
            {
                response.writeHead(200, {'Content-Type':'text/plain', 'Access-Control-Allow-Origin':"*"});
                response.end(JSON.stringify({result:0, text:"You must set const USE_HARD_API_V2:1"}));
                return;
            }
            Caller = WebApi2;
        }
        else
            if(ArrPath[1] === "v1")
            {
                Caller = WebApi1;
            }
        Method = ArrPath[2];
    }
    if(global.STAT_MODE === 2)
    {
        ADD_TO_STAT("HTTP:" + Method);
        response.DetailStatName = ":" + Method;
    }
    
    var F = Caller[Method];
    if(F)
    {
        response.writeHead(200, {'Content-Type':'text/plain', 'Access-Control-Allow-Origin':"*"});
        
        if(!global.USE_API_V1 && !APIv2)
        {
            response.end(JSON.stringify({result:0, text:"This node not use USE_API_V1"}));
            return;
        }
        
        var Ret;
        try
        {
            Ret = F(Params, response, ArrPath, request);
        }
        catch(e)
        {
            Ret = {result:0, text:e.message, text2:e.stack};
        }
        if(Ret === null)
            return;
        
        try
        {
            var Str;
            if(typeof Ret === "object")
                Str = JSON.stringify(Ret);
            else
            {
                if(typeof Ret === "string")
                    Str = Ret;
                else
                    Str = "" + Ret;
            }
            
            response.end(Str);
        }
        catch(e)
        {
            ToLog("ERR PATH:" + Path);
            ToLog(e);
            response.end();
        }
        return;
    }
    
    Method = Method.toLowerCase();
    if(Method === "dapp" && ArrPath.length === 2)
        Method = "DappTemplateFile";
    
    switch(Method)
    {
        case "file":
            SendBlockFile(request, response, ArrPath[1], ArrPath[2]);
            break;
            
        case "DappTemplateFile":
            DappTemplateFile(request, response, ArrPath[1]);
            break;
        case "smart":
            DappSmartCodeFile(response, ArrPath[1]);
            break;
        case "client":
            DappClientCodeFile(response, ArrPath[1]);
            break;
            
        default:
            {
                var Name = ArrPath[ArrPath.length - 1];
                if(typeof Name !== "string")
                    Name = "ErrorPath";
                else
                    if(Path.indexOf("..") >= 0 || Name.indexOf("\\") >= 0 || Name.indexOf("/") >= 0)
                        Name = "ErrorFilePath";
                
                if(Name === "" || LangPathMap[Name])
                    Name = IndexName;
                
                if(Name.indexOf(".") < 0)
                    Name += ".html";
                
                var PrefixPath;
                if(Method === "files")
                {
                    PrefixPath = "../FILES";
                    Name = "";
                    for(var i = 1; i < ArrPath.length; i++)
                        if(ArrPath[i].indexOf("..") ===  - 1 && ArrPath[i].indexOf("\\") ===  - 1)
                            Name += "/" + ArrPath[i];
                    Name = PrefixPath + Name;
                    SendWebFile(request, response, Name, "", 0, 1000);
                    return;
                }
                else
                    if(Method === "update")
                    {
                        PrefixPath = global.DATA_PATH + "Update";
                        Name = "";
                        for(var i = 1; i < ArrPath.length; i++)
                            if(ArrPath[i].indexOf("..") ===  - 1 && ArrPath[i].indexOf("\\") ===  - 1)
                                Name += "/" + ArrPath[i];
                        Name = PrefixPath + Name;
                        SendWebFile(request, response, Name, "", 0, 1000);
                        return;
                    }
                    else
                        if(LangPathMap[Method])
                        {
                            PrefixPath = "./SITE/" + Method;
                        }
                        else
                        {
                            var Name2 = WalletFileMap[Name];
                            if(!Name2)
                                PrefixPath = "./SITE";
                            else
                            {
                                PrefixPath = "./HTML";
                                if(typeof Name2 === "string")
                                    Name = Name2;
                            }
                        }
                
                var type = Path.substr(Path.length - 3, 3);
                var LongTime = global.HTTP_CACHE_LONG;
                switch(type)
                {
                    case ".js":
                        if(ArrPath[0] === "Ace")
                        {
                            LongTime = 1000000;
                            Name = "./HTML/" + Path;
                        }
                        else
                        {
                            Name = PrefixPath + "/JS/" + Name;
                        }
                        break;
                    case "css":
                        Name = PrefixPath + "/CSS/" + Name;
                        break;
                    case "wav":
                    case "mp3":
                        Name = PrefixPath + "/SOUND/" + Name;
                        break;
                    case "svg":
                    case "png":
                    case "gif":
                    case "jpg":
                    case "ico":
                        Name = PrefixPath + "/PIC/" + Name;
                        break;
                        
                    case "pdf":
                    case "zip":
                    case "exe":
                    case "msi":
                        Name = PrefixPath + "/FILES/" + Name;
                        break;
                        
                    default:
                        Name = PrefixPath + "/" + Name;
                        break;
                }
                
                SendWebFile(request, response, Name, "", 1, LongTime);
                break;
            }
    }
}



HostingCaller.GetCurrentInfo = function (Params)
{
    if(typeof Params === "object" && Params.BlockChain == 1)
    {
        if(!global.USE_API_WALLET)
            return {result:0};
    }
    var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
    if(SERVER.BlockNumDBMin === undefined)
        SERVER.ReadStateTX();
    
    var Ret = {result:1, VersionNum:global.START_CODE_VERSION_NUM, VersionUpd:global.UPDATE_CODE_VERSION_NUM, NETWORK:global.NETWORK,
        MaxNumBlockDB:MaxNumBlockDB, BlockNumDBMin:SERVER.BlockNumDBMin, CurBlockNum:GetCurrentBlockNumByTime(), MaxAccID:DApps.Accounts.GetMaxAccount(),
        MaxDappsID:DApps.Smart.GetMaxNum(), CurTime:Date.now(), DELTA_CURRENT_TIME:DELTA_CURRENT_TIME, MIN_POWER_POW_TR:MIN_POWER_POW_TR,
        FIRST_TIME_BLOCK:FIRST_TIME_BLOCK, UPDATE_CODE_JINN:UPDATE_CODE_JINN, CONSENSUS_PERIOD_TIME:CONSENSUS_PERIOD_TIME, NEW_SIGN_TIME:NEW_SIGN_TIME,
        PRICE_DAO:PRICE_DAO(MaxNumBlockDB), GrayConnect:global.CLIENT_MODE, JINN_MODE:global.JINN_MODE, sessionid:sessionid, };
    
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
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    var arr = DApps.Accounts.GetRowsAccounts(ParseNum(Params.StartNum), ParseNum(Params.CountNum));
    return {result:1, arr:arr};
}

HostingCaller.GetAccount = function (id)
{
    
    id = ParseNum(id);
    var arr = DApps.Accounts.GetRowsAccounts(id, 1);
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
    
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    var arr = DApps.Smart.GetRows(ParseNum(Params.StartNum), ParseNum(Params.CountNum), undefined, Params.Filter, 1);
    return {result:1, arr:arr};
}

function GetArrWithWebOnly(arrAlive)
{
    var arrWeb = [];
    for(var i = 0; i < arrAlive.length; i++)
    {
        var Item = arrAlive[i];
        if(Item.portweb)
        {
            arrWeb.push(Item);
            if(arrWeb.length > 100)
                break;
        }
    }
    return arrWeb;
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
    var Geo = 0;
    if(typeof Params === "object" && Params.Geo)
        Geo = 1;
    
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
        if(Geo)
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
    
    var Result = {result:1, arr:arr, VersionNum:global.UPDATE_CODE_VERSION_NUM, NETWORK:global.NETWORK, };
    return Result;
}

var AccountKeyMap = {};
var LastMaxNum = 0;
HostingCaller.GetAccountListByKey = function (Params,aaa,bbb,bRet)
{
    if(typeof Params !== "object" || !Params.Key)
        return {result:0, arr:[]};
    
    if(!global.USE_API_WALLET)
        return {result:0};
    
    var Accounts = DApps.Accounts;
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
            Data.CurrencyObj = DApps.Smart.ReadSimple(Data.Currency, 1);
        if(Data.Value.Smart)
        {
            Data.SmartObj = DApps.Smart.ReadSimple(Data.Value.Smart);
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
    var MaxNumNow = DApps.Smart.GetMaxNum();
    if(MaxNumNow !== CategoryDappMaxNumWas)
    {
        for(var Num = CategoryDappMaxNumWas; Num <= MaxNumNow; Num++)
        {
            var Item = DApps.Smart.ReadSimple(Num);
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
    Ret.MaxAccID = DApps.Accounts.GetMaxAccount();
    Ret.MaxDappsID = DApps.Smart.GetMaxNum();
    
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
    
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    var arr = DApps.Accounts.GetRowsAccounts(ParseNum(Params.StartNum), ParseNum(Params.CountNum), undefined, 1);
    return {arr:arr, result:1};
}
HostingCaller.DappSmartList = function (Params)
{
    if(typeof Params !== "object")
        return {result:0};
    
    if(Params.CountNum > MaxCountViewRows)
        Params.CountNum = MaxCountViewRows;
    if(!Params.CountNum)
        Params.CountNum = 1;
    
    var arr = DApps.Smart.GetRows(ParseNum(Params.StartNum), ParseNum(Params.CountNum), undefined, undefined, Params.GetAllData,
    Params.TokenGenerate);
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
    
    var Data = DApps.Accounts.ReadState(0);
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



setInterval(function ()
{
    
    var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
    
    var HASHARATE_BLOCK_LENGTH = 10;
    var arr = SERVER.GetStatBlockchain("POWER_BLOCKCHAIN", HASHARATE_BLOCK_LENGTH);
    if(arr.length)
    {
        var SumPow = 0;
        var Count = 0;
        var Value = 0;
        for(var i = arr.length - HASHARATE_BLOCK_LENGTH; i < arr.length; i++)
            if(arr[i])
            {
                Value = arr[i];
                SumPow += Value;
                Count++;
            }
        if(!Count)
            Count = 1;
        
        var AvgPow = SumPow / Count;
        ADD_TO_STAT("MAX:HASH_RATE_B", AvgPow);
    }
    
    var Count = COUNT_BLOCK_PROOF;
    if(MaxNumBlockDB > Count)
    {
        var StartNum = MaxNumBlockDB - Count + 1;
        NodeBlockChain = SERVER.BlockChainToBuf(StartNum, StartNum, MaxNumBlockDB);
    }
}
, 700);




require("./api-exchange.js");

try
{
    require("../SITE/JS/web-addon.js");
}
catch(e)
{
}



global.LoadBlockFromNetwork = function (Params,F)
{
    ToLog("RUN: LoadBlockFromNetwork:" + Params.BlockNum, 2);
    
    process.RunRPC("LoadBlockFromNetwork", {BlockNum:Params.BlockNum, F:1}, function (Err,Block)
    {
        ToLog("RETURN: LoadBlockFromNetwork: " + Params.BlockNum, 2);
        F(Err, Block);
    });
}

global.WebApi1.DappStaticCall = global.HostingCaller.DappStaticCall;
global.WebApi1.GetCurrentInfo = global.HostingCaller.GetCurrentInfo;
global.WebApi1.GetNodeList = global.HostingCaller.GetNodeList;
global.WebApi1.GetAccountList = global.HostingCaller.GetAccountList;
global.WebApi1.GetBlockList = global.HostingCaller.GetBlockList;
global.WebApi1.GetTransactionList = global.HostingCaller.GetTransactionList;
global.WebApi1.GetDappList = global.HostingCaller.GetDappList;
global.WebApi1.GetAccountListByKey = global.HostingCaller.GetAccountListByKey;

global.WebApi1.GetTransaction = global.WebApi2.GetTransaction;
global.WebApi1.GetHistoryTransactions = global.WebApi2.GetHistoryTransactions;

global.WebApi1.SendTransactionHex = global.HostingCaller.SendTransactionHex;
