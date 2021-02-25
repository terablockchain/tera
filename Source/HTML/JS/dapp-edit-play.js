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

var LexerJS = global.LexerJS;

var MaxAccCreate = 106;
var VM_VALUE = {CONSENSUS_PERIOD_TIME:1000, FIRST_TIME_BLOCK:0, CurBlockNum:500, MaxDappsID:3, };

var VM_BLOCKS = [];
var VM_SMARTS = [];
var VM_ACCOUNTS = [];
var VM_KEY_VALUE = {};
InitVMArrays();

VM_VALUE.Smart = {};
VM_VALUE.ArrWallet = [];

var DefPubKeyArr0 = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
VM_VALUE.PrivKey = GetHexFromArr([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
1, 1]);
var DefPubKeyArr = {data:DefPubKeyArr0};

var _ListF = window.ListF;

var UPDATE_CODE_1 = 0;
var UPDATE_CODE_2 = 0;

var VM_ATOM_MAP = {};
var WasRollBack = 0;
function BEGINTRANSACTION(M)
{
    WasRollBack = 0;
    VM_ATOM_MAP.VM_KEY_VALUE = JSON.stringify(VM_KEY_VALUE);
    VM_ATOM_MAP.VM_ACCOUNTS = JSON.stringify(VM_ACCOUNTS);
}
function COMMITRANSACTION()
{
    if(WasRollBack)
    {
        VM_KEY_VALUE = JSON.parse(VM_ATOM_MAP.VM_KEY_VALUE);
        VM_ACCOUNTS = JSON.parse(VM_ATOM_MAP.VM_ACCOUNTS);
        for(var i = 0; i < VM_ACCOUNTS.length; i++)
        {
            var Item = VM_ACCOUNTS[i];
            if(Item && Item.PubKey.data)
            {
                Item.PubKey = Item.PubKey.data;
            }
        }
    }
    
    FillOwnWalletAccount();
}

function ROLLBACKRANSACTION()
{
    WasRollBack = 1;
}

function RunFrame(Code,Parent,bRecreate)
{
    SetStatus("");
    DoNewSession();
    
    VM_VALUE.PubKey0 = SignLib.publicKeyCreate(VM_VALUE.PrivKey, 1);
    VM_VALUE.PubKey = {data:VM_VALUE.PubKey0};
    
    if(editHTML)
        editHTML.NeedReplay = 0;
    
    SetDialogToSmart(SMART);
    SMART.ID = undefined;
    SMART.EditorHTML = undefined;
    SMART.EditorCode = undefined;
    
    if(CurProjectValue)
    {
        DapNumber = 7;
    }
    else
    {
        DapNumber =  + ($("idSmartList").value);
    }
    if(DapNumber > VM_VALUE.MaxDappsID)
    {
        VM_VALUE.MaxDappsID = DapNumber;
        InitVMArrays();
    }
    
    glSmart = DapNumber;
    SMART.Num = DapNumber;
    
    VM_SMARTS[glSmart] = SMART;
    VM_VALUE.Smart = SMART;
    
    if(bRecreate || VM_VALUE.PrevName !== SMART.Name || VM_VALUE.PrevStateFormat !== SMART.StateFormat)
    {
        bRecreate = 1;
        VM_ACCOUNTS = [];
        VM_VALUE.SmartBlock = CreateNewBlock({Type:130});
        
        var Currency = 0;
        var SumBase = 10000;
        if(SMART.TokenGenerate)
        {
            Currency = glSmart;
            SumBase =  + SMART.StartValue;
        }
        
        GetNewAccount(100, "TEST", 100000, glSmart, Currency, 1);
        GetNewAccount(101, "Some USD", 1500, glSmart, 1, 1);
        GetNewAccount(102, "Some BTC", 10, glSmart, 2, 1);
        GetNewAccount(103, "Some DAO", 3000, glSmart, 3, 1);
        
        GetNewAccount(104, "Test USD", 0, glSmart, 1, 1);
        GetNewAccount(105, "Test DAO", 0, glSmart, 3, 1);
        
        GetNewAccount(106, "OWNER", 4000, glSmart, Currency, 1);
        
        for(var i = 0; i < SMART.AccountLength; i++)
        {
            var Item = GetNewAccount(107 + i, "Smart base", i === 0 ? SumBase : 0, glSmart, Currency, SMART.OwnerPubKey);
            if(i === 0)
                VM_VALUE.BaseAccount = Item;
        }
        
        FillOwnWalletAccount();
        
        BASE_ACCOUNT = VM_VALUE.BaseAccount;
        
        VM_KEY_VALUE = {};
        InitStorageEmulate();
        InitEvalMap();
    }
    VM_VALUE.PrevStateFormat = SMART.StateFormat;
    VM_VALUE.PrevName = SMART.Name;
    
    BASE_ACCOUNT = VM_VALUE.BaseAccount;
    
    SMART.Account = BASE_ACCOUNT.Num;
    SMART.Owner = VM_VALUE.OwnerAccount.Num;
    SMART.HTML = undefined;
    SMART.Code = undefined;
    
    CreateFrame(Code, Parent);
    if(bRecreate)
    {
        global.SetTickCounter(35000);
        try
        {
            var PayContext = {FromID:SMART.Owner, ToID:0, Description:"Smart create", Value:{SumCOIN:GetPrice(SMART), SumCENT:0}};
            RunPublicMethod("OnCreate", VM_VALUE.SmartBlock, BASE_ACCOUNT, PayContext);
            
            PayContext = {FromID:VM_VALUE.WalletAccount.Num, ToID:0, Description:"Smart set", Value:{SumCOIN:0, SumCENT:0}};
            RunPublicMethod("OnSetSmart", VM_VALUE.SmartBlock, VM_VALUE.WalletAccount, PayContext);
        }
        catch(e)
        {
            ToLog("Error: " + e);
        }
    }
}

