/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

class CDBRow extends global.CDBBase
{
    constructor(FileName, Format, bReadOnly, ColNumName, DeltaNum, DataSize, EngineID)
    {
        super(FileName, bReadOnly, EngineID)
        
        if(typeof Format === "object")
            Format = SerializeLib.GetFormatFromObject(Format)
        
        if(DeltaNum)
            this.DeltaNum = DeltaNum
        else
            this.DeltaNum = 0
        if(DataSize)
            this.DataSize = DataSize
        else
            this.DataSize = SerializeLib.GetBufferFromObject({}, Format, {}).length
        
        this.Format = Format
        this.WorkStruct = {}
        if(ColNumName)
            this.ColName = ColNumName
        else
            this.ColName = "Num"
        
        this.WasUpdate = 1
    }
    
    GetMaxNum()
    {
        var Num = Math.floor(this.GetSize() / this.DataSize) - 1 - this.DeltaNum;
        if(Num < 0)
            return  - 1;
        else
            return Num;
    }
    
    CheckNewNum(Data)
    {
        if(Data[this.ColName] === undefined)
            Data[this.ColName] = this.GetMaxNum() + 1
    }
    
    Write(Data, RetBuf)
    {
        this.WasUpdate = 1
        
        var BufWrite;
        JINN_STAT.WriteRowsDB++
        
        this.CheckNewNum(Data)
        var Num = Math.floor(Data[this.ColName]);
        
        var BufWrite0 = SerializeLib.GetBufferFromObject(Data, this.Format, this.WorkStruct, 0);
        if(this.DataSize < BufWrite0.length)
        {
            ToLogTrace("Error max size = " + this.DataSize + " current = " + BufWrite0.length)
        }
        if(global.Buffer)
        {
            BufWrite = Buffer.alloc(this.DataSize)
            for(var i = 0; i < BufWrite0.length && i < this.DataSize; i++)
                BufWrite[i] = BufWrite0[i]
        }
        else
        {
            BufWrite = BufWrite0
            for(var i = BufWrite0.length; i < this.DataSize; i++)
                BufWrite.push(0)
        }
        
        var Num2 = Num + this.DeltaNum;
        var Position = (Num2) * this.DataSize;
        
        if(this.WriteInner(BufWrite, Position, 0) === false)
            return 0;
        
        if(RetBuf)
        {
            RetBuf.Buf = BufWrite
        }
        
        return 1;
    }
    
    Read(Num, GetBufOnly)
    {
        JINN_STAT.ReadRowsDB++
        Num = Math.trunc(Num)
        
        var Data;
        if(isNaN(Num))
            return undefined;
        
        var Num2 = Num + this.DeltaNum;
        if(Num2 < 0 || Num > this.GetMaxNum())
        {
            return undefined;
        }
        
        var Position = (Num2) * this.DataSize;
        if(Position < 0)
        {
            return undefined;
        }
        
        var BufRead = this.ReadInner(Position, this.DataSize);
        if(!BufRead)
        {
            return undefined;
        }
        
        if(GetBufOnly)
        {
            return BufRead;
        }
        
        try
        {
            Data = SerializeLib.GetObjectFromBuffer(BufRead, this.Format, this.WorkStruct)
        }
        catch(e)
        {
            ToLog("JINN DB-ROW:" + e)
            console.log(e)
            return undefined;
        }
        
        Data[this.ColName] = Num
        return Data;
    }
    GetRows(start, count)
    {
        var arr = [];
        for(var num = start; num < start + count; num++)
        {
            var Data = this.Read(num);
            if(!Data)
                break;
            arr.push(Data)
        }
        return arr;
    }
    
    Truncate(LastNum)
    {
        LastNum = Math.trunc(LastNum)
        
        var Position = (LastNum + 1 + this.DeltaNum) * this.DataSize;
        if(Position < 0)
            Position = 0
        
        if(Position !== this.GetSize())
        {
            JINN_STAT.WriteRowsDB++
            super.Truncate(Position)
            this.WasUpdate = 1
        }
    }
    
    DeleteFromBlock(BlockNum)
    {
        
        var Item = this.FindItemFromMax(BlockNum);
        if(!Item)
            return;
        this.Truncate(Item[this.ColName] - 1)
    }
    
    FindItemFromMax(BlockNum, Name)
    {
        if(!Name)
            Name = "BlockNum"
        
        var FindItem = undefined;
        var MaxNum = this.GetMaxNum();
        for(var num = MaxNum; num >= 0; num--)
        {
            var ItemCheck = this.Read(num);
            if(!ItemCheck || ItemCheck[Name] < BlockNum)
            {
                break;
            }
            
            FindItem = ItemCheck
        }
        
        return FindItem;
    }
    
    FastFindBlockNum(BlockNum)
    {
        
        var MaxNum = this.GetMaxNum();
        if(MaxNum ===  - 1)
            return;
        
        var StartNum = 0;
        var EndNum = MaxNum;
        var CurNum = Math.trunc(MaxNum / 2);
        while(true)
        {
            var Item = this.Read(CurNum);
            if(Item)
            {
                if(Item.BlockNum > BlockNum)
                {
                    EndNum = CurNum - 1
                    var Delta = CurNum - StartNum;
                    if(Delta === 0)
                        return "NoHistory";
                    Delta = Math.trunc((1 + Delta) / 2)
                    CurNum = CurNum - Delta
                }
                else
                    if(Item.BlockNum < BlockNum)
                    {
                        StartNum = CurNum + 1
                        var Delta = EndNum - CurNum;
                        if(Delta === 0)
                            return "NoPresent";
                        Delta = Math.trunc((1 + Delta) / 2)
                        CurNum = CurNum + Delta
                    }
                    else
                        if(Item.BlockNum === BlockNum)
                            break;
            }
            else
            {
                ToError("FastFindBlockNum: Error read num ob block find " + BlockNum)
                return "NoPresent";
            }
        }
        var num = CurNum;
        while(true)
        {
            num--
            if(num < 0)
                return CurNum;
            var Item = this.Read(num);
            if(Item)
            {
                if(Item.BlockNum === BlockNum)
                    CurNum = num
                else
                    return CurNum;
            }
            else
            {
                ToError("FastFindBlockNum: Error #2 read num ob block find " + BlockNum)
                return "NoPresent";
            }
        }
    }
    
    Close(bDel)
    {
        this.CloseDBFile(this.FileName, bDel)
    }
};

global.CDBRow = CDBRow;
