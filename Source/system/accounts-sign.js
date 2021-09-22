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

//sign support


class AccountSign extends require("./accounts-adv-mining")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
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
                case TYPE_TRANSACTION_TRANSFER3:
                case TYPE_TRANSACTION_TRANSFER5:

                    var Num = ReadUintFromArr(Body, 1 + 1 + 6);
                    return Num;

                case TYPE_TRANSACTION_ACC_CHANGE:
                    
                    var Num = ReadUintFromArr(Body, 1 + 6);
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
                case TYPE_TRANSACTION_TRANSFER3:
                case TYPE_TRANSACTION_TRANSFER5:

                    var Num = ReadUintFromArr(Body, 1 + 1);
                    return Num;
                    
                case TYPE_TRANSACTION_ACC_CHANGE:
                    
                    var Num = ReadUintFromArr(Body, 1);
                    return Num;
                    
                case TYPE_TRANSACTION_ACC_HASH:
                    return 0;
            }
        }
        
        return 0;
    }
    
    CheckSignFrom(Body, TR, BlockNum, TrNum)
    {
        var ContextFrom = {FromID:TR.FromNum};
        
        var AccountFrom = this.ReadStateTR(TR.FromNum);
        if(!AccountFrom)
            return "Error account FromNum: " + TR.FromNum;
        if(TR.OperationID < AccountFrom.Value.OperationID)
            return "Error OperationID (expected: " + AccountFrom.Value.OperationID + " for ID: " + TR.FromNum + ")";
        var MaxCountOperationID = 100;
        if(BlockNum >= global.BLOCKNUM_TICKET_ALGO)
            MaxCountOperationID = 1000000;
        if(TR.OperationID > AccountFrom.Value.OperationID + MaxCountOperationID)
            return "Error too much OperationID (expected max: " + (AccountFrom.Value.OperationID + MaxCountOperationID) + " for ID: " + TR.FromNum + ")";
        var hash;
        if(TR.Version === 4 && BlockNum >= global.UPDATE_CODE_6)
            hash = SHA3BUF(Body.slice(0, Body.length - 64), BlockNum);
        else
            hash = SHA3BUF(Body.slice(0, Body.length - 64 - 12), BlockNum);
        
        var Result = CheckSign(hash, TR.Sign, AccountFrom.PubKey);
        if(!Result)
        {
            return "Error sign transaction";
        }
        
        if(BlockNum >= 13000000)
        {
            AccountFrom.Value.OperationID = TR.OperationID + 1;
            this.WriteStateTR(AccountFrom, BlockNum, TrNum)
        }
        else
            if(AccountFrom.Value.OperationID !== TR.OperationID)
            {
                AccountFrom.Value.OperationID = TR.OperationID
                this.WriteStateTR(AccountFrom, BlockNum, TrNum)
            }
        
        return ContextFrom;
    }
    
    GetSignTransferTx(TR, PrivKey)
    {
        var Arr;
        if(TR.Version === 4)
        {
            var Format;
            if(TR.Type===TYPE_TRANSACTION_TRANSFER5)
                Format=FORMAT_MONEY_TRANSFER_BODY5;
            else
                Format=FORMAT_MONEY_TRANSFER_BODY3;
            Arr = BufLib.GetBufferFromObject(TR, Format, GetTxSize(TR), {})
        }
        else
            if(TR.Version === 2 || TR.Version === 3)
            {
                var format;
                if(TR.Version === 2)
                    format = FORMAT_MONEY_TRANSFER_BODY2;
                else
                    format = FORMAT_MONEY_TRANSFER_BODY3;
                
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
                Arr = BufLib.GetBufferFromObject(TR, FORMAT_MONEY_TRANSFER_BODY1, GetTxSize(TR), {})
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
            if(Type !== TYPE_TRANSACTION_TRANSFER3 && Type !== TYPE_TRANSACTION_TRANSFER5 && Type !== TYPE_TRANSACTION_ACC_CHANGE)
                return 0;
        
        return this.CheckSignAccountTx(BlockNum, Body).result;
    }
}

module.exports = AccountSign;
