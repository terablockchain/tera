/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var ALL_DATA_ONCE = 1;
var SMART = {}, BASE_ACCOUNT = {}, INFO = {}, USER_ACCOUNT = [], USER_ACCOUNT_MAP = {}, OPEN_PATH = "", ACCOUNT_OPEN_NUM = 0;
var ALL_ACCOUNTS = 0;

function SendPay(Data)
{
    Data.cmd = "pay";
    SendData(Data);
}

function SetStorage(Key,Value)
{
    var Data = {cmd:"setstorage", Key:Key, Value:Value};
    SendData(Data);
}

function GetStorage(Key,F)
{
    var Data = {cmd:"getstorage", Key:Key};
    SendData(Data, F);
}
function SetCommon(Key,Value)
{
    var Data = {cmd:"setcommon", Key:Key, Value:Value};
    SendData(Data);
}
function GetCommon(Key,F)
{
    var Data = {cmd:"getcommon", Key:Key};
    SendData(Data, F);
}

function GetInfo(F)
{
    var Data = {cmd:"DappInfo", AllAccounts:ALL_ACCOUNTS, AllData:ALL_DATA_ONCE};
    ALL_DATA_ONCE = 0;
    SendData(Data, F);
}

function Call(Account,MethodName,Params,A,B)
{
    var F, ParamsArr;
    if(typeof A === "function")
    {
        F = A;
        ParamsArr = B;
    }
    else
    {
        F = B;
        ParamsArr = A;
    }
    var Data = {cmd:"DappStaticCall", MethodName:MethodName, Params:Params, ParamsArr:ParamsArr, Account:Account};
    SendData(Data, F);
}
function SendCall(Account,MethodName,Params,A,B)
{
    if(!INFO.WalletCanSign)
    {
        SetError("PLS, OPEN WALLET");
        return 0;
    }
    
    var FromNum, ParamsArr;
    if(typeof A === "number")
    {
        FromNum = A;
        ParamsArr = B;
    }
    else
    {
        FromNum = B;
        ParamsArr = A;
    }
    
    var Data = {cmd:"DappSendCall", MethodName:MethodName, Params:Params, ParamsArr:ParamsArr, Account:Account, FromNum:FromNum};
    SendData(Data);
    return 1;
}

function GetWalletAccounts(F)
{
    var Data = {cmd:"DappWalletList"};
    SendData(Data, F);
}
function GetAccountList(Params,F)
{
    var Data = {cmd:"DappAccountList", Params:Params};
    SendData(Data, F);
}
function GetSmartList(Params,F)
{
    var Data = {cmd:"DappSmartList", Params:Params};
    SendData(Data, F);
}
function GetBlockList(Params,F)
{
    var Data = {cmd:"DappBlockList", Params:Params};
    SendData(Data, F);
}
function GetTransactionList(Params,F)
{
    var Data = {cmd:"DappTransactionList", Params:Params};
    SendData(Data, F);
}

function DappSmartHTMLFile(Smart,F)
{
    var Data = {cmd:"DappSmartHTMLFile", Params:{Smart:Smart}};
    SendData(Data, F);
}
function DappBlockFile(BlockNum,TrNum,F)
{
    var Data = {cmd:"DappBlockFile", Params:{BlockNum:BlockNum, TrNum:TrNum}};
    SendData(Data, F);
}
function SetStatus(Str)
{
    SendData({cmd:"SetStatus", Message:Str});
}
function SetError(Str)
{
    SendData({cmd:"SetError", Message:Str});
}

function SetLocationPath(Str)
{
    SendData({cmd:"SetLocationHash", Message:Str});
}

function CreateNewAccount(Currency)
{
    SendData({cmd:"CreateNewAccount", Currency:Currency});
}

function OpenLink(Str)
{
    SendData({cmd:"OpenLink", Message:Str});
}

function SetMobileMode()
{
    SendData({cmd:"SetMobileMode"});
}

