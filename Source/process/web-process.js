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



global.PROCESS_NAME = "WEB";

function GetDefaultPage()
{
    if(global.HTTP_START_PAGE)
    {
        if(global.HTTP_START_PAGE === "WWW")
            return "/index.html";

        return global.HTTP_START_PAGE;
    }
    else
        return "web-wallet.html";
}


const http = require('http'), net = require('net'), url = require('url'), fs = require('fs'), querystring = require('querystring');

global.MAX_STAT_PERIOD = 600;
require("../core/constant");
global.MAX_STAT_PERIOD = 600;
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);

require("../core/library");
require("../core/geo");

require("./child-process");

global.READ_ONLY_DB = 1;
global.MAX_STAT_PERIOD = 600;

global.HostNodeList = [];
global.AllNodeList = [];
global.NodeBlockChain = [];

global.GlMiningBlock = undefined;

process.on('message', function (msg)
{
    switch(msg.cmd)
    {
        case "Stat":
            for(var i=0;i<msg.Arr.length;i++)
                ADD_TO_STAT(msg.Arr[i].Name, msg.Arr[i].Value);
            break;
        case "NodeList":
            global.AllNodeList = msg.ValueAll;
            global.HostNodeList = GetArrWithWebOnly(AllNodeList);
            break;
        case "NodeBlockChain":
            global.NodeBlockChain = msg.Value;
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
            
        case "WalletEvent":
            {
                AddToArrClient(msg.ResultStr, msg.TX, msg.bFinal, Date.now(),msg.BlockNum,msg.TrNum);
                break;
            }
            
        case "MiningBlock":
            global.GlMiningBlock = msg.Value;
            break;
    }
}
);

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

var RedirectServer;
var HostingServer;

global.OnExit = function ()
{
    if(RedirectServer)
        RedirectServer.close();
    if(HostingServer)
        HostingServer.close();
};

