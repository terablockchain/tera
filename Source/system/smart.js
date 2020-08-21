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

require("../HTML/JS/lexer.js");
require("../HTML/JS/smart-vm.js");

const DBRow = require("../core/db/db-row");
const TYPE_TRANSACTION_SMART_CREATE = 130;
global.TYPE_TRANSACTION_SMART_RUN = 135;
const TYPE_TRANSACTION_SMART_CHANGE = 140;

global.FORMAT_SMART_CREATE = "{\
    Type:byte,\
    TokenGenerate:byte,\
    StartValue:uint,\
    OwnerPubKey:byte,\
    ISIN:str,\
    Zip:byte,\
    AccountLength:byte,\
    StateFormat:str,\
    Category1:byte,\
    Category2:byte,\
    Category3:byte,\
    Fixed:byte,\
    CentName:str5,\
    Reserve:arr14,\
    IconBlockNum:uint,\
    IconTrNum:uint16,\
    ShortName:str5,\
    Name:str,\
    Description:str,\
    Code:str,\
    HTML:str,\
    }";
const WorkStructCreate = {};

global.FORMAT_SMART_RUN = "{\
    Type:byte,\
    Account:uint,\
    MethodName:str,\
    Params:str,\
    FromNum:uint,\
    OperationID:uint,\
    Version:byte,\
    Reserve:arr9,\
    Sign:arr64,\
    }";
const WorkStructRun = {};

global.FORMAT_SMART_CHANGE = "{\
    Type:byte,\
    Account:uint,\
    Smart:uint32,\
    Version:byte,\
    Reserve:arr9,\
    FromNum:uint,\
    OperationID:uint,\
    Sign:arr64,\
    }";
const WorkStructChange = {};


class SmartApp extends require("./dapp")
{
    constructor()
    {
        super()
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        
        this.FORMAT_ROW = "{\
            Version:byte,\
            TokenGenerate:byte,\
            ISIN:str12,\
            Zip:byte,\
            BlockNum:uint,\
            TrNum:uint16,\
            IconBlockNum:uint,\
            IconTrNum:uint16,\
            ShortName:str5,\
            Name:str40,\
            Account:uint,\
            AccountLength:byte,\
            Category1:byte,\
            Category2:byte,\
            Category3:byte,\
            Owner:uint,\
            Fixed:byte,\
            CentName:str5,\
            Reserve:arr14,\
            StateFormat:str,\
            Description:str,\
            Code:str,\
            HTML:str,\
            SumHash:hash,\
            }"
        
        this.ROW_SIZE = 2 * (1 << 13)
        this.DBSmart = new DBRow("smart", this.ROW_SIZE, this.FORMAT_ROW, bReadOnly)
        this.InitHole()
        
        if(!bReadOnly)
            this.Start()
    }
    
    SaveAllToFile()
    {
        var Str = "";
        for(var i = 8; i <= this.GetMaxNum(); i++)
        {
            var Smart = this.ReadSmart(i);
            Str += "//############################## " + i + "." + Smart.Name + "\r\n\r\n\r\n"
            Str += Smart.Code + "\r\n\r\n\r\n"
        }
        SaveToFile(GetDataPath("smart-all.txt"), Str)
    }
    
    Start()
    {
        if(this.GetMaxNum() + 1 >= 7)
            return;
        
        this.DBSmartWrite({Num:0, ShortName:"TERA", Name:"TERA", Description:"TERA", BlockNum:0, TokenGenerate:1, Account:0, Category1:0})
        for(var i = 1; i < 8; i++)
            this.DBSmartWrite({Num:i, ShortName:"", Name:"", Description:"", BlockNum:0, TokenGenerate:1, Account:i, Category1:0})
    }
    
    Close()
    {
        this.DBSmart.Close()
    }
    
