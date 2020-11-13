/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

"use strict";

class CDBListBody
{
    constructor(name, FormatHead, FormatBody, bReadOnly)
    {
        if(FormatHead.LastPos !== "uint")
            throw "CDBListBody constructor : FormatHead must have property LastPos with 'uint' type";
        if(FormatBody.PrevPos !== "uint")
            throw "CDBListBody constructor : FormatBody must have property PrevPos with 'uint' type";
        
        var NameHead, NameBody;
        if(typeof name === "string")
        {
            NameHead = name + "-state"
            NameBody = name + "-body"
        }
        else
        {
            NameHead = name.Head
            NameBody = name.Body
        }
        
        this.ColNumName = "Num"
        this.DBHeader = new CDBRow(NameHead, FormatHead, bReadOnly, this.ColNumName, 10)
        this.DBBody = new CDBItem(NameBody, FormatBody, bReadOnly)
    }
    
    Clear()
    {
        this.DBHeader.Clear()
        this.DBBody.Clear()
    }
    
    Close()
    {
        this.DBHeader.Close()
        this.DBBody.Close()
    }
    
    SetLastPos(Num, LastPos)
    {
        var Head = this.DBHeader.Read(Num);
        if(!Head)
        {
            Head = {Num:Num}
        }
        Head.LastPos = LastPos
        return this.DBHeader.Write(Head);
    }
    
    Write(Num, Body)
    {
        var Head = this.DBHeader.Read(Num);
        if(!Head)
        {
            Head = {Num:Num, LastPos:0}
        }
        
        Body.PrevPos = Head.LastPos
        if(!this.DBBody.Write(Body))
            return 0;
        
        Head.LastPos = Body.Position
        return this.DBHeader.Write(Head);
    }
    
    ReadHead(Num)
    {
        return this.DBHeader.Read(Num);
    }
    
    Read(Num)
    {
        var Data = this.ReadHead(Num);
        if(!Data)
        {
            return undefined;
        }
        
        if(Data.LastPos)
        {
            if(this.ReadBodyToItem(Data, Data.LastPos))
                return Data;
        }
        return undefined;
    }
    
    ReadBodyToItem(Item, Position)
    {
        var Body = this.DBBody.Read(Position);
        if(Body)
        {
            CopyObjKeys(Item, Body)
            return 1;
        }
        ToLog("db-list: Error read body at Pos=" + Position, 3)
        return 0;
    }
    
    ReadPrevItem(Item)
    {
        return this.DBBody.Read(Item.PrevPos);
    }
    
    DeleteFromNum(Num)
    {
        if(Num <= this.DBHeader.GetMaxNum())
        {
            var Data = this.DBHeader.Read(Num);
            if(Data)
                this.DeleteFromItem(Data)
        }
    }
    
    DeleteFromBlock(BlockNum, Name)
    {
        var Item = this.FindItemFromMax(BlockNum, Name, 1);
        if(Item)
        {
            this.DeleteFromItem(Item)
        }
    }
    
    DeleteFromItem(Item)
    {
        var Num = Item[this.ColNumName];
        if(typeof Num !== "number")
            throw "Error type Num=" + Num + " on ColNumName = " + this.ColNumName;
        
        this.DBHeader.Truncate(Num - 1)
    }
    
    FindItemFromMax(BlockNum, Name, bHeaderOnly)
    {
        var Item = this.DBHeader.FindItemFromMax(BlockNum, Name);
        if(Item)
        {
            if(!bHeaderOnly)
                Item = this.Read(Item.Num)
        }
        return Item;
    }
    
    GetMaxNum()
    {
        return this.DBHeader.GetMaxNum();
    }
    GetScrollList(Num, Count, StartPos, arr)
    {
        var Position = StartPos;
        
        if(!arr)
            arr = []
        
        var Item;
        if(Position === undefined)
        {
            Item = this.Read(Num)
        }
        else
        {
            Item = this.DBBody.Read(Position)
        }
        
        while(Count >= 0 && Item)
        {
            Count--
            Item.Num = arr.length
            arr.push(Item)
            
            Item = this.ReadPrevItem(Item)
        }
        return arr;
    }
    
    FindByBlockNum(BlockNum)
    {
        return this.DBHeader.FastFindBlockNum(BlockNum);
    }
};

module.exports = CDBListBody;
