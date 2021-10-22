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

var SMARTS=
    {
        ReadSmart: function (Num)
        {
            return VM_SMARTS[Num];
        }
    };

VM_VALUE.Smart = {};
VM_VALUE.ArrWallet = [];

var DefPubKeyArr0 = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
VM_VALUE.PrivKey = GetHexFromArr([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
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
    SMART.Version=2;
    
    if(CurProjectValue)
    {
        DapNumber = 7;
    }
    else
    {
        DapNumber =  + ($("idSmartList").value);
    }

    if(bRecreate || VM_VALUE.PrevName !== SMART.Name)
        bRecreate = 1;

    if(DapNumber > VM_VALUE.MaxDappsID)
    {
        VM_VALUE.MaxDappsID = DapNumber;
        bRecreate=1;
    }
    
    glSmart = DapNumber;
    SMART.Num = DapNumber;
    
    VM_SMARTS[glSmart] = SMART;
    VM_VALUE.Smart = SMART;
    
    if(bRecreate)
    {
        bRecreate = 1;
        VM_ACCOUNTS = [];
        VM_KEY_VALUE = {};
        InitVMArrays();

        VM_SMARTS[glSmart] = SMART;
        VM_VALUE.Smart = SMART;

        VM_VALUE.SmartBlock = CreateNewBlock({Type:130});

        
        var Currency = 0;
        var SumBase = 10000;
        if(SMART.TokenGenerate)
        {
            Currency = glSmart;
            SumBase =  + SMART.StartValue;
        }
        
        GetNewAccount(100, "TEST", 100000, glSmart, Currency, 1);
        GetNewAccount(101, "Some USD", 1500, glSmart, 0, 1,1);
        GetNewAccount(102, "Some BTC", 10, glSmart, 0, 1,2);
        GetNewAccount(103, "Some SOFT", 3000, glSmart, 0, 1,3);
        
        GetNewAccount(104, "Account #1", 0, glSmart, 0, 1);
        GetNewAccount(105, "Account #2", 0, glSmart, 0, 1);

        GetNewAccount(106, "OWNER", 4000, glSmart, Currency, 1);
        VM_VALUE.BaseAccount = GetNewAccount(107, "Smart base", SumBase, glSmart, Currency, SMART.OwnerPubKey);

        FillOwnWalletAccount();
        
        BASE_ACCOUNT = VM_VALUE.BaseAccount;
        
        InitStorageEmulate();
        InitEvalMap();
    }

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
        var PayContext = {FromID:SMART.Owner, ToID:0, Description:"Smart create", Value:{SumCOIN:GetPrice(SMART), SumCENT:0}};
        try
        {
            RunPublicMethod("OnCreate", VM_VALUE.SmartBlock, BASE_ACCOUNT, PayContext);

            // PayContext = {FromID:VM_VALUE.WalletAccount.Num, ToID:0, Description:"Smart set", Value:{SumCOIN:0, SumCENT:0}};
            // RunPublicMethod("OnSetSmart", VM_VALUE.SmartBlock, VM_VALUE.WalletAccount, PayContext);
        }
        catch(e)
        {
            //ToLog("Error: " + e);
            console.log("%c" + e, "color:red;font-weight:bold;");
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

function GetNewAccount(Num,Name,Sum,Smart,Currency,PubKey,CurrencyMint,RunMethod)
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

    // var Mint=0,CurrencyObj=VM_SMARTS[Currency];
    // if(CurrencyObj && CurrencyObj.Version>=2)
    // {
    //     Mint=1;
    // }
    
    Item.Num = Num;
    Item.Name = Name;
    Item.Value = {SumCOIN:CurrencyMint?0:Sum, SumCENT:0, Smart:Smart};
    Item.SmartState = InitSmartState(Num, Smart);
    Item.Currency = Currency;
    Item.BlockNumCreate=VM_VALUE.CurBlockNum;
    

    if(PubKey==1 || PubKey==true)
        Item.PubKey = VM_VALUE.PubKey;
    else
    if(PubKey)
        Item.PubKey = GetArrFromHex(PubKey);
    else
        Item.PubKey = DefPubKeyArr;

    //console.log("PubKey",Item.PubKey)
    Item.PubKeyStr=GetHexFromArr(Item.PubKey);

    if(Smart)
    {
        Item.SmartObj = VM_SMARTS[Smart];
        if(RunMethod)
        {
            global.SetTickCounter(35000);
            try
            {
                var PayContext = {FromID: 0, ToID: 0, Description: "Smart set", Value: {SumCOIN: 0, SumCENT: 0}};
                RunPublicMethod("OnSetSmart", VM_VALUE.SmartBlock, Item, PayContext);
            }
            catch(e)
            {
                //ToLog("Error: " + e);
                console.log("%c" + e, "color:red;font-weight:bold;");
            }
        }
    }

    if(CurrencyMint)
    {
        var Block = CreateNewBlock({Type: 0});
        var Smart2 = SMARTS.ReadSmart(CurrencyMint);
        //console.log("Smart2:",Smart2.Code)
        global.SetTickCounter(35000);
        var PayContext={FromID:Smart2.Owner, ToID:Smart2.Account, Description:"", Value:{SumCOIN:0, SumCENT:0}};
        RunSmartMethod(Block, undefined, Smart2, undefined, Block.BlockNum, 0, PayContext, "DoMint",{Account:Num,Amount:Sum,ID:""},[],1);
    }

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

function SetFirstTimeBlock()
{
    VM_VALUE.FIRST_TIME_BLOCK = Date.now() - VM_BLOCKS.length * VM_VALUE.CONSENSUS_PERIOD_TIME;
}
function InitVMArrays()
{
    
    for(var Num = 0; Num <= VM_VALUE.CurBlockNum; Num++)
    {
        var Block = {Type:1, Body:"0101020304AABBCCDD", Params:"{}"};
        AddHash(Block);
        VM_BLOCKS[Num] = Block;
    }

    SetFirstTimeBlock();

    for(var Num = 8; Num <= VM_VALUE.MaxDappsID; Num++)
    {
        VM_SMARTS[Num] = {Num:Num, Name:"SMART#" + Num, ShortName:"TST",Version:0};
    }
    VM_SMARTS[1] = {Num:1, Name:"USD TOKEN", ShortName:"USD", Code:GetTextFromF(TemplateSmartToken),Version:2};
    VM_SMARTS[2] = {Num:2, Name:"BTC TOKEN", ShortName:"BTC", Code:GetTextFromF(TemplateSmartToken),Version:2};
    VM_SMARTS[3] = {Num:3, Name:"SOFT TOKEN", ShortName:"SOFT", Code:GetTextFromF(TemplateSmartToken),Version:2};
    //VM_SMARTS[2] = {Num:2, Name:"BTC TOKEN", ShortName:"BTC", TokenGenerate:1,Version:0};


    for(var Num = 0; Num <= MaxAccCreate; Num++)
    {
        var Item=GetNewAccount(Num, "TEST#" + Num, 1000);
        if(Num&& Num<=3)
        {
            Item.Value.Smart = Num;
            VM_SMARTS[Num].Account=Num;
            VM_SMARTS[Num].Owner=Num;
        }
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
function CreateNewAccount(Currency,Name,PubKey,F,Context,Confirm)
{
    ToLogDebug("Run:CreateNewAccount");
    if(!Name)
        Name=SMART.Name;
    if(PubKey===undefined)
        PubKey=1;
    GetNewAccount(VM_ACCOUNTS.length, Name, 0, glSmart, Currency, PubKey,0,1);
    if(F)
    {
        var Tx={result:VM_ACCOUNTS.length-1};
        setTimeout(function ()
        {
            F(0, Tx, [100, 0, 0, 0, 0], "Create ok", Context);
        },1000);
    }
}
function ReloadDapp()
{
    ToLog("Run:ReloadDapp");
}
function SetLocationHash(Str)
{
    ToLogDebug("Run:SetLocationHash: " + Str);
}

function DoTranslate(Data)
{
}


// function RunStaticSmartMethod(AccountNum,MethodName,Params,ParamsArr,nPublic)
// {
//     //console.log("RunStaticSmartMethod",MethodName,AccountNum,"Params=",Params,nPublic);
//     var Account;
//     if(typeof AccountNum==="number")
//         Account = ACCOUNTS.ReadStateTR(AccountNum);
//     else
//         Account = AccountNum;
//
//     if(!Account)
//     {
//         return {result:0, RetValue:"Error account Num: " + AccountNum};
//     }
//
//     global.SetTickCounter(100000);
//
//     var glBlock0 = CreateNewBlock({Type:0});
//
//     return SendCallMethod(AccountNum,MethodName,Params,ParamsArr,0);
// }


function SendCallMethod(ToNum,MethodName,Params,ParamsArr,FromNum,FromSmartNum,F,Context,Confirm,TxTicks,bStatic,PayContext)
{
    SetStatus("");
    if(bStatic)
        global.SetTickCounter(100000);
    else
        global.SetTickCounter(TxTicks?TxTicks:35000);
    
    var StrCode = GetSmartCode();
    var Account = GetVMAccount(ToNum);
    if(!PayContext)
        PayContext = {FromID:ParseNum(FromNum), ToID:Account.Num, Description:"", Value:{SumCOIN:0, SumCENT:0}};

    var Data = {Type:136, Account:Account.Num, MethodName:MethodName, FromNum:FromNum, Params:JSON.stringify(Params)};
    var Block = CreateNewBlock(Data, bStatic);
    var BlockNum = Block.BlockNum;
    var Tx=CopyObjKeys({},Data);
    Tx.BlockNum=Block.BlockNum;
    Tx.TrNum=Block.TrNum;
    ToLogDebug("" + Block.BlockNum + ". CallMethod " + MethodName + " " + ToNum + "<-" + FromNum);
    
    var Result,Err=0,Text;
    try
    {
        BEGINTRANSACTION(1);
        Result = RunSmartMethod(Block, Data, VM_VALUE.Smart, Account, BlockNum, Block.TrNum, PayContext, MethodName, Params, ParamsArr, 1,1, StrCode);
        Text="Sent to virtual chain";
        Tx.Result=1;
    }
    catch(e)
    {
        ROLLBACKRANSACTION();
        Data.Type = 0;
        Data.Account = 0;
        Data.Params = undefined;
        Data.MethodName = undefined;

        Err=String(e);
        Text=Err;
        SendMessageError(Err);
        console.error(e);
    }
    finally
    {
        COMMITRANSACTION();
    }

    if(bStatic && Result)
        Result=JSON.parse(JSON.stringify(Result));

    if(!bStatic && $("idDebugTiks").checked)
    {
        console.log("%cTicks of "+MethodName, "color:blue;",(TxTicks?TxTicks:35000)-TickCounter);
        //console.log(" Rest ticks '"+MethodName+"'", TickCounter);
    }

    if(F)
    {
        setTimeout(function ()
        {
            F(Err, Tx, [135, 0, 0, 0, 0], Text, Context);
        },1000);
    }


    return Result;
}

function RunPublicMethod(MethodName,Block,Account,PayContext)
{
    var StrCode = GetSmartCode();
    ToLogDebug("RunPublicMethod " + MethodName);
    
    RunSmartMethod(Block, undefined, VM_VALUE.Smart, Account, Block.BlockNum, 0, PayContext, MethodName, undefined, undefined, 0, 0, StrCode);
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

    if(!bStat)
        SetFirstTimeBlock();

    return Block;
}
function AddNewBlock()
{
    for(var i = 0; i < 1; i++)
    {
        var CurBlockTime = GetBlockNumByTimePlay(new Date());
        if(VM_VALUE.CurBlockNum > CurBlockTime)
            break;
        
        var Block = CreateNewBlock({Type:0});
        ToLogDebug("Block: " + Block.BlockNum);
    }
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

async function AddToTransfer(Data)
{
    //console.log("AddToTransfer",Data);

    var PayContext=Data.ParamsPay;
    var ParamsCall=Data.ParamsCall;
    if(!PayContext.Value)
        PayContext.Value=0;
    if(typeof PayContext.Value==="number")
        PayContext.Value=COIN_FROM_FLOAT(PayContext.Value);
    if(ISZERO(PayContext.Value))
        throw new Error("Zero Value");

    PayContext.SmartMode=0;
    try
    {
        MoveCoin(PayContext.FromID,PayContext.ToID,PayContext.Value,PayContext.Description,PayContext.Currency,PayContext.ID,PayContext.SmartMode);
    }
    catch(e)
    {
        var StrError=String(e);
        RetSendTx(1,{}, [], StrError, Data);
        return;
    }
    if(ParamsCall)
    {
        SendCallMethod(PayContext.ToID, ParamsCall.Method, ParamsCall.Params, ParamsCall.ParamsArr, PayContext.FromID, Data.Smart, RetSendTx, Data, 1, Data.TxTicks, 0, PayContext);
    }

}

function MoveCoin(FromID,ToID,CoinSum,Description,Currency,TokenID,SmartMode)
{
    CoinSum = CoinSumHelper(CoinSum);
    
    var FromData = GetVMAccount(FromID);
    var ToData = GetVMAccount(ToID);

    if(SmartMode)
    if(FromData.Value.Smart !== RunContext.Smart.Num)
    {
        throw "The account: " + FromID + " does not belong to the smart-contract: " + RunContext.Smart.Num + ", access is denied";
    }

    if(Currency && FromData.Currency==Currency)
    {
        //console.log("1 Set zero Currency: "+Currency);
        Currency = 0;
    }
    // if(Currency && ToData.Currency==Currency)
    // {
    //     console.log("2 Set zero Currency: "+Currency);
    //     Currency = 0;
    // }

    if(Currency)
    {
        //перевод soft токенов
        if(!TokenID)
            TokenID="";

        var Smart = SMARTS.ReadSmart(Currency);
        if(!Smart)
            throw "ERROR Read smart: "+Currency;
        if(Smart.Version<2)
            throw "Smart contract "+Currency+" is not a Software Token";
        var Block,TrNum=0;
        if(RunContext)
        {
            Block = RunContext.Block;
            TrNum = RunContext.TrNum;
        }
        else
        {
            Block = CreateNewBlock({Type: 0});
        }
        var PayContext = {FromID:FromID, ToID:ToID, Description:Description, Value:CoinSum,Currency:Currency,TokenID:TokenID,SmartMode:SmartMode};
        RunSmartMethod(Block, undefined, Smart, undefined, Block.BlockNum, TrNum, PayContext, "OnTransfer",{From:FromID,To:ToID,Amount:CoinSum,ID:TokenID},[],0,1);
    }
    else
    {
        if(FromData.Currency !== ToData.Currency)
        {
            throw "Different currencies. Accounts: " + FromData.Num + " and " + ToData.Num;
        }

        var Value = {SumCOIN:FromData.Value.SumCOIN, SumCENT:FromData.Value.SumCENT};
        if(!SUB(Value, CoinSum))
            throw "Not enough money on the account ID:" + FromID;

        SUB(FromData.Value, CoinSum);
        ADD(ToData.Value, CoinSum);
    }

    var Context = {FromID:FromID, ToID:ToID, Description:Description, Value:CoinSum, SmartMode:SmartMode,Currency:Currency,TokenID:TokenID};
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

const $Send = function (ToID,CoinSum,Description,Currency,TokenID)
{
    DO(3000);
    MoveCoin(RunContext.Account.Num, ToID, CoinSum, Description, Currency,TokenID,1);
}

const $Move = function (FromID,ToID,CoinSum,Description,Currency,TokenID)
{
    DO(3000);
    MoveCoin(FromID, ToID, CoinSum, Description, Currency,TokenID,1);
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
        EvalContext = CreateSmartEvalContext(SmartCode,"",2);
        EvalContextMap[SmartNum] = EvalContext;
    }
    
    EvalContext.funclist.SetContext(RunContext.context);
    return EvalContext.publist;
};

ListF.$SendMessage = function ()
{
    DO(20000);
};

function GetValueKey(Key)
{
    if(!RunContext.Account)
        throw "Error - not set smart Account"

    var Key2=""+RunContext.Smart.Num+"-"+Key;
    return Key2;
}

const $ReadValue = function (Key,Format,IDFrom)
{
    DO(900);
    
    var Value;
    var Buf = VM_KEY_VALUE[GetValueKey(Key)];
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

    //console.log(Key,Value);

    return Value;
};

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
    
    VM_KEY_VALUE[GetValueKey(Key)] = Buf;

    //console.log(Key,Value);

}

const $RemoveValue = function (Key)
{
    DO(1000);
    delete VM_KEY_VALUE[GetValueKey(Key)];
}

const $GetObjectFromBuffer = function (ValueBuf,Format)
{
    DO(100);

    return  SerializeLib.GetObjectFromBuffer(ValueBuf, Format, {},0,1);
};

const $GetBufferFromObject = function (Value,Format)
{
    DO(100);

    return SerializeLib.GetBufferFromObject(Value, Format, {})
};


//New 2


const $fromCodePoint = function (Value)
{
    DO(10);

    return String.fromCodePoint(Value);
};

//New soft token support(like ERC)
function CallMethod(Smart,Method,Params,ParamsArr,nPublic)
{
    var PayContext = {FromID:RunContext.Smart.Account, ToID:Smart.Account, Description:"", Value:{SumCOIN:0, SumCENT:0}, SmartMode:1};

    return RunSmartMethod(RunContext.Block, undefined, Smart, undefined, RunContext.BlockNum, RunContext.TrNum, PayContext, Method,Params,ParamsArr,nPublic);
}

function CallMethodStatic(Smart,Method,Params,ParamsArr,nPublic)
{
    global.SetTickCounter(100000);
    var PayContext = {FromID:Smart.Account, ToID:Smart.Account, Description:"", Value:{SumCOIN:0, SumCENT:0}, SmartMode:1};
    var AccountObj=VM_ACCOUNTS[Smart.Account];
    return RunSmartMethod({BlockNum:0}, undefined, Smart, AccountObj, 0, 0, PayContext, Method,Params,ParamsArr,nPublic);
}

const $RegInWallet=function(Account)
{
    DO(100);

    var Ret=RegInWallet(RunContext.BlockNum,Account,RunContext.Smart.Num);
    if(Ret)
    {
        DO(900);
    }
    return Ret;
}



const $CreateSmart=function(FromSmart,Params)
{
    console.log("TODO: CreateSmart!!!");

    DO(5000);
}


const $Call=function(Smart,Method,Params,ParamsArr)
{
    DO(1000);
    return CallMethod(Smart,Method,Params,ParamsArr,1);
}

const $GetBalance=function(Account,Currency,ID)
{
    Account = Account >>> 0;
    Currency = Currency >>>0;
    DO(1000);

    if(!Currency)
    {
        var Data = ACCOUNTS.ReadStateTR(Account);
        if(!Data)
            throw "Error account Num: " + Account;
        return {SumCOIN:Data.Value.SumCOIN,SumCENT:Data.Value.SumCENT};
    }

    return CallMethod(Currency,"OnGetBalance",Account,ID,0);
}

const $MoveCall = function (FromID,ToID,CoinSum,Description,Currency,TokenID,Method,Params,ParamsArr)
{
    if(typeof CoinSum === "number")
        CoinSum = COIN_FROM_FLOAT(CoinSum);

    DO(3000);
    MoveCoin(FromID, ToID, CoinSum, Description, Currency,TokenID,1);

    var Account = ACCOUNTS.ReadStateTR(ToID);
    var Smart=Account.Value.Smart;
    var PayContext = {FromID:FromID, ToID:ToID, Description:Description, Value:CoinSum, Currency:Currency,TokenID:TokenID, SmartMode:1};


    return RunMethod(Smart,Method,Params,ParamsArr,1, PayContext,Account);
};


function PlaySend(From,To,fSum,Desc,Currency,TokenID)
{
    global.SetTickCounter(35000);
    SetStatus("")
    
    try
    {
        BEGINTRANSACTION(2);
        MoveCoin(From, To, COIN_FROM_FLOAT(fSum), Desc, Currency,TokenID,0);
    }
    catch(e)
    {
        ROLLBACKRANSACTION();
        SendMessageError("" + e);
        console.error(e);
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
        if(!SmartCode)
            SmartCode=Smart.Code;

        EvalContext = CreateSmartEvalContext(SmartCode,Smart.Name,2);
        Map["EVAL" + Smart.Num] = EvalContext;
    }
    return EvalContext;
}
function InitEvalMap()
{
    global.EvalMap = {};
}


const $console = console;
const $TickCounter=function (){return TickCounter};

global.UPDATE_CODE_SHARDING = 0;
