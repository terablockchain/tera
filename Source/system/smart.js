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

const fs = require('fs');

require("../HTML/JS/lexer.js");
require("../HTML/JS/smart-vm.js");

global.TYPE_TRANSACTION_SMART_CREATE1 = 130;
global.TYPE_TRANSACTION_SMART_CREATE2 = 131;

global.TYPE_TRANSACTION_SMART_RUN1 = 135;
global.TYPE_TRANSACTION_SMART_RUN2 = 136;
global.TYPE_TRANSACTION_SMART_CHANGE = 140;
global.TYPE_TRANSACTION_SMART_SET = 142;

global.FORMAT_SMART_CREATE2 = "{\
    Type:byte,\
    Reserve1:byte,\
    Reserve2:uint,\
    OwnerPubKey:byte,\
    ISIN:str,\
    Zip:byte,\
    Reserve3:byte,\
    Reserve4:str,\
    Category1:byte,\
    Category2:byte,\
    Category3:byte,\
    Fixed:byte,\
    CentName:str12,\
    CrossMsgConfirms:uint32,\
    Reserve:arr10,\
    IconBlockNum:uint,\
    IconTrNum:uint16,\
    ShortName:str12,\
    Name:str,\
    Description:str,\
    Code:str,\
    HTML:str,\
    }";
global.FORMAT_SMART_CREATE1 = "{\
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
global.WorkStructCreate1 = {};
global.WorkStructCreate2 = {};

global.FORMAT_SMART_RUN2 = "{\
    Type:byte,\
    Version:byte,\
    OperationID:uint,\
    FromNum:uint,\
    TxMaxBlock:uint,\
    TxTicks:uint32,\
    Account:uint,\
    MethodName:str,\
    Params:str,\
    ParamsArr: tr,\
    Reserve:arr7,\
    Sign:arr64,\
    }";
global.FORMAT_SMART_RUN2_NS=global.FORMAT_SMART_RUN2.replace("Sign:arr64,","");

global.FORMAT_SMART_RUN1 = "{\
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
global.WorkStructSmartRun1 = {};
global.WorkStructSmartRun2 = {};
global.WorkStructSmartRun2_NS = {};


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


global.FORMAT_SMART_SET = "{\
    Type:byte,\
    Version:byte,\
    OperationID:uint,\
    FromNum:uint,\
    Smart:uint32,\
    HTMLBlock:uint,\
    HTMLTr:uint16,\
    Reserve:arr10,\
    Sign:arr64,\
    }";
global.WorkStructSet = {};


class SmartApp extends require("./smart-tr")
{
    constructor(UpdateVersion)
    {
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        if(UpdateVersion=="Update")
            bReadOnly=0;

        super(bReadOnly)
        var FileName,FileNameVer,DeltaNum;

        if(fs.existsSync(GetDataPath("DB/smart2")) || UpdateVersion=="Update" || !fs.existsSync(GetDataPath("DB/smart")))
        {

            this.FormatRow2();
            FileNameVer=31;
            DeltaNum=10;
            FileName = "smart2";
            //ToLog("************************* new version SMART2 *************************")
        }
        else
        {
            //old!!!
            this.FormatRow1();
            DeltaNum=0;
            FileNameVer=30;
            FileName = "smart";
        }

        this.DBSmart = new CDBRow(FileName, this.FORMAT_ROW, bReadOnly, "Num", DeltaNum, this.ROW_SIZE)
        REGISTER_TR_DB(this.DBSmart, FileNameVer)
        
        if(!bReadOnly)
            this.Start();
    }

