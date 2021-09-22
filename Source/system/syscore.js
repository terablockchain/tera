/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


"use strict";
//system info


global.TYPE_TRANSACTION_SYS = 20;
global.FORMAT_SYS = {
    Type:"byte", Version:"byte",OperationID:"uint",FromNum:"uint",NextNum:"uint",Active:"uint",

    NewAccount:"double", NewSmart:"double", NewTokenSmart:"double", NewShard:"double",
    Storage:"double",
    FreeStorage:"uint32",

    MaxTicks:"uint32",

    WalletStorage:"double",
    WalletFreeStorage:"uint16",
    WalletMaxCount:"uint16",

    Reserve:"str180",
    Sign:"arr64"
};
global.WorkStructSys = {};


class SysCoreApp extends require("./dapp")
{
    constructor()
    {
        var bReadOnly = (global.PROCESS_NAME !== "TX");
        super(bReadOnly);

        this.ActiveInfo=undefined;
        //this.ActiveBlockNum=0;

        var FormatRow=CopyObjKeys({BlockNum:"uint",TrNum:"uint16"},FORMAT_SYS);
        delete FormatRow.OperationID;
        delete FormatRow.Sign;

        this.DB = new CDBRow("syscore", FormatRow, bReadOnly, "Num", 10, 0, 0)
        REGISTER_TR_DB(this.DB, 60);
    }

    Name()
    {
        return "SysCore";
    }

    Close()
    {
         this.DB.Close()
    }
    ClearDataBase()
    {

        this.DB.Clear()
    }

    OnDeleteBlock(BlockNum)
    {
        if(BlockNum > 0)
        {
            this.DB.DeleteFromBlock(BlockNum);
        }
    }

    OnProcessBlockStart(Block)
    {
        this.ActiveInfo=this.GetInfo(Block.BlockNum,1);
        //this.ActiveBlockNum=Block.BlockNum;
    }

    OnProcessBlockFinish(Block)
    {
        this.ActiveInfo=this.GetInfo(Block.BlockNum,1);
        //this.ActiveBlockNum=0;
    }

    OnProcessTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        var Type = Body[0];

        var Result = false;
        switch(Type)
        {
            case TYPE_TRANSACTION_SYS:
                Result = this.TRNewVerson(Block, Body, BlockNum, TrNum, ContextFrom);
                break;

        }

        return Result;
    }

    GetFormatTransaction(Type)
    {
        var format;
        switch(Type)
        {
            case TYPE_TRANSACTION_SYS:
                format = FORMAT_SYS;
                break;

            default:
                format = ""
        }
        return format;
    }

    TRNewVerson(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        if(ContextFrom)
            return "Error context";

        if(Body.length < 330)
            return "Error length transaction (min size)";

        var TR = SerializeLib.GetObjectFromBuffer(Body, FORMAT_SYS, WorkStructSys);

        var ResultCheck = ACCOUNTS.CheckSignFrom(Body, TR, BlockNum, TrNum);
        if(typeof ResultCheck === "string")
            return ResultCheck;

        var Info=this.GetInfo(BlockNum);
        if(ResultCheck.FromID !== TR.FromNum)
            return "TRNewVerson: Error account FromNum: " + TR.FromNum;
        if(Info.NextNum !== TR.FromNum)
            return "TRNewVerson: Error account FromNum: " + TR.FromNum;


        TR.Num=0;
        TR.BlockNum=BlockNum;
        TR.TrNum=TrNum;
        this.DB.Write(TR);

        return true;
    }

    GetInfo(BlockNum,bReadLast)
    {
        var Item;
        if(!this.ActiveInfo)
            bReadLast=1;

        if(bReadLast)
            Item=this.DB.Read(0);
        else
        {
            Item = this.ActiveInfo;
        }

        if(!Item || !Item.Active)
        {
            Item=
            {
                FromNum:0,
                NextNum:(global.NETWORK_ID == "MAIN-JINN.TERA")?20:8,
                Active:0,

                NewAccount: 10,
                NewSmart: 100,
                NewTokenSmart: 10000,
                NewShard: 10000,
                Storage: 0.01,
                FreeStorage:0,
                MaxTicks:35000,
                WalletStorage:0.1,
                WalletFreeStorage:1,
                WalletMaxCount:10,
            };

            if(BlockNum >= UPDATE_CODE_SHARDING)
            {
                Item.NewTokenSmart = 1000;
            }
        }
        return Item;
    }
    GetActive(BlockNum)
    {
        return this.GetInfo(BlockNum,0).Active;
    }

    GetMaxNum()
    {
        return this.DB.GetMaxNum();
    }

    GetShardList(start, count)
    {
        return this.GetScrollList(this.DB, start, count);
    }
}



module.exports = SysCoreApp;

var App = new SysCoreApp;
REGISTER_SYS_DAPP(App, TYPE_TRANSACTION_SYS);
