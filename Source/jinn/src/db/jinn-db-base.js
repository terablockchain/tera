/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


// Files emulate in memjry module

var FileMap = {};

class CDBBase
{
    constructor(FileName, bReadOnly, EngineID)
    {
        
        this.FileName = FileName
        this.FileNameFull = FileName + "-" + EngineID
        if(EngineID === undefined)
            ToLogTrace("EngineID")
    }
    
    OpenDBFile(filename)
    {
        var Item = FileMap[this.FileNameFull];
        if(!Item)
        {
            Item = {size:0, buf:[]}
            FileMap[this.FileNameFull] = Item
        }
        return Item;
    }
    
    CloseDBFile(filename, bDel)
    {
        if(bDel)
            delete FileMap[this.FileNameFull]
    }
    ReadUint32(Position)
    {
        var BufForSize = this.ReadInner(Position, 4);
        if(!BufForSize)
            return undefined;
        
        BufForSize.len = 0
        return ReadUint32FromArr(BufForSize);
    }
    
    WriteInner(BufWrite, Position, CheckSize, MaxSize)
    {
        this.WasUpdate = 1
        
        var FI = this.OpenDBFile();
        if(Position === undefined)
        {
            if(!FI.size)
                FI.size = 100
            Position = FI.size
        }
        
        if(!MaxSize)
            MaxSize = BufWrite.length
        else
            MaxSize = Math.min(BufWrite.length, MaxSize)
        
        for(var i = 0; i < MaxSize; i++)
            FI.buf[Position + i] = BufWrite[i]
        
        FI.size = FI.buf.length
        
        if(CheckSize && FI.size !== Position + MaxSize)
        {
            ToLogTrace("Error FI.size = " + FI.size)
            return false;
        }
        
        return Position;
    }
    
    Alloc(Size)
    {
        var FI = this.OpenDBFile();
        var Position = FI.size;
        
        for(var i = 0; i < Size; i++)
            FI.buf[Position + i] = 0
        
        FI.size = FI.buf.length
        return Position;
    }
    
    ReadInner(Position, DataSize)
    {
        Position = Math.trunc(Position)
        
        var BufRead = [];
        var FI = this.OpenDBFile();
        
        if(FI.buf.length < Position + DataSize)
        {
            ToLogTrace("ReadInner: Error Position: " + Position + " on file: " + this.FileNameFull)
            return undefined;
        }
        
        for(var i = 0; i < DataSize; i++)
        {
            var Val = FI.buf[Position + i];
            if(!Val)
                Val = 0
            BufRead[i] = Val
        }
        
        return BufRead;
    }
    
    GetSize()
    {
        var FI = this.OpenDBFile();
        return FI.size;
    }
    TruncateInner(Pos)
    {
        var FI = this.OpenDBFile();
        if(FI.size !== Pos)
        {
            FI.size = Pos
            FI.buf.length = FI.size
        }
    }
    
    Truncate(Pos)
    {
        this.TruncateInner(Pos)
    }
    Close(bDel)
    {
        if(bDel)
            CloseDBFile(this.FileName, bDel)
    }
    
    Clear()
    {
        var FI = this.OpenDBFile();
        FI.size = 0
        FI.buf.length = FI.size
    }
    GetBuf()
    {
        var FI = this.OpenDBFile();
        return FI.buf;
    }
};

global.CDBBase = CDBBase;