    FormatRow2()
    {
        this.FORMAT_ROW = "{\
            Version:byte,\
            ShortName:str12,\
            Name:str40,\
            Description:str,\
            CentName:str12,\
            Fixed:byte,\
            Reserve:arr20,\
            TokenGenerate:byte,\
            ISIN:str12,\
            Zip:byte,\
            BlockNum:uint,\
            TrNum:uint16,\
            IconBlockNum:uint,\
            IconTrNum:uint16,\
            Account:uint,\
            AccountLength:byte,\
            Category1:byte,\
            Category2:byte,\
            Category3:byte,\
            Owner:uint,\
            CrossMsgConfirms:uint32,\
            StateFormat:str,\
            Code:str,\
            HTML:str,\
            HTMLBlock:uint,\
            HTMLTr:uint16,\
            Parent:uint32,\
            Reserve2:arr30,\
            }"

        this.ROW_SIZE = 1 << 16;//65536
    }

    FormatRow1()
    {
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
            case TYPE_TRANSACTION_SMART_CREATE1:
                Result = this.TRCreateSmart1(Block, Body, BlockNum, TrNum, ContextFrom)
                break;
            case TYPE_TRANSACTION_SMART_CREATE2:
                Result = this.TRCreateSmart2(Block, Body, BlockNum, TrNum, ContextFrom)
                break;
            case TYPE_TRANSACTION_SMART_RUN1:
                Result = this.TRRunSmart1(Block, Body, BlockNum, TrNum, ContextFrom)
                break;
            case TYPE_TRANSACTION_SMART_RUN2:
                Result = this.TRRunSmart2(Block, Body, BlockNum, TrNum, ContextFrom)
                break;
            case TYPE_TRANSACTION_SMART_CHANGE:
                Result = this.TRChangeSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                break;

            case TYPE_TRANSACTION_SMART_SET:
                Result = this.TRSetSmart(Block, Body, BlockNum, TrNum, ContextFrom)
                break;

        }
        
