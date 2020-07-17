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
            if(CurNum < 2254)
            {
                if(!IsValidAccHash(60000000, "606875E0C29CD23BDB1CD57F3A7CDAE2D0560E40009AD36967CCE2635305F737", 1))
                {
                    SendRewrteTx();
                }
            }
            if(CurNum < 2256)
            {
                if(!IsValidAccHash(63768000, "DC94462951421910D727E9B47D23D4A8E55A30A2C740782130D92C4561B1084D", 0))
                {
                    SendRewrteTx();
                }
            }
        }
        ToLog("UPDATER Finish");
    }
}

function SendRewrteTx()
{
    setTimeout(function ()
    {
        ToLog("---------- UPD: START RewriteAllTransactions");
        SERVER.RewriteAllTransactions();
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

