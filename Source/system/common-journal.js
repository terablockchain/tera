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

const ZLib = require("./zerozip");
const ZZip = new ZLib();

const CDBHeadBody = require("../jinn/src/db/jinn-db-headbody");

class CommonJournal
{
    constructor()
    {
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        
        this.FORMAT_ITEM = {Border1:"str2", TableArr:[{Reserve2:"arr4", Type:"byte", DataArr:[{Pos:"uint", BufZip:"tr"}]}], Reserve3:"arr4",
            SumHash:"hash", AccHash:"hash", BlockNumStart:"uint32", BlockNumFinish:"uint32", Border2:"str2", }
        this.DBJournal = new CDBHeadBody("journal", {Position:"uint", BlockNum:"uint32"}, this.FORMAT_ITEM, bReadOnly)
        
        if(bReadOnly)
            return;
    }
    
    Clear()
    {
        ToLog("Run Clear DBJournal")
        this.DBJournal.Clear()
    }
    
    Close()
    {
        this.DBJournal.Close()
    }
    ReadItem(Num)
    {
        if(Num < 0)
            return undefined;
        
        var Item = this.DBJournal.Read(Num);
        if(Item)
        {
            if(Item.Border1 !== "[[" || Item.Border2 !== "]]")
            {
                ToLog("--------- ERROR JOURNAL BORDERS at Num=" + Num)
                Item = undefined
            }
        }
        return Item;
    }
    StartInitBuffer()
    {
        this.TableArr = []
    }
    
    GetJournalTypeItem(IDNum)
    {
        var TypeItem = this.TableArr[IDNum];
        if(!TypeItem)
        {
            TypeItem = {Type:IDNum, DataArr:[], }
            this.TableArr[IDNum] = TypeItem
        }
        return TypeItem;
    }
    
    WriteBufferToJournal(BufRead, Position, BufWrite, IDNum, NotUseOffset)
    {
        var PosObj = GetDiffPosFromArrays(BufRead, BufWrite);
        if(PosObj.PosLeft === BufWrite.length)
            return;
        
        if(NotUseOffset)
        {
            PosObj = {PosLeft:0}
        }
        else
            if(PosObj.PosLeft !== 0 || PosObj.PosRight !== BufWrite.length)
            {
                BufRead = BufRead.slice(PosObj.PosLeft, PosObj.PosRight)
            }
        
        if(BufRead.length === 0)
            return;
        
        var TypeItem = this.GetJournalTypeItem(IDNum);
        
        var Item = {Pos:Position + PosObj.PosLeft, BufZip:ZZip.GetBufferZZip(BufRead)};
        TypeItem.DataArr.push(Item)
    }
    
    WriteSizeToJournal(Position, BufWrite, IDNum)
    {
        var TypeItem = this.GetJournalTypeItem(IDNum);
        var Item = {Pos:Position, BufZip:[]};
        TypeItem.DataArr.push(Item)
    }
    
    WriteJournalToFile(BlockNumStart, BlockFinish)
    {
        var FixData = {BlockNum:BlockFinish.BlockNum, Border1:"[[", TableArr:[], SumHash:BlockFinish.SumHash, AccHash:ACCOUNTS.GetCalcHash(),
            BlockNumStart:BlockNumStart, BlockNumFinish:BlockFinish.BlockNum, Border2:"]]", };
        
        for(var i = 0; i < this.TableArr.length; i++)
        {
            var Table = this.TableArr[i];
            if(Table)
                FixData.TableArr.push(Table)
        }
        
        this.DBJournal.DeleteFromBlock(BlockFinish.BlockNum, "BlockNum")
        if(!this.DBJournal.Write(FixData))
            ToLog("Error write FixData on BlockNum=" + FixData.BlockNum)
        this.TableArr = []
    }
    
    RestoreFromJournalAtNum(BlockNum, bCheckOnly)
    {
        var bWasRestoreDB = 0;
        while(1)
        {
            var Item = this.DBJournal.Read(this.DBJournal.GetMaxNum());
            if(!Item)
            {
                ToLog("RestoreFromJournalAtNum: Error read last item on BlockNum=" + BlockNum, 2)
                break;
            }
            else
                if(Item.BlockNum >= BlockNum)
                {
                    if(Item.BlockNum === BlockNum)
                        bWasRestoreDB = 1
                    
                    this.ProcessingRestoreItems(Item, BlockNum, bCheckOnly)
                    this.DBJournal.DeleteFromItem(Item)
                }
                else
                {
                    break;
                }
        }
        
        return bWasRestoreDB;
    }
    
