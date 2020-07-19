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

const fs = require('fs');
const DBRow = require("../core/db/db-row");

require('../core/rest_tables.js');

const CAdvMining = require('./adv-mining.js');

const MAX_SUM_TER = 1e9;
const MAX_SUM_CENT = 1e9;

const DBLib = require("../core/db/db");
global.HistoryDB = new DBLib();
const FILE_NAME_HISTORY = "history-body";
var WorkStructHistory = {};

const BLOCK_CREATE_INTERVAL = 10;

global.TYPE_TRANSACTION_CREATE = 100;
const TYPE_DEPRECATED_TRANSFER1 = 105;
const TYPE_DEPRECATED_TRANSFER2 = 110;
const TYPE_TRANSACTION_TRANSFER = 111;

global.TYPE_TRANSACTION_ACC_HASH = 119;

global.FORMAT_CREATE = "{\
    Type:byte,\
    Currency:uint,\
    PubKey:arr33,\
    Name:str40,\
    Adviser:uint,\
    Smart:uint32,\
    Reserve:arr3,\
    }";

global.FORMAT_MONEY_TRANSFER = '{\
    Type:byte,\
    Currency:uint,\
    FromID:uint,\
    To:[{ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Sign:arr64,\
    }';
const WorkStructTransfer = {};
global.FORMAT_MONEY_TRANSFER_BODY = FORMAT_MONEY_TRANSFER.replace("Sign:arr64,", "");

global.FORMAT_MONEY_TRANSFER2 = "{\
    Type:byte,\
    Version:byte,\
    Currency:uint,\
    FromID:uint,\
    To:[{ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Sign:arr64,\
    }";
const WorkStructTransfer2 = {};
global.FORMAT_MONEY_TRANSFER_BODY2 = FORMAT_MONEY_TRANSFER2.replace("Sign:arr64,", "");

global.FORMAT_MONEY_TRANSFER3 = "{\
    Type:byte,\
    Version:byte,\
    OperationSortID:uint,\
    FromID:uint,\
    To:[{PubKey:tr,ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Body:tr,\
    Sign:arr64,\
    }";
const WorkStructTransfer3 = {};
global.FORMAT_MONEY_TRANSFER_BODY3 = FORMAT_MONEY_TRANSFER3.replace("Sign:arr64,", "");



global.FORMAT_ACCOUNT_HASH3 = "{\
    Type:byte,\
    BlockNum:uint,\
    AccHash:buffer32,\
    AccountMax:uint,\
    SmartHash:buffer32,\
    SmartCount:uint,\
    }";

class MerkleDBRow extends DBRow
{
    constructor(FileName, DataSize, Format, bReadOnly)
    {
        super(FileName, DataSize, Format, bReadOnly)
        
        this.InitMerkleTree()
    }
    InitMerkleTree()
    {
        this.MerkleTree = undefined
        this.MerkleArr = []
        this.MerkleCalc = {}
    }
    CalcMerkleTree(bForceUpdate)
    {
        
        if(!this.MerkleTree || bForceUpdate)
        {
            this.MerkleCalc = {}
            this.MerkleTree = {LevelsHash:[this.MerkleArr], RecalcCount:0}
            var GetMaxNum = this.GetMaxNum();
            for(var num = 0; num <= GetMaxNum; num++)
            {
                var Buf = this.Read(num, 1);
                if(!Buf)
                {
                    if(global.WATCHDOG_DEV)
                        ToErrorTx("CalcMerkleTree: Break account reading on num: " + num)
                    break;
                }
                
                if(UPDATE_CODE_NEW_ACCHASH)
                    this.MerkleArr[num] = sha3(Buf)
                else
                    this.MerkleArr[num] = shaarr(Buf)
                
                this.MerkleCalc[num] = 1
            }
        }
        
        this.MerkleTree.RecalcCount = 0
        UpdateMerklTree(this.MerkleTree, this.MerkleCalc, 0)
        this.MerkleCalc = {}
        
        return this.MerkleTree.Root;
    }
    
    Write(Data)
    {
        var RetBuf = {};
        var bRes = DBRow.prototype.Write.call(this, Data, RetBuf);
        if(bRes)
        {
            var Hash;
            if(UPDATE_CODE_NEW_ACCHASH)
                Hash = sha3(RetBuf.Buf)
            else
                Hash = shaarr(RetBuf.Buf)
            this.MerkleArr[Data.Num] = Hash
            this.MerkleCalc[Data.Num] = 1
        }
        return bRes;
    }
    Truncate(LastNum)
    {
        DBRow.prototype.Truncate.call(this, LastNum)
        if(this.MerkleArr.length !== LastNum + 1)
        {
            this.MerkleArr.length = LastNum + 1
            this.MerkleCalc[LastNum] = 1
        }
    }
};


class AccountApp extends require("./dapp")
{
    constructor()
    {
        super()
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        this.CreateTrCount = 0
        this.FORMAT_ACCOUNT_ROW = "{\
            Currency:uint,\
            PubKey:arr33,\
            Name:str40,\
            Value:{SumCOIN:uint,SumCENT:uint32, OperationID:uint,Smart:uint32,Data:arr80},\
            BlockNumCreate:uint,\
            Adviser:uint,\
            Reserve:arr9,\
            }"
        
        this.SIZE_ACCOUNT_ROW = 6 + 33 + 40 + (6 + 4 + 6 + 84) + 6 + 6 + 9
        
        this.DBState = new MerkleDBRow("accounts-state", this.SIZE_ACCOUNT_ROW, this.FORMAT_ACCOUNT_ROW, bReadOnly)
        this.FORMAT_ACCOUNT_ROW_REST = "{\
            Arr:[{\
            BlockNum:uint,\
            Value:{SumCOIN:uint,SumCENT:uint32, OperationID:uint,Smart:uint32,Data:arr80,Reserv:arr96},\
            }],\
            Reserv0:arr10,\
            }"
        
        this.SIZE_ACCOUNT_ROW_REST = 1024
        this.DBRest = new DBRow("accounts-rest", this.SIZE_ACCOUNT_ROW_REST, this.FORMAT_ACCOUNT_ROW_REST, bReadOnly)
        this.DBAct = new DBRow("accounts-act", 6 + 6 + (6 + 4 + 6 + 6 + 84) + 1 + 11, "{ID:uint, BlockNum:uint,PrevValue:{SumCOIN:uint,SumCENT:uint32, NextPos:uint, OperationID:uint,Smart:uint32,Data:arr80}, Mode:byte, TrNum:uint16, Reserve: arr9}",
        bReadOnly)
        this.DBActPrev = new DBRow("accounts-act-prev", this.DBAct.DataSize, this.DBAct.Format, bReadOnly)
        this.FORMAT_TX_HASHES = "{SumHash:hash,AccHash:hash}"
        this.FORMAT_STATE_HISTORY = "{NextPos:uint,Reserv:arr2}"
        this.DBStateHistory = new DBRow("history-state", 8, this.FORMAT_STATE_HISTORY, bReadOnly)
        HistoryDB.OpenDBFile(FILE_NAME_HISTORY, !bReadOnly)
        this.HistoryFormatArr = ["{Type:byte, BlockNum:uint32,TrNum:uint16, NextPos:uint}", "{Type:byte, BlockNum:uint32,TrNum:uint16, NextPos:uint, Direct:str1,CorrID:uint, SumCOIN:uint,SumCENT:uint32}",
        "{Type:byte, BlockNum:uint32,TrNum:uint16, NextPos:uint, Direct:str1,CorrID:uint, SumCOIN:uint,SumCENT:uint32,Description:str}",
        ]
        
        this.DBStateTX = new DBRow("accounts-tx", 6 + 6 + 88, "{BlockNum:uint, BlockNumMin:uint, Reserve: arr88}", bReadOnly)
        
        this.ErrSumHashCount = 0
        if(global.READ_ONLY_DB)
            return;
        this.DBAccountsHash = new DBRow("accounts-hash3", 6 + 32 + 32 + 32 + 6 + 6 + 14, "{BlockNum:uint, AccHash:hash, SumHash:hash, SmartHash:hash, AccountMax:uint, SmartCount:uint, Reserve: arr14}",
        bReadOnly)
        
        if(global.START_SERVER)
            return;
        
        if(!bReadOnly)
            this.Start()
        
        setInterval(this.ControlActSize.bind(this), 60 * 1000)
    }
    
