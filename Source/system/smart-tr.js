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
        super(bReadOnly);
    }

    TRCreateSmart2(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(GETVERSION(BlockNum)<2)
            return "Error blockchain version";

        if(!ContextFrom)
            return "Pay context required";

        if(Body.length < 32)
            return "Error length transaction (min size)";

        if(Body.length > 65000)
            return "Error length transaction (max size), Body.length=" + Body.length;

        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";

        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_CREATE2, WorkStructCreate2)
        TR.AccountLength=1;
        TR.TokenGenerate=0;
        return this.CreateSmartFromTR(TR,Block, Body, BlockNum, TrNum, ContextFrom,2);
    }

    TRCreateSmart1(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(GETVERSION(BlockNum)>=2)
            return "Error blockchain version. Need new format.";

        if(!ContextFrom)
            return "Pay context required";

        if(Body.length < 31)
            return "Error length transaction (min size)";

        if(Body.length > 16000)
            return "Error length transaction (max size), Body.length=" + Body.length;

        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";

        var TR;
        if(BlockNum < UPDATE_CODE_SHARDING)
            TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_CREATE1, WorkStructCreate1)
        else
            TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_CREATE1, WorkStructCreate1)

        return this.CreateSmartFromTR(TR,Block, Body, BlockNum, TrNum, ContextFrom,0);
    }

    CreateSmartFromTR(TR, Block, Body, BlockNum, TrNum, ContextFrom,Version)
    {

        if(!TR.Name.trim())
            return "Name required";
        if(TR.AccountLength > 50)
            return "Error AccountLength=" + TR.AccountLength;
        if(TR.AccountLength < 1)
            TR.AccountLength = 1

        var AddAccount = TR.AccountLength - 1;

        var Price;
        if(TR.TokenGenerate)
            Price = PRICE_DAO(BlockNum).NewTokenSmart;
        else
            Price = PRICE_DAO(BlockNum).NewSmart;
        Price += AddAccount * PRICE_DAO(BlockNum).NewAccount;

        if(!(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID === 0 && ContextFrom.To[0].SumCOIN >= Price))
        {
            return "No money in the transaction";
        }

        ContextFrom.ToID = ContextFrom.To[0].ID;
        TR.Owner = ContextFrom.FromID;

        return this.CreateNewSmart(TR, Block, BlockNum, TrNum, ContextFrom,AddAccount,Version);
    }

    CreateNewSmart(TR, Block, BlockNum, TrNum, ContextFrom,AddAccount,Version)
    {
        var Smart = TR;
        Smart.Version = Version;
        Smart.Zip = 0;
        Smart.BlockNum = BlockNum;
        Smart.TrNum = TrNum;
        Smart.Num = undefined;
        this.DBSmart.CheckNewNum(Smart);
        var Account = ACCOUNTS.NewAccountTR(BlockNum, TrNum, Smart.Num);
        Smart.Account = Account.Num;
        
        this.DBSmartWrite(Smart);
        
        Account.Value.Smart = Smart.Num
        Account.Name = TR.Name
        if(Smart.TokenGenerate)
        {
            Account.Currency = Smart.Num
            
            Account.Value.SumCOIN = TR.StartValue
        }
        if(TR.OwnerPubKey && ContextFrom)
            Account.PubKey = ContextFrom.FromPubKey
        
        ACCOUNTS.WriteStateTR(Account, BlockNum, TrNum)
        for(var i = 0; i < AddAccount; i++)
        {
            var CurAccount = ACCOUNTS.NewAccountTR(BlockNum, TrNum, Smart.Num);
            CurAccount.Value.Smart = Smart.Num
            CurAccount.Name = TR.Name
            if(Smart.TokenGenerate)
                CurAccount.Currency = Smart.Num
            if(TR.OwnerPubKey && ContextFrom)
                CurAccount.PubKey = ContextFrom.FromPubKey
            
            ACCOUNTS.WriteStateTR(CurAccount, BlockNum, TrNum)
        }
        
        var Map = SMARTS.GetSmartMap();
        delete Map["EVAL" + Smart.Num]
        try
        {
            RunSmartMethod(Block, TR, Smart, Account, BlockNum, TrNum, ContextFrom, "OnCreate");
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

    TRRunSmart2(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(GETVERSION(BlockNum)<2)
            return "Error blockchain version";

        // if(ContextFrom)
        //     return "Error context";

        if(Body.length < 50)
            return "Error length transaction (min size) Body.length="+Body.length;
        var TR;

        if(ContextFrom)
        {
            TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN2_NS, WorkStructSmartRun2_NS);
        }
        else
        {
            TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN2, WorkStructSmartRun2);

            if(TR.TxMaxBlock && TR.TxMaxBlock<BlockNum)
                return "Error Max block num: "+BlockNum+"/"+TR.TxMaxBlock;

            var MaxTicks = PRICE_DAO(BlockNum).MaxTicks;
            if(TR.TxTicks > MaxTicks)
                return "Error max ticks: " + TR.TxTicks + "/" + MaxTicks;
            SetTickCounter(TR.TxTicks);
        }

        return this.RunSmart(TR,Block, Body, BlockNum, TrNum, ContextFrom);
    }

    TRRunSmart1(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(GETVERSION(BlockNum)>=2)
            return "Error blockchain version. Need new format.";

        var TR;
        if(Body.length < 100)
            return "Error length transaction (min size)";
        if(BlockNum < UPDATE_CODE_SHARDING)
            TR = BufLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN1, WorkStructSmartRun1)
        else
            TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_RUN1, WorkStructSmartRun1)
        return this.RunSmart(TR,Block, Body, BlockNum, TrNum, ContextFrom);
    }

    RunSmart(TR,Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";


        if(ContextFrom && ContextFrom.To.length === 1 && ContextFrom.To[0].ID)
        {
            //only run on ToId account
            //ToLog("---------- RunSmart on ContextFrom Was:"+TR.Account+"  New:"+ContextFrom.To[0].ID)
            TR.Account=ContextFrom.To[0].ID;
        }

        if(!ContextFrom && TR.FromNum)
        {
            var ResultCheck = ACCOUNTS.CheckSignFrom(Body, TR, BlockNum, TrNum);
            if(typeof ResultCheck === "string")
                return ResultCheck;
            ContextFrom = ResultCheck;
        }



        var AccountData = ACCOUNTS.ReadStateTR(TR.Account);
        if(!AccountData)
            return "RunSmart: Error account Num: " + TR.Account;
        if(!AccountData.Value.Smart)
            return "RunSmart: No smart on account: " + TR.Account;

        try
        {
            var Params = JSON.parse(TR.Params);
            RunSmartMethod(Block, TR, AccountData.Value.Smart, AccountData, BlockNum, TrNum, ContextFrom, TR.MethodName, Params, TR.ParamsArr,1);
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
            var ResultCheck = ACCOUNTS.CheckSignFrom(Body, TR, BlockNum, TrNum);
            if(typeof ResultCheck === "string")
                return ResultCheck;
            ContextFrom = ResultCheck
        }
        
        if(TR.Smart > this.GetMaxNum())
            TR.Smart = 0;
        
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
                RunSmartMethod(Block, TR, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnDeleteSmart");
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
                RunSmartMethod(Block, TR, Account.Value.Smart, Account, BlockNum, TrNum, ContextFrom, "OnSetSmart");
            }
            catch(e)
            {
                return e;
            }
        }
        
        return true;
    }

    TRSetSmart(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(GETVERSION(BlockNum)<2)
            return "Error blockchain version";

        if(Body.length < 100)
            return "Error length transaction (min size)";

        if(BlockNum < SMART_BLOCKNUM_START)
            return "Error block num";

        var TR=SerializeLib.GetObjectFromBuffer(Body, FORMAT_SMART_SET, WorkStructSet);

        if(!ContextFrom)
        {
            var ResultCheck = ACCOUNTS.CheckSignFrom(Body, TR, BlockNum, TrNum);
            if(typeof ResultCheck === "string")
                return ResultCheck;
            ContextFrom = ResultCheck
        }

        var Smart=this.ReadSmart(TR.Smart);
        if(!Smart)
            return "Error smart num: "+TR.Smart;
        if(TR.FromNum!==Smart.Owner)
            return "Error smart Owner: "+TR.FromNum+"/"+Smart.Owner;
        Smart.HTMLBlock=TR.HTMLBlock;
        Smart.HTMLTr=TR.HTMLTr;
        this.DBSmartWrite(Smart);

         return true;
    }

    
    SendSmartEvent(Data)
    {
        if(!global.TreeFindTX)
            return;
        //console.log("SendSmartEvent: "+JSON.stringify(Data,"",4));
        var Has = global.TreeFindTX.LoadValue("Smart:" + Data.Smart, 1);
        if(Has)
        {
            Data.key = global.GetCurTxKey();
            
            process.send({cmd:"DappEvent", Data:Data})
        }
    }
}

module.exports = SmartTR;