if(!global.HTTP_HOSTING_PORT)
{
    ToLogTrace("global.HTTP_HOSTING_PORT=" + global.HTTP_HOSTING_PORT);
    OnExit();
    process.exit();
}
global.HTTP_HOSTING_PORT =  + global.HTTP_HOSTING_PORT;

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
    
    const CSertificate = require("./web-sert");
    global.glSertEngine = new CSertificate(greenlock);
    glSertEngine.StartCheck();
    
    if(glSertEngine.HasValidSertificate(0))
    {
        ToLog("*************** USE EXIST SERT. ExpiresAt: " + new Date(glSertEngine.certs.expiresAt));
        HostingServer = require('https').createServer(glSertEngine.tlsOptions, MainHTTPFunction);
        RunListenServer();
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

    if(!Path || Path==="/")
    {
        Path = GetDefaultPage();
    }

    var ip = request.socket.remoteAddress;
    global.WEB_LOG && ToLogWeb("" + ip + " Get Path:" + Path);
    
    Path = GetSafePath(Path);
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
            if(postData.length <= 65000 && postDataChunk.length <= 65000)
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


var WalletFileMap = {};
WalletFileMap["mobile-wallet.html"] = "web-wallet.html";

if(!global.WebApi2)
    global.WebApi2 = {};
if(!global.WebApi1)
{
    global.WebApi1 = {};
}

function DoCommandNew(request,response,Type,Path,Params)
{
    if(global.HTTP_START_PAGE === "WWW")
        return DoCommandWWW(request, response, Type, Path, Params);

    if(Path.substring(0, 1) === "/")
        Path = Path.substring(1);

//
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
    else
    {
        if(!global.USE_API_WALLET)
        {
            response.end();
            return;
        }
    }
    if(global.STAT_MODE === 2)
    {
        ADD_TO_STAT("HTTP:" + Method);
        response.DetailStatName = ":" + Method;
    }
    
    var F = Caller[Method];
    if(F)
    {
        //console.log(Method,ArrPath);

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
    if(!Method)
        return;

    Method = Method.toLowerCase();
    if(Method === "dapp" && ArrPath.length === 2)
        Method = "DappTemplateFile";
    
    switch(Method)
    {
        case "file":
            SendBlockFile(request, response, ArrPath[1], ArrPath[2]);
            break;

        case "nft":
            SendNFTFile(request, response, ArrPath[1]);
            break;

        case "DappTemplateFile":
            DappTemplateFile(request, response, ArrPath[1]);
            break;
        case "smart":
            DappSmartCodeFile(response, ArrPath[1]);
            break;
        case "account":
            DappAccount(response, ArrPath[1]);
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
                
                if(Name === "")
                    Name = GetDefaultPage();
                
                if(Name.indexOf(".") < 0)
                    Name += ".html";
                
                var PrefixPath;
                if(Method === "files")
                {
                    PrefixPath = "../FILES";
                    Name = "";
                    for(var i = 1; i < ArrPath.length; i++)
                        if(ArrPath[i] && ArrPath[i].indexOf("..") ===  - 1 && ArrPath[i].indexOf("\\") ===  - 1)
                            Name += "/" + ArrPath[i];
                    Name = PrefixPath + Name;
                    SendWebFile(request, response, Name, "", 0, 1000);
                    return;
                }
                else
                    if(Method === "shard.js")
                    {
                        var ShardParamPath = GetDataPath("shard.js");
                        SendWebFile(request, response, ShardParamPath, "", 0, 1000);
                        return;
                    }
                    else
                        if(Method === "update")
                        {
                            PrefixPath = global.DATA_PATH + "Update";
                            Name = "";
                            for(var i = 1; i < ArrPath.length; i++)
                                if(ArrPath[i] && ArrPath[i].indexOf("..") ===  - 1 && ArrPath[i].indexOf("\\") ===  - 1)
                                    Name += "/" + ArrPath[i];
                            Name = PrefixPath + Name;
                            SendWebFile(request, response, Name, "", 0, 1000);
                            return;
                        }
                        else
                        {
                            var Name2 = WalletFileMap[Name];
                            PrefixPath = "./HTML";
                            if(typeof Name2 === "string")
                                Name = Name2;
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

function DoCommandWWW(request,response,Type,Path,Params,ArrPath)
{
    //console.log(Path);
    if(!Path || Path.substring(Path.length - 1) === "/")
        Path += "index.html";
    
    var ArrPath = Path.split('/', 7);
    if(global.AddonCommand)
    {
        if(!global.AddonCommand(request, response, Type, Path, Params, ArrPath))
            return;
    }
    
    var Name = "../WWW";
    for(var i = 1; i < ArrPath.length; i++)
        if(ArrPath[i] && ArrPath[i].indexOf("..") ===  - 1 && ArrPath[i].indexOf("\\") ===  - 1)
            Name += "/" + ArrPath[i];
    
    SendWebFile(request, response, Name, "", 0, 1000);
}

function GetSafePath(filename)
{
    if(filename.indexOf('\0') !==  - 1)
    {
        return "";
    }
    
    filename = filename.replace(/\~/g, "");
    filename = filename.replace(/\.\./g, "");
    filename = filename.replace(/\/\//g, "");
    
    return filename;
}

require("../rpc/api-v1.js");





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
        global.NodeBlockChain = SERVER.BlockChainToBuf(StartNum, StartNum, MaxNumBlockDB);
    }
}
, 700);




require("../rpc/api-v2-exchange.js");

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
global.WebApi1.GetBalance = global.WebApi2.GetBalance;


global.WebApi1.SendTransactionHex = global.HostingCaller.SendTransactionHex;

global.WebApi1.GetWork = global.HostingCaller.GetWork;
global.WebApi1.SubmitWork = global.HostingCaller.SubmitWork;
global.WebApi1.SubmitHashrate = global.HostingCaller.SubmitHashrate;

global.WebApi1.SendHexTx = global.HostingCaller.SendHexTx;
global.WebApi1.GetFormatTx = global.HostingCaller.GetFormatTx;