function InitStorageEmulate()
{
    var StorageEmulate = {setItem:function (Key,Value)
        {
            this[Key] = Value;
        }, getItem:function (Key)
        {
            return this[Key];
        }};
    
    EmulateStorage = StorageEmulate;
    EmulateSessionStorage = StorageEmulate;
}

function GetNewAccount(Num,Name,Sum,Smart,Currency,bWalletPubKey)
{
    if(!Smart)
        Smart = 0;
    if(!Currency)
        Currency = 0;
    
    var Item = VM_ACCOUNTS[Num];
    if(!Item)
    {
        Item = {};
        VM_ACCOUNTS[Num] = Item;
    }
    
    Item.Num = Num;
    Item.Name = Name;
    Item.Value = {SumCOIN:Sum, SumCENT:0, Smart:Smart};
    Item.SmartState = InitSmartState(Num, Smart);
    Item.Currency = Currency;
    
    if(Smart)
        Item.SmartObj = VM_SMARTS[Smart];
    
    if(bWalletPubKey)
        Item.PubKey = VM_VALUE.PubKey;
    else
        Item.PubKey = DefPubKeyArr;
    
    return Item;
}

function FillOwnWalletAccount()
{
    VM_VALUE.ArrWallet = [];
    VM_VALUE.WalletAccount = VM_ACCOUNTS[100];
    VM_VALUE.OwnerAccount = VM_ACCOUNTS[106];
    for(var i = 100; i < 150; i++)
    {
        var Item = VM_ACCOUNTS[i];
        if(Item)
            if(GetHexFromArr(Item.PubKey) === GetHexFromArr(VM_VALUE.PubKey))
            {
                VM_VALUE.ArrWallet.push(Item);
            }
    }
}

var WasStartBlock;

function GetBlockNumByTimePlay(CurrentTime)
{
    var CurTimeNum = CurrentTime - VM_VALUE.FIRST_TIME_BLOCK;
    return Math.floor(CurTimeNum / VM_VALUE.CONSENSUS_PERIOD_TIME + 0.999999);
}

