/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


"use strict";

class CDBHeadBody
{
    constructor(name, FormatHead, FormatBody, bReadOnly, ColNumName)
    {
        if(FormatHead.Position !== "uint")
            throw "CDBHeadBody constructor : FormatHead must have property Position with 'uint' type";
        
        var NameHead, NameBody;
        if(typeof name === "string")
        {
            NameHead = name + "-head"
            NameBody = name + "-body"
        }
        else
        {
            NameHead = name.Head
            NameBody = name.Body
        }
        
        this.FileNameHead = NameHead
        this.FileNameBody = NameBody
        
        this.ColNumName = ColNumName ? ColNumName : "Num"
        this.DBHeader = new CDBRow(NameHead, FormatHead, bReadOnly, ColNumName, 10)
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
    
    Write(Item)
    {
        if(!this.DBBody.Write(Item))
            return 0;
        
        return this.DBHeader.Write(Item);
    }
    
    Read(Num)
    {
        var Data = this.DBHeader.Read(Num);
        if(!Data)
            return undefined;
        
        if(Data.Position)
        {
            var Body = this.DBBody.Read(Data.Position);
            if(Body)
            {
                CopyObjKeys(Data, Body)
                return Data;
            }
        }
        
        return undefined;
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
        if(Item.Position)
        {
            this.DBBody.Truncate(Item.Position)
        }
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
    GetScrollList(start, count)
    {
        var arr = [];
        for(var num = start; true; num++)
        {
            var Data = this.Read(num);
            if(!Data)
                break;
            
            arr.push(Data)
            
            count--
            if(count < 1)
                break;
        }
        
        return arr;
    }
    
    FindByBlockNum(BlockNum)
    {
        return this.DBHeader.FastFindBlockNum(BlockNum);
    }
};

module.exports = CDBHeadBody;