        return Result;
    }
    
    GetFormatTransaction(Type,bInner)
    {
        var format;
        switch(Type)
        {
            case TYPE_TRANSACTION_SMART_CREATE1:
                format = FORMAT_SMART_CREATE1;
                break;
            case TYPE_TRANSACTION_SMART_CREATE2:
                format = FORMAT_SMART_CREATE2;
                break;

            case TYPE_TRANSACTION_SMART_RUN1:
                format = FORMAT_SMART_RUN1;
                break;
            case TYPE_TRANSACTION_SMART_RUN2:
                if(bInner)
                    format = FORMAT_SMART_RUN2_NS;
                else
                    format = FORMAT_SMART_RUN2;
                break;

            case TYPE_TRANSACTION_SMART_CHANGE:
                format = FORMAT_SMART_CHANGE;
                break;

            case TYPE_TRANSACTION_SMART_SET:
                format = FORMAT_SMART_SET;
                break;

            default:
                format = "";
        }
        return format;
    }
    GetSenderNum(BlockNum, Body)
    {
        var Type = Body[0];
        if(Type==TYPE_TRANSACTION_SMART_RUN2 && Body.length >= 32)
        {
            var len = 1+1+6;
            var Num = ReadUintFromArr(Body, len);
            return Num;
        }
        else
        if(Type && Body.length > 90)
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_SMART_RUN1:
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

                case TYPE_TRANSACTION_SMART_SET:
                    var Num = ReadUintFromArr(Body, 1+1+6);
                    return Num;

            }
        }
        
        return 0;
    }
    GetSenderOperationID(BlockNum, Body)
    {
        var Type = Body[0];
        if(Type==TYPE_TRANSACTION_SMART_RUN2 && Body.length >= 32)
        {
            var len = 1+1;
            var Num = ReadUintFromArr(Body, len);
            return Num;
        }
        else
        if(Type && Body.length > 90)
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_SMART_RUN1:
                    var len = 1 + 6;
                    len += 2 + Body[len] + Body[len + 1] * 256
                    if(len + 64 > Body.length)
                        return 0;
                    len += 2 + Body[len] + Body[len + 1] * 256
                    if(len + 64 > Body.length)
                        return 0;
                    len += 6;
                    var Num = ReadUintFromArr(Body, len);
                    return Num;
                case TYPE_TRANSACTION_SMART_CHANGE:
                    var Num = ReadUintFromArr(Body, 1 + 26);
                    return Num;

                case TYPE_TRANSACTION_SMART_SET:
                    var Num = ReadUintFromArr(Body, 1+1);
                    return Num;
            }
        }

        return 0;
    }

    GetSignTransferTx(TR, PrivKey)
    {
        var Format;
        if(TR.Type===TYPE_TRANSACTION_SMART_RUN2)
            Format=FORMAT_SMART_RUN2;
        else
            Format=FORMAT_SMART_RUN1;

        var Arr = BufLib.GetBufferFromObject(TR, Format, GetTxSize(TR), {})
        var Hash = Buffer.from(sha3(Arr.slice(0, Arr.length - 64)));
        var sigObj = secp256k1.sign(Hash, Buffer.from(PrivKey));
        return sigObj.signature;
    }

    CheckSignTransferTx(BlockNum, Body)
    {
        return this.CheckSignAccountTx(BlockNum, Body).result;
    }

    CreateSmartByParent(Block, BlockNum, TrNum, SmartNum,Params)
    {
        var Smart = SMARTS.ReadSmart(SmartNum);
        var Smart2=CopyObjKeys({},Smart);
        for(var key in Params)
            Smart2[key]=Params[key];

        Smart2.TokenGenerate=0;
        Smart2.OwnerPubKey=0;
        Smart2.AccountLength=1;
        Smart2.Parent=SmartNum;

        var Ret=this.CreateNewSmart(Smart2, Block, BlockNum, TrNum, undefined,0,2);
        if(Ret===true)
            return Smart2;
        else
            throw new Error(Ret);
    }

    DBSmartWrite(Item)
    {
        var PrevNum;
        if(Item.Num === undefined)
            PrevNum = this.GetMaxNum();
        else
            PrevNum = Item.Num - 1;
        
        // Item.SumHash = [];
        // var Buf = BufLib.GetBufferFromObject(Item, this.FORMAT_ROW, 66000, {});
        // var Hash = sha3(Buf);
        //
        // if(PrevNum < 0)
        // {
        //     Item.SumHash = Hash;
        // }
        // else
        // {
        //     var PrevItem = this.DBSmart.Read(PrevNum);
        //     if(!PrevItem)
        //     {
        //         throw "!PrevItem of Smart num = " + PrevNum;
        //     }
        //     Item.SumHash = sha3arr2(PrevItem.SumHash, Hash)
        // }
        
        this.DBSmart.Write(Item)
    }
    GetSmartMap()
    {
        if(this.DBSmart.WasUpdate)
        {
            this.DBSmart.WasUpdate = 0;
            this.SmartMap = {};
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
        
        // if(Smart && bTokenDescription)
        //     this.AddCurrencyTokenDescription(Smart)
        
        return Smart;
    }
    
    // AddCurrencyTokenDescription(Smart)
    // {
    //     if(!Smart || !Smart.Num)
    //         return;
    //
    //     if(!this.MapTokenDescription)
    //         this.MapTokenDescription = {}
    //     var Item = this.MapTokenDescription[Smart.Num];
    //     var Time = Date.now();
    //     if(!Item)
    //     {
    //         Item = {Time:Time, Description:""}
    //         this.MapTokenDescription[Smart.Num] = Item
    //     }
    //     if(Time - Item.Time > 5 * 1000)
    //     {
    //         Item.Time = Time
    //         var Result;
    //         var Params = {};
    //         Result = RunStaticSmartMethod(Smart.Account, "GetTokenDescription", Params)
    //         if(Result && Result.result)
    //         {
    //             Item.TokenDescription = Result.RetValue
    //         }
    //         else
    //         {
    //             Item.TokenDescription = ""
    //             Item.Time = Time + 1000 * 1000
    //         }
    //     }
    //     Smart.TokenDescription = Item.TokenDescription
    // }
}

global.SmartApp=SmartApp;
var App = new SmartApp;

REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_CREATE1);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_RUN1);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_CREATE2);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_RUN2);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_CHANGE);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SMART_SET);



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

