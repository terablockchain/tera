/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

class CDBRow extends global.CDBFile
{
    constructor(FileName, Format, bReadOnly, ColNumName, DeltaNum, EngineID)
    {
        super(FileName, bReadOnly, EngineID)
        
        if(typeof Format === "object")
            Format = SerializeLib.GetFormatFromObject(Format)
        
        this.DeltaNum = DeltaNum
        this.DataSize = SerializeLib.GetBufferFromObject({}, Format, {}).length
        this.Format = Format
        this.WorkStruct = {}
        if(ColNumName)
            this.ColName = ColNumName
        else
            this.ColName = "Num"
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
    
    Write(Data)
    {
        JINN_STAT.WriteRowsDB++
        
        this.CheckNewNum(Data)
        var Num = Math.floor(Data[this.ColName]);
        
        var BufWrite = SerializeLib.GetBufferFromObject(Data, this.Format, this.WorkStruct, 1);
        if(this.DataSize !== BufWrite.length)
        {
            ToLogTrace("Error SerializeLib")
        }
        
        var Num2 = Num + this.DeltaNum;
        var Position = (Num2) * this.DataSize;
        if(this.WriteInner(BufWrite, Position, 0) === false)
            return 0;
        
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
            return undefined;
        
        var Position = (Num2) * this.DataSize;
        if(Position < 0)
            return undefined;
        
        var BufRead = this.ReadInner(Position, this.DataSize);
        if(!BufRead)
            return undefined;
        
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
            ToLog("JINN DB-ROW: " + e)
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
        }
    }
    
    DeleteHistory(BlockNumFrom)
    {
        
        var MaxNum = this.GetMaxNum();
        if(MaxNum ===  - 1)
            return;
        
        for(var num = MaxNum; num >= 0; num--)
        {
            var ItemCheck = this.Read(num);
            if(!ItemCheck)
                break;
            
            if(ItemCheck.BlockNum < BlockNumFrom)
            {
                if(num < MaxNum)
                {
                    this.Truncate(num)
                }
                return;
            }
        }
        this.Truncate( - 1)
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
                throw "Error read num";
                return;
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
                throw "Error read num";
                return;
            }
        }
    }
    
    Close(bDel)
    {
        this.CloseDBFile(this.FileName, bDel)
    }
};

global.CDBRow = CDBRow;