function ComputeSecret(PubKey,F,Account)
{
    if(!INFO.WalletCanSign)
    {
        SetError("Pls, open wallet");
        return 0;
    }
    if(!Account && USER_ACCOUNT.length)
        Account = USER_ACCOUNT[0].Num;
    
    if(typeof PubKey === "number")
    {
        var AccNum = PubKey;
        GetAccountList({StartNum:AccNum, CountNum:1}, function (Err,Arr)
        {
            if(Err)
            {
                SetError(Err);
            }
            else
            {
                var PubKeyArr = Arr[0].PubKey;
                if(PubKeyArr.data)
                    PubKeyArr = PubKeyArr.data;
                SendData({cmd:"ComputeSecret", Account:Account, PubKey:PubKeyArr}, F);
            }
        });
    }
    else
    {
        SendData({cmd:"ComputeSecret", Account:Account, PubKey:PubKey}, F);
    }
}


function CheckInstall()
{
    SendData({cmd:"CheckInstall"});
}

function SendTransaction(Body,TR,SumPow,F)
{
    SetError("Cannt SEND TR: " + JSON.stringify(TR));
}

function ReloadDapp()
{
    SendData({cmd:"ReloadDapp"});
}

function CurrencyName(Num)
{
    var Name = MapCurrency[Num];
    if(!Name)
    {
        GetSmartList({StartNum:Num, CountNum:1, TokenGenerate:1}, function (Err,Arr)
        {
            if(Err || Arr.length === 0)
                return;
            
            var Smart = Arr[0];
            Name = GetTokenName(Smart.Num, Smart.ShortName);
            MapCurrency[Smart.Num] = Name;
        });
        
        Name = GetTokenName(Num, "");
    }
    return Name;
}

var SendCountUpdate = 0;

var WasInitCurrency = 0;
function FindAllCurrency()
{
    WasInitCurrency = 1;
    InitMapCurrency();
    FindAllCurrencyNext(8);
}
function FindAllCurrencyNext(StartNum)
{
    
    SendCountUpdate++;
    var MaxCountViewRows = 10;
    GetSmartList({StartNum:StartNum, CountNum:MaxCountViewRows, TokenGenerate:1}, function (Err,Arr)
    {
        SendCountUpdate--;
        if(Err)
            return;
        var MaxNum = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Smart = Arr[i];
            if(!MapCurrency[Smart.Num])
            {
                var Name = GetTokenName(Smart.Num, Smart.ShortName);
                MapCurrency[Smart.Num] = Name;
            }
            if(Smart.Num > MaxNum)
                MaxNum = Smart.Num;
        }
        
        if(Arr.length === MaxCountViewRows && MaxNum)
        {
            FindAllCurrencyNext(MaxNum + 1);
        }
    });
}


function GetParamsFromPath(Name)
{
    if(!OPEN_PATH)
        return undefined;
    
    var arr = OPEN_PATH.split("&");
    for(var i = 0; i < arr.length; i++)
    {
        if(arr[i].indexOf(Name + "=") === 0)
        {
            return arr[i].split("=")[1];
        }
    }
}

function GetState(AccNum,F,FErr)
{
    SendCountUpdate++;
    GetAccountList({StartNum:AccNum, CountNum:1}, function (Err,Arr)
    {
        SendCountUpdate--;
        if(!Err && Arr.length)
        {
            var Item = Arr[0].SmartState;
            if(Item)
            {
                F(Item);
                return;
            }
        }
        if(FErr)
        {
            FErr();
            return;
        }
    });
}


function GetDappBlock(Block,Tr,F)
{
    DappBlockFile(Block, Tr, function (Err,Data)
    {
        if(!Err && Data.Type === 135)
        {
            try
            {
                var Params = JSON.parse(Data.Params);
            }
            catch(e)
            {
            }
            if(Params)
            {
                F(0, Params, Data.MethodName, Data.FromNum);
                return;
            }
        }
        F(1);
    });
}

function UpdateListArr(Block,Tr,Arr,StopBlock,IgnoreTailBlock,MaxDepth,F)
{
    Arr.sort(function (a,b)
    {
        return a.Num - b.Num;
    });
    if(Arr.length)
        StopBlock = Math.max(StopBlock, Arr[Arr.length - 1].BlockNum);
    
    UpdateRowArr(Block, Tr, Arr, StopBlock, IgnoreTailBlock, MaxDepth, F);
}

