/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


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
        
        if(global.NETWORK === "MAIN-JINN")
        {
            if(CurNum < 2294)
            {
                if(!IsValidAccHash(64166000, "98352EF599DDBA82882A95504C5CBEFB864CDBBBDB7C1F524647921761ED96B7", 0))
                {
                    ToLog("Find error AccHash - Start check on Acts...");
                    global.CheckSumHashInActs();
                }
            }
        }
        ToLog("UPDATER Finish");
    }
}

function SendRewrteAllTx()
{
    setTimeout(function ()
    {
        ToLog("---------- UPD: START RewriteAllTransactions");
        SERVER.RewriteAllTransactions();
    }, 4000);
}

function SendRewrteTx(StartNum)
{
    setTimeout(function ()
    {
        ToLog("---------- UPD: START RewrteTx from: " + StartNum);
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ReWriteDAppTransactions", {StartNum:StartNum});
    }, 4000);
}

function IsValidAccHash(BlockNum,StrHash,bMust)
{
    var AccountsHash = DApps.Accounts.GetHashOrUndefined(BlockNum);
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
    var DBAct = DApps.Accounts[Name];
    
    var Num = 0;
    while(1)
    {
        var Item = DBAct.Read(Num);
        if(!Item)
            return 1;
        
        if(Item.Mode === 200)
        {
            Item.HashData = DApps.Accounts.GetActHashesFromBuffer(Item.PrevValue.Data);
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