function InitVMArrays()
{
    
    for(var Num = 0; Num <= VM_VALUE.CurBlockNum; Num++)
    {
        var Block = {Type:1, Body:"0101020304AABBCCDD", Params:"{}"};
        AddHash(Block);
        VM_BLOCKS[Num] = Block;
    }
    
    VM_VALUE.FIRST_TIME_BLOCK = Date.now() - VM_BLOCKS.length * VM_VALUE.CONSENSUS_PERIOD_TIME;
    
    for(var Num = 8; Num <= VM_VALUE.MaxDappsID; Num++)
    {
        VM_SMARTS[Num] = {Num:Num, Name:"SMART#" + Num, ShortName:"TST"};
    }
    VM_SMARTS[1] = {Num:1, Name:"USD TOKEN", ShortName:"USD", TokenGenerate:1};
    VM_SMARTS[2] = {Num:2, Name:"BTC TOKEN", ShortName:"BTC", TokenGenerate:1};
    VM_SMARTS[3] = {Num:3, Name:"DAO TOKEN", ShortName:"DAO", TokenGenerate:1};
    
    for(var Num = 0; Num <= MaxAccCreate; Num++)
    {
        GetNewAccount(Num, "TEST#" + Num, 1000);
    }
    GetNewAccount(0, "System account", 900000000);
    
    if(!WasStartBlock)
    {
        setInterval(AddNewBlock, 1000);
        WasStartBlock = 1;
    }
}

function AddHash(Block)
{
    Block.AddrHash = sha3(JSON.stringify(Block));
    Block.Hash = sha3(JSON.stringify(Block));
}

function GetVMAccount(Num)
{
    var Item = undefined;
    
    if(VM_ACCOUNTS[Num] === undefined)
    {
        var strresult = GetData("/account/" + Num);
        var result;
        try
        {
            result = JSON.parse(strresult);
            Item = result.Item;
        }
        catch(e)
        {
            ToLog(e);
        }
        VM_ACCOUNTS[Num] = Item;
    }
    else
    {
        Item = VM_ACCOUNTS[Num];
    }
    
    if(!Item)
        throw "Error account num=" + Num;
    else
        return Item;
}

function GetVMSmart(Num)
{
    var Item = VM_SMARTS[Num];
    if(!Item)
        throw "Error smart num=" + Num;
    else
        return Item;
}

function DoComputeSecret(Account,PubKey,F)
{
    
    var Result = ComputeSecretWithSmartNum(PubKey, VM_VALUE.PrivKey, glSmart);
    F(Result);
}

function SetMobileMode()
{
    ToLog("Run:SetMobileMode");
}
function CheckInstall()
{
    ToLog("Run:CheckInstall");
}
function CreateNewAccount(Currency)
{
    ToLogDebug("Run:CreateNewAccount");
    GetNewAccount(VM_ACCOUNTS.length, SMART.Name, 0, glSmart, Currency, 1);
}
function ReloadDapp()
{
    ToLog("Run:ReloadDapp");
}
function SetLocationHash(Str)
{
    ToLog("Run:SetLocationHash: " + Str);
}

function DoTranslate(Data)
{
}

function SendCallMethod(ToNum,MethodName,Params,ParamsArr,FromNum,FromSmartNum,bStatic)
{
    SetStatus("");
    if(bStatic)
        global.SetTickCounter(100000);
    else
        global.SetTickCounter(35000);
    
    var StrCode = GetSmartCode();
    var Account = GetVMAccount(ToNum);
    var PayContext = {FromID:ParseNum(FromNum), ToID:Account.Num, Description:"", Value:{SumCOIN:0, SumCENT:0}};
    
    var Data = {Type:135, Account:Account.Num, MethodName:MethodName, FromNum:FromNum, Params:JSON.stringify(Params)};
    var Block = CreateNewBlock(Data, bStatic);
    var BlockNum = Block.BlockNum;
    ToLogDebug("" + Block.BlockNum + ". CallMethod " + MethodName + " " + ToNum + "<-" + FromNum);
    
    var Result;
    try
    {
        BEGINTRANSACTION(1);
        Result = RunSmartMethod(Block, Data, VM_VALUE.Smart, Account, BlockNum, Block.TrNum, PayContext, MethodName, Params, ParamsArr,
        1, StrCode);
    }
    catch(e)
    {
        ROLLBACKRANSACTION();
        Data.Type = 0;
        Data.Account = 0;
        Data.Params = undefined;
        Data.MethodName = undefined;
        
        SendMessageError("" + e);
    }
    finally
    {
        COMMITRANSACTION();
    }
    return Result;
}