function UpdateRowArr(Block,Tr,Arr,StopMinBlock,IgnoreTailBlock,MaxDepth,F)
{
    if(Block <= StopMinBlock || !MaxDepth)
        return;
    
    SendCountUpdate++;
    GetDappBlock(Block, Tr, function (Err,Params)
    {
        SendCountUpdate--;
        if(!Err)
        {
            if(Block <= INFO.CurBlockNum - IgnoreTailBlock)
            {
                
                Params.BlockNum = Block;
                Params.TrNum = Tr;
                Params.Num = Params.BlockNum * 100000 + Params.TrNum;
                Params.Time = Date.now();
                
                if(!Arr.length || Arr[Arr.length - 1].Num !== Params.Num)
                {
                    if(F)
                    {
                        if(F(Params))
                        {
                            return;
                        }
                    }
                    else
                    {
                        Arr.push(Params);
                    }
                }
            }
            
            if(Params.PrevBlock)
            {
                UpdateRowArr(Params.PrevBlock, Params.PrevTr, Arr, StopMinBlock, IgnoreTailBlock, MaxDepth - 1, F);
            }
        }
    });
}

function GetKeyNum(Key)
{
    var Arr;
    if(typeof Key === "number")
    {
        Arr = sha3("" + Key);
    }
    else
    {
        Arr = sha3(Key);
    }
    var KeyNum = ReadUintFromArr(Arr, 0);
    return KeyNum;
}

function GetKeyInner(Key,DBBlock,DBTr,F)
{
    FindItem(DBBlock, DBTr, Key, function (Result,PathArr)
    {
        for(var i = 0; i < PathArr.length; i++)
        {
            var Elem = PathArr[i];
            if(Elem.Key === Key)
            {
                if(Elem.VB)
                {
                    LoadElement(Elem, i, PathArr, F);
                }
                else
                {
                    F(1, Elem, PathArr);
                }
                return;
            }
        }
        F(0, undefined, PathArr);
    });
}

function SetKeyInner(Key,Value,DBBlock,DBTr,F)
{
    FindItem(DBBlock, DBTr, Key, function (Result,PathArr)
    {
        var Elem;
        var bCreate = 1;
        var ElemEdit = undefined;
        for(var i = 0; i < PathArr.length; i++)
        {
            Elem = PathArr[i];
            if(Elem.Key === Key)
            {
                Elem.Key = undefined;
                Elem.VB = undefined;
                Elem.VT = undefined;
                Elem.Level = undefined;
                if(i === PathArr.length - 1)
                    bCreate = 0;
                
                if(typeof Value === "number")
                    ElemEdit = Elem;
            }
            if(Elem.VB)
            {
                Elem.Value = undefined;
            }
        }
        
        var L = PathArr.length - 1;
        if(ElemEdit)
        {
            Elem = ElemEdit;
        }
        else
        {
            if(L ===  - 1 || bCreate)
            {
                L++;
                PathArr[L] = {};
            }
            
            Elem = PathArr[L];
        }
        
        Elem.Key = Key;
        Elem.Value = Value;
        
        F(PathArr);
    });
}

var GetBlockKeyCount = 0;
function FindItem(Block,Tr,Key,F)
{
    GetBlockKeyCount = 0;
    var KeyNum = GetKeyNum(Key);
    FindItemNext(Block, Tr, Key, KeyNum, [], 0, F);
}