    ProcessingRestoreItems(Item, BlockNum, bCheckOnly)
    {
        if(!Item.TableArr)
            return;
        
        var LastSavingItem = undefined;
        for(var n = 0; n < Item.TableArr.length; n++)
        {
            var Table = Item.TableArr[n];
            
            var DB = GET_TR_DB(Table.Type);
            if(!DB)
            {
                ToLog("ProcessingRestoreItems BlockNum=" + BlockNum + " Error Type=" + Table.Type, 3)
                continue;
            }
            for(var i = 0; i < Table.DataArr.length; i++)
            {
                var Data = Table.DataArr[i];
                if(Data.BufZip.length === 0)
                {
                    
                    if(!bCheckOnly)
                    {
                        DB.TruncateInner(Data.Pos)
                    }
                    
                    continue;
                }
                var BufUnZip = ZZip.GetBufferUnZZip(Data.BufZip, Data.BufZip.length);
                
                if(bCheckOnly)
                {
                    var BufRead = DB.ReadInner(Data.Pos, BufUnZip.length);
                    if(!BufRead || !IsEqArr(BufRead, BufUnZip))
                    {
                        ToLog("Restore BlockNum=" + BlockNum + " DB: " + DB.FileName + " Pos=" + Data.Pos + "/" + DB.GetSize())
                        ToLog("BufRead =" + GetHexFromArr(BufRead))
                        ToLog("BufUnZip=" + GetHexFromArr(BufUnZip))
                        ToLog("BufZip  =" + GetHexFromArr(Data.BufZip))
                        
                        continue;
                    }
                }
                else
                {
                    if(Data.Pos === DB._JournalLastSavingPos)
                    {
                        LastSavingItem = {BufUnZip:BufUnZip, Pos:Data.Pos}
                        continue;
                    }
                    
                    DB.WriteInner(BufUnZip, Data.Pos, undefined, BufUnZip.length, 1)
                }
            }
            if(LastSavingItem)
            {
                DB.WriteInner(LastSavingItem.BufUnZip, LastSavingItem.Pos, undefined, LastSavingItem.BufUnZip.length, 1)
            }
            
            if(DB.OnRestoreJournal)
                DB.OnRestoreJournal()
        }
    }
    
    GetLastBlockNumAct()
    {
        this.Close()
        
        var BlockNum;
        var MaxNumJournal = this.GetMaxNum();
        var Item = this.ReadItem(MaxNumJournal);
        if(Item)
            BlockNum = Item.BlockNum
        else
        {
            BlockNum =  - 1
        }
        
        return BlockNum;
    }
    
    GetLastBlockNumItem()
    {
        
        var MaxNumJournal = this.GetMaxNum();
        var Item = this.ReadItem(MaxNumJournal);
        
        return Item;
    }
    
    GetMinBlockAct()
    {
    }
    
    ControlSize()
    {
    }
    GetMaxNum()
    {
        return this.DBJournal.GetMaxNum();
    }
    
    FindByBlockNum(BlockNum)
    {
        return this.DBJournal.FindByBlockNum(BlockNum);
    }
    GetScrollList(start, count)
    {
        var arr = this.DBJournal.GetScrollList(start, count);
        for(var i = 0; i < arr.length; i++)
        {
            var Item = arr[i];
            
            Item.Tables = ""
            for(var n = 0; n < Item.TableArr.length; n++)
            {
                var Table = Item.TableArr[n];
                var DB = GET_TR_DB(Table.Type);
                if(DB)
                {
                    Item.Tables += DB.FileName + "\n"
                }
            }
            
            var Block = SERVER.ReadBlockHeaderDB(Item.BlockNum);
            
            if(!Block)
                Item.VerifySumHash = 0
            else
            {
                if(IsEqArr(Block.SumHash, Item.SumHash))
                    Item.VerifySumHash = 1
                else
                    Item.VerifySumHash =  - 1
            }
        }
        
        return arr;
    }
};

function GetDiffPosFromArrays(BufRead,BufWrite)
{
    var PosLeft = 0;
    var MaxLength = BufRead.length;
    for(var i = 0; i < MaxLength; i++)
    {
        if(BufRead[i] !== BufWrite[i])
        {
            break;
        }
        PosLeft = i + 1;
    }
    
    var PosRight = 0;
    for(var i = MaxLength - 1; i >= PosLeft; i--)
    {
        PosRight = i + 1;
        if(BufRead[i] !== BufWrite[i])
        {
            break;
        }
    }
    
    return {PosLeft:PosLeft, PosRight:PosRight};
}

global.JOURNAL_DB = new CommonJournal();
