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

//key-value db

const CDBTree = require("../jinn/tera/db/tera-db-tree");

class AccountKeyValue extends require("./accounts-tr")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        
        const FormatRow = {ID:"uint", Key:"str", ValueBuf:"tr", };
        function FCompareRow(a,b)
        {
            if(a.ID !== b.ID)
                return a.ID - b.ID;
            
            if(a.Key !== b.Key)
            {
                return (a.Key > b.Key) ? 1 :  - 1;
            }
            return 0;
        };
        
        this.DBKeyValue = new CDBTree("accounts-key-value", FormatRow, bReadOnly, FCompareRow, "nFixed", "nBin")
        REGISTER_TR_DB(this.DBKeyValue.DB, 28)
    }
    CloseKeyValue()
    {
        this.DBKeyValue.Close()
    }
    
    ClearKeyValue()
    {
        this.DBKeyValue.Clear()
    }
    
    DeleteDBKeyValueOnBlock(BlockNum)
    {
    }
    
    ControlStorageDeposit(Account, BlockNum)
    {
        if(!Account.KeyValueSize)
            return;
        
        var Value = 0;
        if(Account.Currency === 0)
            Value = FLOAT_FROM_COIN(Account.Value);
        var Price = PRICE_DAO(BlockNum);
        var Size=Account.KeyValueSize-Price.FreeStorage;
        if(Size<=0)
            return;

        var MinSum = Size * Price.Storage;
        if(Value < MinSum)
        {
            throw "Insufficient deposit amount on account: " + Account.Num + " for data storage: Value=" + Value + " min need: " + MinSum;
        }
    }
    
    ControlValueBufSize(Data, BlockNum, nDirect)
    {
        var Size = Data.Key.length + Data.ValueBuf.length;
        var Account = this.DBState.Read(Data.ID);
        if(Account)
        {
            Account.KeyValueSize += Size * nDirect;
            this.DBStateWriteInner(Account, BlockNum);
        }
    }
    
    ReadValue(ID, Key, Format,bOldVer)
    {

        var Value;
        var Data = {ID:ID, Key:Key};
        var Item = this.DBKeyValue.Find(Data);
        if(Item)
        {
            if(Format)
            {
                Value = SerializeLib.GetObjectFromBuffer(Item.ValueBuf, Format, {},0,bOldVer)
            }
            else
            {
                var Str = ReadStrFromArr(Item.ValueBuf);
                Value = JSON.parse(Str);
            }
        }
        
        return Value;
    }
    
    WriteValue(ID, Key, Value, Format, BlockNum)
    {
        var Buf;
        if(Format)
        {
            Buf = SerializeLib.GetBufferFromObject(Value, Format, {})
        }
        else
        {
            var Str = JSON.stringify(Value);
            Buf = toUTF8Array(Str)
        }
        
        if(Buf.length > 65535)
            Buf.length = 65535;
        
        var Data = {ID:ID, Key:Key, ValueBuf:Buf};
        
        this.RemoveValue(ID, Key);

        if(BlockNum)
            this.ControlValueBufSize(Data, BlockNum, 1);
        
        this.DBKeyValue.Insert(Data)
    }
    RemoveValue(ID, Key, BlockNum)
    {
        var Data = {ID:ID, Key:Key};
        
        var Find = this.DBKeyValue.Find(Data);
        if(Find)
        {
            this.ControlValueBufSize(Find, BlockNum,  - 1)
            this.DBKeyValue.Remove(Data)
        }
    }
}

module.exports = AccountKeyValue;