function RunPublicMethod(MethodName,Block,Account,PayContext)
{
    var StrCode = GetSmartCode();
    ToLogDebug("RunPublicMethod " + MethodName);
    
    RunSmartMethod(Block, undefined, VM_VALUE.Smart, Account, Block.BlockNum, 0, PayContext, MethodName, undefined, undefined,
    0, StrCode);
}

function CreateNewBlock(Data,bStat)
{
    var Block;
    if(bStat)
    {
        Block = {BlockNum:0, TrNum:0, TxArray:[Data]};
    }
    else
    {
        VM_VALUE.CurBlockNum++;
        Block = {BlockNum:VM_VALUE.CurBlockNum, TrNum:0, TxArray:[Data]};
        VM_BLOCKS[VM_VALUE.CurBlockNum] = Data;
        VM_VALUE.CurrentBlock = Block;
    }
    AddHash(Block);
    
    return Block;
}
function AddNewBlock()
{
    for(var i = 0; i < 10; i++)
    {
        var CurBlockTime = GetBlockNumByTimePlay(new Date());
        if(VM_VALUE.CurBlockNum > CurBlockTime)
            break;
        
        var Block = CreateNewBlock({Type:0});
        ToLogDebug("Block: " + Block.BlockNum);
    }
}

function DoGetData(Name,Params,Func)
{
    var SetData = {result:0};
    switch(Name)
    {
        case "DappWalletList":
            SetData.result = 1;
            SetData.arr = VM_VALUE.ArrWallet;
            break;
        case "DappSmartHTMLFile":
            SetData.result = 1;
            SetData.Body = GetHTMLCode();
            break;
        case "DappBlockFile":
            SetData.Body = VM_BLOCKS[Params.BlockNum];
            SetData.result = !!SetData.Body;
            break;
        case "DappAccountList":
            SetData.result = 1;
            SetData.arr = VM_ACCOUNTS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappSmartList":
            SetData.result = 1;
            SetData.arr = VM_SMARTS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappBlockList":
            SetData.result = 1;
            SetData.arr = VM_BLOCKS.slice(Params.StartNum, Params.StartNum + Params.CountNum);
            break;
        case "DappTransactionList":
            break;
        case "DappStaticCall":
            if(Params.Account >= VM_ACCOUNTS.length)
            {
                GetData(Name, Params, Func);
                return;
            }
            else
            {
                SetData.RetValue = SendCallMethod(Params.Account, Params.MethodName, Params.Params, Params.ParamsArr, 0, glSmart, 1);
            }
            SetData.result = 1;
            break;
            
        default:
            ToLog("Error method name: " + Name);
    }
    ToLogDebug("GetData:\n" + JSON.stringify(Params));
    ToLogDebug("RESULT:\n" + JSON.stringify(SetData));
    
    Func(SetData);
}

function DoDappInfo(Data)
{
    var Network_Name = CONFIG_DATA.NETWORK;
    if(!Network_Name)
        Network_Name = "VIRTUAL-NET";
    
    ToLogDebug("DoDappInfo");
    Data.EmulateMode = 1;
    Data.CanReloadDapp = 0;
    Data.result = 1;
    Data.DELTA_CURRENT_TIME = 0;
    Data.FIRST_TIME_BLOCK = VM_VALUE.FIRST_TIME_BLOCK;
    Data.CONSENSUS_PERIOD_TIME = VM_VALUE.CONSENSUS_PERIOD_TIME;
    Data.PRICE_DAO = {NewAccount:10, NewSmart:100, NewTokenSmart:10000, Storage:0.01};
    Data.NEW_SIGN_TIME = 0;
    Data.NETWORK = Network_Name;
    Data.SHARD_NAME = "TERA";
    
    Data.PubKey = DefPubKeyArr;
    Data.WalletIsOpen = 1;
    Data.WalletCanSign = 1;
    
    Data.Smart = SMART;
    
    Data.Account = BASE_ACCOUNT;
    
    Data.NumDappInfo = 0;
    Data.CurTime = Date.now();
    Data.CurBlockNum = VM_VALUE.CurBlockNum;
    Data.MaxAccID = VM_ACCOUNTS.length - 1;
    Data.MaxDappsID = VM_VALUE.MaxDappsID;
    Data.OPEN_PATH = OPEN_PATH;
    
    Data.ArrWallet = VM_VALUE.ArrWallet;
    Data.ArrEvent = [];
    Data.ArrLog = [];
    
    SendMessage(Data);
}

