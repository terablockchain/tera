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

//Accounts  and states engine

const MerkleDBRow = require("./accounts-merkle-dbrow");

global.OLD_BLOCK_CREATE_INTERVAL = 10;

global.TYPE_TRANSACTION_CREATE = 100;
const TYPE_DEPRECATED_TRANSFER1 = 105;
const TYPE_DEPRECATED_TRANSFER2 = 110;
global.TYPE_TRANSACTION_TRANSFER = 111;

global.TYPE_TRANSACTION_ACC_HASH_OLD = 119;
global.TYPE_TRANSACTION_ACC_HASH = 210;

global.FORMAT_CREATE = "{\
    Type:byte,\
    Currency:uint,\
    PubKey:arr33,\
    Name:str40,\
    Adviser:uint,\
    Smart:uint32,\
    Reserve:arr3,\
    }";

const FORMAT_MONEY_TRANSFER = '{\
    Type:byte,\
    Currency:uint,\
    FromID:uint,\
    To:[{ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Sign:arr64,\
    }';
const WorkStructTransfer = {};
const FORMAT_MONEY_TRANSFER_BODY = FORMAT_MONEY_TRANSFER.replace("Sign:arr64,", "");

const FORMAT_MONEY_TRANSFER2 = "{\
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
const FORMAT_MONEY_TRANSFER_BODY2 = FORMAT_MONEY_TRANSFER2.replace("Sign:arr64,", "");

global.FORMAT_MONEY_TRANSFER3 = "{\
    Type:byte,\
    Version:byte,\
    OperationID:uint,\
    FromID:uint,\
    To:[{PubKey:tr,ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    DeprecatedOperationID:uint,\
    Body:tr,\
    Sign:arr64,\
    }";
const WorkStructTransfer3 = {};
global.FORMAT_MONEY_TRANSFER_BODY3 = FORMAT_MONEY_TRANSFER3.replace("Sign:arr64,", "");

global.FORMAT_ACCOUNT_HASH = "{\
    Type:byte,\
    BlockNum:uint,\
    AccHash:hash,\
    AccountMax:uint,\
    SmartHash:hash,\
    SmartCount:uint\
    }";
global.WorkStructAccHash = {};


class AccountApp extends require("./accounts-hash")
{
    constructor()
    {
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        super(bReadOnly)
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
        
        this.DBState = new MerkleDBRow("accounts-state", this.FORMAT_ACCOUNT_ROW, bReadOnly, "Num", 0, this.SIZE_ACCOUNT_ROW)
        REGISTER_TR_DB(this.DBState, 10)
        
        if(global.READ_ONLY_DB || global.START_SERVER)
            return;
        
        if(!bReadOnly)
            this.Start()
    }
    
    Name()
    {
        return "Account";
    }
    
    Start(bClean)
    {
        // tx-process var
        this.BadBlockNum = 0
        this.BadBlockNumChecked = 0
        this.BadBlockNumHash = 0
        
        this.InitAMIDTab()
        
        if(!bClean && this.DBState.GetMaxNum() + 1 >= BLOCK_PROCESSING_LENGTH2)
        {
            ToLog("ACCOUNTS MAX_NUM:" + this.DBState.GetMaxNum())
            return;
        }
        
        COMMON_ACTS.ClearDataBase()
    }
    
    Close()
    {
        
        this.DBState.Close()
        
        this.CloseAccountsHash()
        this.CloseRest()
        this.CloseHistory()
    }
    
    ClearDataBase()
    {
        
        this.DBState.MerkleTree = undefined
        this.DBState.Clear()
        
        this.ClearAccountsHash()
        this.ClearRest()
        this.ClearHistory()
        this.DBStateWriteInner({Num:0, PubKey:[], Value:{BlockNum:1, SumCOIN:0.95 * TOTAL_SUPPLY_TERA}, Name:"System account"}, 1)
        for(var i = 1; i < 8; i++)
            this.DBStateWriteInner({Num:i, PubKey:[], Value:{BlockNum:1}, Name:""})
        
        this.DBStateWriteInner({Num:8, PubKey:GetArrFromHex(ARR_PUB_KEY[0]), Value:{BlockNum:1, SumCOIN:0.05 * TOTAL_SUPPLY_TERA},
            Name:"Founder account"})
        this.DBStateWriteInner({Num:9, PubKey:GetArrFromHex(ARR_PUB_KEY[1]), Value:{BlockNum:1, SumCOIN:0}, Name:"Developer account"})
        for(var i = 10; i < BLOCK_PROCESSING_LENGTH2; i++)
            this.DBStateWriteInner({Num:i, PubKey:GetArrFromHex(ARR_PUB_KEY[i - 8]), Value:{BlockNum:1}, Name:""})
        
        this.DBStateHistory.Write({Num:15})
        
        this.DBState.InitMerkleTree()
        this.CalcMerkleTree(1)
    }
    
