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

class CommonActs
{
    constructor()
    {
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        this.FORMAT_MODE_200 = "{SumHash:hash,AccHash:hash}"
        this.WorkStructMode200 = {}
        this.DBAct = new CDBRow("accounts-act", "{ID:uint, BlockNum:uint,PrevValue:{SumCOIN:uint,SumCENT:uint32, NextPos:uint, OperationID:uint,Smart:uint32,Data:arr80}, Mode:byte, TrNum:uint16, Reserve: arr9}",
        bReadOnly)
        this.DBActPrev = new CDBRow("accounts-act-prev", this.DBAct.Format, bReadOnly)
        
        if(bReadOnly || global.READ_ONLY_DB || global.START_SERVER)
            return;
    }
    
    ClearDataBase()
    {
        
        this.DBAct.Truncate( - 1)
        this.DBActPrev.Truncate( - 1)
        
        for(var key in DApps)
        {
            DApps[key].ClearDataBase()
        }
        
        DB_RESULT.Clear()
        
        JOURNAL_DB.Clear()
    }
    
    Close()
    {
        this.DBActPrev.Close()
        this.DBAct.Close()
        
        JOURNAL_DB.Close()
        
        for(var key in DApps)
        {
            DApps[key].Close()
        }
        DB_RESULT.Close()
    }
    
    GetLastBlockNumActWithReopen()
    {
        var TXBlockNum = JOURNAL_DB.GetLastBlockNumAct();
        if(!TXBlockNum || TXBlockNum <= 0)
        {
            this.Close()
            TXBlockNum = JOURNAL_DB.GetLastBlockNumAct()
        }
        return TXBlockNum;
    }
    
    GetBufferFromActHashes(Struct)
    {
        var Buf = BufLib.GetBufferFromObject(Struct, this.FORMAT_MODE_200, 80, this.WorkStructMode200);
        return Buf;
    }
    GetActHashesFromBuffer(Buf)
    {
        var Item = BufLib.GetObjectFromBuffer(Buf, this.FORMAT_MODE_200, this.WorkStructMode200);
        return Item;
    }
    
    WriteActArr(BlockNum, arr)
    {
        
        for(var i = 0; i < arr.length; i++)
        {
            var Account = arr[i];
            var BackLog = {Num:undefined, ID:Account.Num, BlockNum:BlockNum, PrevValue:Account.BackupValue, TrNum:Account.ChangeTrNum,
                Mode:Account.New};
            this.DBAct.Write(BackLog)
        }
    }
    
    WriteMode200(Block)
    {
        var BlockNum = Block.BlockNum;
        var AccHash = ACCOUNTS.GetCalcHash();
        var HashData = {SumHash:Block.SumHash, AccHash:AccHash};
        this.DBAct.Write({Num:undefined, ID:0, BlockNum:BlockNum, PrevValue:{Data:this.GetBufferFromActHashes(HashData)}, TrNum:0xFFFF,
            Mode:200})
    }
    
    MoveActToStates(BlockNumFrom, bRestoreDB)
    {
        if(global.START_SERVER)
            throw "MoveActToStates START_SERVER";
        
        this.MoveActOneDB(this.DBAct, BlockNumFrom, bRestoreDB)
        this.MoveActOneDB(this.DBActPrev, BlockNumFrom, bRestoreDB)
    }
    
    MoveActOneDB(DBAct, BlockNum, bRestoreDB)
    {
        var MaxNum = DBAct.GetMaxNum();
        if(MaxNum ===  - 1)
            return;
        
        for(var num = MaxNum; num >= 0; num--)
        {
            var ItemCheck = DBAct.Read(num);
            if(!ItemCheck)
            {
                return;
            }
            
            if(ItemCheck.BlockNum < BlockNum)
            {
                
                this.ProcessingMoveAct(DBAct, num + 1, bRestoreDB)
                return;
            }
        }
        this.ProcessingMoveAct(DBAct, 0, bRestoreDB)
    }
    
    ProcessingMoveAct(DBAct, StartNum, bRestoreDB)
    {
        var bWasCopyAct = 0;
        var Map = {};
        for(var num = StartNum; true; num++)
        {
            var Item = DBAct.Read(num);
            if(!Item)
                break;
            if(!bWasCopyAct)
                bWasCopyAct = 1
            
            if(Map[Item.ID])
                continue;
            Map[Item.ID] = 1
            
            switch(Item.Mode)
            {
                case 50:
                    
                    break;
                case 52:
                    break;
                case 0:
                    if(!bRestoreDB)
                        break;
                    
                    bWasCopyAct = 2
                    var Data = ACCOUNTS.DBState.Read(Item.ID);
                    if(Data)
                    {
                        Data.Value = Item.PrevValue
                        ACCOUNTS.DBStateWriteInner(Data, Item.BlockNum, 1)
                    }
                    var History = ACCOUNTS.DBStateHistory.Read(Item.ID);
                    if(History)
                    {
                        History.NextPos = Item.PrevValue.NextPos
                        ACCOUNTS.DBStateHistory.Write(History)
                    }
                    break;
                case 1:
                    break;
                default:
            }
        }
        
        DBAct.Truncate(StartNum - 1)
    }
    GetLastBlockNumAct()
    {
        throw "Error - old mode";
    }
    
    GetLastBlockNumItem()
    {
        throw "Error - old mode";
        
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
            Item.AccHash = Item.HashData.AccHash
            Item.SumHash = Item.HashData.SumHash
        }
        
        return Item;
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
                if(Item.HashData)
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
    
    GetActsMaxNum()
    {
        return this.DBActPrev.GetMaxNum() + this.DBAct.GetMaxNum();
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
    
    Read(Num)
    {
        var DB;
        if(Num <= this.DBActPrev.GetMaxNum())
            DB = this.DBActPrev
        else
        {
            Num = Num - this.DBActPrev.GetMaxNum()
            DB = this.DBAct
        }
        
        return DB.Read(Num);
    }
};

global.COMMON_ACTS = new CommonActs;
