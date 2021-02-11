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
//History tx

const fs = require('fs');

class AccountHistory extends require("./accounts-rest-no")
{
    constructor(bReadOnly)
    {
        super(bReadOnly)
        this.FILE_NAME_HISTORY = "history-body"
        this.FORMAT_STATE_HISTORY = {NextPos:"uint", Reserv:"arr2"}
        
        this.DBStateHistory = new CDBRow("history-state", this.FORMAT_STATE_HISTORY, bReadOnly)
        this.DBBodyHistory = new CDBBase(this.FILE_NAME_HISTORY, bReadOnly)
        this.HistoryFormatArr = [{Type:"byte", BlockNum:"uint32", TrNum:"uint16", NextPos:"uint"}, {Type:"byte", BlockNum:"uint32",
            TrNum:"uint16", NextPos:"uint", Direct:"str1", CorrID:"uint", SumCOIN:"uint", SumCENT:"uint32"}, {Type:"byte", BlockNum:"uint32",
            TrNum:"uint16", NextPos:"uint", Direct:"str1", CorrID:"uint", SumCOIN:"uint", SumCENT:"uint32", Description:"str"}, ]
        this.WorkStructArr = [{}, {}, {}]
        REGISTER_TR_DB(this.DBStateHistory, 14)
        REGISTER_TR_DB(this.DBBodyHistory, 16)
    }
    
    ClearHistory()
    {
        this.DBStateHistory.Clear()
        this.DBBodyHistory.Clear()
    }
    
    CloseHistory()
    {
        
        this.DBStateHistory.Close()
        this.DBBodyHistory.Close()
    }
    
    WriteHistory(Num, Body)
    {
        if(Body.SmartMode)
            Body.Type = 2
        else
            Body.Type = 1
        
        var Head = this.DBStateHistory.Read(Num);
        if(!Head)
            Head = {Num:Num, NextPos:0}
        
        Body.NextPos = Head.NextPos
        Head.NextPos = this.WriteHistoryBody(Body)
        this.DBStateHistory.Write(Head)
    }
    
    WriteHistoryBody(Body)
    {
        var BufWrite = SerializeLib.GetBufferFromObject(Body, this.HistoryFormatArr[Body.Type], this.WorkStructArr[Body.Type]);
        return this.DBBodyHistory.Write(BufWrite);
    }
    
    GetHistory(Num, Count, StartPos, MinConfirm)
    {
        if(!MinConfirm)
            MinConfirm = 0
        var MaxNumBlockDB = SERVER.GetMaxNumBlockDB();
        
        var Position = StartPos;
        
        if(Position === undefined)
        {
            var Account = this.DBStateHistory.Read(Num);
            if(!Account)
            {
                return [];
            }
            Position = Account.NextPos
        }
        
        var arr = [];
        while(Count > 0 && Position)
        {
            Count--
            
            var Item = this.ReadHistory(Position);
            if(!Item)
                break;
            Position = Item.NextPos
            if(MinConfirm)
            {
                if(Item.BlockNum + MinConfirm > MaxNumBlockDB)
                {
                    continue;
                }
            }
            if(Num === 226012 || Num === 226241)
            {
                var Acc = this.ReadState(Item.CorrID);
                Item.PubKey = GetHexFromArr(Acc.PubKey)
            }
            arr.push(Item)
        }
        return arr;
    }
    
    ReadHistory(Position)
    {
        var BufRead = this.DBBodyHistory.ReadInner(Position, 1000, 1);
        if(!BufRead || BufRead.length < 13)
        {
            ToLog("ReadHistory: Error bytesRead length (less 13 bytes) at Position=" + Position)
            return undefined;
        }
        
        var Type = BufRead[0];
        var format = this.HistoryFormatArr[Type];
        if(!format)
        {
            ToLog("ReadHistory: Error from history, type = " + Type)
            return undefined;
        }
        
        var Item = SerializeLib.GetObjectFromBuffer(BufRead, format, this.WorkStructArr[Type]);
        Item.Pos = Position
        
        return Item;
    }
};

module.exports = AccountHistory;