function FindItemNext(Block,Tr,Key,KeyNum,PathArr,Level,F)
{
    GetBlockKeyCount++;
    GetDappBlock(Block, Tr, function (Err,Params)
    {
        GetBlockKeyCount--;
        if(!Err)
        {
            var KeyNumStr = KeyNum.toString(2);
            var Arr = Params.Arr;
            for(var L = Level; Arr && L < Arr.length; L++)
            {
                var Elem = Arr[L];
                PathArr[L] = Elem;
                
                if(Elem.Key !== undefined)
                {
                    if(Elem.Key !== Key && !Elem.VB && typeof Elem.Value !== "number")
                    {
                        Elem.VB = Block;
                        Elem.VT = Tr;
                    }
                }
                
                var Bit =  + KeyNumStr.substr(L, 1);
                if(Bit !== Elem.t)
                {
                    var IB = Elem.IB;
                    var IT = Elem.IT;
                    Elem.t = Bit;
                    Elem.IB = Block;
                    Elem.IT = Tr;
                    
                    if(IB)
                    {
                        FindItemNext(IB, IT, Key, KeyNum, PathArr, L + 1, F);
                    }
                    else
                    {
                        break;
                    }
                    return;
                }
            }
            
            F(1, PathArr);
            return;
        }
        
        if(GetBlockKeyCount === 0)
            F(0, []);
    });
}

function LoadElement(Element,Level,PathArr,F)
{
    GetBlockKeyCount++;
    GetDappBlock(Element.VB, Element.VT, function (Err,Params)
    {
        GetBlockKeyCount--;
        if(!Err)
        {
            F(1, Params.Arr[Level], PathArr);
            return;
        }
        if(GetBlockKeyCount === 0)
            F(0);
    });
}

function GetXORArr(Arr1,Arr2)
{
    var Arr3 = [];
    for(var i = 0; i < 32; i++)
    {
        Arr3[i] = Arr1[i] ^ Arr2[i];
    }
    return Arr3;
}

function EncryptUint32(ArrSecret,RandomNum,Value)
{
    WriteUintToArrOnPos(ArrSecret, 0, 0);
    WriteUintToArrOnPos(ArrSecret, RandomNum, 6);
    
    var ValueArr = [];
    WriteUint32ToArr(ValueArr, Value);
    return GetHexFromArr(DoSecret(ValueArr, ArrSecret));
}

function DecryptUint32(ArrSecret,RandomNum,StrValue)
{
    WriteUintToArrOnPos(ArrSecret, 0, 0);
    WriteUintToArrOnPos(ArrSecret, RandomNum, 6);
    
    var Arr0 = GetArrFromHex(StrValue);
    var ValueArr = DoSecret(Arr0, ArrSecret);
    ValueArr.len = 0;
    
    var Value = ReadUint32FromArr(ValueArr);
    return Value;
}
function EncryptArr32(ArrSecret,RandomNum,ValueArr)
{
    WriteUintToArrOnPos(ArrSecret, 0, 0);
    WriteUintToArrOnPos(ArrSecret, RandomNum, 6);
    return GetHexFromArr(DoSecret(ValueArr, ArrSecret));
}

function DecryptArr32(ArrSecret,RandomNum,StrValue)
{
    WriteUintToArrOnPos(ArrSecret, 0, 0);
    WriteUintToArrOnPos(ArrSecret, RandomNum, 6);
    
    var Arr0 = GetArrFromHex(StrValue);
    var ValueArr = DoSecret(Arr0, ArrSecret);
    return ValueArr;
}

var glMapF = {};
var glKeyF = 0;
function SendData(Data,F)
{
    if(!window.parent)
        return;
    
    if(F)
    {
        glKeyF++;
        Data.CallID = glKeyF;
        glMapF[glKeyF] = F;
    }
    
    window.parent.postMessage(Data, "*");
}