    Start(bClean)
    {
        
        this.InitAMIDTab()
        
        if(!bClean && this.DBState.GetMaxNum() + 1 >= BLOCK_PROCESSING_LENGTH2)
            return;
        
        this.DBState.MerkleTree = undefined
        this.DBState.Truncate( - 1)
        this.DBStateHistory.Truncate( - 1)
        this.DBAct.Truncate( - 1)
        this.DBActPrev.Truncate( - 1)
        this.DBAccountsHash.Truncate( - 1)
        this.DBStateTX.Truncate( - 1)
        this.DBRest.Truncate( - 1)
        this.DBStateWriteInner({Num:0, PubKey:[], Value:{BlockNum:1, SumCOIN:0.95 * TOTAL_SUPPLY_TERA}, Name:"System account"}, 1)
        for(var i = 1; i < 8; i++)
            this.DBStateWriteInner({Num:i, PubKey:[], Value:{BlockNum:1}, Name:""})
        
        this.DBStateWriteInner({Num:8, PubKey:GetArrFromHex(ARR_PUB_KEY[0]), Value:{BlockNum:1, SumCOIN:0.05 * TOTAL_SUPPLY_TERA},
            Name:"Founder account"})
        this.DBStateWriteInner({Num:9, PubKey:GetArrFromHex(ARR_PUB_KEY[1]), Value:{BlockNum:1, SumCOIN:0}, Name:"Developer account"})
        for(var i = 10; i < BLOCK_PROCESSING_LENGTH2; i++)
            this.DBStateWriteInner({Num:i, PubKey:GetArrFromHex(ARR_PUB_KEY[i - 8]), Value:{BlockNum:1}, Name:""})
        
        this.DBStateTX.Write({Num:0, BlockNum:0})
        
        var FileItem = HistoryDB.OpenDBFile(FILE_NAME_HISTORY, 1);
        fs.ftruncateSync(FileItem.fd, 0)
        FileItem.size = 0
        
        this.CalcMerkleTree(1)
        
        ToLog("MAX_NUM:" + this.DBState.GetMaxNum())
    }
    
    Close()
    {
        
        this.DBState.Close()
        this.DBActPrev.Close()
        this.DBAct.Close()
        if(this.DBAccountsHash)
            this.DBAccountsHash.Close()
        if(this.DBStateTX)
            this.DBStateTX.Close()
        this.DBRest.Close()
        
        if(this.DBStateHistory)
            this.DBStateHistory.Close()
    }
    
    ClearDataBase()
    {
        this.Start(1)
    }
    
    CheckRestDB()
    {
        if(!global.SERVER)
            return;
        if(this.WasCheckRestDB)
            return;
        this.WasCheckRestDB = 1
        var MaxNumBlock = SERVER.GetMaxNumBlockDB();
        if(this.DBState.GetMaxNum() >= 0 && this.DBRest.GetMaxNum() < 0 && MaxNumBlock > 0)
        {
            this.FillRestDB(MaxNumBlock)
        }
    }
    FillRestDB(BlockNum)
    {
        ToLog("******************************START FillRestDB")
        var Max = this.DBState.GetMaxNum();
        for(var Num = 0; Num <= Max; Num++)
        {
            var Data = this.DBState.Read(Num);
            
            var RestData = this.ReadRest(Num);
            
            if(Num % 10000 === 0)
                ToLog("Fill Rest DB : " + Num)
            
            RestData.Arr[0] = {BlockNum:BlockNum, Value:Data.Value}
            
            this.DBRest.Write(RestData)
        }
        ToLog("******************************FINISH FillRestDB")
    }
    
    DBStateWriteInner(Data, BlockNum, bDeleteAct)
    {
        this.CheckRestDB()
        
        this.DBState.Write(Data)
        
        if(Data.Num === undefined)
            throw "Error undefined Num DBRest !!";
        
        var RestData = this.ReadRest(Data.Num);
        
        DoRest(RestData, Data, BlockNum)
        
        this.DBRest.Write(RestData)
        
        this.SetAMIDTab(Data, BlockNum)
    }
    
    DBStateTruncateInner(Num)
    {
        this.DBState.Truncate(Num)
        
        this.DBRest.Truncate(Num)
        this.TruncateAMIDTab(Num)
    }
    
    ReadRest(Num)
    {
        var COUNT_STATE = 5;
        
        var RestData = this.DBRest.Read(Num);
        if(!RestData || RestData.Arr.length !== COUNT_STATE)
        {
            RestData = {Num:Num, Arr:[]}
            for(var i = 0; i < COUNT_STATE; i++)
                RestData.Arr[i] = {BlockNum:0, Value:{}}
        }
        
        if(RestData.Arr.length !== COUNT_STATE)
            throw "Error RestData.Arr.length = (" + RestData.Arr.length + ")";
        return RestData;
    }
    
