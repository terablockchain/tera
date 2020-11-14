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

//Smart contract engine


require("../HTML/JS/lexer.js");
require("../HTML/JS/smart-vm.js");

const TYPE_TRANSACTION_SMART_CREATE = 130;
const TYPE_TRANSACTION_SMART_RUN = 135;
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
    CrossMsgConfirms:uint32,\
    Reserve:arr10,\
    IconBlockNum:uint,\
    IconTrNum:uint16,\
    ShortName:str5,\
    Name:str,\
    Description:str,\
    Code:str,\
    HTML:str,\
    }";
global.WorkStructCreate = {};

global.FORMAT_SMART_RUN = "{\
    Type:byte,\
    Account:uint,\
    MethodName:str,\
    Params:str,\
    FromNum:uint,\
    OperationID:uint,\
    Version:byte,\
    ParamsArr: tr,\
    Reserve:arr7,\
    Sign:arr64,\
    }";
global.WorkStructSmartRun = {};

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
global.WorkStructChange = {};


class SmartApp extends require("./smart-tr")
{
    constructor()
    {
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        super(bReadOnly)
        
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
            CrossMsgConfirms:uint32,\
            Reserve:arr10,\
            StateFormat:str,\
            Description:str,\
            Code:str,\
            HTML:str,\
            SumHash:hash,\
            }"
        
        this.ROW_SIZE = 2 * (1 << 13)
        this.DBSmart = new CDBRow("smart", this.FORMAT_ROW, bReadOnly, "Num", 0, this.ROW_SIZE)
        REGISTER_TR_DB(this.DBSmart, 30)
        
        if(!bReadOnly)
            this.Start()
    }
    
    Name()
    {
        return "Smart";
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
    }
    
    Close()
    {
        this.SmartMap = {}
        this.DBSmart.Close()
    }
    
    ClearDataBase()
    {
        this.SmartMap = {}
        
        this.DBSmart.Clear()
        
        if(SHARD_PARAMS.GenesisSmartCreate)
            SHARD_PARAMS.GenesisSmartCreate()
        else
            this.GenesisSmartCreate()
    }
    
    GenesisSmartCreate()
    {
        this.DBSmartWrite({Num:0, ShortName:SHARD_NAME, Name:SHARD_NAME, Description:SHARD_NAME, BlockNum:0, TokenGenerate:1, Account:0,
            Category1:0})
        for(var i = 1; i < 8; i++)
            this.DBSmartWrite({Num:i, ShortName:"", Name:"", Description:"", BlockNum:0, TokenGenerate:1, Account:i, Category1:0})
    }
    
    OnDeleteBlock(BlockNum)
    {
        if(BlockNum > 0)
        {
            this.DBSmart.DeleteFromBlock(BlockNum)
        }
    }
    
    OnProcessBlockStart(Block)
    {
    }
    
    OnProcessBlockFinish(Block)
    {
    }
    
    OnProcessTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];
        
        var Result = false;
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
        
        return Result;
    }
    
    GetFormatTransaction(Type)
    {
        var format;
        switch(Type)
        {
            case TYPE_TRANSACTION_SMART_CREATE:
                format = FORMAT_SMART_CREATE
                break;
                
            case TYPE_TRANSACTION_SMART_RUN:
                format = FORMAT_SMART_RUN
                break;
                
            case TYPE_TRANSACTION_SMART_CHANGE:
                format = FORMAT_SMART_CHANGE
                break;
                
            default:
                format = ""
        }
        return format;
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
        {
            Item.SumHash = Hash
        }
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
    GetSmartMap()
    {
        if(this.DBSmart.WasUpdate)
        {
            this.DBSmart.WasUpdate = 0
            this.SmartMap = {}
        }
        
        return this.SmartMap;
    }
    ReadSmart(Num)
    {
        Num = ParseNum(Num)
        var Map = this.GetSmartMap();
        var Smart = Map["ITEM" + Num];
        if(!Smart)
        {
            Smart = this.DBSmart.Read(Num)
            if(Smart)
            {
                
                if(!Smart.WorkStruct)
                    Smart.WorkStruct = {}
                
                Smart.CodeLength = Smart.Code.length
                Smart.HTMLLength = Smart.HTML.length
                
                Map["ITEM" + Num] = Smart
            }
        }
        
        return Smart;
    }
    ReadSimple(Num, bTokenDescription)
    {
        var Map = this.GetSmartMap();
        var Smart = Map["SIMPLE" + Num];
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
                
                Map["SIMPLE" + Num] = Smart
            }
        }
        
        if(Smart && bTokenDescription)
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
            var Result;
            var Params = {};
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
}

var App = new SmartApp;

REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_CREATE);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_RUN);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_CHANGE);

const VM = require('vm');
global.RunSmartEvalContext = RunSmartEvalContext;
function RunSmartEvalContext(CodeLex,EvalContext,InnerRun)
{
    
    var publist = {};
    var messagelist = {};
    var funclist = {};
    EvalContext.publist = publist;
    EvalContext.messagelist = messagelist;
    EvalContext.funclist = funclist;
    VM.createContext(EvalContext, {codeGeneration:{strings:false, wasm:false}});
    
    var RunCode = CodeLex;
    if(InnerRun)
        RunCode += "\n" + InnerRun + "\nInnerChangeObjects()";
    VM.runInContext(RunCode, EvalContext);
}

