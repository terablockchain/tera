/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var EmulateStorage;
var EmulateSessionStorage;

var MAX_DELTA_IGNORE_BUFFER = 10;
var DAPPPREFIX = "DAPP-";
var NumDappGet = 0;
var NumDappInfo = 0;

var DapNumber;
var glSmart;
var SMART = {}, BASE_ACCOUNT = {}, OPEN_PATH = "";
if(window.addEventListener)
{
    window.addEventListener("message", DappListener);
}
else
{
    window.attachEvent("onmessage", DappListener);
}

function CreateFrame(Code,Parent)
{
    
    if(!Parent)
        Parent = document.getElementsByTagName('body')[0];
    
    var element = $("idFrame");
    if(element)
        element.outerHTML = "";
    
    var iframe = document.createElement('iframe');
    iframe.id = "idFrame";
    iframe.name = 'dapp';
    iframe.sandbox = "allow-scripts";
    
    var SriptLW = "";
    var StrPath = ".";
    if(MainServer)
    {
        StrPath = GetProtocolServerPath(MainServer);
        Code = Code.replace(/.\/CSS\/[0-9a-z_-]+.css\">/g, StrPath + "$&");
        Code = Code.replace(/.\/JS\/[0-9a-z_-]+.js\">/g, StrPath + "$&");
        Code = Code.replace(/\/file\/[0-9]+\/[0-9]+\"/g, StrPath + "$&");
        SriptLW = '<script>window.PROTOCOL_SERVER_PATH="' + StrPath + '";<\/script>';
        
        if(isMobile())
            StrPath = ".";
    }
    if(isMobile())
    {
        StrPath = GetProtocolServerPath(MainServer);
    }
    
    Code = SriptLW + '\
    <meta charset="UTF-8">\
    <meta http-equiv="X-Frame-Options" value="sameorigin">\
    <script type="text/javascript" src="' + StrPath + '/JS/sha3.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/client.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/crypto-client.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/coinlib.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/dapp-inner.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/terahashlib.js"><\/script>\
    ' + Code;
    
    if($("idModalCSS"))
    {
        Code += $("idModalCSS").outerHTML;
        Code += $("idOverlay").outerHTML;
        Code += $("idConfirm").outerHTML;
    }
    
    iframe.srcdoc = Code;
    Parent.appendChild(iframe);
    
    setTimeout(function ()
    {
        SetVisibleBlock("idFrame", 1);
    }, 2000);
}

function SendMessage(Data)
{
    var win = window.frames.dapp;
    if(!win)
    {
        ToLog("Error window.frames.dapp");
        setTimeout(function ()
        {
            win.postMessage(Data, "*");
        }, 200);
        return;
    }
    win.postMessage(Data, "*");
}

function DappListener(event)
{
    var Data = event.data;
    if(!Data || typeof Data !== "object")
        return;
    
    var CurStorage = Storage;
    var CurSessionStorage = sessionStorage;
    
    if(EmulateStorage)
        CurStorage = EmulateStorage;
    if(EmulateSessionStorage)
        CurSessionStorage = EmulateSessionStorage;
    
    switch(Data.cmd)
    {
        case "translate":
            {
                DoTranslate(Data);
                break;
            }
        case "pay":
            {
                ToLog("The method is deprecated and no longer supported.");
                break;
            }
        case "setstorage":
            {
                CurStorage.setItem(DAPPPREFIX + DapNumber + "-" + Data.Key, JSON.stringify(Data.Value));
                break;
            }
        case "getstorage":
            {
                Data.Value = CurStorage.getItem(DAPPPREFIX + DapNumber + "-" + Data.Key);
                if(Data.Value && Data.Value !== "undefined")
                    try
                    {
                        Data.Value = JSON.parse(Data.Value);
                    }
                    catch(e)
                    {
                    }
                SendMessage(Data);
                break;
            }
        case "setcommon":
            {
                CurStorage.setItem(DAPPPREFIX + "COMMON-" + Data.Key, JSON.stringify(Data.Value));
                break;
            }
        case "getcommon":
            {
                Data.Value = CurStorage.getItem(DAPPPREFIX + "COMMON-" + Data.Key);
                if(Data.Value && Data.Value !== "undefined")
                    try
                    {
                        Data.Value = JSON.parse(Data.Value);
                    }
                    catch(e)
                    {
                    }
                SendMessage(Data);
                break;
            }
            
        case "DappStaticCall":
            {
                if(!Data.Account)
                    Data.Account = BASE_ACCOUNT.Num;
                DoGetData("DappStaticCall", {Account:Data.Account, MethodName:Data.MethodName, Params:Data.Params}, function (SetData)
                {
                    if(SetData)
                    {
                        Data.Err = !SetData.result;
                        Data.RetValue = SetData.RetValue;
                    }
                    else
                    {
                        Data.Err = 1;
                    }
                    SendMessage(Data);
                });
                
                break;
            }
        case "DappSendCall":
            {
                if(!Data.Account)
                    Data.Account = BASE_ACCOUNT.Num;
                if(!Data.FromNum)
                    Data.FromNum = 0;
                
                SendCallMethod(Data.Account, Data.MethodName, Data.Params, Data.ParamsArr, Data.FromNum, glSmart);
                
                break;
            }
        case "DappInfo":
            {
                DoDappInfo(Data);
                break;
            }
        case "DappWalletList":
            var Key = GetPubKey();
            Data.Params = {Smart:glSmart, Key:Key};
        case "DappSmartHTMLFile":
        case "DappBlockFile":
        case "DappAccountList":
        case "DappSmartList":
        case "DappBlockList":
        case "DappTransactionList":
            {
                var StrKeyStorage = undefined;
                if(Data.cmd === "DappBlockFile" && Data.Params.BlockNum <= CONFIG_DATA.CurBlockNum - MAX_DELTA_IGNORE_BUFFER)
                {
                    StrKeyStorage = Data.Params.BlockNum + "-" + Data.Params.TrNum;
                    
                    var SavedTextData = CurSessionStorage[StrKeyStorage];
                    if(SavedTextData)
                    {
                        var SetData = JSON.parse(SavedTextData);
                        Data.Err = !SetData.result;
                        Data.arr = SetData.arr;
                        Data.Body = SetData.Body;
                        SendMessage(Data);
                        return;
                    }
                }
                
                Data.Params.Session = glSession;
                DoGetData(Data.cmd, Data.Params, function (SetData,responseText)
                {
                    if(SetData)
                    {
                        Data.Err = !SetData.result;
                        Data.arr = SetData.arr;
                        Data.Body = SetData.Body;
                        SendMessage(Data);
                        if(StrKeyStorage && SetData.result)
                        {
                            CurSessionStorage[StrKeyStorage] = responseText;
                        }
                    }
                });
                break;
            }
            
        case "SetStatus":
            {
                SetStatus(Data.Message);
                break;
            }
        case "SetError":
            {
                SetError(Data.Message);
                break;
            }
        case "CheckInstall":
            {
                CheckInstall();
                break;
            }
        case "SetLocationHash":
            {
                SetLocationHash("#" + Data.Message);
                break;
            }
        case "OpenLink":
            {
                var Path = Data.Message.substr(0, 200);
                if(IsLocalClient() && Path.substr(0, 6) === "/dapp/")
                    Path = "?dapp=" + Path.substr(6);
                OpenWindow(Path, 1);
                break;
            }
        case "ComputeSecret":
            {
                DoComputeSecret(Data.Account, Data.PubKey, function (Result)
                {
                    Data.Result = Result;
                    SendMessage(Data);
                });
                break;
            }
        case "SetMobileMode":
            {
                SetMobileMode();
                break;
            }
            
        case "CreateNewAccount":
            {
                CreateNewAccount(Data.Currency);
                break;
            }
        case "ReloadDapp":
            {
                ReloadDapp();
                break;
            }
    }
}

function DoDappInfo(Data)
{
    var AllData = 0;
    if(Data.AllData || !NumDappGet || NumDappGet % 60 === 0)
        AllData = 1;
    NumDappGet++;
    
    var Key = GetPubKey();
    GetData("DappInfo", {Smart:glSmart, Key:Key, Session:glSession, NumDappInfo:NumDappInfo, AllData:AllData, AllAccounts:Data.AllAccounts},
    function (SetData)
    {
        if(SetData)
        {
            Data.Err = !SetData.result;
            if(SetData.result)
            {
                if(SetData.cache)
                {
                    for(var key in SetData)
                        CONFIG_DATA[key] = SetData[key];
                    SetData = CONFIG_DATA;
                }
                else
                {
                    CONFIG_DATA = SetData;
                    SMART = SetData.Smart;
                    BASE_ACCOUNT = SetData.Account;
                }
                SetArrLog(SetData.ArrLog);
                
                NumDappInfo = SetData.NumDappInfo;
                SetBlockChainConstant(SetData);
                
                for(var key in SetData)
                    Data[key] = SetData[key];
                Data.OPEN_PATH = OPEN_PATH;
                
                if(!Storage.getItem("BIGWALLET"))
                {
                    Data.PubKey = GetPubKey();
                    Data.WalletCanSign = IsPrivateMode(GetPrivKey());
                    Data.WalletIsOpen = Data.WalletCanSign;
                }
                
                CONFIG_DATA.WalletCanSign = Data.WalletCanSign;
                CONFIG_DATA.PubKey = Data.PubKey;
                Data.CanReloadDapp = 1;
            }
            
            if(Data.ArrEvent)
            {
                for(var i = 0; i < Data.ArrEvent.length; i++)
                {
                    var Item = Data.ArrEvent[i];
                    if(typeof Item.Description === "string")
                    {
                        SetStatusBlockNum(Item.Description, Item.BlockNum);
                    }
                }
            }
            
            SendMessage(Data);
        }
    });
}

function SetArrLog(arr)
{
    if(!arr)
        return;
    for(var i = 0; i < arr.length; i++)
    {
        var Item = arr[i];
        if(!Item.final)
            continue;
        if(Item.text.indexOf("Add to blockchain") >= 0)
            continue;
        
        var TR = MapSendTransaction[Item.key];
        if(TR && !TR.WasSend && Item.final < 1)
        {
            var Data = {};
            Data.cmd = "OnEvent";
            if(isMobile())
                Data.Description = Item.text;
            else
                Data.Description = "Error: " + Item.text;
            Data.Error = 1;
            
            SerErrorBlockNum(Item.text, TR.BlockNum);
            SendMessage(Data);
            TR.WasSend = 1;
        }
    }
}

function DoGetData(Name,Data,Func)
{
    return GetData(Name, Data, Func);
}

function DoComputeSecret(Account,PubKey,F)
{
    ComputeSecret(Account, PubKey, glSmart, function (Result)
    {
        F(Result);
    });
}