    ControlActSize()
    {
        var MaxNum = this.DBAct.GetMaxNum();
        if(MaxNum >= MAX_ACTS_LENGTH)
        {
            this.DBActPrev.CloseDBFile(this.DBActPrev.FileName)
            this.DBAct.CloseDBFile(this.DBAct.FileName)
            if(fs.existsSync(this.DBActPrev.FileNameFull))
            {
                var FileNameFull2 = this.DBActPrev.FileNameFull + "_del";
                try
                {
                    fs.renameSync(this.DBActPrev.FileNameFull, FileNameFull2)
                }
                catch(e)
                {
                    ToErrorTx("Can-t rename for delete act-file: " + FileNameFull2)
                    return;
                }
                
                fs.unlinkSync(FileNameFull2)
            }
            
            try
            {
                fs.renameSync(this.DBAct.FileNameFull, this.DBActPrev.FileNameFull)
            }
            catch(e)
            {
                ToErrorTx("Can-t rename act-file!")
                return;
            }
        }
    }
    GetSenderNum(BlockNum, Body)
    {
        var Type = Body[0];
        if(Type && Body.length > 90)
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_CREATE:
                    {
                        if(BlockNum < global.UPDATE_CODE_7 && BlockNum % BLOCK_CREATE_INTERVAL !== 0)
                            return 0;
                        
                        var Num = this.GetMaxAccount() + 1;
                        return Num;
                    }
                case TYPE_TRANSACTION_TRANSFER:
                    
                    var Num = ReadUintFromArr(Body, 1 + 1 + 6);
                    return Num;
                    
                case TYPE_TRANSACTION_ACC_HASH:
                    return  - 1;
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
                case TYPE_TRANSACTION_TRANSFER:
                    
                    var Num = ReadUintFromArr(Body, 1 + 1);
                    return Num;
                    
                case TYPE_TRANSACTION_ACC_HASH:
                    return 0;
            }
        }
        
        return 0;
    }
    
    OnDeleteBlock(Block)
    {
        if(Block.BlockNum < 1)
            return;
        this.DeleteAct(Block.BlockNum)
    }
    
    OnWriteBlockStart(Block)
    {
        this.CreateTrCount = 0
        if(Block.BlockNum < 1)
            return;
        this.OnDeleteBlock(Block)
        
        this.BeginBlock()
    }
    
    OnWriteBlockFinish(Block)
    {
        try
        {
            
            this.BeginTransaction()
            this.DoCoinBaseTR(Block)
            this.CommitTransaction(Block.BlockNum, 0xFFFF)
        }
        catch(e)
        {
            ToErrorTx("BlockNum:" + Block.BlockNum + " - DoCoinBaseTR: " + e)
            this.RollBackTransaction()
        }
        
        this.CommitBlock(Block)
    }
    
    OnWriteTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        
        var Result;
        try
        {
            Result = this.OnWriteTransactionTR(Block, Body, BlockNum, TrNum, ContextFrom)
        }
        catch(e)
        {
            Result = "" + e
            if(global.WATCHDOG_DEV)
                ToErrorTx("BlockNum:" + BlockNum + " : " + e)
        }
        
        if(Result !== true)
        {
            this.RollBackTransaction()
        }
        
        return Result;
    }
    
    OnWriteTransactionTR(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];
        
        var Result;
        switch(Type)
        {
            case TYPE_TRANSACTION_CREATE:
                {
                    Result = this.TRCreateAccount(Block, Body, BlockNum, TrNum, ContextFrom)
                    break;
                }
                
            case TYPE_DEPRECATED_TRANSFER1:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER, WorkStructTransfer)
                    break;
                }
            case TYPE_DEPRECATED_TRANSFER2:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER2, WorkStructTransfer2)
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER3, WorkStructTransfer3)
                    break;
                }
            case TYPE_TRANSACTION_ACC_HASH:
                {
                    Result = true
                    
                    if(BlockNum < START_BLOCK_ACCOUNT_HASH + START_BAD_ACCOUNT_CONTROL)
                        break;
                    
                    var BlockNumHash = BlockNum - DELTA_BLOCK_ACCOUNT_HASH;
                    if(!this.TRCheckAccountHash(Body, BlockNum, TrNum))
                    {
                        Result = "BAD ACCOUNT HASH"
                        ToLog("2. ****FIND BAD ACCOUNT HASH IN BLOCK: " + BlockNumHash + " DO BLOCK=" + BlockNum, 3)
                    }
                    else
                    {
                        Result = true
                    }
                    
                    break;
                }
        }
        
        return Result;
    }
    
    DoCoinBaseTR(Block)
    {
        if(Block.BlockNum < global.START_MINING)
            return;
        
        var SysData = this.ReadStateTR(0);
        var SysBalance = SysData.Value.SumCOIN;
        var REF_PERIOD_START = global.START_MINING;
        
        var AccountID = ReadUintFromArr(Block.AddrHash, 0);
        
        if(Block.BlockNum >= global.UPDATE_CODE_5 && AccountID >= 1e9)
        {
            var FindAMID = AccountID;
            AccountID = this.GetIDByAMID(FindAMID)
            if(!AccountID)
                ToErrorTx("DoCoinBaseTR: Error find AMID:" + FindAMID + " on BlockNum:" + Block.BlockNum)
        }
        
        if(AccountID < 8)
            return;
        
        var Data = this.ReadStateTR(AccountID);
        
        var KTERA = global.NEW_FORMULA_KTERA;
        if(Block.BlockNum >= global.UPDATE_CODE_JINN_KTERA)
            KTERA = global.NEW_FORMULA_JINN_KTERA
        
        if(Data && Data.Currency === 0 && Data.BlockNumCreate < Block.BlockNum)
        {
            var Sum;
            if(Block.BlockNum >= NEW_FORMULA_START)
            {
                if(Block.BlockNum <= NEW_FORMULA_TARGET1)
                {
                    Sum = SysBalance * 43 * 43 / 100 / TOTAL_SUPPLY_TERA
                    
                    var KMult = (NEW_FORMULA_TARGET2 - Block.BlockNum) / (NEW_FORMULA_TARGET2 - NEW_FORMULA_START);
                    Sum = KMult * Sum
                }
                else
                {
                    Sum = KTERA * SysBalance / TOTAL_SUPPLY_TERA
                }
            }
            else
            {
                var Power = GetPowPower(Block.PowHash);
                if(Block.BlockNum >= NEW_BLOCK_REWARD1)
                    Power = 43
                Sum = Power * Power * SysBalance / TOTAL_SUPPLY_TERA / 100
            }
            
            var OperationNum = 0;
            var CoinTotal = {SumCOIN:0, SumCENT:0};
            var CoinSum = COIN_FROM_FLOAT(Sum);
            if(!ISZERO(CoinSum))
            {
                if(Data.Adviser >= 8 && Block.BlockNum < REF_PERIOD_END)
                {
                    
                    var RefData = this.ReadStateTR(Data.Adviser);
                    if(RefData && RefData.BlockNumCreate < Block.BlockNum - REF_PERIOD_MINING)
                    {
                        var K = (REF_PERIOD_END - Block.BlockNum) / (REF_PERIOD_END - REF_PERIOD_START);
                        var CoinAdv = COIN_FROM_FLOAT(Sum * K);
                        
                        OperationNum++
                        this.SendMoneyTR(Block, 0, Data.Adviser, CoinAdv, Block.BlockNum, 0xFFFF, "", "Adviser coin base [" + AccountID + "]", 1, 0,
                        OperationNum)
                        ADD(CoinTotal, CoinAdv)
                        
                        ADD(CoinSum, CoinAdv)
                    }
                }
                
                OperationNum++
                this.SendMoneyTR(Block, 0, AccountID, CoinSum, Block.BlockNum, 0xFFFF, "", "Coin base", 1, 0, OperationNum)
                ADD(CoinTotal, CoinSum)
                
                var CoinDevelop = CopyObjValue(CoinTotal);
                DIV(CoinDevelop, 100)
                
                if(!ISZERO(CoinDevelop))
                {
                    OperationNum++
                    this.SendMoneyTR(Block, 0, 9, CoinDevelop, Block.BlockNum, 0xFFFF, "", "Developers support", 1, 0, OperationNum)
                }
            }
        }
    }
    
    GetVerifyTransaction(Block, BlockNum, TrNum, Body)
    {
        if(global.JINN_MODE)
        {
            JINN.DBResult.CheckLoadResult(Block)
        }
        
        if(Block.VersionBody === 1)
        {
            var Result = Block.arrContentResult[TrNum];
            if(!Result)
                return  - 1;
            else
                return Result;
        }
        return 0;
    }
    
    GetFormatTransaction(Type)
    {
        var format;
        switch(Type)
        {
            case TYPE_TRANSACTION_CREATE:
                {
                    format = FORMAT_CREATE
                    break;
                }
                
            case TYPE_DEPRECATED_TRANSFER1:
                {
                    format = FORMAT_MONEY_TRANSFER
                    break;
                }
            case TYPE_DEPRECATED_TRANSFER2:
                {
                    format = FORMAT_MONEY_TRANSFER2
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER:
                {
                    format = FORMAT_MONEY_TRANSFER3
                    break;
                }
            case TYPE_TRANSACTION_ACC_HASH:
                {
                    format = FORMAT_ACCOUNT_HASH3
                    break;
                }
                
            default:
                format = ""
        }
        return format;
    }
    
    TRCheckAccountHash(Body, BlockNum, TrNum)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return 1;
        
        try
        {
            var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_ACCOUNT_HASH3, {});
        }
        catch(e)
        {
            return 0;
        }
        
        if(BlockNum < START_BLOCK_ACCOUNT_HASH + global.START_BAD_ACCOUNT_CONTROL)
            return 1;
        
        var Item = this.GetAccountHashItem(TR.BlockNum);
        if(Item && Item.BlockNum === TR.BlockNum)
        {
            if(CompareArr(Item.AccHash, TR.AccHash) === 0)
            {
                if(TR.BlockNum >= START_BLOCK_ACCOUNT_HASH3)
                {
                    if(CompareArr(Item.SmartHash, TR.SmartHash) === 0 && Item.AccountMax === TR.AccountMax && Item.SmartCount === TR.SmartCount)
                    {
                        return 1;
                    }
                    else
                        return 0;
                }
                
                return 1;
            }
            else
                return 0;
        }
        else
            return 2;
    }
    
    TRCreateAccount(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(Body.length < 90)
            return "Error length transaction";
        
        var CheckMinPower = 1;
        if(BlockNum >= 7000000 || global.NETWORK !== "MAIN-JINN")
        {
            if(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID === 0 && ContextFrom.To[0].SumCOIN >= PRICE_DAO(BlockNum).NewAccount)
            {
                CheckMinPower = 0
            }
            else
            {
                if(BlockNum < global.UPDATE_CODE_7 && BlockNum % BLOCK_CREATE_INTERVAL !== 0)
                    return "The create transaction is not possible in this block: " + BlockNum;
                
                if(this.CreateTrCount > 0)
                    return "The account creation transaction was already in this block: " + BlockNum;
            }
        }
        this.CreateTrCount++
        
        if(CheckMinPower && global.NETWORK === "MAIN-JINN")
        {
            var power;
            if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
            {
                power = this.GetPowTx(Body, BlockNum)
            }
            else
            {
                power = GetPowPower(shaarr(Body))
            }
            
            if(BlockNum < 19600000)
            {
                var MinPower;
                if(BlockNum < 2500000)
                    MinPower = MIN_POWER_POW_ACC_CREATE
                else
                    if(BlockNum < 2800000)
                        MinPower = MIN_POWER_POW_ACC_CREATE + 2
                    else
                        MinPower = MIN_POWER_POW_ACC_CREATE + 3
                
                if(power < MinPower)
                    return "Error min power POW for create account (update client)";
            }
        }
        
        try
        {
            var TR = BufLib.GetObjectFromBuffer(Body, FORMAT_CREATE, {});
        }
        catch(e)
        {
            return "Error transaction format";
        }
        
        if(BlockNum >= 3500000 && !TR.Name)
            return "Account name required";
        if(BlockNum >= 5700000 && !TR.Name.trim())
            return "Account name required";
        
        var Account = this.NewAccountTR(BlockNum, TrNum);
        Account.Currency = TR.Currency
        Account.PubKey = TR.PubKey
        Account.Name = TR.Name
        Account.Adviser = TR.Adviser
        Account.Value.Smart = TR.Smart
        this.WriteStateTR(Account, TrNum)
        
        if(BlockNum >= global.UPDATE_CODE_3)
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
        
        this.ResultTx = Account.Num
        return true;
    }
    
    GetPowTx(Body, BlockNum)
    {
        var HASH = sha3(Body);
        var HashTicket = HASH.slice(0, 10);
        var FullHashTicket = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for(var i = 0; i < 10; i++)
            FullHashTicket[i] = HashTicket[i]
        
        WriteUintToArrOnPos(FullHashTicket, BlockNum, 10)
        
        var HashPow = sha3(FullHashTicket, 32);
        var power = GetPowPower(HashPow);
        
        return power;
    }
    
    TRTransferMoney(Block, Body, BlockNum, TrNum, format_money_transfer, workstructtransfer)
    {
        if(Body.length < 103)
            return "Error length transaction";
        
        try
        {
            var TR = BufLib.GetObjectFromBuffer(Body, format_money_transfer, workstructtransfer);
        }
        catch(e)
        {
            return "Error transaction format";
        }
        if(!TR.Version)
            TR.Version = 0
        var Data = this.ReadStateTR(TR.FromID);
        if(!Data)
            return "Error sender's account ID: " + TR.FromID;
        if(TR.Version < 3 && TR.Currency !== Data.Currency)
            return "Error sender's currency";
        
        if(TR.Version === 4 && BlockNum >= global.UPDATE_CODE_6)
            TR.OperationID = TR.OperationSortID
        if(TR.Version < 3)
        {
            if(TR.OperationID !== Data.Value.OperationID)
                return "Error OperationID (expected: " + Data.Value.OperationID + " for ID: " + TR.FromID + ")";
        }
        else
        {
            if(TR.OperationID < Data.Value.OperationID)
                return "Error OperationID (expected: " + Data.Value.OperationID + " for ID: " + TR.FromID + ")";
            
            var MaxCountOperationID = 100;
            if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
                MaxCountOperationID = 1000000
            if(TR.OperationID > Data.Value.OperationID + MaxCountOperationID)
                return "Error too much OperationID (expected max: " + (Data.Value.OperationID + MaxCountOperationID) + " for ID: " + TR.FromID + ")";
        }
        
        if(BlockNum >= SMART_BLOCKNUM_START)
        {
            if(TR.To.length > 10)
                return "The number of recipients has been exceeded (max=10, current count=" + TR.To.length + ")";
        }
        
        if(TR.Body && TR.Body.length && TR.To.length > 1)
        {
            return "Error - dapps transaction can not be used in a multiple transaction";
        }
        var TotalSum = {SumCOIN:0, SumCENT:0};
        var MapItem = {};
        var bWas = 0;
        for(var i = 0; i < TR.To.length; i++)
        {
            var Item = TR.To[i];
            if(Item.SumCOIN > MAX_SUM_TER)
                return "Error MAX_SUM_COIN";
            if(Item.SumCENT >= MAX_SUM_CENT)
                return "Error MAX_SUM_CENT";
            
            if(TR.Version < 3)
            {
                if(Item.ID === TR.FromID || MapItem[Item.ID])
                    continue;
                MapItem[Item.ID] = 1
            }
            
            bWas = 1
            ADD(TotalSum, Item)
        }
        
        if(!bWas && TR.Version < 3)
            return "No significant recipients";
        var ZeroSum = 0;
        if(TotalSum.SumCOIN === 0 && TotalSum.SumCENT === 0)
        {
            if(TR.Version < 3)
                return "No money transaction";
            else
                ZeroSum = 1
        }
        
        if(Data.Value.SumCOIN < TotalSum.SumCOIN || (Data.Value.SumCOIN === TotalSum.SumCOIN && Data.Value.SumCENT < TotalSum.SumCENT))
            return "Not enough money on the account";
        if(BlockNum >= global.NEW_ACCOUNT_INCREMENT)
            Data.Value.OperationID = TR.OperationID
        
        Data.Value.OperationID++
        
        TR.Value = TotalSum
        
        var arr = [];
        MapItem = {}
        var arrpub = [];
        for(var i = 0; i < TR.To.length; i++)
        {
            var Item = TR.To[i];
            
            var DataTo = this.ReadStateTR(Item.ID);
            if(!DataTo)
                return "Error receiver account ID: " + Item.ID;
            if(!ZeroSum && Data.Currency !== DataTo.Currency)
                return "Error receiver currency";
            for(var j = 0; j < 33; j++)
                arrpub[arrpub.length] = DataTo.PubKey[j]
            
            if(DataTo.Value.Smart)
            {
                if(TR.To.length > 1)
                    return "Error - smart accounts can not be used in a multiple transaction";
            }
            
            if(TR.Version === 3 && Item.ID === 0 && Item.PubKey && Item.PubKey.length === 33)
            {
                if(Item.SumCOIN < PRICE_DAO(BlockNum).NewAccount)
                    return "Not enough money for create account with index: " + i;
                var name = TR.Description;
                var index = name.indexOf("\n");
                if(index !==  - 1)
                    name = name.substr(0, index)
                
                var Account = this.NewAccountTR(BlockNum, TrNum);
                Account.PubKey = Item.PubKey
                Account.Name = name
                this.WriteStateTR(Account, TrNum)
                this.ResultTx = Account.Num
                
                Item.ID = Account.Num
                this.SendMoneyTR(Block, Data.Num, Account.Num, {SumCOIN:Item.SumCOIN, SumCENT:Item.SumCENT}, BlockNum, TrNum, TR.Description,
                TR.Description, 1)
                this.SendMoneyTR(Block, Account.Num, 0, {SumCOIN:PRICE_DAO(BlockNum).NewAccount, SumCENT:0}, BlockNum, TrNum, "Fee for create account",
                "", 1)
            }
            else
            {
                if(TR.Version < 3)
                {
                    if(Item.ID === TR.FromID || MapItem[Item.ID])
                        continue;
                    MapItem[Item.ID] = 1
                }
                
                this.SendMoneyTR(Block, Data.Num, DataTo.Num, {SumCOIN:Item.SumCOIN, SumCENT:Item.SumCENT}, BlockNum, TrNum, TR.Description,
                TR.Description, 0)
                arr.push(DataTo)
            }
        }
        if(TR.Version < 3 && arr.length === 0)
            return "No recipients";
        var hash;
        if(TR.Version === 2 || TR.Version === 3)
        {
            for(var j = 0; j < Body.length - 64 - 12; j++)
                arrpub[arrpub.length] = Body[j]
            hash = SHA3BUF(arrpub, BlockNum)
        }
        else
            if(TR.Version === 4 && BlockNum >= global.UPDATE_CODE_6)
            {
                hash = SHA3BUF(Body.slice(0, Body.length - 64), BlockNum)
            }
            else
                if(!TR.Version)
                {
                    hash = SHA3BUF(Body.slice(0, Body.length - 64 - 12), BlockNum)
                }
                else
                {
                    return "Error transaction version";
                }
        var Result = 0;
        if(Data.PubKey[0] === 2 || Data.PubKey[0] === 3)
            try
            {
                Result = secp256k1.verify(hash, TR.Sign, Data.PubKey)
            }
            catch(e)
            {
            }
        
        if(!Result)
        {
            return "Error sign transaction";
        }
        if(TR.Body && TR.Body.length)
        {
            var App = DAppByType[TR.Body[0]];
            if(App)
            {
                TR.FromPubKey = Data.PubKey
                var Result = App.OnWriteTransaction(Block, TR.Body, BlockNum, TrNum, TR);
                if(Result !== true)
                    return Result;
            }
        }
        
        return true;
    }
    
    ReadState(Num)
    {
        var Data = this.DBState.Read(Num);
        if(Data)
            Data.WN = ""
        return Data;
    }
    
    GetMinBlockAct()
    {
        var DBAct;
        var MaxNum = this.DBActPrev.GetMaxNum();
        if(MaxNum ===  - 1)
            DBAct = this.DBAct
        else
            DBAct = this.DBActPrev
        
        var Item = DBAct.Read(0);
        if(!Item)
            return  - 1;
        else
            return Item.BlockNum;
    }
    GetLastBlockNumAct()
    {
        var Item = this.GetLastBlockNumItem();
        if(!Item)
            return  - 1;
        else
            return Item.BlockNum;
    }
    GetLastBlockNumItem()
    {
        var DBAct;
        var MaxNum = this.DBAct.GetMaxNum();
        if(MaxNum ===  - 1)
            DBAct = this.DBActPrev
        else
            DBAct = this.DBAct
        
        var MaxNum = DBAct.GetMaxNum();
        if(MaxNum ===  - 1)
            return undefined;
        
        var Item = DBAct.Read(MaxNum);
        
        if(Item && Item.Mode === 200)
        {
            Item.HashData = this.GetActHashesFromBuffer(Item.PrevValue.Data)
        }
        
        return Item;
    }
    
    DeleteAct(BlockNumFrom)
    {
        if(global.START_SERVER)
            throw "DeleteAct START_SERVER";
        
        if(BlockNumFrom > 0)
        {
            var StateTX = this.DBStateTX.Read(0);
            StateTX.BlockNum = BlockNumFrom - 1
            this.DBStateTX.Write(StateTX)
        }
        
        this.DeleteActOneDB(this.DBAct, BlockNumFrom)
        this.DeleteActOneDB(this.DBActPrev, BlockNumFrom)
        this.DBAccountsHash.Truncate(Math.trunc(BlockNumFrom / PERIOD_ACCOUNT_HASH))
    }
    
    DeleteActOneDB(DBAct, BlockNum)
    {
        var MaxNum = DBAct.GetMaxNum();
        if(MaxNum ===  - 1)
            return;
        
        for(var num = MaxNum; num >= 0; num--)
        {
            var ItemCheck = DBAct.Read(num);
            if(!ItemCheck)
            {
                
                ToLogTrace("!ItemCheck")
                throw "ERRR DeleteActOneDB";
            }
            
            if(ItemCheck.BlockNum < BlockNum)
            {
                this.ProcessingDeleteAct(DBAct, num + 1)
                return;
            }
        }
        this.ProcessingDeleteAct(DBAct, 0)
    }
    
    ProcessingDeleteAct(DBAct, StartNum)
    {
        var Map = {};
        var bWas = 0;
        var NumTruncateState = 0;
        for(var num = StartNum; true; num++)
        {
            var Item = DBAct.Read(num);
            if(!Item)
                break;
            
            bWas = 1
            
            if(Map[Item.ID])
                continue;
            Map[Item.ID] = 1
            
            if(Item.Mode >= 100)
            {
            }
            else
                if(Item.Mode === 1)
                {
                    
                    if(!NumTruncateState)
                        NumTruncateState = Item.ID
                }
                else
                {
                    var Data = this.DBState.Read(Item.ID);
                    Data.Value = Item.PrevValue
                    this.DBStateWriteInner(Data, Item.BlockNum, 1)
                    var History = this.DBStateHistory.Read(Item.ID);
                    if(History)
                    {
                        History.NextPos = Item.PrevValue.NextPos
                        this.DBStateHistory.Write(History)
                    }
                }
        }
        
        if(bWas)
        {
            if(NumTruncateState)
            {
                this.DBStateTruncateInner(NumTruncateState - 1)
                this.DBStateHistory.Truncate(NumTruncateState - 1)
            }
            DBAct.Truncate(StartNum - 1)
        }
    }
    
    FindBlockInAct(DBAct, BlockNum)
    {
        return DBAct.FastFindBlockNum(BlockNum);
    }
    
    GetHole()
    {
        if(global.TEST_NETWORK)
            return [];
        return [{s:8300, f:186478}];
    }
    IsHole(num)
    {
        if(global.ALL_VIEW_ROWS)
            return 0;
        
        var ArrHole = this.GetHole();
        for(var i = 0; i < ArrHole.length; i++)
            if(num >= ArrHole[i].s && num <= ArrHole[i].f)
                return 1;
        return 0;
    }
    FindAccounts(PubKeyArr, Map, HiddenMap, nSet)
    {
        var Count = 0;
        for(var num = 0; true; num++)
        {
            if(this.IsHole(num) || (HiddenMap && HiddenMap[num] !== undefined))
                continue;
            
            var Data = this.ReadState(num);
            if(!Data)
                break;
            
            for(var i = 0; i < PubKeyArr.length; i++)
                if(CompareArr(Data.PubKey, PubKeyArr[i]) === 0)
                {
                    Map[Data.Num] = i
                    Count++
                }
        }
        return Count;
    }
    
    GetWalletAccountsByMap(map)
    {
        var arr = [];
        for(var key in map)
        {
            var Num = parseInt(key);
            var Data = this.ReadState(Num);
            if(Data)
            {
                if(!Data.PubKeyStr)
                    Data.PubKeyStr = GetHexFromArr(Data.PubKey)
                arr.push(Data)
                Data.WN = map[key]
                Data.Name = NormalizeName(Data.Name)
                
                if(Data.Currency)
                {
                    Data.CurrencyObj = DApps.Smart.ReadSimple(Data.Currency, 1)
                }
                
                if(Data.Value.Smart)
                {
                    Data.SmartObj = DApps.Smart.ReadSimple(Data.Value.Smart)
                    if(Data.SmartObj)
                        Data.SmartState = this.GetSmartState(Data, Data.SmartObj.StateFormat)
                    else
                        Data.SmartState = {}
                }
            }
        }
        return arr;
    }
    GetMaxAccount()
    {
        return this.DBState.GetMaxNum();
    }
    GetRowsAccounts(start, count, Filter, bGetState)
    {
        if(Filter)
        {
            Filter = Filter.trim()
        }
        
        var F;
        if(Filter)
        {
            if(Filter.substring(0, 1) === "=")
            {
                Filter = Filter.substring(1)
                try
                {
                    F = CreateEval(Filter, "Cur,Currency,ID,Operation,Amount,Adviser,Name,PubKey,Smart,BlockNum")
                }
                catch(e)
                {
                    F = undefined
                    ToLog("" + e)
                }
            }
            else
            {
                Filter = Filter.toUpperCase()
            }
        }
        
        var WasError = 0;
        var arr = [];
        for(var num = start; true; num++)
        {
            if(this.IsHole(num))
                continue;
            
            var Data = this.ReadState(num);
            if(!Data)
                break;
            if(!Data.PubKeyStr)
                Data.PubKeyStr = GetHexFromArr(Data.PubKey)
            
            Data.Name = NormalizeName(Data.Name)
            
            if(F)
            {
                var Cur = Data.Currency;
                var Currency = Data.Currency;
                var ID = Data.Num;
                var Operation = Data.Value.OperationID;
                var Amount = FLOAT_FROM_COIN(Data.Value);
                var Adviser = Data.Adviser;
                var Name = Data.Name;
                var PubKey = GetHexFromArr(Data.PubKey);
                var Smart = Data.Value.Smart;
                
                try
                {
                    if(!F(Cur, Currency, ID, Operation, Amount, Adviser, Name, PubKey, Smart, Data.BlockNumCreate))
                        continue;
                }
                catch(e)
                {
                    if(!WasError)
                        ToLog("" + e)
                    WasError = 1
                }
            }
            else
                if(Filter)
                {
                    var Amount = FLOAT_FROM_COIN(Data.Value);
                    var PubKey = GetHexFromArr(Data.PubKey);
                    var Str = "" + Data.Num + " " + Data.Value.OperationID + " " + Data.Name.toUpperCase() + " " + Data.Adviser + " " + Amount + " " + PubKey + " " + Smart + " " + Data.BlockNumCreate;
                    
                    if(Str.indexOf(Filter) < 0)
                        continue;
                }
            
            if(bGetState)
            {
                if(Data.Currency)
                    Data.CurrencyObj = DApps.Smart.ReadSimple(Data.Currency, 1)
                
                if(Data.Value.Smart)
                {
                    Data.SmartObj = DApps.Smart.ReadSimple(Data.Value.Smart)
                    if(Data.SmartObj)
                        Data.SmartState = this.GetSmartState(Data, Data.SmartObj.StateFormat)
                    else
                        Data.SmartState = {}
                }
            }
            
            arr.push(Data)
            count--
            if(count < 1)
                break;
        }
        
        return arr;
    }
    GetSmartState(StateData, StateFormat)
    {
        var SmartState;
        try
        {
            SmartState = BufLib.GetObjectFromBuffer(StateData.Value.Data, StateFormat, {})
            if(typeof SmartState === "object")
                SmartState.Num = StateData.Num
        }
        catch(e)
        {
            SmartState = {}
        }
        return SmartState;
    }
    
    GetActsMaxNum()
    {
        return this.DBActPrev.GetMaxNum() + this.DBAct.GetMaxNum();
    }
    GetActList(start, count)
    {
        
        var arr = [];
        var num;
        for(num = start; num < start + count; num++)
        {
            var Item = this.DBActPrev.Read(num);
            if(!Item)
                break;
            Item.Num = "Prev." + Item.Num
            if(Item.TrNum === 0xFFFF)
                Item.TrNum = ""
            arr.push(Item)
            if(arr.length > count)
                return arr;
        }
        start = num - this.DBActPrev.GetMaxNum() - 1
        
        for(num = start; num < start + count; num++)
        {
            var Item = this.DBAct.Read(num);
            if(!Item)
                break;
            Item.Num = Item.Num
            if(Item.TrNum === 0xFFFF)
                Item.TrNum = ""
            
            if(Item.Mode === 200)
            {
                Item.HashData = this.GetActHashesFromBuffer(Item.PrevValue.Data)
            }
            
            arr.push(Item)
            if(arr.length > count)
                return arr;
        }
        return arr;
    }
    
    GetHashOrUndefined(BlockNum)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return undefined;
        
        var Item = this.GetAccountHashItem(BlockNum);
        if(Item)
            return Item.AccHash;
        else
            return undefined;
    }
    GetAccountHashItem(BlockNum)
    {
        var Item = this.DBAccountsHash.Read(Math.trunc(BlockNum / PERIOD_ACCOUNT_HASH));
        return Item;
    }
    
    GetHashedMaxBlockNum()
    {
        var Num = this.DBAccountsHash.GetMaxNum();
        if(Num >= 0)
        {
            var Data = this.DBAccountsHash.Read(Num);
            return Data.BlockNum;
        }
        else
            return 0;
    }
    
    GetCalcHash()
    {
        if(this.DBState.WasUpdate || IsZeroArr(this.DBState.MerkleHash))
        {
            this.CalcMerkleTree()
        }
        var Hash = this.DBState.MerkleHash;
        return Hash;
    }
    
    CalcHash(Block, BlockMaxAccount)
    {
        if(Block.BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return;
        var Hash = this.GetCalcHash();
        
        var SmartHash;
        var SmartCount = DApps.Smart.GetMaxNum() + 1;
        if(SmartCount > 0)
        {
            var MaxSmart = DApps.Smart.DBSmart.Read(SmartCount - 1);
            SmartHash = MaxSmart.SumHash
        }
        else
        {
            SmartHash = []
        }
        if(Block.BlockNum > 1000 && IsZeroArr(Hash))
        {
            ToErrorTx("BlockNum:" + Block.BlockNum + " AccHash = Zero")
            throw "AccHash = Zero";
        }
        
        var Data = {Num:Block.BlockNum / PERIOD_ACCOUNT_HASH, BlockNum:Block.BlockNum, AccHash:Hash, SumHash:Block.SumHash, AccountMax:BlockMaxAccount,
            SmartHash:SmartHash, SmartCount:SmartCount};
        this.DBAccountsHash.Write(Data)
        this.DBAccountsHash.Truncate(Block.BlockNum / PERIOD_ACCOUNT_HASH)
        return Data;
    }
    
    CalcMerkleTree(bForce)
    {
        this.DBState.MerkleHash = this.DBState.CalcMerkleTree(bForce)
        this.DBState.WasUpdate = 0
        
        if(bForce)
            this.ErrSumHashCount = 0
    }
    GetAdviserByMiner(Map, Id)
    {
        var Adviser = Map[Id];
        if(Adviser === undefined)
        {
            var Item = this.ReadState(Id);
            if(Item)
                Adviser = Item.Adviser
            else
                Adviser = 0
            Map[Id] = Adviser
        }
        return Adviser;
    }
    BeginBlock()
    {
        this.DBChanges = {BlockMap:{}, BlockMaxAccount:this.GetMaxAccount(), BlockHistory:[], BlockEvent:[], }
    }
    BeginTransaction()
    {
        SetTickCounter(35000)
        
        this.DBChanges.TRMap = {}
        this.DBChanges.TRMaxAccount = this.DBChanges.BlockMaxAccount
        this.DBChanges.RollBackTransaction = 0
        this.DBChanges.TRHistory = []
        this.DBChanges.TREvent = []
    }
    
    RollBackTransaction()
    {
        this.DBChanges.RollBackTransaction = 1
    }
    
    CommitBlock(Block)
    {
        var BlockNum = Block.BlockNum;
        var DBChanges = this.DBChanges;
        var PrevSumHash;
        if(Block.ForcePrevSumHash)
        {
            PrevSumHash = Block.PrevSumHash
        }
        else
        {
            var LastItem = this.GetLastBlockNumItem();
            if(LastItem && LastItem.HashData && LastItem.BlockNum === Block.BlockNum - 1)
                PrevSumHash = LastItem.HashData.SumHash
            else
                PrevSumHash = Block.PrevSumHash
        }
        
        var SumHash = CalcSumHash(PrevSumHash, Block.Hash, Block.BlockNum, Block.SumPow);
        if(!Block.NoChechkSumHash && !IsEqArr(Block.SumHash, SumHash))
        {
            ToLog("#SUMHASH: Error sum hash on Block=" + Block.BlockNum, 3)
            this.ErrSumHashCount++
        }
        else
        {
            this.ErrSumHashCount = 0
        }
        
        for(var i = 0; i < DBChanges.BlockHistory.length; i++)
        {
            var Data = DBChanges.BlockHistory[i];
            
            var Account = DBChanges.BlockMap[Data.CurID];
            
            if(Data.SmartMode)
                Data.Type = 2
            else
                Data.Type = 1
            Data.NextPos = Account.Value.NextPos
            Account.Value.NextPos = this.SaveHistory(Data)
        }
        var arr = [];
        for(var key in DBChanges.BlockMap)
        {
            key = ParseNum(key)
            var Data = DBChanges.BlockMap[key];
            if(Data.Changed)
            {
                arr.push(Data)
            }
        }
        
        arr.sort(function (a,b)
        {
            return a.Num - b.Num;
        })
        for(var i = 0; i < arr.length; i++)
        {
            var Account = arr[i];
            var BackLog = {Num:undefined, ID:Account.Num, BlockNum:BlockNum, PrevValue:Account.BackupValue, TrNum:Account.ChangeTrNum,
                Mode:Account.New};
            this.DBAct.Write(BackLog)
        }
        for(var i = 0; i < arr.length; i++)
        {
            var Account = arr[i];
            this.DBStateWriteInner(Account, BlockNum, 0)
        }
        for(var i = 0; i < arr.length; i++)
        {
            var Account = arr[i];
            var History = {Num:Account.Num, NextPos:Account.Value.NextPos};
            this.DBStateHistory.Write(History)
        }
        
        for(var i = 0; i < DBChanges.BlockEvent.length; i++)
        {
            
            var Data = DBChanges.BlockEvent[i];
            
            var Has = global.TreeFindTX.LoadValue("Smart:" + Data.Smart, 1);
            if(Has)
            {
                process.send({cmd:"DappEvent", Data:Data})
            }
        }
        
        SetTickCounter(0)
        this.DBChanges = undefined
        var AccHash = this.GetCalcHash();
        this.CalcHash(Block, DBChanges.BlockMaxAccount)
        var HashData = {SumHash:SumHash, AccHash:AccHash};
        this.DBAct.Write({Num:undefined, ID:0, BlockNum:BlockNum, PrevValue:{Data:this.GetBufferFromActHashes(HashData)}, TrNum:0xFFFF,
            Mode:200})
        
        var StateTX = this.DBStateTX.Read(0);
        StateTX.BlockNum = BlockNum
        this.DBStateTX.Write(StateTX)
        
        return 1;
    }
    GetBufferFromActHashes(Struct)
    {
        var Buf = BufLib.GetBufferFromObject(Struct, this.FORMAT_TX_HASHES, 80, {});
        return Buf;
    }
    GetActHashesFromBuffer(Buf)
    {
        var Item = BufLib.GetObjectFromBuffer(Buf, this.FORMAT_TX_HASHES, {});
        return Item;
    }
    
    CommitTransaction(BlockNum, TrNum)
    {
        var DBChanges = this.DBChanges;
        if(DBChanges.RollBackTransaction)
            return false;
        DBChanges.BlockMaxAccount = DBChanges.TRMaxAccount
        for(var key in DBChanges.TRMap)
        {
            key = ParseNum(key)
            var Data = DBChanges.TRMap[key];
            if(Data.Changed)
            {
                DBChanges.BlockMap[key] = Data
                if(Data.New)
                    this.OnWriteNewAccountTR(Data, BlockNum, TrNum)
            }
        }
        
        for(var i = 0; i < DBChanges.TRHistory.length; i++)
            DBChanges.BlockHistory.push(DBChanges.TRHistory[i])
        
        for(var i = 0; i < DBChanges.TREvent.length; i++)
        {
            DBChanges.BlockEvent.push(DBChanges.TREvent[i])
        }
        
        SetTickCounter(0)
        return true;
    }
    
    OnWriteNewAccountTR(Data, BlockNum, TrNum)
    {
        if(BlockNum < SMART_BLOCKNUM_START)
            Data.Value.Smart = 0
        Data.BlockNumCreate = BlockNum
        
        if(BlockNum >= global.UPDATE_CODE_5)
        {
            var AMID = Data.Adviser;
            if(AMID < 1e9 || AMID >= 1e10)
                Data.Adviser = 0
            else
            {
                var CurNum = this.GetIDByAMID(AMID);
                if(CurNum && CurNum < Data.Num)
                {
                    ToLog("Account:" + Data.Num + " - was find AMID: " + AMID + " in Account: " + CurNum + ", AMID set to 0", 2)
                    Data.Adviser = 0
                }
            }
        }
        else
            if(Data.Adviser > this.GetMaxAccount())
            {
                Data.Adviser = 0
            }
        
        if(Data.Value.Smart > DApps.Smart.GetMaxNum())
            Data.Value.Smart = 0
        if(Data.Currency > DApps.Smart.GetMaxNum())
            Data.Currency = 0
        if(Data.Currency)
        {
            var Smart = DApps.Smart.ReadSmart(Data.Currency);
            if(!Smart || !Smart.TokenGenerate)
                Data.Currency = 0
        }
    }
    
    NewAccountTR(BlockNum, TrNum)
    {
        var DBChanges = this.DBChanges;
        
        DBChanges.TRMaxAccount++
        
        var Data = {Num:DBChanges.TRMaxAccount, New:1, Changed:1, ChangeTrNum:TrNum, BackupValue:{}, PubKey:[], Currency:0, Adviser:0,
            Value:{SumCOIN:0, SumCENT:0, OperationID:0, Smart:0, Data:[]}};
        
        this.DBChanges.TRMap[Data.Num] = Data
        
        return Data;
    }
    
    ReadStateTR(Num)
    {
        Num = ParseNum(Num)
        var TRMap = this.DBChanges.TRMap;
        
        var Data = TRMap[Num];
        if(!Data)
        {
            var Value;
            var BlockMap = this.DBChanges.BlockMap;
            var BData = BlockMap[Num];
            
            if(!BData)
            {
                BData = this.DBState.Read(Num)
                if(!BData)
                    return undefined;
                BData.Num = Num
                
                Value = BData.Value
                
                var BHistory = this.DBStateHistory.Read(Num);
                if(BHistory)
                    Value.NextPos = BHistory.NextPos
                
                BData.BackupValue = {SumCOIN:Value.SumCOIN, SumCENT:Value.SumCENT, OperationID:Value.OperationID, Smart:Value.Smart, Data:Value.Data,
                    NextPos:Value.NextPos}
                BlockMap[Num] = BData
            }
            
            Value = BData.Value
            Data = {Num:Num, Currency:BData.Currency, PubKey:BData.PubKey, Name:BData.Name, BlockNumCreate:BData.BlockNumCreate, Adviser:BData.Adviser,
                Value:{SumCOIN:Value.SumCOIN, SumCENT:Value.SumCENT, OperationID:Value.OperationID, Smart:Value.Smart, Data:CopyArr(Value.Data),
                    NextPos:Value.NextPos}, BackupValue:BData.BackupValue}
            
            TRMap[Num] = Data
        }
        
        return Data;
    }
    
    WriteStateTR(Data, TrNum)
    {
        Data.Changed = 1
        Data.ChangeTrNum = TrNum
    }
    
    SendMoneyTR(Block, FromID, ToID, CoinSum, BlockNum, TrNum, DescriptionFrom, DescriptionTo, OperationCount, bSmartMode, OperationNum)
    {
        FromID = ParseNum(FromID)
        ToID = ParseNum(ToID)
        
        if(CoinSum.SumCENT >= 1e9)
        {
            throw "ERROR SumCENT>=1e9";
        }
        
        var FromData = this.ReadStateTR(FromID);
        if(!FromData)
        {
            throw "Send: Error account FromNum: " + FromID;
        }
        var ToData = this.ReadStateTR(ToID);
        if(!ToData)
        {
            throw "Send: Error account ToNum: " + ToID;
        }
        
        if(global.EXPERIMENTAL_CODE)
            if(FromData.Currency && (CoinSum.SumCOIN || CoinSum.SumCENT))
            {
                if(FromData.Value.SumCOIN >= 1e12 || ToData.Value.SumCOIN >= 1e12)
                {
                    
                    if(!FromData.Value.SumCOIN)
                        throw "There is no token on the account ID:" + FromID;
                    if(ToData.Value.SumCOIN)
                        throw "The token is already on the account ID:" + ToID;
                    
                    CoinSum = {SumCOIN:FromData.Value.SumCOIN, SumCENT:FromData.Value.SumCENT}
                }
            }
        
        if(!SUB(FromData.Value, CoinSum))
        {
            throw "Not enough money on the account ID:" + FromID;
        }
        this.WriteStateTR(FromData, TrNum)
        
        if(FromID >= global.START_HISTORY)
        {
            var DescriptionFrom2 = DescriptionFrom;
            if(DescriptionFrom2.length > 100)
                DescriptionFrom2 = DescriptionFrom2.substr(0, 100)
            this.DBChanges.TRHistory.push({Direct:"-", Receive:0, CurID:FromID, CorrID:ToID, BlockNum:BlockNum, TrNum:TrNum, FromID:FromID,
                ToID:ToID, SumCOIN:CoinSum.SumCOIN, SumCENT:CoinSum.SumCENT, Description:DescriptionFrom2, FromOperationID:FromData.Value.OperationID,
                Currency:FromData.Currency, SmartMode:bSmartMode})
        }
        
        ADD(ToData.Value, CoinSum)
        this.WriteStateTR(ToData, TrNum)
        
        if(ToID >= global.START_HISTORY)
        {
            var DescriptionTo2 = DescriptionTo;
            if(DescriptionTo2.length > 100)
                DescriptionTo2 = DescriptionTo2.substr(0, 100)
            this.DBChanges.TRHistory.push({Direct:"+", Receive:1, CurID:ToID, CorrID:FromID, BlockNum:BlockNum, TrNum:TrNum, FromID:FromID,
                ToID:ToID, SumCOIN:CoinSum.SumCOIN, SumCENT:CoinSum.SumCENT, Description:DescriptionTo2, FromOperationID:FromData.Value.OperationID,
                Currency:ToData.Currency, SmartMode:bSmartMode})
        }
        
        FromData.Value.OperationID += OperationCount
        
        if(FromData.Value.Smart)
        {
            var Context = {FromID:FromID, ToID:ToID, Description:DescriptionFrom, Value:CoinSum};
            RunSmartMethod(Block, FromData.Value.Smart, FromData, BlockNum, TrNum, Context, "OnSend")
        }
        if(ToData.Value.Smart)
        {
            var Context = {FromID:FromID, ToID:ToID, Description:DescriptionTo, Value:CoinSum};
            RunSmartMethod(Block, ToData.Value.Smart, ToData, BlockNum, TrNum, Context, "OnGet")
        }
    }
    GetSignTransferTx(TR, PrivKey)
    {
        var Arr;
        if(TR.Version === 4)
        {
            Arr = BufLib.GetBufferFromObject(TR, FORMAT_MONEY_TRANSFER_BODY3, GetTxSize(TR), {})
        }
        else
            if(TR.Version === 2 || TR.Version === 3)
            {
                var format;
                if(TR.Version === 2)
                    format = FORMAT_MONEY_TRANSFER_BODY2
                else
                    format = FORMAT_MONEY_TRANSFER_BODY3
                
                Arr = []
                for(var i = 0; i < TR.To.length; i++)
                {
                    var Item = TR.To[i];
                    
                    var DataTo = DApps.Accounts.ReadState(Item.ID);
                    if(!DataTo)
                    {
                        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    }
                    for(var j = 0; j < 33; j++)
                        Arr[Arr.length] = DataTo.PubKey[j]
                }
                var Body = BufLib.GetBufferFromObject(TR, format, GetTxSize(TR), {});
                
                for(var j = 0; j < Body.length; j++)
                    Arr[Arr.length] = Body[j]
            }
            else
            {
                Arr = BufLib.GetBufferFromObject(TR, FORMAT_MONEY_TRANSFER_BODY, GetTxSize(TR), {})
            }
        
        var sigObj = secp256k1.sign(SHA3BUF(Arr), Buffer.from(PrivKey));
        return sigObj.signature;
    }
    
    CheckSignTransferTx(BlockNum, Body)
    {
        if(Body.length < 64)
            return 0;
        
        var Type = Body[0];
        if(Type === TYPE_TRANSACTION_CREATE && (BlockNum % BLOCK_CREATE_INTERVAL === 0 || BlockNum >= global.UPDATE_CODE_7))
            return 1;
        else
            if(Type !== TYPE_TRANSACTION_TRANSFER)
                return 0;
        
        return this.CheckSignAccountTx(BlockNum, Body);
    }
    SaveHistory(Data)
    {
        
        var FileItem = HistoryDB.OpenDBFile(FILE_NAME_HISTORY, 1);
        var FD = FileItem.fd;
        var Position = FileItem.size;
        if(!Position)
            Position = 100
        
        var BufWrite = BufLib.GetBufferFromObject(Data, this.HistoryFormatArr[Data.Type], 100, WorkStructHistory);
        var written = fs.writeSync(FD, BufWrite, 0, BufWrite.length, Position);
        if(written !== BufWrite.length)
        {
            TO_ERROR_LOG("DB-HISTORY", 10, "Error write to file:" + written + " <> " + BufWrite.length)
            throw "Error write to FILE_NAME_HISTORY";
            return false;
        }
        if(Position >= FileItem.size)
        {
            FileItem.size = Position + written
        }
        
        return Position;
    }
    
    GetHistory(Num, Count, StartPos, MinConfirm)
    {
        if(!MinConfirm)
            MinConfirm = 0
        var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
        
        var Position = StartPos;
        var FileItem = HistoryDB.OpenDBFile(FILE_NAME_HISTORY, 0);
        var FD = FileItem.fd;
        if(Position === undefined)
        {
            var Account = this.DBStateHistory.Read(Num);
            if(!Account)
            {
                return [];
            }
            Position = Account.NextPos
        }
        
        var arr = [];
        while(Count > 0 && Position)
        {
            Count--
            var BufRead = BufLib.GetNewBuffer(100);
            var bytesRead = fs.readSync(FD, BufRead, 0, BufRead.length, Position);
            if(bytesRead < 13)
            {
                ToLog("bytesRead<13 Position=" + Position)
                break;
            }
            var Type = BufRead[0];
            var format = this.HistoryFormatArr[Type];
            if(!format)
            {
                ToLog("Error from history, type = " + Type)
                break;
            }
            var Item = BufLib.GetObjectFromBuffer(BufRead, format, WorkStructHistory);
            Item.Pos = Position
            Position = Item.NextPos
            if(MinConfirm)
            {
                if(Item.BlockNum + MinConfirm > MaxNumBlockDB)
                {
                    continue;
                }
            }
            
            arr.push(Item)
        }
        return arr;
    }
    CalcTotalSum(Currency)
    {
        var SumCoin = {SumCOIN:0, SumCENT:0};
        for(var num = 0; true; num++)
        {
            var Data = this.ReadState(num);
            if(!Data)
                break;
            if(Data.Currency === Currency)
            {
                ADD(SumCoin, Data.Value)
            }
        }
        
        return FLOAT_FROM_COIN(SumCoin);
    }
    InitAMIDTab()
    {
        this.AdvMining = new CAdvMining()
        var GetMaxNum = this.GetMaxAccount();
        for(var num = 0; num <= GetMaxNum; num++)
        {
            var Account = this.ReadState(num);
            if(Account && Account.BlockNumCreate >= global.UPDATE_CODE_5 && Account.Adviser >= 1e9)
                this.AdvMining.SetRow(Account.Num, Account.Adviser)
        }
    }
    
    SetAMIDTab(Account, BlockNum)
    {
        if(BlockNum < global.UPDATE_CODE_5)
            return;
        
        if(Account.New && Account.Num && Account.Adviser >= 1e9)
        {
            this.AdvMining.SetRow(Account.Num, Account.Adviser)
        }
    }
    
    TruncateAMIDTab(ToID)
    {
        this.AdvMining.Truncate(ToID)
    }
    
    GetIDByAMID(AMID)
    {
        if(!this.AdvMining)
            this.InitAMIDTab()
        
        return this.AdvMining.GetID(AMID);
    }
};

module.exports = AccountApp;
var App = new AccountApp;
DApps["Accounts"] = App;
DAppByType[TYPE_TRANSACTION_CREATE] = App;
DAppByType[TYPE_DEPRECATED_TRANSFER1] = App;
DAppByType[TYPE_DEPRECATED_TRANSFER2] = App;
DAppByType[TYPE_TRANSACTION_TRANSFER] = App;
DAppByType[TYPE_TRANSACTION_ACC_HASH] = App;

function TestStateFiles(Size,Format)
{
    return;
    
    if(global.PROCESS_NAME !== "MAIN")
        return;
    
    var DBState1 = new DBRow("state-ok", Size, Format, 0);
    var DBState2 = new DBRow("state-no", Size, Format, 0);
    
    for(var Num = 0; 1; Num++)
    {
        var Item1 = DBState1.Read(Num);
        var Item2 = DBState2.Read(Num);
        if(!Item1 && !Item2)
            break;
        
        var Str1 = JSON.stringify(Item1);
        var Str2 = JSON.stringify(Item2);
        if(Str1 !== Str2)
        {
            ToLog("Err item: " + Num);
            ToLog("1: " + Str1);
            ToLog("2: " + Str2);
        }
    }
}