    ClearDataBase()
    {
        this.DBSmart.Truncate( - 1)
        this.Start()
    }
    GetSenderNum(BlockNum, Body)
    {
        var Type = Body[0];
        if(Type && Body.length > 90)
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_SMART_RUN:
                    var len = 1 + 6;
                    len += 2 + Body[len] + Body[len + 1] * 256
                    if(len + 64 > Body.length)
                        return 0;
                    len += 2 + Body[len] + Body[len + 1] * 256
                    if(len + 64 > Body.length)
                        return 0;
                    
                    var Num = ReadUintFromArr(Body, len);
                    return Num;
                case TYPE_TRANSACTION_SMART_CHANGE:
                    var Num = ReadUintFromArr(Body, 1);
                    return Num;
            }
        }
        
        return 0;
    }
    GetSenderOperationID(BlockNum, Body)
    {
        var Type = Body[0];
        if(Type && Body.length > 90)
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_SMART_RUN:
                    var len = 1 + 6;
                    len += 2 + Body[len] + Body[len + 1] * 256
                    if(len + 64 > Body.length)
                        return 0;
                    len += 2 + Body[len] + Body[len + 1] * 256
                    if(len + 64 > Body.length)
                        return 0;
                    len += 6
                    var Num = ReadUintFromArr(Body, len);
                    return Num;
                case TYPE_TRANSACTION_SMART_CHANGE:
                    var Num = ReadUintFromArr(Body, 1 + 26);
                    return Num;
            }
        }
        
        return 0;
    }
    
    CheckSignTransferTx(BlockNum, Body)
    {
        return this.CheckSignAccountTx(BlockNum, Body);
    }
    
    OnDeleteBlock(Block)
    {
        if(Block.BlockNum < 1)
            return;
        this.DBSmart.DeleteHistory(Block.BlockNum)
    }
    
    OnProcessBlockStart(Block)
    {
        if(Block.BlockNum < 1)
            return;
        this.OnDeleteBlock(Block)
    }
    
    OnProcessBlockFinish(Block)
    {
    }
    
    OnProcessTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];
        
        if(!ContextFrom)
        {
            DApps.Accounts.BeginTransaction()
        }
        
        var Result;
        try
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_SMART_CREATE:
                    Result = this.TRCreateSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                    break;
                case TYPE_TRANSACTION_SMART_RUN:
                    Result = this.TRRunSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                    break;
                case TYPE_TRANSACTION_SMART_CHANGE:
                    Result = this.TRChangeSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                    break;
            }
        }
        catch(e)
        {
            Result = "" + e
            if(global.WATCHDOG_DEV)
                ToLogTx("BlockNum :" + BlockNum + ":" + e)
        }
        
        return Result;
    }
    
    GetFormatTransaction(Type)
    {
        var format;
        if(Type === TYPE_TRANSACTION_SMART_CREATE)
            format = FORMAT_SMART_CREATE
        else
            if(Type === TYPE_TRANSACTION_SMART_RUN)
                format = FORMAT_SMART_RUN
            else
                if(Type === TYPE_TRANSACTION_SMART_CHANGE)
                    format = FORMAT_SMART_CHANGE
                else
                    format = ""
        return format;
    }
    GetVerifyTransaction(Block, BlockNum, TrNum, Body)
    {
        Engine.DBResult.CheckLoadResult(Block)
        
        if(Block.VersionBody === 1)
        {
            var Result = Block.arrContentResult[TrNum];
            if(!Result)
                return  - 1;
            else
                return Result;
        }
        return 1;
    }
    
    TRCreateSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(!ContextFrom)
            return "Pay context required";
        
        if(Body.length < 31)
            return "Error length transaction (min size)";
        
        if(Body.length > 16000)
            return "Error length transaction (max size)";
        
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";
        
        var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_CREATE, WorkStructCreate);
        if(!TR.Name.trim())
            return "Name required";
        if(TR.AccountLength > 50)
            return "Error AccountLength=" + TR.AccountLength;
        if(TR.AccountLength < 1)
            TR.AccountLength = 1
        
        var AddAccount = TR.AccountLength - 1;
        
        var Price;
        if(TR.TokenGenerate)
            Price = PRICE_DAO(BlockNum).NewTokenSmart
        else
            Price = PRICE_DAO(BlockNum).NewSmart
        Price += AddAccount * PRICE_DAO(BlockNum).NewAccount
        
        if(!(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID === 0 && ContextFrom.To[0].SumCOIN >= Price))
        {
            return "Not money in the transaction";
        }
        
        ContextFrom.ToID = ContextFrom.To[0].ID
        var Smart = TR;
        Smart.Version = 0
        Smart.Zip = 0
        Smart.BlockNum = BlockNum
        Smart.TrNum = TrNum
        Smart.Num = undefined
        Smart.Owner = ContextFrom.FromID
        this.DBSmart.CheckNewNum(Smart)
        var Account = DApps.Accounts.NewAccountTR(BlockNum, TrNum);
        Account.Value.Smart = Smart.Num
        Account.Name = TR.Name
        if(Smart.TokenGenerate)
        {
            Account.Currency = Smart.Num
            
            Account.Value.SumCOIN = TR.StartValue
        }
        if(TR.OwnerPubKey)
            Account.PubKey = ContextFrom.FromPubKey
        
        DApps.Accounts.WriteStateTR(Account, TrNum)
        for(var i = 0; i < AddAccount; i++)
        {
            var CurAccount = DApps.Accounts.NewAccountTR(BlockNum, TrNum);
            CurAccount.Value.Smart = Smart.Num
            CurAccount.Name = TR.Name
            if(Smart.TokenGenerate)
                CurAccount.Currency = Smart.Num
            if(TR.OwnerPubKey)
                CurAccount.PubKey = ContextFrom.FromPubKey
            
            DApps.Accounts.WriteStateTR(CurAccount, TrNum)
        }
        
        Smart.Account = Account.Num
        
        this.DBSmart.DeleteMap("EVAL" + Smart.Num)
        try
        {
            RunSmartMethod(Block, Smart, Account, BlockNum, TrNum, ContextFrom, "OnCreate")
        }
        catch(e)
        {
            this.DBSmart.DeleteMap("EVAL" + Smart.Num)
            return e;
        }
        if(BlockNum < global.UPDATE_CODE_2)
        {
            Smart.Reserve = []
        }
        
        this.DBSmartWrite(Smart)
        
        return true;
    }
    
    CheckSignFrom(Body, TR, BlockNum, TrNum)
    {
        var ContextFrom = {FromID:TR.FromNum};
        
        var AccountFrom = DApps.Accounts.ReadStateTR(TR.FromNum);
        if(!AccountFrom)
            return "Error account FromNum: " + TR.FromNum;
        if(TR.OperationID < AccountFrom.Value.OperationID)
            return "Error OperationID (expected: " + AccountFrom.Value.OperationID + " for ID: " + TR.FromNum + ")";
        var MaxCountOperationID = 100;
        if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
            MaxCountOperationID = 1000000
        if(TR.OperationID > AccountFrom.Value.OperationID + MaxCountOperationID)
            return "Error too much OperationID (expected max: " + (AccountFrom.Value.OperationID + MaxCountOperationID) + " for ID: " + TR.FromNum + ")";
        var hash;
        if(TR.Version === 4 && BlockNum >= global.UPDATE_CODE_6)
            hash = SHA3BUF(Body.slice(0, Body.length - 64), BlockNum)
        else
            hash = SHA3BUF(Body.slice(0, Body.length - 64 - 12), BlockNum)
        
        var Result = 0;
        if(AccountFrom.PubKey[0] === 2 || AccountFrom.PubKey[0] === 3)
            try
            {
                Result = secp256k1.verify(hash, TR.Sign, AccountFrom.PubKey)
            }
            catch(e)
            {
            }
        if(!Result)
        {
            return "Error sign transaction";
        }
        
        if(BlockNum >= 13000000)
        {
            AccountFrom.Value.OperationID = TR.OperationID + 1
            DApps.Accounts.WriteStateTR(AccountFrom, TrNum)
        }
        else
            if(AccountFrom.Value.OperationID !== TR.OperationID)
            {
                AccountFrom.Value.OperationID = TR.OperationID
                DApps.Accounts.WriteStateTR(AccountFrom, TrNum)
            }
        
        return ContextFrom;
    }
    
    TRRunSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(Body.length < 100)
            return "Error length transaction (min size)";
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";
        
        var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN, WorkStructRun);
        
        var Account = DApps.Accounts.ReadStateTR(TR.Account);
        if(!Account)
            return "RunSmart: Error account Num: " + TR.Account;
        
        if(!ContextFrom && TR.FromNum)
        {
            var ResultCheck = this.CheckSignFrom(Body, TR, BlockNum, TrNum);
            if(typeof ResultCheck === "string")
                return ResultCheck;
            ContextFrom = ResultCheck
        }
        
        try
        {
            var Params = JSON.parse(TR.Params);
            RunSmartMethod(Block, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, TR.MethodName, Params, 1)
        }
        catch(e)
        {
            return e;
        }
        return true;
    }
    
    TRChangeSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        
        if(Body.length < 21)
            return "Error length transaction (min size)";
        
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";
        
        var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_CHANGE, WorkStructChange);
        
        if(!ContextFrom)
        {
            var ResultCheck = this.CheckSignFrom(Body, TR, BlockNum, TrNum);
            if(typeof ResultCheck === "string")
                return ResultCheck;
            ContextFrom = ResultCheck
        }
        
        if(TR.Smart > this.GetMaxNum())
            TR.Smart = 0
        
        if(ContextFrom.FromID !== TR.Account)
            return "ChangeSmart: Error account FromNum: " + TR.Account;
        var Account = DApps.Accounts.ReadStateTR(TR.Account);
        if(!Account)
            return "Error read account Num: " + TR.Account;
        
        if(BlockNum >= 13000000)
        {
            if(Account.Value.Smart === TR.Smart)
                return "The value has not changed";
        }
        
        if(Account.Value.Smart)
        {
            var Smart = this.ReadSmart(Account.Value.Smart);
            if(Smart.Account === TR.Account)
                return "Can't change base account";
            
            try
            {
                RunSmartMethod(Block, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnDeleteSmart")
            }
            catch(e)
            {
                return e;
            }
        }
        
        Account.Value.Smart = TR.Smart
        Account.Value.Data = []
        DApps.Accounts.WriteStateTR(Account, TrNum)
        
        if(Account.Value.Smart)
        {
            try
            {
                RunSmartMethod(Block, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnSetSmart")
            }
            catch(e)
            {
                return e;
            }
        }
        
        return true;
    }
    GetRows(start, count, Filter, Category, GetAllData, bTokenGenerate)
    {
        
        if(Filter)
        {
            Filter = Filter.trim()
            Filter = Filter.toUpperCase()
        }
        if(Category)
            Category = ParseNum(Category)
        
        var WasError = 0;
        var arr = [];
        var Data;
        for(var num = start; true; num++)
        {
            if(this.IsHole(num))
                continue;
            
            if(GetAllData)
                Data = this.ReadSmart(num)
            else
                Data = this.ReadSimple(num)
            
            if(!Data)
                break;
            
            if(bTokenGenerate && !Data.TokenGenerate)
                continue;
            
            if(Category)
            {
                if(Data.Category1 !== Category && Data.Category2 !== Category && Data.Category3 !== Category)
                    continue;
            }
            
            if(Filter)
            {
                var Str = "" + Data.ShortName.toUpperCase() + Data.ISIN.toUpperCase() + Data.Name.toUpperCase() + Data.Description.toUpperCase();
                if(Data.TokenGenerate)
                    Str += "TOKEN GENERATE"
                
                if(Str.indexOf(Filter) < 0)
                    continue;
            }
            
            var CanAdd = 1;
            var DataState = DApps.Accounts.ReadState(Data.Account);
            if(DataState)
            {
                Data.BaseState = DApps.Accounts.GetSmartState(DataState, Data.StateFormat)
                if(!global.ALL_VIEW_ROWS)
                    if(typeof Data.BaseState === "object" && Data.BaseState.HTMLBlock === 404)
                        CanAdd = 0
            }
            
            if(CanAdd)
            {
                arr.push(Data)
            }
            
            count--
            if(count < 1)
                break;
        }
        
        return arr;
    }
    
    GetMaxNum()
    {
        return this.DBSmart.GetMaxNum();
    }
    DBSmartWrite(Item)
    {
        var PrevNum;
        if(Item.Num === undefined)
            PrevNum = this.GetMaxNum()
        else
            PrevNum = Item.Num - 1
        
        Item.SumHash = []
        var Buf = BufLib.GetBufferFromObject(Item, this.FORMAT_ROW, 20000, {});
        var Hash = sha3(Buf);
        
        if(PrevNum < 0)
            Item.SumHash = Hash
        else
        {
            var PrevItem = this.DBSmart.Read(PrevNum);
            if(!PrevItem)
            {
                throw "!PrevItem of Smart num = " + PrevNum;
            }
            Item.SumHash = sha3arr2(PrevItem.SumHash, Hash)
        }
        
        this.DBSmart.Write(Item)
    }
    ReadSmart(Num)
    {
        Num = ParseNum(Num)
        var Smart = this.DBSmart.GetMap("ITEM" + Num);
        if(!Smart)
        {
            Smart = this.DBSmart.Read(Num)
            if(Smart)
            {
                if(!Smart.WorkStruct)
                    Smart.WorkStruct = {}
                
                Smart.CodeLength = Smart.Code.length
                Smart.HTMLLength = Smart.HTML.length
                
                this.DBSmart.SetMap("ITEM" + Num, Smart)
            }
        }
        
        return Smart;
    }
    ReadSimple(Num, bTokenDescription)
    {
        var Smart = this.DBSmart.GetMap("SIMPLE" + Num);
        if(!Smart)
        {
            Smart = this.DBSmart.Read(Num)
            if(Smart)
            {
                Smart.CodeLength = Smart.Code.length
                Smart.HTMLLength = Smart.HTML.length
                
                Object.defineProperties(Smart, {Reserve:{configurable:true, enumerable:false}})
                Object.defineProperties(Smart, {Code:{configurable:true, enumerable:false}})
                Object.defineProperties(Smart, {HTML:{configurable:true, enumerable:false}})
                Object.defineProperties(Smart, {Description:{configurable:true, enumerable:false}})
                
                this.DBSmart.SetMap("SIMPLE" + Num, Smart)
            }
        }
        
        if(bTokenDescription)
            this.AddCurrencyTokenDescription(Smart)
        
        return Smart;
    }
    
    AddCurrencyTokenDescription(Smart)
    {
        if(!Smart || !Smart.Num)
            return;
        
        if(!this.MapTokenDescription)
            this.MapTokenDescription = {}
        var Item = this.MapTokenDescription[Smart.Num];
        var Time = Date.now();
        if(!Item)
        {
            Item = {Time:Time, Description:""}
            this.MapTokenDescription[Smart.Num] = Item
        }
        if(Time - Item.Time > 5 * 1000)
        {
            Item.Time = Time
            
            var Params = undefined;
            var BlockNum = GetCurrentBlockNumByTime();
            if(BlockNum < UPDATE_CODE_2)
            {
                try
                {
                    var Account = DApps.Accounts.ReadState(Smart.Account);
                    if(Smart.StateFormat)
                    {
                        var State = BufLib.GetObjectFromBuffer(Account.Value.Data, Smart.StateFormat, {}, 1);
                        Params = {State:State, PayCur:GET_SMART(DApps.Smart.ReadSmart(State.PayCurrency)), OpnCur:GET_SMART(DApps.Smart.ReadSmart(State.Currency)),
                        }
                    }
                }
                catch(e)
                {
                }
            }
            else
            {
                Params = {}
            }
            
            var Result;
            if(Params)
                Result = RunStaticSmartMethod(Smart.Account, "GetTokenDescription", Params)
            if(Result && Result.result)
            {
                Item.TokenDescription = Result.RetValue
            }
            else
            {
                Item.TokenDescription = ""
                Item.Time = Time + 1000 * 1000
            }
        }
        Smart.TokenDescription = Item.TokenDescription
    }
    
    InitHole()
    {
        if(global.LOCAL_RUN || global.TEST_NETWORK || global.FORK_MODE)
            this.RowHole = {}
        else
            this.RowHole = {"10":1, "19":1, "22":1, "23":1, "24":1, "26":1, "27":1, "29":1, "30":1, "34":1, "56":1, "57":1}
        
        for(var Num = 0; Num < 8; Num++)
            this.RowHole[Num] = 1
    }
    IsHole(num)
    {
        if(global.ALL_VIEW_ROWS)
            return 0;
        return this.RowHole[num];
    }
}
module.exports = SmartApp;
var App = new SmartApp;
DApps["Smart"] = App;
DAppByType[TYPE_TRANSACTION_SMART_CREATE] = App;
DAppByType[TYPE_TRANSACTION_SMART_RUN] = App;
DAppByType[TYPE_TRANSACTION_SMART_CHANGE] = App;

const VM = require('vm');
global.RunSmartEvalContext = RunSmartEvalContext;
function RunSmartEvalContext(CodeLex,EvalContext,InnerRun)
{
    
    var publist = {};
    var funclist = {};
    EvalContext.publist = publist;
    EvalContext.funclist = funclist;
    VM.createContext(EvalContext, {codeGeneration:{strings:false, wasm:false}});
    
    var RunCode = CodeLex;
    if(InnerRun)
        RunCode += "\n" + InnerRun + "\nInnerChangeObjects()";
    VM.runInContext(RunCode, EvalContext);
}