function InitSmartState(Num,Smart)
{
    if(Smart === glSmart && SMART.StateFormat)
    {
        var Map = {uint:0, byte:0, double:0, str:"\"\"", hash:"[]", arr:"[]"};
        var Str = SMART.StateFormat;
        Str = Str.replace(/[" "]/g, "");
        for(var key in Map)
        {
            var value = Map[key];
            Str = Str.replace(new RegExp(":" + key + "[0-9]{0,2}", "g"), ":" + value);
            Str = Str.replace(new RegExp("\\[" + key + "[0-9]{0,2}", "g"), "[" + value);
        }
        
        var Result;
        try
        {
            eval("Result=" + Str);
            Result.Num = Num;
        }
        catch(e)
        {
            ToLog("Error in StateFormat:\n" + e);
            Result = {Num:Num};
        }
        return Result;
    }
    else
    {
        return {Num:Num};
    }
}


window.$ToLog = ToLog;
window.$JSON = JSON;

function CoinSumHelper(CoinSum)
{
    if(typeof CoinSum === "number")
    {
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    }
    CHECKSUM(CoinSum);
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    
    return CoinSum;
}

const SetValue = function (ID,CoinSum)
{
    DO(3000);
    
    if(!RunContext.Smart.TokenGenerate)
    {
        throw "The smart-contract is not token generate, access to change values is denied";
    }
    
    CoinSum = CoinSumHelper(CoinSum);
    
    var ToData = GetVMAccount(ID);
    ToData.Value.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    ToData.Value.SumCENT = Math.trunc(CoinSum.SumCENT);
    
    return true;
}

function MoveCoin(FromID,ToID,CoinSum,Description,SmartMode)
{
    CoinSum = CoinSumHelper(CoinSum);
    
    var FromData = GetVMAccount(FromID);
    var ToData = GetVMAccount(ToID);
    if(FromData.Currency !== ToData.Currency)
    {
        throw "Different currencies. Accounts: " + FromData.Num + " and " + ToData.Num;
    }
    
    if(SmartMode)
        if(FromData.Value.Smart !== RunContext.Smart.Num)
        {
            throw "The account: " + FromID + " does not belong to the smart-contract: " + RunContext.Smart.Num + ", access is denied";
        }
    
    var Value = {SumCOIN:FromData.Value.SumCOIN, SumCENT:FromData.Value.SumCENT};
    if(!SUB(Value, CoinSum))
        throw "Not enough money on the account ID:" + FromID;
    
    SUB(FromData.Value, CoinSum);
    ADD(ToData.Value, CoinSum);
    
    var Context = {FromID:FromID, ToID:ToID, Description:Description, Value:CoinSum, SmartMode:SmartMode};
    if(FromData.Value.Smart)
    {
        RunPublicMethod("OnSend", VM_VALUE.CurrentBlock, FromData, Context);
    }
    
    if(ToData.Value.Smart)
    {
        RunPublicMethod("OnGet", VM_VALUE.CurrentBlock, ToData, Context);
    }
}

const $SetValue = function (ID,CoinSum)
{
    DO(3000);
    ID = ParseNum(ID);
    
    if(!RunContext.Smart.TokenGenerate)
    {
        throw "The smart-contract is not token generate, access to change values is denied";
    }
    
    var ToData = GetVMAccount(ID);
    if(!ToData)
    {
        throw "Account does not exist.Error id number: " + ID;
    }
    
    if(ToData.Currency !== RunContext.Smart.Num)
    {
        throw "The account currency does not belong to the smart-contract, access to change values is denied";
    }
    
    if(typeof CoinSum === "number")
    {
        CoinSum = COIN_FROM_FLOAT(CoinSum);
    }
    
    CHECKSUM(CoinSum);
    
    if(CoinSum.SumCENT >= 1e9)
    {
        throw "ERROR SumCENT>=1e9";
    }
    if(CoinSum.SumCOIN < 0 || CoinSum.SumCENT < 0)
    {
        throw "ERROR Sum<0";
    }
    
    ToData.Value.SumCOIN = Math.trunc(CoinSum.SumCOIN);
    ToData.Value.SumCENT = Math.trunc(CoinSum.SumCENT);
    
    return true;
}

