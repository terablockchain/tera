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

class SmartTR extends require("./smart-scroll")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
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
        
        var TR;
        if(BlockNum < UPDATE_CODE_SHARDING)
            TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_CREATE, WorkStructCreate)
        else
            TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_CREATE, WorkStructCreate)
        
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
            return "No money in the transaction";
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
        var Account = ACCOUNTS.NewAccountTR(BlockNum, TrNum, Smart.Num);
        Smart.Account = Account.Num
        
        this.DBSmartWrite(Smart)
        
        Account.Value.Smart = Smart.Num
        Account.Name = TR.Name
        if(Smart.TokenGenerate)
        {
            Account.Currency = Smart.Num
            
            Account.Value.SumCOIN = TR.StartValue
        }
        if(TR.OwnerPubKey)
            Account.PubKey = ContextFrom.FromPubKey
        
        ACCOUNTS.WriteStateTR(Account, BlockNum, TrNum)
        for(var i = 0; i < AddAccount; i++)
        {
            var CurAccount = ACCOUNTS.NewAccountTR(BlockNum, TrNum, Smart.Num);
            CurAccount.Value.Smart = Smart.Num
            CurAccount.Name = TR.Name
            if(Smart.TokenGenerate)
                CurAccount.Currency = Smart.Num
            if(TR.OwnerPubKey)
                CurAccount.PubKey = ContextFrom.FromPubKey
            
            ACCOUNTS.WriteStateTR(CurAccount, BlockNum, TrNum)
        }
        
        var Map = SMARTS.GetSmartMap();
        delete Map["EVAL" + Smart.Num]
        try
        {
            RunSmartMethod(Block, TR, Smart, Account, BlockNum, TrNum, ContextFrom, "OnCreate")
        }
        catch(e)
        {
            
            delete Map["EVAL" + Smart.Num]
            return e;
        }
        if(BlockNum < global.UPDATE_CODE_2)
        {
            Smart.Reserve = []
        }
        
        return true;
    }
    
    TRRunSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(Body.length < 100)
            return "Error length transaction (min size)";
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";
        
        var TR;
        if(BlockNum < UPDATE_CODE_SHARDING)
            TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN, WorkStructSmartRun)
        else
            TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN, WorkStructSmartRun)
        
        var AccountData = ACCOUNTS.ReadStateTR(TR.Account);
        if(!AccountData)
            return "RunSmart: Error account Num: " + TR.Account;
        if(!AccountData.Value.Smart)
            return "RunSmart: No smart on account: " + TR.Account;
        
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
            RunSmartMethod(Block, TR, AccountData.Value.Smart, AccountData, BlockNum, TrNum, ContextFrom, TR.MethodName, Params, TR.ParamsArr,
            1)
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
        
        var TR;
        if(BlockNum < UPDATE_CODE_SHARDING)
            TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_CHANGE, WorkStructChange)
        else
            TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_CHANGE, WorkStructChange)
        
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
        var Account = ACCOUNTS.ReadStateTR(TR.Account);
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
                RunSmartMethod(Block, TR, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnDeleteSmart")
            }
            catch(e)
            {
                return e;
            }
        }
        
        Account.Value.Smart = TR.Smart
        Account.Value.Data = []
        ACCOUNTS.WriteStateTR(Account, BlockNum, TrNum)
        
        if(Account.Value.Smart)
        {
            try
            {
                RunSmartMethod(Block, TR, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnSetSmart")
            }
            catch(e)
            {
                return e;
            }
        }
        
        return true;
    }
    
    CheckSignFrom(Body, TR, BlockNum, TrNum)
    {
        var ContextFrom = {FromID:TR.FromNum};
        
        var AccountFrom = ACCOUNTS.ReadStateTR(TR.FromNum);
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
        
        var Result = CheckSign(hash, TR.Sign, AccountFrom.PubKey);
        if(!Result)
        {
            return "Error sign transaction";
        }
        
        if(BlockNum >= 13000000)
        {
            AccountFrom.Value.OperationID = TR.OperationID + 1
            ACCOUNTS.WriteStateTR(AccountFrom, BlockNum, TrNum)
        }
        else
            if(AccountFrom.Value.OperationID !== TR.OperationID)
            {
                AccountFrom.Value.OperationID = TR.OperationID
                ACCOUNTS.WriteStateTR(AccountFrom, BlockNum, TrNum)
            }
        
        return ContextFrom;
    }
    
    SendSmartEvent(Data)
    {
        if(!global.TreeFindTX)
            return;
        
        var Has = global.TreeFindTX.LoadValue("Smart:" + Data.Smart, 1);
        if(Has)
        {
            process.send({cmd:"DappEvent", Data:Data})
        }
    }
};

module.exports = SmartTR;
