/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


const fs = require('fs');



module.exports = class CDBFile extends require("./db")
{
    constructor(FileName, bReadOnly)
    {
        super()
        
        this.FileName = FileName
        var FileItem = this.OpenDBFile(this.FileName, !bReadOnly);
        this.FileNameFull = FileItem.fname
    }
    WriteUint32(Data, Position)
    {
        var Arr = [];
        WriteUint32(Arr, Data)
        if(global.Buffer)
            Arr = Buffer.from(Arr)
        
        return this.WriteInner(Arr, Position, 0);
    }
    ReadUint32(Position)
    {
        var BufForSize = this.ReadInner(Position, 4);
        if(!BufForSize)
            return undefined;
        
        BufForSize.len = 0
        return ReadUint32FromArr(BufForSize);
    }
    
    Write(BufWrite, Position, CheckSize)
    {
        return this.WriteInner(BufWrite, Position, CheckSize);
    }
    Read(Position, DataSize)
    {
        return this.ReadInner(Position, DataSize);
    }
    
    WriteInner(BufWrite, Position, CheckSize, MaxSize)
    {
        
        var FI = this.OpenDBFile(this.FileName, 1);
        
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
        
        var written = fs.writeSync(FI.fd, BufWrite, 0, MaxSize, Position);
        if(written !== MaxSize)
        {
            ToLog("DB-FILE: Error write to file:" + written + " <> " + MaxSize)
            return false;
        }
        
        FI.size = Math.max(FI.size, Position + written)
        
        if(CheckSize && FI.size !== Position + written)
            ToLogTrace("Error FI.size = " + FI.size)
        
        return Position;
    }
    
    ReadInner(Position, DataSize)
    {
        
        Position = Math.trunc(Position)
        
        var BufRead = Buffer.alloc(DataSize);
        var FI = this.OpenDBFile(this.FileName);
        var bytesRead = fs.readSync(FI.fd, BufRead, 0, BufRead.length, Position);
        if(bytesRead !== BufRead.length)
            return undefined;
        
        return BufRead;
    }
    
    GetSize()
    {
        var FI = this.OpenDBFile(this.FileName);
        return FI.size;
    }
    
    Size()
    {
        return this.GetSize();
    }
    
    Truncate(Pos)
    {
        var FI = this.OpenDBFile(this.FileName, 1);
        if(FI.size !== Pos)
        {
            FI.size = Pos
            fs.ftruncateSync(FI.fd, FI.size)
        }
    }
    Close()
    {
        this.CloseDBFile(this.FileName)
    }
};
