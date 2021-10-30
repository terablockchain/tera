/*
 * @project: TERA
 * @version: 2
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


"use strict";

const MULTI_COIN_FORMAT={MaxCount:"uint32", Arr:[{Token:"str", Arr:[{ID:"str", SumCOIN:"uint", SumCENT:"uint32", Flag:"uint"}], Flag:"uint"}], Flag:"uint"};

//Accounts  and states engine

const MerkleDBRow = require("./accounts-merkle-dbrow");

global.OLD_BLOCK_CREATE_INTERVAL = 10;

global.TYPE_TRANSACTION_CREATE = 100;
global.TYPE_TRANSACTION_ACC_CHANGE = 102;

const TYPE_DEPRECATED_TRANSFER1 = 105;
const TYPE_DEPRECATED_TRANSFER2 = 110;
global.TYPE_TRANSACTION_TRANSFER3 = 111;
global.TYPE_TRANSACTION_TRANSFER5 = 112;

global.TYPE_TRANSACTION_ACC_HASH_OLD = 119;
global.TYPE_TRANSACTION_ACC_HASH = 210;

global.FORMAT_ACC_CREATE = "{\
    Type:byte,\
    Currency:uint,\
    PubKey:arr33,\
    Name:str40,\
    Adviser:uint,\
    Smart:uint32,\
    Reserve:arr3,\
    }";

global.FORMAT_MONEY_TRANSFER1 = '{\
    Type:byte,\
    Currency:uint,\
    FromID:uint,\
    To:[{ID:uint,SumCOIN:uint,SumCENT:uint32}],\
    Description:str,\
    OperationID:uint,\
    Sign:arr64,\
    }';
const WorkStructTransfer = {};
global.FORMAT_MONEY_TRANSFER_BODY1 = FORMAT_MONEY_TRANSFER1.replace("Sign:arr64,", "");

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
global.FORMAT_MONEY_TRANSFER_BODY2 = FORMAT_MONEY_TRANSFER2.replace("Sign:arr64,", "");

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


//new
global.FORMAT_MONEY_TRANSFER5 = "{\
    Type:byte,\
    Version:byte,\
    OperationID:uint,\
    FromID:uint,\
    TxMaxBlock:uint,\
    TxTicks:uint32,\
    ToID:uint,\
    Amount:{SumCOIN:uint,SumCENT:uint32},\
    Currency:uint32,\
    TokenID:str,\
    Description:str,\
    CodeVer:uint16,\
    Reserve:uint32,\
    Body:tr,\
    Sign:arr64,\
    }";
const WorkStructTransfer5 = {};
global.FORMAT_MONEY_TRANSFER_BODY5 = FORMAT_MONEY_TRANSFER5.replace("Sign:arr64,", "");


global.FORMAT_ACCOUNT_HASH = "{\
    Type:byte,\
    BlockNum:uint,\
    AccHash:hash,\
    AccountMax:uint,\
    SmartHash:hash,\
    SmartCount:uint\
    }";
global.WorkStructAccHash = {};

global.FORMAT_ACC_CHANGE = {Type:"byte", OperationID:"uint", Account:"uint", PubKey:"arr33", Name:"str40", Reserve:"arr10",
    Sign:"arr64", };


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
            KeyValueSize:uint,\
            Reserve:arr3,\
            }";


        this.SIZE_ACCOUNT_ROW = 6 + 33 + 40 + (6 + 4 + 6 + 84) + 6 + 6 + 9;
        
        this.DBState = new MerkleDBRow("accounts-state", this.FORMAT_ACCOUNT_ROW, bReadOnly, "Num", 0, this.SIZE_ACCOUNT_ROW);
        REGISTER_TR_DB(this.DBState, 10);




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
        this.DBState.InitMerkleTree()
        this.CalcMerkleTree(1)
        
        // tx-process var
        this.BadBlockNum = 0
        this.BadBlockNumChecked = 0
        this.BadBlockNumHash = 0
        
        this.InitAMIDTab()
        
        ToLog("ACCOUNTS MAX_NUM:" + this.DBState.GetMaxNum())
    }
    
    Close()
    {
        
        this.DBState.Close()
        
        this.CloseAccountsHash()
        this.CloseRest()
        this.CloseHistory()
        
        this.CloseKeyValue()
    }
    
    ClearDataBase()
    {
        
        this.DBState.MerkleTree = undefined
        this.DBState.Clear()
        
        this.ClearAccountsHash()
        this.ClearRest()
        
        this.ClearHistory()
        this.ClearKeyValue()
        if(SHARD_PARAMS.GenesisAccountCreate)
            SHARD_PARAMS.GenesisAccountCreate()
        else
            this.GenesisAccountCreate()
        
        var MaxNum = this.DBState.GetMaxNum();
        if(MaxNum >= 0)
            this.DBStateHistory.Write({Num:MaxNum})
        
        this.Start()
    }
    GenesisAccountCreate()
    {
        this.DBStateWriteInner({Num:0, PubKey:[], Value:{BlockNum:1, SumCOIN:0.95 * TOTAL_SUPPLY_TERA}, Name:"System account"}, 1)
        for(var i = 1; i < 8; i++)
            this.DBStateWriteInner({Num:i, PubKey:[], Value:{BlockNum:1}, Name:""})
        
        this.DBStateWriteInner({Num:8, PubKey:GetArrFromHex(ARR_PUB_KEY[0]), Value:{BlockNum:1, SumCOIN:0.05 * TOTAL_SUPPLY_TERA},
            Name:"Founder account"})
        this.DBStateWriteInner({Num:9, PubKey:GetArrFromHex(ARR_PUB_KEY[1]), Value:{BlockNum:1, SumCOIN:0}, Name:"Developer account"})
        for(var i = 10; i < BLOCK_PROCESSING_LENGTH2; i++)
            this.DBStateWriteInner({Num:i, PubKey:GetArrFromHex(ARR_PUB_KEY[i - 8]), Value:{BlockNum:1}, Name:""})
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
            
            if(SHARD_PARAMS.DoCoinBaseTR)
                SHARD_PARAMS.DoCoinBaseTR(Block)
            else
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
                    Result = this.TRCreateAccount(Block, Body, BlockNum, TrNum, ContextFrom);
                    break;
                }
                
            case TYPE_DEPRECATED_TRANSFER1:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER1, WorkStructTransfer);
                    break;
                }
            case TYPE_DEPRECATED_TRANSFER2:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER2, WorkStructTransfer2);
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER3:
                {
                    Result = this.TRTransferMoney(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER3, WorkStructTransfer3);
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER5:
            {
                Result = this.TRTransferMoney5(Block, Body, BlockNum, TrNum, FORMAT_MONEY_TRANSFER5, WorkStructTransfer5);
                break;
            }
            case TYPE_TRANSACTION_ACC_HASH_OLD:
            case TYPE_TRANSACTION_ACC_HASH:
                Result = this.TRCheckAccountHash(Block, Body, BlockNum, TrNum, ContextFrom);
                break;
            case TYPE_TRANSACTION_ACC_CHANGE:
                Result = this.TRChangeAccount(Block, Body, BlockNum, TrNum, ContextFrom);
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
        var AccountID = this.GetMinerFromBlock(Block);
        
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
                    Sum = SysBalance * 43 * 43 / 100 / TOTAL_SUPPLY_TERA;
                    
                    var KMult = (NEW_FORMULA_TARGET2 - Block.BlockNum) / (NEW_FORMULA_TARGET2 - NEW_FORMULA_START);
                    Sum = KMult * Sum
                }
                else
                {
                    Sum = KTERA * SysBalance / TOTAL_SUPPLY_TERA;
                }
            }
            else
            {
                var Power = GetPowPower(Block.PowHash);
                if(Block.BlockNum >= NEW_BLOCK_REWARD1)
                    Power = 43;
                Sum = Power * Power * SysBalance / TOTAL_SUPPLY_TERA / 100;
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
                        
                        OperationNum++;
                        this.SendMoneyTR(Block, 0, Data.Adviser, CoinAdv, Block.BlockNum, 0xFFFF, "", "Adviser coin base [" + AccountID + "]", 1, 0,
                        OperationNum);
                        ADD(CoinTotal, CoinAdv);
                        
                        ADD(CoinSum, CoinAdv);
                    }
                }
                
                OperationNum++;
                this.SendMoneyTR(Block, 0, AccountID, CoinSum, Block.BlockNum, 0xFFFF, "", "Coin base", 1, 0, OperationNum)
                ADD(CoinTotal, CoinSum);
                
                var CoinDevelop = CopyObjValue(CoinTotal);
                DIV(CoinDevelop, 100);
                
                if(!ISZERO(CoinDevelop))
                {
                    OperationNum++;
                    this.SendMoneyTR(Block, 0, 9, CoinDevelop, Block.BlockNum, 0xFFFF, "", "Developers support", 1, 0, OperationNum)
                }
            }
        }
    }
    
    ReadState(Num)
    {
        var Data = this.DBState.Read(Num);
        if(Data)
            Data.WN = "";
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
                    Map[Data.Num] = i;
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
                    Data.PubKeyStr = GetHexFromArr(Data.PubKey);
                arr.push(Data);
                Data.WN = map[key];
                Data.Name = NormalizeName(Data.Name);
                
                if(Data.Currency)
                {
                    Data.CurrencyObj = SMARTS.ReadSimple(Data.Currency, 1);
                }
                
                if(Data.Value.Smart)
                {
                    Data.SmartObj = SMARTS.ReadSimple(Data.Value.Smart);
                    if(Data.SmartObj)
                    {
                        Data.SmartState = this.GetSmartState(Data, Data.SmartObj.StateFormat);
                    }
                    else
                    {
                        Data.SmartState = {}
                    }
                }
                //ERC
                Data.BalanceArr=this.ReadBalanceArr(Data);
            }
        }
        return arr;
    }

    GetMaxAccount()
    {
        return this.DBState.GetMaxNum();
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
    
    GetFormatTransaction(Type)
    {
        var format;
        switch(Type)
        {
            case TYPE_TRANSACTION_CREATE:
                {
                    format = FORMAT_ACC_CREATE
                    break;
                }
                
            case TYPE_DEPRECATED_TRANSFER1:
                {
                    format = FORMAT_MONEY_TRANSFER1;
                    break;
                }
            case TYPE_DEPRECATED_TRANSFER2:
                {
                    format = FORMAT_MONEY_TRANSFER2;
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER3:
                {
                    format = FORMAT_MONEY_TRANSFER3;
                    break;
                }
            case TYPE_TRANSACTION_TRANSFER5:
            {
                format = FORMAT_MONEY_TRANSFER5;
                break;
            }
            case TYPE_TRANSACTION_ACC_HASH_OLD:
            case TYPE_TRANSACTION_ACC_HASH:
                format = FORMAT_ACCOUNT_HASH;
                break;
                
            case TYPE_TRANSACTION_ACC_CHANGE:
                format = FORMAT_ACC_CHANGE;
                break;
                
            default:
                format = ""
        }
        return format;
    }


    //Coin store
    RegInWallet(BlockNum,Account,SmartNum)
    {
        var SysCore=SYSCORE.GetInfo(BlockNum);

        var Item=this.ReadRegWallet(Account);
        var ItemArr=Item.Arr;

        for(var i=0;i<ItemArr.length;i++)
            if(ItemArr[i]===SmartNum)
                return  0;//was add

        if(ItemArr.length>=SysCore.WalletMaxCount)
            return  0;//not add

        ItemArr.push(SmartNum);

        this.WriteRegWallet(Item);

        if(ItemArr.length>SysCore.WalletFreeStorage)
            return 2;//need pay
        else
            return 1;
    }
    WriteRegWallet(Item)
    {
        this.WriteValue(0,Item.Key, Item, Item.Format);
    }
    ReadRegWallet(Account,bRaw)
    {
        var Format="{Arr:[uint32]}";
        var Key="WALLET:"+Account;
        var Item=this.ReadValue(0,Key, Format);
        if(bRaw)
            return Item;

        if(!Item)
            Item={Arr:[]};

        Item.Key=Key;
        Item.Format=Format;
        return Item;
    }
    ReadBalanceArr(Data)
    {
        var Arr=this.ReadSoftBalanceArr(Data);
        if(!Arr)
            Arr=[];

        var Value={ID:"",SumCOIN:Data.Value.SumCOIN,SumCENT:Data.Value.SumCENT};
        var Smart=Data.CurrencyObj;
        var Token,IconBlockNum,IconTrNum;
        if(Smart)
        {
            //Token = "" + Data.Currency + "." + Smart.ShortName.trim();
            Token = Smart.ShortName.trim();
            if(Smart.IconBlockNum)
            {
                Value.IMG = "/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum;
                IconBlockNum = Smart.IconBlockNum;
                IconTrNum = Smart.IconTrNum;
            }
        }
        else
        {
            Token="TERA";
            Value.IMG="/PIC/Tera.svg";
            IconBlockNum=undefined;
            IconTrNum=undefined;
        }

        Arr.unshift({Currency: Data.Currency, Token:Token, IconBlockNum:IconBlockNum,IconTrNum:IconTrNum, Inner:1, Arr: [Value]});

        return Arr;
    }

    ReadSoftBalanceArr(Data)
    {
        var Account=Data.Num;


        var Arr;
        var Item=this.ReadRegWallet(Account,1);
        if(!Item)
        {
            if(!global.DEV_MODE)
                return undefined;

            var Ret=this.ReadValue(COIN_STORE_NUM, "ACCOUNT:"+Account, MULTI_COIN_FORMAT,1);
            if(Ret)
            {
                //console.log("COIN_STORE", JSON.stringify(Ret, "", 4));

                for(var i=0;i<Ret.Arr.length;i++)
                    Ret.Arr[i].Old=1;

                return  Ret.Arr;
            }


            //console.log("No reg wallet on Account:"+Account);
            return undefined;
        }


        Arr=[];
        for(var i=0;i<Item.Arr.length;i++)
        {
            var SmartNum=Item.Arr[i];
            var Smart = SMARTS.ReadSmart(SmartNum);
            if(Smart && Smart.Version>=2)
            {
                var Ret=RunStaticSmartMethod(Smart.Account, "OnGetBalance", Account,undefined,0);
                var RetValue=Ret.RetValue;
                if(Ret.result==1 && RetValue)
                {
                    var ValueArr;
                    if(!RetValue.length)
                    {
                        if(ISZERO(RetValue))
                            continue;
                        if(!RetValue.ID)
                            RetValue.ID = "";
                        if(!RetValue.IMG)
                            RetValue.IMG = "/file/" + Smart.IconBlockNum + "/" + Smart.IconTrNum;
                        ValueArr=[RetValue];
                    }
                    else
                    {
                        ValueArr=RetValue;
                    }


                    var Token = Smart.ShortName.trim();
                    Arr.push({Currency: Smart.Num, Token:Token,IconBlockNum:Smart.IconBlockNum,IconTrNum:Smart.IconTrNum, Arr: ValueArr});
                }
            }
        }

        return Arr;

    }

    GetBalance(Account,Currency,ID)
    {
        Account = Account >>> 0;
        Currency = Currency >>>0;

        if(!Currency)
        {
            var Data = ACCOUNTS.ReadStateTR(Account);
            if(Data)
                return {SumCOIN:Data.Value.SumCOIN, SumCENT:Data.Value.SumCENT, Currency:Currency};
        }
        else
        {
            var Smart = SMARTS.ReadSmart(Currency);
            if(Smart)
            {
                var Ret=RunStaticSmartMethod(Smart.Account, "OnGetBalance", Account,ID,0);
                var RetValue=Ret.RetValue;
                if(Ret.result==1 && RetValue)
                {
                    if(RetValue.length)
                        RetValue={Arr:RetValue};
                    RetValue.ID=ID;
                    RetValue.Currency=Currency;

                    return RetValue;
                }
            }
        }

        return {SumCOIN:0,SumCENT:0,Currency:Currency,ID:ID};
    }

}
var App = new AccountApp;

REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_CREATE);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_ACC_CHANGE);
REGISTER_SYS_DAPP(App, TYPE_DEPRECATED_TRANSFER1);
REGISTER_SYS_DAPP(App, TYPE_DEPRECATED_TRANSFER2);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_TRANSFER3);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_TRANSFER5);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_ACC_HASH);
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_ACC_HASH_OLD);