function OnMessage(event)
{
    var Data = event.data;
    if(!Data || typeof Data !== "object")
    {
        return;
    }
    
    var CallID = Data.CallID;
    var cmd = Data.cmd;
    if(CallID)
    {
        var F = glMapF[CallID];
        if(F)
        {
            delete Data.CallID;
            delete Data.cmd;
            
            switch(cmd)
            {
                case "translate":
                    F(Data.Str, Data.Str2);
                    break;
                case "getstorage":
                case "getcommon":
                    F(Data.Key, Data.Value);
                    break;
                case "DappStaticCall":
                    F(Data.Err, Data.RetValue);
                    break;
                case "DappInfo":
                    F(Data.Err, Data);
                    break;
                case "DappWalletList":
                case "DappAccountList":
                case "DappSmartList":
                case "DappBlockList":
                case "DappTransactionList":
                    F(Data.Err, Data.arr);
                    break;
                    
                case "DappBlockFile":
                case "DappSmartHTMLFile":
                    F(Data.Err, Data.Body);
                    break;
                case "ComputeSecret":
                    F(Data.Result);
                    break;
                default:
                    console.log("Error cmd: " + cmd);
            }
            
            delete glMapF[CallID];
        }
    }
    else
    {
        switch(cmd)
        {
            case "History":
                var eventEvent = new CustomEvent("History", {detail:Data});
                window.dispatchEvent(eventEvent);
                
                break;
            case "OnEvent":
                if(window.OnEvent)
                {
                    window.OnEvent(Data);
                }
                
                var eventEvent = new CustomEvent("Event", {detail:Data});
                window.dispatchEvent(eventEvent);
        }
    }
}

function OpenRefFile(Str)
{
    var Param = ParseFileName(Str);
    if(Param.BlockNum)
        DappBlockFile(Param.BlockNum, Param.TrNum, function (Err,Body)
        {
            document.write(Body);
        });
    else
    {
        OpenLink(Str);
    }
}

function SaveToStorageByArr(Arr)
{
    SetStorage("VerSave", "1");
    for(var i = 0; i < Arr.length; i++)
    {
        var name = Arr[i];
        var Item = $(name);
        if(Item)
        {
            if(Item.type === "checkbox")
                SetStorage(name, 0 + Item.checked);
            else
                SetStorage(name, Item.value);
        }
    }
}

function LoadFromStorageByArr(Arr,F,bAll)
{
    GetStorage("VerSave", function (Key,Value)
    {
        if(Value === "1")
        {
            for(var i = 0; i < Arr.length; i++)
            {
                if(i === Arr.length - 1)
                    LoadFromStorageById(Arr[i], F);
                else
                    LoadFromStorageById(Arr[i]);
            }
        }
        else
            if(bAll && F)
                F(0);
    });
}

function LoadFromStorageById(Name,F)
{
    GetStorage(Name, function (Key,Value)
    {
        var Item = document.getElementById(Name);
        if(Item)
        {
            if(Item.type === "checkbox")
                Item.checked = parseInt(Value);
            else
                Item.value = Value;
        }
        if(F)
            F(Key, Value);
    });
}

var SendCountDappParams = 0;
function GetDappParams(BNum,TrNum,F,bAll)
{
    if(!BNum)
    {
        if(bAll)
            F();
        return;
    }
    
    SendCountDappParams++;
    GetDappBlock(BNum, TrNum, function (Err,Params,MethodName,FromNum)
    {
        SendCountDappParams--;
        if(!Err)
        {
            F(Params, MethodName, FromNum);
            return;
        }
        if(bAll)
            F();
    });
}



document.addEventListener("DOMContentLoaded", function ()
{
    var refs = document.getElementsByTagName("A");
    for(var i = 0, L = refs.length; i < L; i++)
    {
        if(refs[i].href.indexOf("/file/") >= 0)
        {
            refs[i].onclick = function ()
            {
                OpenRefFile(this.href);
            };
        }
    }
}
);

if(window.addEventListener)
{
    window.addEventListener("message", OnMessage);
}
else
{
    window.attachEvent("onmessage", OnMessage);
}


var WasStartInit = 0, WasStartInit2 = 0;
var eventInfo = new Event("UpdateInfo");