const $Send = function (ToID,CoinSum,Description)
{
    DO(3000);
    MoveCoin(RunContext.Account.Num, ToID, CoinSum, Description, 1);
}

const $Move = function (FromID,ToID,CoinSum,Description)
{
    DO(3000);
    MoveCoin(FromID, ToID, CoinSum, Description, 1);
}
const $Event = function (Description)
{
    DO(50);
    var Data = {cmd:"OnEvent", Description:Description, Smart:RunContext.Smart.Num, Account:RunContext.Account.Num, BlockNum:RunContext.BlockNum,
        TrNum:RunContext.TrNum};
    SendMessage(Data);
    if(typeof Description === "string")
        SetStatus(Description);
    else
        ToLog(Description);
}

const $ReadAccount = function (ID)
{
    DO(900);
    var AccObj = GetVMAccount(ID);
    return GET_ACCOUNT(AccObj);
}


const $ReadSmart = function (ID)
{
    DO(900);
    var SmartObj = GetVMSmart(ID);
    return GET_SMART(SmartObj);
}
const $ReadState = function (ID)
{
    DO(900);
    var AccObj = GetVMAccount(ID);
    
    ToLogDebug("ReadState: " + ID + "\n" + JSON.stringify(AccObj.SmartState));
    return AccObj.SmartState;
}
const $WriteState = function (SmartState,ID)
{
    DO(3000);
    if(!ID)
        ID = SmartState.Num;
    
    ToLogDebug("WriteState: " + ID + "\n" + JSON.stringify(SmartState));
    var AccObj = GetVMAccount(ID);
    AccObj.SmartState = SmartState;
}
const $GetMaxAccount = function ()
{
    DO(20);
    return VM_ACCOUNTS.length - 1;
}

var EvalContextMap = {};
window.$require = function (SmartNum)
{
    DO(2000);
    
    var EvalContext = EvalContextMap[SmartNum];
    if(!EvalContext)
    {
        ToLog("Loading smart " + SmartNum + " from blockchain");
        
        var SmartCode = GetData("/smart/" + SmartNum);
        EvalContext = CreateSmartEvalContext(SmartCode);
        EvalContextMap[SmartNum] = EvalContext;
    }
    
    EvalContext.funclist.SetContext(RunContext.context);
    return EvalContext.publist;
}

ListF.$SendMessage = function ()
{
    DO(20000);
}

const $ReadValue = function (Key,Format)
{
    DO(900);
    
    var Value;
    var Buf = VM_KEY_VALUE[Key];
    if(Buf)
    {
        if(Format)
        {
            Value = SerializeLib.GetObjectFromBuffer(Buf, Format, {});
        }
        else
        {
            var Str = ReadStrFromArr(Buf);
            Value = JSON.parse(Str);
        }
    }
    
    return Value;
}

const $WriteValue = function (Key,Value,Format)
{
    DO(3000);
    
    var Buf;
    if(Format)
    {
        Buf = SerializeLib.GetBufferFromObject(Value, Format, {});
    }
    else
    {
        var Str = JSON.stringify(Value);
        Buf = toUTF8Array(Str);
    }
    
    if(Buf.length > 65535)
        Buf.length = 65535;
    
    VM_KEY_VALUE[Key] = Buf;
}

const $RemoveValue = function (Key)
{
    DO(1000);
    delete VM_KEY_VALUE[Key];
}

function PlaySend(From,To,fSum,Desc)
{
    global.SetTickCounter(35000);
    
    try
    {
        BEGINTRANSACTION(2);
        MoveCoin(From, To, COIN_FROM_FLOAT(fSum), Desc, 0);
    }
    catch(e)
    {
        ROLLBACKRANSACTION();
        SendMessageError("" + e);
    }
    finally
    {
        COMMITRANSACTION();
        window.RunContext = undefined;
    }
}



