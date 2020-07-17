/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

class CDBItem extends global.CDBFile
{
    constructor(FileName, Format, bReadOnly, EngineID, bCheckSize)
    {
        super(FileName, bReadOnly, EngineID)
        
        if(typeof Format === "object")
            Format = SerializeLib.GetFormatFromObject(Format)
        
        if(bCheckSize)
            this.DataSize = SerializeLib.GetBufferFromObject({}, Format, {}).length
        
        this.Format = Format
        this.WorkStruct = {}
    }
    
    Write(Data)
    {
        JINN_STAT.WriteRowsDB++
        
        var BufWrite = SerializeLib.GetBufferFromObject(Data, this.Format, this.WorkStruct, 1);
        if(this.DataSize && this.DataSize !== BufWrite.length)
        {
            ToLogTrace("Error SerializeLib")
        }
        
        var DataSize = BufWrite.length;
        
        if(Data.Position)
        {
            DataSize = this.ReadUint32(Data.Position)
            if(DataSize < BufWrite.length)
            {
                ToLogTrace("Error Read DataSize: " + DataSize + "/" + BufWrite.length)
                return 0;
            }
        }
        else
        {
            var Position = this.WriteUint32(DataSize, Data.Position);
            if(!Position)
                return 0;
            Data.Position = Position
        }
        if(this.WriteInner(BufWrite, Data.Position + 4, 0, DataSize))
            return 1;
        else
            return 0;
    }
    
    Read(Position)
    {
        JINN_STAT.ReadRowsDB++
        Position = Math.trunc(Position)
        var DataSize = this.ReadUint32(Position);
        if(!DataSize)
            return undefined;
        
        if(this.DataSize && this.DataSize > DataSize)
        {
            ToLogTrace("Error Read DataSize: " + DataSize + "/" + this.DataSize)
            return 0;
        }
        
        var BufRead = this.ReadInner(Position + 4, DataSize);
        if(!BufRead)
            return undefined;
        
        var Data;
        try
        {
            Data = SerializeLib.GetObjectFromBuffer(BufRead, this.Format, this.WorkStruct)
        }
        catch(e)
        {
            ToLog("JINN DB-ITEM: " + e)
            return undefined;
        }
        
        Data.Position = Position
        return Data;
    }
};

global.CDBItem = CDBItem;
