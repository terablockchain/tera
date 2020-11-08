/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

var BWRITE_MODE_TX = (global.PROCESS_NAME === "TX");

class CDBCrossTx
{
    constructor(name)
    {
        this.DATA_FORMAT = CopyObjKeys({}, global.FORMAT_CROSS_TX)
        this.DATA_FORMAT.DeltaNum = "uint32"
        this.DATA_FORMAT.Hash = "hash"
        
        this.DBHeader = new CDBRow(name + "-header", {Position:"uint", BlockNum:"uint32", Status:"byte", Reserv:"arr9"}, !BWRITE_MODE_TX,
        "Num", 10)
        this.DBData = new CDBItem(name + "-body", this.DATA_FORMAT, !BWRITE_MODE_TX)
        this.WorkStruct = {}
    }
    
    Clear()
    {
        this.DBHeader.Truncate( - 1)
        this.DBData.Truncate(0)
    }
    
    Close()
    {
        this.DBHeader.Close()
        this.DBData.Close()
    }
    
    WriteInner(Item)
    {
        Item.Position = undefined
        if(!this.DBData.Write(Item))
            return 0;
        
        return this.DBHeader.Write(Item);
    }
    
    WriteArr(Arr)
    {
        if(!Arr.length)
            return 1;
        var Hash;
        var MaxNum = this.GetMaxNum();
        if(MaxNum >= 0)
        {
            var Item = this.Read(MaxNum);
            Hash = Item.Hash
        }
        if(!Hash)
            Hash = ZERO_ARR_32
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            this.CalcCrossHash(Item, Hash)
            Hash = Item.Hash
            
            Item.Position = undefined
            if(!this.DBData.Write(Item))
                return 0;
        }
        
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            
            if(!this.DBHeader.Write(Item))
                return 0;
        }
        
        return 1;
    }
    
    Read(Num)
    {
        var Data = this.DBHeader.Read(Num);
        if(!Data)
            return undefined;
        
        if(Data.Position)
        {
            var Body = this.DBData.Read(Data.Position);
            if(Body)
                CopyObjKeys(Data, Body)
        }
        
        return Data;
    }
    
    DeleteFromBlock(BlockNum)
    {
        var Item = this.DBHeader.FindItemFromMax(BlockNum);
        if(!Item)
            return;
        this.DBHeader.Truncate(Item.Num - 1)
        if(Item.Position !== undefined)
        {
            this.DBData.Truncate(Item.Position)
        }
    }
    
    GetMaxNum()
    {
        return this.DBHeader.GetMaxNum();
    }
    CalcCrossHash(Item, PrevHash)
    {
        Item.Hash = PrevHash
        var Arr = SerializeLib.GetBufferFromObject(Item, this.DATA_FORMAT, this.WorkStruct);
        Item.Hash = sha3(Arr)
    }
};

module.exports = CDBCrossTx;