    DBStateTruncateInner(Num)
    {
        this.DBState.Truncate(Num)
        
        this.TruncateRest(Num)
        this.TruncateAMIDTab(Num)
    }
    
    OnDeleteBlock(BlockNum)
    {
        if(BlockNum < 1)
            return;
        
        this.DeleteAccountHashFromBlock(BlockNum)
        
        var Item = this.DBState.FindItemFromMax(BlockNum, "BlockNumCreate");
        if(!Item || !Item.Num)
            return;
        var LastNum = Item.Num - 1;
        this.DBStateTruncateInner(LastNum)
        this.DBStateHistory.Truncate(LastNum)
    }
    
    OnProcessBlockStart(Block)
    {
        this.CreateTrCount = 0
        if(Block.BlockNum < 1)
            return;
    }
    
    OnProcessBlockFinish(Block)
    {
        var bErr = 0;
        try
        {
            BEGIN_TRANSACTION()
            this.DoCoinBaseTR(Block)
            COMMIT_TRANSACTION(Block.BlockNum, 0xFFFF)
        }
        catch(e)
        {
            bErr = 1
            ToLogTx("BlockNum:" + Block.BlockNum + " - DoCoinBaseTR: " + e)
        }
        
        if(bErr)
        {
            ROLLBACK_TRANSACTION()
        }
        
        this.WriteHash100(Block)
    }
    
    OnProcessTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];
        
        var Result = false;
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
            case TYPE_TRANSACTION_ACC_HASH_OLD:
            case TYPE_TRANSACTION_ACC_HASH:
                Result = this.TRCheckAccountHash(Block, Body, BlockNum, TrNum, ContextFrom)
                break;
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
                ToLogTx("DoCoinBaseTR: Error find AMID:" + FindAMID + " on BlockNum:" + Block.BlockNum)
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
    
    ReadState(Num)
    {
        var Data = this.DBState.Read(Num);
        if(Data)
            Data.WN = ""
        return Data;
    }
    FindAccounts(PubKeyArr, Map, HiddenMap, nSet)
    {
        var Count = 0;
        for(var num = 0; true; num++)
        {
            if(this.IsHole(num, 1) || (HiddenMap && HiddenMap[num] !== undefined))
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
                    Data.CurrencyObj = SMARTS.ReadSimple(Data.Currency, 1)
                }
                
                if(Data.Value.Smart)
                {
                    Data.SmartObj = SMARTS.ReadSimple(Data.Value.Smart)
                    if(Data.SmartObj)
                    {
                        Data.SmartState = this.GetSmartState(Data, Data.SmartObj.StateFormat)
                    }
                    else
                    {
                        Data.SmartState = {}
                    }
                }
            }
        }
        return arr;
    }
    GetMaxAccount()
    {
        return this.DBState.GetMaxNum();
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
                    
                    var DataTo = ACCOUNTS.ReadState(Item.ID);
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
        if(Type === TYPE_TRANSACTION_CREATE)
        {
            if(JINN_CONST.BLOCK_CREATE_INTERVAL < 2 || BlockNum % JINN_CONST.BLOCK_CREATE_INTERVAL === 0)
                return 1;
            else
                return 0;
        }
        else
            if(Type !== TYPE_TRANSACTION_TRANSFER)
                return 0;
        
        return this.CheckSignAccountTx(BlockNum, Body);
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
    GetSenderNum(BlockNum, Body)
    {
        var Type = Body[0];
        if(Type && Body.length > 90)
        {
            switch(Type)
            {
                case TYPE_TRANSACTION_CREATE:
                    {
                        if(BlockNum < global.UPDATE_CODE_7 && BlockNum % OLD_BLOCK_CREATE_INTERVAL !== 0)
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
            case TYPE_TRANSACTION_ACC_HASH_OLD:
            case TYPE_TRANSACTION_ACC_HASH:
                format = FORMAT_ACCOUNT_HASH
                break;
                
            default:
                format = ""
        }
        return format;
    }
}
var App = new AccountApp;

REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_CREATE);
REGISTER_SYS_DAPP(App, TYPE_DEPRECATED_TRANSFER1);
REGISTER_SYS_DAPP(App, TYPE_DEPRECATED_TRANSFER2);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_TRANSFER);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_ACC_HASH);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_ACC_HASH_OLD);

