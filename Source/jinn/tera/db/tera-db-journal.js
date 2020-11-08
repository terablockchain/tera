/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

global.TR_DATABUF_COUNTER = 0;

class CDBTR extends global.CDBParentBase
{
    constructor(FileName, bReadOnly)
    {
        super(FileName, bReadOnly, 0)
        
        this.TRLevel = []
        this.ClearAllTR()
    }
    
    ReadInner(Position, DataSize, bNoCheckSize, Level)
    {
        if(!Level)
            Level = 0
        
        var TRContext = this.GetCurrentTRTree(Level);
        if(TRContext)
        {
            var Item = {Position:Position};
            var Find = TRContext.Tree.find(Item);
            if(Find)
            {
                return Find.BufWrite;
            }
            else
            {
                return this.ReadInner(Position, DataSize, bNoCheckSize, Level + 1);
            }
        }
        
        return super.ReadInner(Position, DataSize, bNoCheckSize);
    }
    
    WriteInner(BufWrite, Position, CheckSize, MaxSize, bJournalRestoring)
    {
        this.WasUpdate = 1
        
        var TRContext = this.GetCurrentTRTree();
        if(!TRContext)
            return super.WriteInner(BufWrite, Position, CheckSize, MaxSize, bJournalRestoring);
        
        if(Position === undefined)
        {
            Position = this.GetSize()
            if(!Position)
                Position = 100
        }
        
        if(MaxSize && BufWrite.length !== MaxSize)
            BufWrite = BufWrite.slice(0, MaxSize)
        
        var Item = {Position:Position, BufWrite:BufWrite};
        var Find = TRContext.Tree.find(Item);
        if(Find)
        {
            TRContext.Tree.remove(Find)
            if(Find.BufWrite.length !== Item.BufWrite.length)
                StopAndExit("WriteInner: Error new Item length = " + Item.BufWrite.length + "/" + Find.BufWrite.length)
        }
        TRContext.Tree.insert(Item)
        
        global.TR_DATABUF_COUNTER += BufWrite.length
        
        if(CheckSize && this.GetSize() !== Position + MaxSize)
        {
            ToLogTrace("Error size = " + this.GetSize())
            return false;
        }
        
        return Position;
    }
    
    GetSize()
    {
        var TRContext = this.GetCurrentTRTree();
        if(!TRContext)
            return super.GetSize();
        var Item = TRContext.Tree.max();
        if(Item)
        {
            var Size = Item.Position;
            if(Item.BufWrite)
                Size += Item.BufWrite.length
            
            if(Size > TRContext.Size)
                return Size;
        }
        
        return TRContext.Size;
    }
    
    Truncate(Pos)
    {
        var TRContext = this.GetCurrentTRTree();
        if(!TRContext)
            super.Truncate(Pos)
        else
        {
            this.WasUpdate = 1
            this.TruncateTree(TRContext, Pos)
        }
    }
    
    TruncateTree(TRContext, Pos)
    {
        if(!Pos)
            TRContext.Tree.clear()
        else
        {
            while(1)
            {
                var Item = TRContext.Tree.max();
                if(!Item || Item.Position < Pos)
                    break;
                TRContext.Tree.remove(Item)
            }
        }
        TRContext.Tree.insert({Position:Pos, Truncate:1})
        TRContext.Size = Pos
    }
    
    ClearAllTR()
    {
        for(var i = 0; i < this.TRLevel.length; i++)
            this.TRLevel[i].Tree.clear()
        
        this.TRLevel = []
    }
    
    BeginTR(Name)
    {
        
        var Tree = new RBTree(function (a,b)
        {
            if(a.Position !== b.Position)
                return a.Position - b.Position;
            
            return (b.Truncate ? 1 : 0) - (a.Truncate ? 1 : 0);
        });
        
        var Size = this.GetSize();
        
        this.TRLevel.unshift({Tree:Tree, Size:Size, Name:Name})
    }
    
    RollbackTR(Name)
    {
        var TRContext = this.TRLevel.shift();
        if(!TRContext)
            StopAndExit("Error RollbackTR - The transaction was not started")
        if(TRContext.Name !== Name)
            StopAndExit("Error RollbackTR - Bad level, current = " + TRContext.Name + " need " + Name)
        if(this.OnRollbackTR)
            this.OnRollbackTR(Name)
        
        if(this.OnRollbackItemTR)
        {
            var it = TRContext.Tree.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                this.OnRollbackItemTR(Item.BufWrite, Item.Position)
            }
        }
    }
    
    CommitTR(Name, CheckPoint, IDNum)
    {
        
        var TRContext = this.TRLevel.shift();
        if(!TRContext)
        {
            StopAndExit("Error CommitTR:" + Name + " - The transaction was not started")
        }
        if(TRContext.Name !== Name)
        {
            StopAndExit("Error CommitTR:" + Name + " - Bad level. Need " + TRContext.Name)
        }
        
        var TRParent = this.GetCurrentTRTree();
        if(TRParent)
        {
            if(CheckPoint)
                StopAndExit("CommitTR: Error use CheckPoint in not top level")
            
            var WasTruncate = 0;
            
            var it = TRContext.Tree.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                if(Item.Truncate)
                {
                    if(!WasTruncate)
                        this.TruncateTree(TRParent, Item.Position)
                    WasTruncate = 1
                }
                else
                {
                    var Find = TRParent.Tree.find(Item);
                    if(Find)
                    {
                        if(Find.BufWrite.length !== Item.BufWrite.length)
                            StopAndExit("CommitTR : Error new Item length = " + Item.BufWrite.length + "/" + Find.BufWrite.length)
                        
                        Find.BufWrite = Item.BufWrite
                    }
                    else
                    {
                        TRParent.Tree.insert(Item)
                    }
                }
            }
        }
        else
        {
            
            var WasTruncate = 0;
            var WasCheckFileSize = 0;
            var LastSavingItem = undefined;
            var it = TRContext.Tree.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                if(Item.Truncate)
                {
                    if(CheckPoint)
                        continue;
                    
                    if(!WasTruncate)
                        super.Truncate(Item.Position)
                    WasTruncate = 1
                }
                else
                {
                    if(CheckPoint)
                    {
                        var BufRead = super.ReadInner(Item.Position, Item.BufWrite.length);
                        if(BufRead)
                        {
                            JOURNAL_DB.WriteBufferToJournal(BufRead, Item.Position, Item.BufWrite, IDNum, (Item.Position === this._JournalLastSavingPos))
                        }
                        else
                            if(this._JournalCheckFileSize && !WasCheckFileSize)
                            {
                                WasCheckFileSize = 1
                                JOURNAL_DB.WriteSizeToJournal(Item.Position, Item.BufWrite, IDNum)
                            }
                    }
                    else
                    {
                        if(Item.Position === this._JournalLastSavingPos)
                        {
                            LastSavingItem = Item
                            continue;
                        }
                        super.WriteInner(Item.BufWrite, Item.Position)
                    }
                }
            }
            
            if(LastSavingItem)
                super.WriteInner(LastSavingItem.BufWrite, LastSavingItem.Position)
            
            if(CheckPoint)
            {
                this.TRLevel.unshift(TRContext)
            }
            else
            {
                TRContext.Tree.clear()
            }
        }
    }
    
    GetCurrentTRTree(Level)
    {
        if(!Level)
            Level = 0
        return this.TRLevel[Level];
    }
};

module.exports = CDBTR;
