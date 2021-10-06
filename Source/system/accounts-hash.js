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

//accounts-hash


class AccountHash extends require("./accounts-keyvalue")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        this.DBAccountsHash = new CDBRow("accounts-hash3", "{BlockNum:uint, AccHash:hash, SumHash:hash, SmartHash:hash, AccountMax:uint, SmartCount:uint, Reserve: arr14}",
        bReadOnly)
        REGISTER_TR_DB(this.DBAccountsHash, 12)
        
        if(global.TEST_ACC_HASH_MODE)
            this.DBAccountsHashTest = new CDBRow("accounts-hash3-test", "{BlockNum:uint, AccHash:hash, SumHash:hash, SmartHash:hash, AccountMax:uint, SmartCount:uint, Reserve: arr14}",
            bReadOnly)
    }
    ClearAccountsHash()
    {
        this.DBAccountsHash.Clear()
    }
    
    CloseAccountsHash()
    {
        this.DBAccountsHash.Close()
    }
    TRCheckAccountHash(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(ContextFrom)
            return "Only the transaction of miners is expected";
        
        var Result = true;
        
        if(BlockNum < START_BLOCK_ACCOUNT_HASH + START_BAD_ACCOUNT_CONTROL)
            return Result;
        
        var TR;
        try
        {
            TR = BufLib.GetObjectFromBuffer(Body, FORMAT_ACCOUNT_HASH, WorkStructAccHash)
        }
        catch(e)
        {
            return "Error ACCOUNT_HASH data format";
        }
        
        var CheckResult = this.CheckAccountHash(Body, BlockNum, TR);
        if(!CheckResult || CheckResult===-1)
        {
            Result = "BAD ACCOUNT HASH";
            if(global.OnBadAccountHash && CheckResult===-1)
            {
                if(TR && TR.BlockNum)
                    global.OnBadAccountHash(BlockNum, TR.BlockNum)
            }
        }
        else
        {
            Result = true
        }
        
        return Result;
    }
    
    CheckAccountHash(Body, BlockNum, TR)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH === 0)
        {
            var Item = this.GetAccountHashItem(TR.BlockNum);

            // if(TR.BlockNum===76700800)
            //     var Stop=1;

            if(Item && Item.BlockNum === TR.BlockNum)
            {
                if(!IsZeroArr(TR.SmartHash))
                    return 0;//error miner



                if(CompareArr(Item.AccHash, TR.AccHash) === 0)
                {
                    // if(IsZeroArr(TR.SmartHash) || TR.AccountMax === 0 || TR.SmartCount)
                    return 1;

                    // if(CompareArr(Item.SmartHash, TR.SmartHash) === 0 && Item.AccountMax === TR.AccountMax && Item.SmartCount === TR.SmartCount)
                    //     return 1;
                }
                // if(global.DEV_MODE)
                // {
                //     ToLog("SmartHash on " + Item.BlockNum + " : ", GetHexFromArr(Item.SmartHash))
                //     console.log(Item);
                //     console.log(TR);
                // }
                return -1;
            }
        }
        
        return 2;
    }
    
    GetAccountHashItem(BlockNum)
    {
        return this.DBAccountsHash.Read(Math.trunc(BlockNum / PERIOD_ACCOUNT_HASH));
    }
    
    GetAccountHashItemTest(BlockNum)
    {
        if(global.TEST_ACC_HASH_MODE)
            return this.DBAccountsHashTest.Read(Math.trunc(BlockNum / PERIOD_ACCOUNT_HASH));
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
    GetAccountHashTxBody(Item)
    {
        Item.Type = TYPE_TRANSACTION_ACC_HASH
        var Body = SerializeLib.GetBufferFromObject(Item, FORMAT_ACCOUNT_HASH, WorkStructAccHash);
        return Body;
    }
    
    GetAccountHashTx(BlockNum)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH === 0 && BlockNum - PERIOD_ACCOUNT_HASH > 0)
        {
            var Item = this.GetAccountHashItem(BlockNum - PERIOD_ACCOUNT_HASH);
            if(Item)
            {
                var Body = this.GetAccountHashTxBody(Item);
                return {body:Body};
            }
        }
        
        return undefined;
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
    
    WriteHash100(Block)
    {
        if(Block.BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return;
        
        var BlockMaxAccount;
        BlockMaxAccount = this.GetMaxAccount();
        var Hash = this.GetCalcHash();
        
        var SmartHash=[];
        var SmartCount = SMARTS.GetMaxNum() + 1;
        // if(SmartCount > 0)
        // {
        //     var MaxSmart = SMARTS.DBSmart.Read(SmartCount - 1);
        //     SmartHash = MaxSmart.SumHash
        // }
        // else
        // {
        //     SmartHash = []
        // }
        if(Block.BlockNum > 1000 && IsZeroArr(Hash))
        {
            ToLogTx("BlockNum:" + Block.BlockNum + " AccHash = Zero")
            throw "AccHash = Zero";
        }
        var Data = {Num:Block.BlockNum / PERIOD_ACCOUNT_HASH, BlockNum:Block.BlockNum, AccHash:Hash, SumHash:Block.SumHash, AccountMax:BlockMaxAccount,
            SmartHash:SmartHash, SmartCount:SmartCount};
        this.DBAccountsHash.Write(Data);
        return Data;
    }
    
    DeleteAccountHashFromBlock(BlockNum)
    {
        if(BlockNum >= 0)
            this.DBAccountsHash.Truncate(Math.trunc((BlockNum - 1) / PERIOD_ACCOUNT_HASH))
    }
    
    CalcMerkleTree(bForce)
    {
        this.DBState.MerkleHash = this.DBState.CalcMerkleTree(bForce)
        this.DBState.WasUpdate = 0
    }
};

module.exports = AccountHash;
