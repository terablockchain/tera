/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

var TaskArr = [];
global.SendTestCoin = SendTestCoin;
function SendTestCoin(FromID,ToID,Sum,Count,TimeRepeat,bClear,Mode)
{
    if(bClear)
        TaskArr.length = 0;
    
    if(!TimeRepeat)
        TimeRepeat = 1;
    for(var i = 0; i < TimeRepeat; i++)
        TaskArr.unshift({FromID:FromID, ToID:ToID, Sum:Sum, Count:Count, Mode:Mode});
    return TaskArr.length;
}

function SendTestCoinInner(FromID,ToID,Sum,Count,Mode)
{
    var PrivHex = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    if(WALLET && WALLET.WalletOpen !== false)
    {
        PrivHex = WALLET.KeyPair.getPrivateKey('hex');
    }
    
    var Params = {"FromID":FromID, "FromPrivKey":PrivHex, "ToID":ToID, "Amount":Sum, "Description":"Test", "Confirm":0};
    
    var WasSend = 0;
    
    for(var i = 0; i < Count; i++)
    {
        var Res = WebApi2.Send(Params, 0, 0, 0, 2);
        if(!Res.Body)
        {
            ToLog("Error WebApi2.Send Res: " + JSON.stringify(Res), 2);
            continue;
        }
        
        var Body = Res.Body.slice(0, Res.Body.length - 12);
        if(Res.result)
        {
            var Res2 = SERVER.AddTransaction({body:Body}, 1);
            if(Res2 === 1)
            {
                WasSend++;
            }
        }
    }
    return WasSend;
}

module.exports.Init = Init;
function Init(Engine)
{
    Engine.DoOnStartBlock = function ()
    {
        
        if(!TaskArr.length)
        {
            
            return;
        }
        
        var Item = TaskArr[TaskArr.length - 1];
        TaskArr.length = TaskArr.length - 1;
        
        if(!Item.Count)
        {
            
            return;
        }
        
        SendTestCoinInner(Item.FromID, Item.ToID, Item.Sum, Item.Count, Item.Mode);
    };
    
    if(!global.TEST_CONNECTOR)
        return;
    
    Engine.SendGetNodesReq = function (Child)
    {
    };
    
    Engine.AddNodeAddrOld = Engine.AddNodeAddr;
    Engine.AddNodeAddr = function ()
    {
        Engine.AddNodeAddrOld({ip:"test.ru", port:33004});
    };
    Engine.UseExtraSlot = 1;
}

function InitTestSha3()
{
    global.StatArrSha3 = [];
    if(global.oldsha3)
        return;
    
    global.oldsha3 = global.sha3;
    global.sha3 = function (data,num)
    {
        JINN_STAT.TestStat0++;
        
        if(num === undefined)
            num = 50;
        
        if(!StatArrSha3[num])
            StatArrSha3[num] = 0;
        StatArrSha3[num]++;
        
        return oldsha3(data);
    };
}
global.InitTestSha3 = InitTestSha3;

if(0 && global.PROCESS_NAME === "MAIN")
    InitTestSha3();
