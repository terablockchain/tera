/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
module.exports.Init = Init;

const os = require('os');

var GlSumUser;
var GlSumSys;
var GlSumIdle;

var PrevSumPow = 0;
function Init(Engine)
{
    
    SERVER.GetActualNodes = function ()
    {
        var Arr = [];
        if(!Engine.ConnectArray)
            return Arr;
        
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(!Child || !Child.IsOpen())
                continue;
            
            Arr.push(Child);
        }
        
        return Arr;
    };
    
    SERVER.GetHotNodesCount = function ()
    {
        var Count = 0;
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(!Child || !Child.IsHot())
                continue;
            
            Count++;
        }
        
        return Count;
    };
    
    Engine.GetNodesArr = function ()
    {
        var Arr = [];
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            Arr.push(Item);
        }
        return Arr;
    };
    
    function GetNodesArr()
    {
        var Arr = [];
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            Arr.push("" + Item.ip + ":" + Item.port + " pow=" + Engine.GetAddrPowerFomItem(Item));
        }
        return Arr;
    };
    
    function AddNodeToArr(MapSet,Arr,Node)
    {
        if(MapSet.has(Node))
            return;
        MapSet.add(Node);
        
        if(!Node.IDStr)
        {
            Node.IDArr = CalcIDArr(Node.ip, Node.port);
            Node.IDStr = GetHexFromArr(Node.IDArr);
            Node.Level = Engine.AddrLevelArr(Engine.IDArr, Node.IDArr, 1);
        }
        if(IsEqArr(Engine.IDArr, Node.IDArr))
            return;
        
        var Item = GetJinnNode(Node, 1);
        
        var ArrLevel = Arr[Item.Level];
        if(!ArrLevel)
        {
            ArrLevel = [];
            Arr[Item.Level] = ArrLevel;
        }
        
        ArrLevel.push(Item);
    };
    
    function GetJinnNode(Node,bSimple)
    {
        var IsOpen, IsHot, CanHot = 0;
        if(Node.IsOpen)
            IsOpen = Node.IsOpen();
        if(Node.IsHot)
            IsHot = Node.IsHot();
        if(Engine.CanSetHot(Node) > 0)
            CanHot = 1;
        
        var AddrItem = Node.AddrItem;
        if(!AddrItem)
            AddrItem = {Score:Node.Score};
        
        var Item = {ID:Node.ID, id:Node.ID, ip:Node.ip, port:Node.port, Active:IsOpen, CanHot:CanHot, Hot:IsHot, IsCluster:Node.IsCluster,
            Cross:Node.Cross, Level:Node.Level, BlockProcessCount:AddrItem.Score, TransferCount:Node.TransferCount, DeltaTime:Node.RetDeltaTime,
            Debug:Node.Debug, Name:Node.Name, CurrentShard:Node.ShardName === global.SHARD_NAME ? 1 : 0};
        
        if(bSimple)
        {
            return Item;
        }
        
        var Item2 = {VersionNum:Node.CodeVersionNum, NetConstVer:Node.NetConstVer, addrStr:Node.IDStr, LastTimeTransfer:(Node.LastTransferTime ? Node.LastTransferTime : 0),
            DeltaTime:Node.RetDeltaTime, LogInfo:Engine.GetLogNetInfo(Node), ErrCountAll:Node.ErrCount, WasBan:Engine.WasBanItem(Node),
            SocketStatus:Engine.GetSocketStatus(Node), Name:Node.Name, };
        
        CopyPrimitiveValues(Item, Item2);
        CopyPrimitiveValues(Item, Node);
        
        if(Node.AddrItem)
        {
            Item.ADDR_ITEM = {};
            CopyPrimitiveValues(Item.ADDR_ITEM, Node.AddrItem);
            
            Item.ADDR_ITEM.AddrPower = Engine.GetAddrPower(Node.AddrItem.AddrHashPOW, Node.AddrItem.BlockNum);
        }
        else
            if(Node.AddrHashPOW)
            {
                Item.AddrPower = Engine.GetAddrPower(Node.AddrHashPOW, Node.BlockNum);
            }
        
        if(Node.HotItem)
        {
            Item.HOT_ITEM = {};
            CopyPrimitiveValues(Item.HOT_ITEM, Node.HotItem);
        }
        
        Item.INFO = Node.INFO_DATA;
        Item.STATS = Node.STAT_DATA;
        
        return Item;
    };
    
    global.GetJinnNode = GetJinnNode;
    
    function CopyPrimitiveValues(Dst,Src)
    {
        for(var Key in Src)
        {
            var Value = Src[Key];
            var Type = typeof Value;
            if(Type === "string" || Type === "number" || Type === "boolean")
                Dst[Key] = Value;
        }
    };
    SERVER.GetTransferTree = function ()
    {
        var MapSet = new Set();
        var ArrRes = [];
        var ArrLevels = Engine.GetTransferArrByLevel(3, 1);
        for(var L = 0; L < ArrLevels.length; L++)
        {
            var LevelData = ArrLevels[L];
            
            if(LevelData.HotChild)
                AddNodeToArr(MapSet, ArrRes, LevelData.HotChild);
            if(LevelData.CrossChild)
                AddNodeToArr(MapSet, ArrRes, LevelData.CrossChild);
            
            for(var i = 0; i < LevelData.Connect.length; i++)
            {
                AddNodeToArr(MapSet, ArrRes, LevelData.Connect[i]);
            }
            
            for(var i = 0; i < LevelData.NotConnect.length; i++)
            {
                AddNodeToArr(MapSet, ArrRes, LevelData.NotConnect[i]);
            }
        }
        
        return ArrRes;
    };
    
    SERVER.NetClearChildLog = function (ID,bSet)
    {
        var Child = SERVER.FindNodeByID(ID);
        if(!Child)
            return "CHILD NOT FOUND";
        Engine.ClearLogNetBuf(Child);
        
        return "OK log clear for " + ID;
    };
    
    SERVER.NetSetDebug = function (ID,bSet)
    {
        var Child = SERVER.FindNodeByID(ID);
        if(!Child)
            return "CHILD NOT FOUND";
        Child.Debug = bSet;
        
        return "SET Debug=" + bSet + " for " + ID;
    };
    
    SERVER.NetAddConnect = function (ID)
    {
        var Child = SERVER.FindNodeByID(ID);
        if(!Child)
            return "CHILD NOT FOUND";
        
        Child.SendHotConnectPeriod = 1000;
        
        var Child2 = Engine.RetNewConnectByAddr(Child);
        if(!Child2)
            return "#1 NO AddConnect";
        
        Child2.ToLogNet("=MANUAL CONNECT=");
        
        if(Engine.SendConnectReq(Child2))
            return "OK AddConnect: " + ID;
        else
            return "#2 NO AddConnect";
    };
    
    SERVER.NetAddBan = function (ID)
    {
        var Child = SERVER.FindNodeByID(ID);
        if(!Child)
            return "CHILD NOT FOUND";
        
        Child.ToLogNet("=MANUAL BAN=");
        
        Engine.AddToBan(Child, "=BAN=");
        return "OK AddBan: " + ID;
    };
    
    SERVER.NetAddHot = function (ID)
    {
        var Child = SERVER.FindNodeByID(ID);
        if(!Child)
            return "CHILD NOT FOUND";
        
        Child.ToLogNet("=MANUAL ADD HOT=");
        
        var WasChild = Engine.LevelArr[Child.Level];
        if(WasChild)
        {
            Engine.DenyHotConnection(WasChild, 1);
        }
        
        if(Engine.TryHotConnection(Child, 1))
            return "OK AddHot: " + ID;
        else
            return "NOT AddHot";
    };
    
    SERVER.NetDeleteNode = function (ID)
    {
        var Child = SERVER.FindNodeByID(ID);
        if(!Child)
            return "CHILD NOT FOUND";
        
        Child.ToLogNet("=MANUAL DELETE=");
        
        Engine.DenyHotConnection(Child, 1);
        return "OK DeleteNode: " + ID;
    };
    
    SERVER.FindNodeByID = function (ID)
    {
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(Child && Child.ID === ID)
                return Child;
        }
        
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            if(Item.ID === ID)
                return Item;
        }
        
        return undefined;
    };
    
    Engine.StatSecondNum = Date.now();
    Engine.OnStatSecond = function ()
    {
        if(!Engine.GetCountAddr)
            return;
        if(!SERVER.GetMaxNumBlockDB)
            return;
        
        SERVER.CurrentBlockNum = Engine.CurrentBlockNum;
        
        var StatNum = Math.floor(Engine.TickNum / 10);
        if(Engine.TeraLastStatNum === StatNum)
            return;
        Engine.TeraLastStatNum = StatNum;
        
        var DeltaStat = Date.now() - Engine.StatSecondNum;
        Engine.StatSecondNum = Date.now();
        if(global.JINN_WARNING >= 3 && DeltaStat > 1500)
            ToLog("=============== DeltaStat: " + DeltaStat + " ms  !!!!");
        
        PrepareStatEverySecond();
        
        var Arr = SERVER.GetActualNodes();
        
        global.CountAllNode = Engine.GetCountAddr();
        global.CountConnectedNode = Arr.length;
        ADD_TO_STAT("MAX:HOT_NODES", SERVER.GetHotNodesCount());
        ADD_TO_STAT("MAX:CONNECTED_NODES", global.CountConnectedNode);
        ADD_TO_STAT("MAX:ALL_NODES", global.CountAllNode);
        
        ADD_TO_STAT("SENDDATA(KB)", Engine.SendTraffic / 1024);
        ADD_TO_STAT("GETDATA(KB)", Engine.ReceiveTraffic / 1024);
        Engine.SendTraffic = 0;
        Engine.ReceiveTraffic = 0;
        
        ADD_TO_STAT("MAX:TIME_DELTA", DELTA_CURRENT_TIME);
        
        ADD_TO_STAT("USEPACKET", Engine.ReceivePacket);
        Engine.ReceivePacket = 0;
        
        ADD_TO_STAT("NETCONFIGURATION", Engine.NetConfiguration);
        Engine.NetConfiguration = 0;
        
        ADD_TO_STAT("ERRORS", JINN_STAT.ErrorCount);
        
        ADD_TO_STAT("DELTA_STAT", DeltaStat);
        
        global.glMemoryUsage = (process.memoryUsage().heapTotal / 1024 / 1024) >>> 0;
        global.glFreeMem = os.freemem() / 1024 / 1024;
        ADD_TO_STAT("MAX:MEMORY_USAGE", glMemoryUsage);
        ADD_TO_STAT("MAX:MEMORY_FREE", glFreeMem);
        
        var SumUser = 0;
        var SumSys = 0;
        var SumIdle = 0;
        var cpus = os.cpus();
        for(var i = 0; i < cpus.length; i++)
        {
            var cpu = cpus[i];
            SumUser += cpu.times.user;
            SumSys += cpu.times.sys + cpu.times.irq;
            SumIdle += cpu.times.idle;
        }
        if(GlSumUser !== undefined)
        {
            var maxsum = cpus.length * 1000;
            ADD_TO_STAT("MAX:CPU_USER_MODE", Math.min(maxsum, SumUser - GlSumUser));
            ADD_TO_STAT("MAX:CPU_SYS_MODE", Math.min(maxsum, SumSys - GlSumSys));
            ADD_TO_STAT("MAX:CPU_IDLE_MODE", Math.min(maxsum, SumIdle - GlSumIdle));
            ADD_TO_STAT("MAX:CPU", Math.min(maxsum, SumUser + SumSys - GlSumUser - GlSumSys));
        }
        GlSumUser = SumUser;
        GlSumSys = SumSys;
        GlSumIdle = SumIdle;
        
        var MaxNumDB = SERVER.GetMaxNumBlockDB();
        var MaxBlock = Engine.GetBlockHeaderDB(MaxNumDB);
        if(MaxBlock)
        {
            if(PrevSumPow)
                ADD_TO_STAT("MAX:BLOCK_SUMPOW", MaxBlock.SumPow - PrevSumPow);
            PrevSumPow = MaxBlock.SumPow;
        }
        global.glMaxNumDB = MaxNumDB;
        
        JINN_STAT.TeraReadRowsDB += global.TeraReadRowsDB;
        JINN_STAT.TeraWriteRowsDB += global.TeraWriteRowsDB;
        
        global.TeraReadRowsDB = 0;
        global.TeraWriteRowsDB = 0;
        
        var Str = GetJinnStatInfo();
        Str = Str.replace(/[\n]/g, " ");
        var JinnStat = Engine;
        var StrMode = " H:" + (JinnStat.Header2 - JinnStat.Header1) + " B:" + (JinnStat.Block2 - JinnStat.Block1) + "";
        Str += StrMode;
        if(global.DEV_MODE === 12)
            ToLogInfo("" + MaxCurNumTime + ":" + Str);
        ADD_TO_STAT("MAX:TRANSACTION_COUNT", JINN_STAT.BlockTx);
        ADD_TO_STAT("MAX:SUM_POW", Engine.DB.MaxSumPow % 1000);
        for(var key in JINN_STAT.Methods)
        {
            var StatNum = Math.floor(JINN_STAT.Methods[key]);
            ADD_TO_STAT(key, StatNum);
        }
        for(var key in JINN_STAT.Keys)
        {
            var Name = JINN_STAT.Keys[key];
            if(Name)
            {
                if(Name.substr(0, 1) === "-")
                    Name = Name.substr(1);
                
                var StatNum = JINN_STAT[key];
                ADD_TO_STAT("JINN:" + Name, StatNum);
            }
        }
        
        global.TERA_STAT = {};
        CopyObjKeys(global.TERA_STAT, JINN_STAT);
        JINN_STAT.Clear();
    };
    
    Engine.CanUploadData = function (CurBlockNum,LoadBlockNum)
    {
        return 1;
        if(global.glKeccakCount < global.MAX_SHA3_VALUE && GetBusyTime() <= global.MAX_BUSY_VALUE)
        {
            return 1;
        }
        
        var Delta = Math.abs(CurBlockNum - LoadBlockNum);
        if(Delta < 8)
            return 1;
        
        return 0;
    };
    
    Engine.GetBlockchainStatForMonitor = function (Param)
    {
        if(Param.Mode === "POW")
            return SERVER.GetStatBlockchainPeriod(Param);
        
        if(Param.Mode === "SenderGistogram")
        {
            
            var StartNum = Param.BlockNum;
            if(!Param.Count || Param.Count < 0)
                Param.Count = 1000;
            var EndNum = StartNum + Param.Count;
            
            if(JINN_CONST.TX_PRIORITY_RND_SENDER)
            {
                
                var ArrList = new Array(JINN_CONST.TX_PRIORITY_RND_SENDER);
                var ArrX = [];
                for(var i = 0; i < ArrList.length; i++)
                {
                    ArrX[i] = i;
                    ArrList[i] = 0;
                }
                for(var num = StartNum; num < EndNum; num++)
                {
                    var Block = Engine.GetBlockDB(num);
                    if(!Block)
                        break;
                    
                    for(var i = 0; Block.TxData && i < Block.TxData.length; i++)
                    {
                        var Tx = Block.TxData[i];
                        var SenderNum = Engine.GetTxSenderNum(Tx, Block.BlockNum);
                        if(SenderNum >= 0)
                            ArrList[SenderNum]++;
                    }
                }
            }
            else
            {
                
                var Map = {};
                var Arr = [];
                for(var num = StartNum; num < EndNum; num++)
                {
                    var Block = Engine.GetBlockDB(num);
                    if(!Block)
                        break;
                    
                    for(var i = 0; Block.TxData && i < Block.TxData.length; i++)
                    {
                        var Tx = Block.TxData[i];
                        var SenderNum = Engine.GetTxSenderNum(Tx, Block.BlockNum);
                        if(SenderNum >= 0)
                        {
                            var Item = Map[SenderNum];
                            if(!Item)
                            {
                                Item = {SenderNum:SenderNum, Count:0};
                                Arr.push(Item);
                                Map[SenderNum] = Item;
                            }
                            Item.Count++;
                        }
                    }
                }
                Arr.sort(function (a,b)
                {
                    return a.SenderNum - b.SenderNum;
                });
                var ArrList = [];
                var ArrX = [];
                for(var i = 0; i < Arr.length; i++)
                {
                    var Item = Arr[i];
                    ArrList[i] = Item.Count;
                    ArrX[i] = Item.SenderNum;
                }
            }
            
            return {ArrList:ArrList, ArrX:ArrX, steptime:1};
        }
    };
}


