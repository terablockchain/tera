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
    
    var ScriptLW = "";
    var StrPath = ".";
    if(GetMainServer())
    {
        StrPath = GetProtocolServerPath();
        Code = Code.replace(/\/CSS\/[0-9a-z_-]+.css\">/g, StrPath + "$&");
        Code = Code.replace(/\/JS\/[0-9a-z_-]+.js\">/g, StrPath + "$&");
        Code = Code.replace(/\/file\/[0-9]+\/[0-9]+\"/g, StrPath + "$&");

        //console.log("Code:",Code);
        ScriptLW = '<script>window.PROTOCOL_SERVER_PATH="' + StrPath + '";<\/script>';

        //console.log("Code:",Code);

        if(isMobile())
            StrPath = ".";
    }
    if(isMobile())
    {
        StrPath = GetProtocolServerPath();
    }

    ScriptLW+=`<script>window.NETWORK_ID="${window.NETWORK_ID}";window.NETWORK_NAME="${window.NETWORK_NAME}";window.SHARD_NAME="${window.SHARD_NAME}";window.SMART_NUM=${SMART.Num};<\/script>`;
    //console.log("CreateFrame NETWORK_ID",NETWORK_ID);
    
    Code = ScriptLW + '\
    <meta charset="UTF-8">\
    <meta http-equiv="X-Frame-Options" value="sameorigin">\
    <script type="text/javascript" src="' + StrPath + '/JS/sha3.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/client.js"><\/script>\
    \<script type="text/javascript" src="' + StrPath + '/JS/client-promise.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/client-tokens.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/client-tx.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/crypto-client.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/coinlib.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/dapp-inner.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/terahashlib.js"><\/script>\
    <script type="text/javascript" src="' + StrPath + '/JS/terabuf.js"><\/script>\
    ' + Code;


    if($("idModalCSS"))
    {
        Code += $("idModalCSS").outerHTML;
        Code += $("idOverlay").outerHTML;
        Code += $("idConfirm").outerHTML;
    }

    iframe.srcdoc = Code;
    Parent.appendChild(iframe);

    CorrectFrameSize();

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
                ToLog("The method is deprecated and no longer supported. Use StartTransfer.");
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

                SendCallMethod(Data.Account, Data.MethodName, Data.Params, Data.ParamsArr, Data.FromNum, glSmart,RetSendTx,Data,Data.Confirm,Data.TxTicks);

                break;
            }
        case "StartTransfer":
        {
            Data.Smart=glSmart;
            //Data.Account=BASE_ACCOUNT.Num;

            AddToTransfer(Data);

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
        case "DappGetBalance":
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
                        Data.Value = SetData.Value;
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
                OpenWindow(Path, 1,Data.Location);
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
                CreateNewAccount(Data.Currency,Data.Name,Data.PubKey,RetSendTx,Data,Data.Confirm);
                break;
            }
        case "ReloadDapp":
            {
                ReloadDapp();
                break;
            }
        case "ethereum-installed":
            {
                Data.cmd = "Result";
                Data.Result = Boolean(window.ethereum && window.ethereum.isMetaMask);
                SendMessage(Data);
                break;
            }
            
        case "ethereum-request":
            {
                if(!window.ethereum)
                {
                    Data.cmd = "Result";
                    Data.Result = "Metamask not installed";
                    Data.Err = 1;
                    SendMessage(Data);
                    return;
                }

                window.ethereum.request(Data.Params).then(function (Result)
                {
                    Data.cmd = "Result";
                    Data.Result = Result;
                    //console.log("Result",Result);
                    SendMessage(Data);
                }).catch(function (Result)
                {
                    Data.cmd = "Result";
                    Data.Result = Result;
                    Data.Err = 1;
                    //console.error(Result);
                    SendMessage(Data);
                });
                break;
            }
            
        case "ethereum-on":
            {
                if(window.ethereum)
                window.ethereum.on(Data.Name, function (Result)
                {
                    Data.cmd = "ResultOn";
                    Data.Result = Result;
                    SendMessage(Data);
                });
                break;
            }
        case "ethereum-off":
            {
                if(window.ethereum)
                window.ethereum.removeListener(Data.Name, function (Result)
                {
                    Data.cmd = "Result";
                    Data.Result = Result;
                    SendMessage(Data);
                });
                break;
            }
            
        case "ethereum-selected":
            {
                Data.cmd = "Result";
                Data.Result = window.ethereum.selectedAddress;
                SendMessage(Data);
                break;
            }
        case "Show":
            SetVisibleBlock("idFrame", 1);
            break;
        case "Close":
            CloseDapp();
            break;
    }
}

function CloseDapp()
{
    //console.log("CloseDapp");
    idFrame.srcdoc="";
    if(parent.closeIFrame)
    {
        //console.log("closeIFrame");
        parent.closeIFrame();
    }
    else
    {
        //console.log(window.history.length);
        if(window.history.length)
        {
            //console.log("Back");
            window.history.back();
            window.close();
        }
        else
        {
            //console.log("CloseWindow");
            window.close();
        }
    }
}

function RetSendTx(Err,TR, Body, Text, Context)
{
    Context.cmd="DATA";
    Context.result=Err?0:1;
    Context.Err=Err;
    Context.TR=TR;
    Context.Text=Text;
    SendMessage(Context);
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
        //console.log(SetData)
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
                
                if(!IsFullNode())
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
        if(typeof Item.text==="string" && Item.text.indexOf("Add to blockchain") >= 0)
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


