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

class AccountAct extends require("./accounts-rest")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        this.DBAct = new CDBRow("accounts-act", "{ID:uint, BlockNum:uint,PrevValue:{SumCOIN:uint,SumCENT:uint32, NextPos:uint, OperationID:uint,Smart:uint32,Data:arr80}, Mode:byte, TrNum:uint16, Reserve: arr9}",
        bReadOnly)
        this.DBActPrev = new CDBRow("accounts-act-prev", this.DBAct.Format, bReadOnly)
        
        if(bReadOnly || global.READ_ONLY_DB || global.START_SERVER)
            return;
        
        setInterval(this.ControlActSize.bind(this), 60 * 1000)
    }
    
    ClearAct()
    {
        this.DBAct.Truncate( - 1)
        this.DBActPrev.Truncate( - 1)
    }
    
    CloseAct()
    {
        this.DBActPrev.Close()
        this.DBAct.Close()
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
        {
            return  - 1;
        }
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
                
                ToLogTrace("!ItemCheck on " + num + " BlockNum=" + BlockNum)
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
                    if(Data)
                    {
                        Data.Value = Item.PrevValue
                        this.DBStateWriteInner(Data, Item.BlockNum, 1)
                    }
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
    
    FindActByBlockNum(BlockNum)
    {
        var Num = this.DBAct.FastFindBlockNum(BlockNum);
        if(typeof Num === "number")
            Num += 1 + this.DBActPrev.GetMaxNum()
        else
            Num = this.DBActPrev.FastFindBlockNum(BlockNum)
        return Num;
    }
    
    GetActsMaxNum()
    {
        return this.DBActPrev.GetMaxNum() + this.DBAct.GetMaxNum();
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
                    ToLogTx("Can-t rename for delete act-file: " + FileNameFull2)
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
                ToLogTx("Can-t rename act-file!")
                return;
            }
        }
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
            if(Item.TrNum === 0xFFFF)
                Item.TrNum = ""
            arr.push(Item)
            if(arr.length > count)
                return arr;
        }
        var DeltaNum = this.DBActPrev.GetMaxNum() + 1;
        start = num - DeltaNum
        
        for(num = start; num < start + count; num++)
        {
            var Item = this.DBAct.Read(num);
            if(!Item)
                break;
            Item.Num = Item.Num + DeltaNum
            if(Item.TrNum === 0xFFFF)
                Item.TrNum = ""
            
            if(Item.Mode === 200)
            {
                Item.HashData = this.GetActHashesFromBuffer(Item.PrevValue.Data)
                if(Item)
                {
                    var Block = SERVER.ReadBlockHeaderDB(Item.BlockNum);
                    if(!Block || !IsEqArr(Block.SumHash, Item.HashData.SumHash))
                        Item.HashData.ErrorSumHash = 1
                }
            }
            
            arr.push(Item)
            if(arr.length > count)
                return arr;
        }
        return arr;
    }
};

module.exports = AccountAct;
