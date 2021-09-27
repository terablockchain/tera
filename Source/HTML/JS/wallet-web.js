/*
 * @project: TERA
 * @version: 2
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


var MIN_VERSION = 2542;
var COUNT_BLOCK_PROOF = 100;
var MIN_SUM_POWER = 0;

var MaxConnectedCount = 50;
var TIME_LENGTH_CONNECT_ALL = 2 * 1000;
var StartTimeConnecting = 0;
var ConnectedCount = 0;
var NETWORK_NAME = "MAIN-JINN";
var SHARD_NAME = "TERA";
var NETWORK_ID = NETWORK_NAME + "." + SHARD_NAME;
var SystemOnly;
var ServerMap = {};
var ServerMainMap = {
    "127.0.0.1":{"ip":"127.0.0.1", "port":80, "Name":"LOCAL"},
    "terawallet.org":{"ip":"terawallet.org", "port":443,"Name":"terawallet", "System":1},
    "teraexplorer.org":{"ip":"teraexplorer.org", "port":443, "Name":"teraexplorer", "System":1},
    "t2.teraexplorer.com":{"ip":"t2.teraexplorer.com", "port":443, "Name":"t2.teraexplorer.com", "System":1},
    "t4.teraexplorer.com":{"ip":"t4.teraexplorer.com", "port":443, "Name":"t4.teraexplorer.com", "System":1},
    "t5.teraexplorer.com":{"ip":"t5.teraexplorer.com", "port":443, "Name":"t5.teraexplorer.com",  "System":1},

    "dappsgate.com":{"ip":"dappsgate.com", "port":80, "Name":"SUPPORT2", "System":1},
    "t1.teraexplorer.com":{"ip":"t1.teraexplorer.com", "port":80, "Name":"t1.teraexplorer.com", "System":1},
};

var ServerTestMap = {"127.0.0.1":{"ip":"127.0.0.1", "port":80, "Name":"LOCAL"}, "dappsgate.com":{"ip":"dappsgate.com", "port":88,
        "Name":"SUPPORT1", "System":1}, };

function StartWebWallet()
{
    if(NETWORK_ID === "MAIN-JINN.TERA")
    {
        ServerMap = ServerMainMap;
        MIN_SUM_POWER = COUNT_BLOCK_PROOF * 30;
        UPDATE_CODE_JINN = 63510000;
        BLOCKNUM_ALGO2 = 6560000;
        BLOCKNUM_HASH_NEW = 10195000;
        BLOCKNUM_TICKET_ALGO = 16070000;
    }
    else
    {
        ServerMap = ServerTestMap;
        MIN_SUM_POWER = 0;
        UPDATE_CODE_JINN = 0;
        BLOCKNUM_ALGO2 = 0;
        BLOCKNUM_HASH_NEW = 0;
        BLOCKNUM_TICKET_ALGO = 0;
    }

    
    if($("idNetwork"))
        $("idNetwork").innerText = NETWORK_ID;
    OnInitWebWallet();
    ConnectWebWallet();
}
function OnInitWebWallet()
{
    if(isMobile() || !IsLocalClient() || idMainServer.value)
    {
        SystemOnly=1;
        return;//only seed nodes
    }


    var str = Storage.getItem(NETWORK_ID + "NodesArrayList");
    if(str)
    {
        var arr = JSON.parse(str);
        for(var i = 0; i < arr.length; i++)
        {
            var Item = ServerMap[arr[i].ip];
            if(Item && Item.System)
                continue;
            
            ServerMap[arr[i].ip] = arr[i];
        }
    }
}
function SaveServerMap()
{
    var Arr = GetArrFromServerMap();
    Arr.sort(function (a,b)
    {
        if(a.SumPower === b.SumPower)
            return a.DeltaTime - b.DeltaTime;
        else
            return b.SumPower - a.SumPower;
    });
    
    var Arr2 = [];
    for(var i = 0; i < Math.min(Arr.length, MaxConnectedCount); i++)
    {
        var Item = Arr[i];
        Arr2.push({ip:Item.ip, port:Item.port, Stat:Item.Stat, t:Item.DeltaTime});
    }
    
    Storage.setItem(NETWORK_ID + "NodesArrayList", JSON.stringify(Arr2));
}

function SetStatus(Str,bNoEscape)
{
    if(!bNoEscape)
    {
        if(Str)
            console.log(Str);
        Str = escapeHtml(Str);
    }
    var id = $("idStatus");
    if(id)
        id.innerHTML = Str;
}

function SetError(Str,bNoSound)
{
    if(Str)
        console.log("%c" + Str, "color:red;font-weight:bold;");
    SetStatus("<DIV  align='left' style='color:red'><B>" + escapeHtml(Str) + "</B></DIV>", 1);
}

var CountConnect = 0;
var CountWallet = 0;
function ConnectWebWallet()
{

    if(idMainServer.value)
    {
        var Str=idMainServer.value;
        if(Str.substr(Str.length-1)==="/")
            Str=Str.substr(0,Str.length-1);
        var Index1=Str.indexOf("://");
        var Port=Str.indexOf("https:")>=0?443:80;
        var Server=Str;
        if(Index1>=0 && Str.substr(0,4)==="http")
            Server=Str.substr(Index1+3);

        var Index2=Server.indexOf(":");
        if(Index2>=0)
        {
            Port = +Server.substr(Index2+1);
            Server = Server.substr(0, Index2);
        }
        //console.log("Server:",Str,"--->",Server,Port);


        SetMainServer({ip:Server,port:Port,Name:"User defined"});

        GetData("/GetCurrentInfo", {}, function (Data)
        {
            if(Data && Data.result)
            {
                CheckNetworkID(Data);
                SetBlockChainConstant(Data);
                OnFindServer();

            }
        });

        return;
    }


    StartTimeConnecting = Date.now();
    ConnectedCount = 0;
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        Item.SendHandShake = 0;
    }
    
    if(window.BrowserIE && !IsLocalClient())
    {
        SetMainServer( undefined);
        return;
    }
    
    CountConnect = 0;
    CountWallet = 0;
    SetStatus("Connecting...");
    LoopHandShake();
    setTimeout(LoopWalletInfo, 1500);
}

var Stage = 0;
var PreparingStartLoopHandShake = 0;
function LoopHandShake()
{
    PreparingStartLoopHandShake = 0;
    
    Stage++;
    SetStatus("Connecting: " + Stage + "...");
    
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        if(Item.SendHandShake || !Item.port)
            continue;

        if(!Item.System && SystemOnly)
            continue;

        CountConnect++;
        if(window.BrowserIE && CountConnect > 4)
            break;
        
        DoNodeList(Item);
    }
}
function IsCorrectDomenName(ip)
{
    var Arr = ip.match(/[\w\.]/g);
    if(!Arr || !ip || Arr.length !== ip.length)
    {
        return 0;
    }
    return 1;
}

function DoNodeList(Item)
{
    if(!IsCorrectDomenName(Item.ip))
    {
        console.log("Not correct ip: " + Item.ip);
        return;
    }
    
    if(window.location.protocol === "https:" && Item.port !== 443)
        return;
    if(Item.port === 443 && IsIPAddres(Item.ip))
        return;
    
    Item.SendHandShake = 1;
    Item.StartTime = Date.now();
    GetData(GetProtocolServerPath(Item) + "/GetNodeList", {}, function (Data)
    {
        if(!Data || !Data.result)
            return;
        
        var CurNetworkID = Data.NETWORK + "." + Data.SHARD_NAME;
        if(CurNetworkID === NETWORK_ID && Data.VersionNum >= MIN_VERSION)
        {
            ConnectedCount++;
            Item.GetHandShake = 1;
            Item.BlockChain = Data.BlockChain;
            
            Item.DeltaTime = Date.now() - Item.StartTime;
            SetStatus("Get: " + Item.ip + ":" + Item.port + " t: " + Item.DeltaTime);
            
            var bWas = 0;
            for(var i = 0; i < Data.arr.length; i++)
            {
                var Node = Data.arr[i];
                if(!ServerMap[Node.ip] && Node.port)
                {
                    ServerMap[Node.ip] = Node;
                    bWas = 1;
                }
            }
            
            var DeltaAll = Date.now() - StartTimeConnecting;
            if(!PreparingStartLoopHandShake && bWas && ConnectedCount < MaxConnectedCount && DeltaAll < TIME_LENGTH_CONNECT_ALL)
            {
                PreparingStartLoopHandShake = 1;
                setTimeout(LoopHandShake, 100);
            }
        }
    });
}
function GetArrFromServerMap()
{
    var Arr = [];
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        if(Item.port)
        {
            if(!Item.SumPower)
                Item.SumPower = 0;
            if(!Item.DeltaTime)
                Item.DeltaTime = 10000;
            if(!Item.Stat)
                Item.Stat = 0;
            Arr.push(Item);
        }
    }
    return Arr;
}

var idTimeFindLider = 0;
var CountDoWalletInfoAll = 0;
var CountDoWalletInfoGet = 0;
function LoopWalletInfo()
{
    CountDoWalletInfoAll = 0;
    CountDoWalletInfoGet = 0;
    
    var Arr = GetArrFromServerMap();
    Arr.sort(function (a,b)
    {
        a.DeltaTime - b.DeltaTime;
    });
    
    CountWallet = Math.min(Arr.length, 8);
    if(window.BrowserIE && CountWallet > 4)
        CountWallet = 4;
    
    for(var i = 0; i < CountWallet; i++)
    {
        DoWalletInfo(Arr[i]);
    }
    
    idTimeFindLider = setTimeout(FindLider, 2500);
}
function DoWalletInfo(Item)
{
    if(window.location.protocol === "https:" && Item.port !== 443)
        return;
    if(Item.port === 443 && IsIPAddres(Item.ip))
        return;
    
    CountDoWalletInfoAll++;
    Item.StartTime = Date.now();
    Item.SendWalletInfo = 1;
    GetData(GetProtocolServerPath(Item) + "/GetCurrentInfo", {BlockChain:1}, function (Data)
    {
        if(!idTimeFindLider)
            return;
        
        if(!Data || !Data.result)
            return;
        
        var CurNetworkID = Data.NETWORK + "." + Data.SHARD_NAME;
        if(Data.BlockChain && CurNetworkID === NETWORK_ID)
        {
            Item.Name = "";
            Item.GetWalletInfo = 1;
            Item.DeltaTime2 = Date.now() - Item.StartTime;
            Item.BlockChain = Data.BlockChain;
            Item.MaxNumBlockDB = Data.MaxNumBlockDB;
            
            SetStatus("Get: " + Item.ip + ":" + Item.port + " t:" + Item.DeltaTime2);
            CountDoWalletInfoGet++;
            
            if(idTimeFindLider && CountDoWalletInfoAll && CountDoWalletInfoGet >= 2 && CountDoWalletInfoGet / CountDoWalletInfoAll > 0.7)
            {
                clearTimeout(idTimeFindLider);
                idTimeFindLider = 0;
                
                FindLider();
            }
        }
    });
}

function FindLider()
{
    SetMainServer( undefined);
    
    var Arr = [];
    var MapSumPower = {};
    for(var key in ServerMap)
    {
        var Item = ServerMap[key];
        if(Item.GetWalletInfo && Item.BlockChain)
        {
            var arr = Item.BlockChain;
            if(arr.data)
                arr = arr.data;
            Item.SumPower = CalcPowFromBlockChain(arr, Item.ip);
            if(MIN_SUM_POWER && Item.SumPower < MIN_SUM_POWER)
            {
                ToLog("Skip: " + Item.ip + ":" + Item.port + " SumPower(" + Item.SumPower + ") < MIN_SUM_POWER(" + MIN_SUM_POWER + ")");
                continue;
            }
            if(!MapSumPower[Item.SumPower])
                MapSumPower[Item.SumPower] = 0;
            MapSumPower[Item.SumPower]++;
            Arr.push(Item);
        }
    }
    var Max = 0, MaxKey;
    for(var key in MapSumPower)
    {
        if(MapSumPower[key] >= Max)
        {
            Max = MapSumPower[key];
            MaxKey = parseInt(key);
        }
    }
    Arr.sort(function (a,b)
    {
        return a.DeltaTime2 - b.DeltaTime2;
    });
    for(var i = 0; i < Arr.length; i++)
    {
        var Item = Arr[i];
        if(Item.SumPower === MaxKey)
        {
            Item.Stat++;
            
            SetStatus("Found node " + Item.ip + ":" + Item.port + " pow=" + Item.SumPower / COUNT_BLOCK_PROOF + "  ping=" + Item.DeltaTime2 + " ms");
            SetMainServer(Item);
            SaveServerMap();
            break;
        }
    }
    OnFindServer();
}

function CalcPowFromBlockChain(BufRead,name)
{
    var Sum = 0;
    var Arr = GetBlockArrFromBuffer(BufRead);
    if(Arr.length && Arr.length === COUNT_BLOCK_PROOF)
    {
        var FirstBlockNum = Arr[0].BlockNum;
        var LastBlockNum = Arr[Arr.length - 1].BlockNum;
        if(LastBlockNum + 10 < GetCurrentBlockNumByTime())
            return  - 1;
        
        var PrevBlock = undefined;
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(!Block || Block.BlockNum !== FirstBlockNum + i)
                return  - 2;
            if(PrevBlock)
            {
                if(!IsEqArr(Block.PrevHash, PrevBlock.Hash))
                {
                    return  - 3;
                }
            }
            
            Block.DataHash = CalcDataHash(Block.BlockNum, Block.PrevHash, Block.TreeHash, Block.PrevSumPow);
            CalcBlockHashJinn(Block, Block.DataHash, Block.MinerHash, Block.BlockNum, Block.PrevHash);
            
            Sum += Arr[i].Power;
            
            PrevBlock = Block;
        }
    }
    return Sum;
}


