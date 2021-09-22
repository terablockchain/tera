/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
var glWasError = 0;
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


function RunTestTreeDB(Count,CountM)
{
    
    var bReadOnly = (global.PROCESS_NAME !== "MAIN");
    if(bReadOnly)
        return;
    
    const CMyTestBase = require("./db/tera-db-tree");
    function FCompare(a,b)
    {
        if(a.Shard !== b.Shard)
            return (a.Shard > b.Shard) ? 1 :  - 1;
        return a.Delta - b.Delta;
    };
    var TreeDB = new CMyTestBase("test-tree-datafile", {Shard:SHARD_STR_TYPE, Value:"uint", name:"str40", Delta:"uint", Msg:{Str:SHARD_STR_TYPE}},
    0, FCompare, "nFixed", "nBin");
    TreeDB.Clear();
    
    var nRand = 1234567;
    function random(max)
    {
        nRand = (nRand * 1664525 + 1013904223) >>> 0;
        return nRand % max;
    };
    var Delta, StartTime = Date.now();
    var StartTime0 = StartTime;
    
    var ShardStrArr = ["TEST1", "TEST2", "TEST3"];
    
    var AllArr = [];
    for(var m = 0; m < CountM; m++)
    {
        nRand = 1234567;
        TreeDB.BeginBuffer();
        
        if(!bReadOnly)
        {
            for(var i = 0; i < Count; i++)
            {
                var Name = "";
                var NameL = 1 + random(20);
                for(var n = 0; n < NameL; n++)
                    Name += "#";
                
                var Shard = ShardStrArr[random(3)];
                var Delta = random(1000000);
                var Item = {_Position:undefined, _FileName:undefined, Shard:Shard, Value:i, name:"Test: " + Name, Delta:Delta, Msg:{}};
                Item.Msg.Str = "test";
                
                if(TreeDB.Insert(Item))
                {
                    AllArr.push(Item);
                    
                    if(!TreeDB.RewriteData(Item))
                        ToLog("Error RewriteData");
                }
            }
        }
        
        Delta = Date.now() - StartTime;
        StartTime = Date.now();
        ToLog("Time1=" + Delta + " ms");
        
        TreeDB.FlushBuffer();
        Delta = Date.now() - StartTime;
        StartTime = Date.now();
        ToLog("Time2=" + Delta + " ms");
    }
    
    AllArr.sort(FCompare);
    
    List(TreeDB);
    CheckArr(TreeDB, AllArr);
    
    ToLog("**********************");
    TreeDB.ReloadTree();
    
    List(TreeDB);
    CheckArr(TreeDB, AllArr);
    
    Delta = Date.now() - StartTime0;
    
    ToLog("OK Count=" + TreeDB.GetCount() + " file=" + (Math.trunc(TreeDB.GetSize() / 1024 / 10) / 100) + " Mb Time=" + Delta + " ms   MaxCount=" + TreeDB.MaxCount);
    ToLog("**********************");
    ToLog("******* ALL " + (glWasError ? "ERR" : " OK") + " ******");
    ToLog("**********************");
    
    var Find = TreeDB.FindBoundIter({Shard:"TEST3", Delta:0});
    Find.prev();
    Find.next();
    var FindData = Find.data();
    ToLog("Find=" + JSON.stringify(FindData));
    
    process.exit();
}

function List(TreeDB)
{
    var num = 0;
    ToLog("------------------------");
    var it = TreeDB.Iterator(), Item;
    while((Item = it.next()) !== null)
    {
        num++;
        if(num > 10)
            break;
        
        ToLog("" + num + ". " + JSON.stringify(Item));
    }
}
function CheckArr(TreeDB,AllArr)
{
    var num = 0;
    ToLog("------------------------");
    var it = TreeDB.Iterator(), Item;
    while((Item = it.next()) !== null)
    {
        var ItemArr = AllArr[num];
        if(!ItemArr || ItemArr.Value !== Item.Value)
        {
            glWasError = 1;
            ToLog(JSON.stringify(ItemArr));
            ToLog(JSON.stringify(Item));
            ToLog("CheckArr Error in " + num);
            return;
        }
        
        num++;
    }
    ToLog("CheckArr OK");
}

function CryptoTest()
{
    var Str = "The quick brown fox jumps over the lazy dog";
    
    console.log(sha3(Str));
    console.log(sha256(Str));
    
    var Time0 = Date.now();
    var Count = 1000000;
    for(var i = 0; i < Count; i++)
    {
        sha3(Str, 'hex');
    }
    var Time1 = Date.now();
    for(var i = 0; i < Count; i++)
    {
        sha256(Str, 'hex');
    }
    var Time2 = Date.now();
    
    var Delta1 = Time1 - Time0;
    var Delta2 = Time2 - Time1;
    
    console.log("sha3   js=" + Delta1);
    console.log("sha256 in=" + Delta2);
    
    process.exit(0);
}