function UpdateDappInfo()
{
    GetInfo(function (Err,Data)
    {
        if(Err)
        {
            return;
        }
        INFO = Data;
        SMART = Data.Smart;
        BASE_ACCOUNT = Data.Account;
        OPEN_PATH = Data.OPEN_PATH;
        ACCOUNT_OPEN_NUM = ParseNum(OPEN_PATH);
        
        SetBlockChainConstant(Data);
        
        window.NETWORK_NAME = INFO.NETWORK;
        window.SHARD_NAME = INFO.SHARD_NAME;
        window.NETWORK_ID = window.NETWORK_NAME + "." + window.SHARD_NAME;
        
        if(!WasInitCurrency)
            FindAllCurrency();
        
        USER_ACCOUNT = Data.ArrWallet;
        USER_ACCOUNT_MAP = {};
        for(var i = 0; i < USER_ACCOUNT.length; i++)
            USER_ACCOUNT_MAP[USER_ACCOUNT[i].Num] = USER_ACCOUNT[i];
        
        if(window.OnInit && !WasStartInit)
        {
            WasStartInit = 1;
            window.OnInit(1);
        }
        else
            if(window.OnUpdateInfo)
            {
                window.OnUpdateInfo();
            }
        
        if(!WasStartInit2)
        {
            WasStartInit2 = 1;
            var eventInit = new Event("Init");
            window.dispatchEvent(eventInit);
        }
        
        window.dispatchEvent(eventInfo);
        if(Data.ArrEvent)
            for(var i = 0; i < Data.ArrEvent.length; i++)
            {
                var Item = Data.ArrEvent[i];
                Item.cmd = "OnEvent";
                OnMessage({data:Item});
            }
    });
}

window.addEventListener('load', function ()
{
    
    UpdateDappInfo();
    setInterval(UpdateDappInfo, 1000);
    InitTranslater();
}
);

window.onkeydown = function (e)
{
    if(e.keyCode === 116 && INFO.CanReloadDapp)
    {
        e.preventDefault();
        ReloadDapp();
    }
    else
        if(e.keyCode === 27)
        {
            if(window.closeModal)
                closeModal();
        }
        else
            if(e.keyCode === 13)
            {
                if(glConfirmF)
                    OnConfirmOK();
            }
}


function CanTranslate(elem)
{
    var Text = elem.innerText;
    if(!Text)
        return 0;
    if(String(",STYLE,SCRIPT,").indexOf("," + elem.tagName + ",") >= 0)
        return 0;
    
    if(!elem.innerHTML)
        return 0;
    
    Text = Text.trim();
    if(elem.innerHTML.trim() !== Text)
        return 0;
    
    if(Text.substr(0, 1) === "$")
        return 0;
    
    if(Text.toUpperCase() == Text.toLowerCase())
        return 0;
    
    return 1;
}

var glTranslateMap = {};
var glTranslateMap2 = {};
var glTranslateNum = 0;
function TranslateElement(elem)
{
    var StrText = elem.textContent.trim();
    if(!StrText || StrText.toUpperCase() === StrText.toLowerCase())
        return StrText;
    
    if(glTranslateMap2[StrText])
        return;
    
    glTranslateNum++;
    var StrKey = "id" + GetHexFromArr(sha3(StrText));
    var Text = glTranslateMap[StrKey];
    if(Text !== undefined)
    {
        glTranslateMap2[Text] = 1;
        elem.textContent = Text;
        return;
    }
    
    var Data = {cmd:"translate", Key:StrKey, Str:StrText};
    SendData(Data, function (Str,Str2)
    {
        if(!Str2)
            return;
        
        glTranslateMap[StrKey] = Str2;
        glTranslateMap2[Str2] = 1;
        
        if(Str !== Str2 && elem.textContent === Str)
        {
            elem.textContent = Str2;
        }
    });
}

function InitTranslater()
{
    
    var elems = document.getElementsByTagName("*");
    for(var elem, i = 0; elem = elems[i++]; )
    {
        if(!CanTranslate(elem))
        {
            continue;
        }
        TranslateElement(elem);
        
        var observer = new MutationObserver(function (mutations)
        {
            mutations.forEach(function (mutation)
            {
                for(var i = 0; i < mutation.addedNodes.length; i++)
                {
                    var elem2 = mutation.addedNodes[i];
                    if(elem2.nodeName !== "#text" && !CanTranslate(elem2))
                    {
                        continue;
                    }
                    
                    if(elem2.textContent)
                    {
                        TranslateElement(elem2);
                        continue;
                    }
                }
            });
        });
        
        observer.observe(elem, {childList:true, attributes:false, subtree:true, characterData:true, });
    }
}
