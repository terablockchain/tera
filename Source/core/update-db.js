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

global.RunOnUpdate = RunOnUpdate;
function RunOnUpdate()
{
    var fname = GetDataPath("DB/update.lst");
    var UpdateInfo = LoadParams(fname, {UPDATE_NUM_COMPLETE:2000, JINN_MODE_VER2:1});
    
    if(!UpdateInfo.UPDATE_NUM_COMPLETE)
    {
        UpdateInfo.UPDATE_NUM_COMPLETE = 0;
        UpdateInfo.JINN_MODE_VER2 = 1;
    }
    var CurNum = UpdateInfo.UPDATE_NUM_COMPLETE;
    if(CurNum !== UPDATE_CODE_VERSION_NUM)
    {
        UpdateInfo.UPDATE_NUM_COMPLETE = UPDATE_CODE_VERSION_NUM;
        UpdateInfo.JINN_MODE_VER2 = 1;
        
        ToLog("---------- UPDATER Start from:" + CurNum);
        
        SaveParams(fname, UpdateInfo);
        
        if(global.NETWORK_ID === "MAIN-JINN.TERA")
        {
            if(CurNum < 2304)
            {
                if(!IsValidAccHash(64382000, "9D37B1CA6A998734F1B65A1DA737AEFB5182D05291502C6A484618992184F3E6", 0))
                {
                    if(IsValidAccHash(64300000, "C80D6EE465BF54E69647D94B852ED896B611E1027ABF9AE57D08DD0698EEDD68", 1))
                    {
                        SendRewrteTx(64300000);
                    }
                    else
                        if(IsValidAccHash(64200000, "04157B03A87F282055B6779C327B241776C1CDAAB3E0A1593B7B943661979D78", 1))
                        {
                            SendRewrteTx(64200000);
                        }
                        else
                            if(IsValidAccHash(64100000, "F587B8F9DE5FCF8221CC35125A86D29ED1A65DCE40D1DD20F302129C2A3F5853", 1))
                            {
                                SendRewrteTx(64100000);
                            }
                            else
                            {
                                SendRewrteAllTx();
                            }
                }
            }
            if(CurNum < 2422)
            {
            }
        }
        
        if(global.NETWORK_ID === "TEST-JINN.TERA")
        {
            if(CurNum < 2462)
            {
                if(!IsValidAccHash(413000, "DDE70E3BAF9FFED095A9516E1C35EB5724F7194E9D0830812E41376FD8B58521", 0))
                {
                    SendRewrteAllTx();
                }
            }
        }

        // if(CurNum < 2568)
        // {
        //     UpdateSmartDB();
        // }
        ToLog("UPDATER Finish");
    }

    var FName2=GetDataPath("DB/smart2");
    if(!fs.existsSync(FName2) && SMARTS.GetMaxNum()>0)
        UpdateSmartDB();

}
function DeleteOldDBFiles()
{
    setTimeout(function ()
    {
        ToLog("---------- UPD: START DeleteOldDBFiles");
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
        {
            global.TX_PROCESS.RunRPC("RunDeleteOldDBFiles", {});
        }
    }, 20 * 1000);
}

function SendRewrteAllTx()
{
    ToLog("---------- UPD: Prepare RewriteAllTransactions");
    setTimeout(function ()
    {
        ToLog("---------- UPD: START RewriteAllTransactions");
        SERVER.RewriteAllTransactions();
    }, 30 * 1000);
}

function SendRewrteTx(StartNum)
{
    setTimeout(function ()
    {
        ToLog("---------- UPD: START RewrteTx from: " + StartNum);
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ReWriteDAppTransactions", {StartNum:StartNum});
    }, 30 * 1000);
}

function IsValidAccHash(BlockNum,StrHash,bMust)
{
    var AccountsHash = ACCOUNTS.GetHashOrUndefined(BlockNum);
    if(!AccountsHash)
    {
        if(bMust)
            return 0;
        else
            return 1;
    }
    
    if(GetHexFromArr(AccountsHash) === StrHash)
        return 1;
    else
        return 0;
}



global.CheckSumHashInActs = function ()
{
    if(CheckActDB("DBActPrev"))
        CheckActDB("DBAct");
}

function CheckActDB(Name)
{
    var DBAct = ACCOUNTS[Name];
    
    var Num = 0;
    while(1)
    {
        var Item = DBAct.Read(Num);
        if(!Item)
            return 1;
        
        if(Item.Mode === 200)
        {
            Item.HashData = COMMON_ACTS.GetActHashesFromBuffer(Item.PrevValue.Data);
            if(Item)
            {
                var Block = SERVER.ReadBlockHeaderDB(Item.BlockNum);
                if(!Block || !IsEqArr(Block.SumHash, Item.HashData.SumHash))
                {
                    ToLog("---------Error SumHash on BlockNum=" + Item.BlockNum);
                    SendRewrteTx(Item.BlockNum);
                    
                    return 0;
                }
            }
        }
        
        Num++;
        Num % 100000 === 0 && ToLog(Name + ": Check " + Num);
    }
}

function UpdateSmartDB()
{
    console.log("********************* Converting Smart DB *********************");

    // var FName2=GetDataPath("DB/smart2");
    // if(fs.existsSync(FName2))
    //     return;
    // {
    //     console.log("---------delete old: "+FName2)
    //     fs.unlinkSync(FName2);
    // }

    var Smart2 = new SmartApp("Update");
    //Smart2.ClearDataBase();

    for(var Num=0;Num <= SMARTS.GetMaxNum();Num++)
    {
        var Data = SMARTS.ReadSmart(Num);
        if(Data)
        {
            console.log("Write",Num,Data.Name);
            Smart2.DBSmartWrite(Data);
        }
    }

    process.exit(0);
}