global.GetBusyTime = GetBusyTime;
global.glBusySha3 = 0;
global.glBusyTime = 0;

var LastTimeIdle = 0;
function OnTimeIdleBusy()
{
    global.glBusyTime = (Date.now() - LastTimeIdle) * (100 / 50);
    
    LastTimeIdle = Date.now();
    global.glBusySha3 = global.glKeccakCount;
    global.glKeccakCount = 0;
    
    if(global.glStartStat)
    {
        if(global.glStartStat === 2)
        {
            ADD_TO_STAT("MAX:Busy", global.glBusyTime);
            ADD_TO_STAT("SHA3", global.glBusySha3);
        }
        global.glStartStat = 2;
    }
    
    setTimeout(OnTimeIdleBusy, 50);
}
OnTimeIdleBusy();

function GetBusyTime()
{
    var LocalBusyTime = (Date.now() - LastTimeIdle) * (100 / 50);
    return Math.max(LocalBusyTime, glBusyTime);
}

var PrevTimeIdle = 0;
OnTimeIdle();
function OnTimeIdle()
{
    
    var CurTime = Date.now();
    var Delta = CurTime - PrevTimeIdle;
    if(Delta <= 51)
    {
        ADD_TO_STAT("TIME_IDLE", 5);
    }
    
    setTimeout(OnTimeIdle, 49);
    PrevTimeIdle = CurTime;
}