function ToLogDebug(Str)
{
    if($("idDebugLog").checked)
    {
        ToLog(Str);
    }
}

function SendMessageError(Str)
{
    var Data = {};
    Data.cmd = "OnEvent";
    Data.Description = Str;
    Data.Error = 1;
    SetError(Str);
    SendMessage(Data);
}


function ChangePrototype()
{
    var Array_prototype_concat = Array.prototype.concat;
    var Array_prototype_toString = Array.prototype.toString;
    
    Array.prototype.concat = function ()
    {
        if(RunContext)
            throw "Error Access denied: concat";
        else
            return Array_prototype_concat.apply(this, arguments);
    };
    Array.prototype.toString = function ()
    {
        if(RunContext)
            throw "Error Access denied: toString";
        else
            return Array_prototype_toString.apply(this, arguments);
    };
    var Function_prototype_toString = Function.prototype.toString;
    Function.prototype.toString = function ()
    {
        if(RunContext)
            return "";
        else
            return Function_prototype_toString.apply(this, arguments);
    };
    Function.prototype.toLocaleString = function ()
    {
        return this.toString();
    };
    
    
    Array.prototype.toLocaleString = Array.prototype.toString;
    Number.prototype.toLocaleString = function ()
    {
        return this.toString();
    };
    
    String.prototype.toLocaleLowerCase = String.prototype.toLowerCase;
    String.prototype.toLocaleUpperCase = String.prototype.toUpperCase;
    
    var String_prototype_localeCompare = String.prototype.localeCompare;
    String.prototype.localeCompare = function ()
    {
        if(RunContext)
            throw "Error Access denied: localeCompare";
        else
            return String_prototype_localeCompare.apply(this, arguments);
    };
    
    var String_prototype_match = String.prototype.match;
    String.prototype.match = function ()
    {
        if(RunContext)
            throw "Error Access denied: match";
        else
            return String_prototype_match.apply(this, arguments);
    };
    
    var String_prototype_repeat = String.prototype.repeat;
    String.prototype.repeat = function ()
    {
        if(RunContext)
            throw "Error Access denied: repeat";
        else
            return String_prototype_repeat.apply(this, arguments);
    };
    var String_prototype_search = String.prototype.search;
    String.prototype.search = function ()
    {
        if(RunContext)
            throw "Error Access denied: search";
        else
            return String_prototype_search.apply(this, arguments);
    };
    var String_prototype_padStart = String.prototype.padStart;
    String.prototype.padStart = function ()
    {
        if(RunContext)
            throw "Error Access denied: padStart";
        else
            return String_prototype_padStart.apply(this, arguments);
    };
    var String_prototype_padEnd = String.prototype.padEnd;
    String.prototype.padEnd = function ()
    {
        if(RunContext)
            throw "Error Access denied: padEnd";
        else
            return String_prototype_padEnd.apply(this, arguments);
    };
    
    String.prototype.right = function (count)
    {
        if(this.length > count)
            return this.substr(this.length - count, count);
        else
            return this.substr(0, this.length);
    };
}

function RunSmartEvalContext(CodeLex,EvalContext)
{
    var publist = {};
    var funclist = {};
    var messagelist = {};
    
    EvalContext.publist = publist;
    EvalContext.messagelist = messagelist;
    EvalContext.funclist = funclist;
    
    eval(CodeLex);
}

function SetFreezeListF()
{
    for(var key in ListF)
    {
        if(key.substr(0, 1) != "$")
            continue;
        if(window[key])
            continue;
        var Value = ListF[key];
        Object.freeze(Value);
        Object.defineProperty(window, key, {writable:false, value:Value});
    }
}

SetFreezeListF();
ListF = {};
ChangePrototype();

global.EvalMap = {};
function GetEval(Smart,SmartCode)
{
    var Map = global.EvalMap;
    var EvalContext = Map["EVAL" + Smart.Num];
    
    if(!EvalContext)
    {
        EvalContext = CreateSmartEvalContext(SmartCode);
        Map["EVAL" + Smart.Num] = EvalContext;
    }
    return EvalContext;
}
function InitEvalMap()
{
    global.EvalMap = {};
}


global.UPDATE_CODE_SHARDING = 0;
