/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Stores a list of all network node addresses
 * Allows you to bypass this list sequentially by levels
 * Properties:
 * - rotation of nodes on a large address space (almost unlimited)
 * - the traversal iterator is stored outside of this list (external, i.e. on the calling side)
 * - if the number of nodes at one level is more than MAX_LEVEL_NODES, then the old elements will be re-formatted
 * - nodes must perform POW to get their address in the list of nodes
 *
**/




'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Addr"});

global.GETNODES_VERSION = 8;

const POW_MEMORY_BIT_SIZE = 18;
const POW_MAX_ITEM_IN_MEMORRY = 1 << POW_MEMORY_BIT_SIZE;
const POW_SHIFT_MASKA = 32 - POW_MEMORY_BIT_SIZE;

global.MIN_POW_ADDRES = 10;

var COUNT_LIST_LOOP = 3;


function InitClass(Engine)
{
    Engine.NodesArrByLevel = [];
    Engine.NodesTree = new RBTree(FNodeAddr);
    
    if(global.MODELING)
        global.MIN_POW_ADDRES = 4;
    
    Engine.SendGetNodesReq = function (Child)
    {
        if(!CanTime(Child, "SendGetNodesReq", 1000))
            return;
        
        if(!Child.Iterator)
            Child.Iterator = {Level:0, Arr:[]};
        
        Engine.Send("GETNODES", Child, {Iterator:Child.Iterator, Version:GETNODES_VERSION}, function (Child,Data)
        {
            if(!Data || Data.Version < GETNODES_VERSION)
                return;
            
            var Count = 0;
            Child.Iterator = Data.Iterator;
            for(var i = 0; i < Data.Arr.length; i++)
            {
                var Item = Data.Arr[i];
                if(Item.ip && Item.port)
                {
                    if(IsLocalIP(Item.ip))
                        continue;
                    
                    if(Engine.AddNodeAddr(Item, Child) === 1)
                        Count++;
                }
            }
            
            if(Count === 0)
            {
                Child.SendGetNodesReqPeriod += 1000;
            }
            else
            {
                Child.SendGetNodesReqPeriod = 1000;
            }
        });
    };
    Engine.GETNODES_SEND = {Version:"byte", Iterator:{Level:"byte", Arr:["uint16"]}};
    Engine.GETNODES_RET = {Version:"byte", Iterator:{Level:"byte", Arr:["uint16"]}, Arr:[{ip:"str40", port:"uint16", BlockNum:"uint32",
            Nonce:"uint", portweb:"uint16", Reserv:"arr20"}]};
    Engine.GETNODES = function (Child,Data)
    {
        if(!Data || Data.Version < GETNODES_VERSION)
            return;
        
        var Arr = [];
        if(Engine.DirectIP && !Engine.ROOT_NODE)
            if(IsZeroArr(Data.Iterator))
            {
                if(Engine.AddrItem)
                {
                    Arr.push(Engine.AddrItem);
                }
            }
        
        for(var i = 0; i < JINN_CONST.MAX_RET_NODE_LIST; i++)
        {
            var Item = Engine.GetNextNodeAddr(Data.Iterator, 0);
            if(Item && !Item.IsLocal)
            {
                if(Child.IsCluster || Item.ShardName === JINN_CONST.SHARD_NAME)
                    Arr.push(Item);
            }
        }
        
        return {Version:GETNODES_VERSION, Arr:Arr, Iterator:Data.Iterator};
    };
    Engine.GetCountAddr = function ()
    {
        var Count = 0;
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            var Power = Engine.GetAddrPower(Item.AddrHashPOW, Item.BlockNum);
            if(Item.System || global.MODELING)
                Power += global.MIN_POW_ADDRES;
            
            if(Power > global.MIN_POW_ADDRES)
            {
                Count++;
            }
        }
        
        return Count;
    };
    Engine.AddNodeAddr = function (AddrItem,FromChild)
    {
        AddrItem.ip = GetNormalIP(AddrItem.ip);
        
        if(global.LOCAL_RUN && global.IP_VERSION !== 6 && AddrItem.ip !== "127.0.0.1")
            return 0;
        
        if(AddrItem.ip === "0.0.0.0")
        {
            ToLogOne("AddNodeAddr:Error ip from " + ChildName(FromChild));
            return 0;
        }
        
        if(!Engine.IsCorrectNode(AddrItem.ip, AddrItem.port))
        {
            Engine.ToLog("Not correct node ip = " + AddrItem.ip + ":" + AddrItem.port, 3);
            return 0;
        }
        
        AddrItem.IDArr = CalcIDArr(AddrItem.ip, AddrItem.port);
        
        AddrItem.Level = Engine.AddrLevelArr(Engine.IDArr, AddrItem.IDArr, 1);
        var Arr = Engine.GetArrByLevel(AddrItem.Level);
        
        var Tree = Engine.NodesTree;
        var Find = Tree.find(AddrItem);
        
        if(Find)
        {
            if(!Engine.SetParamsNodeAddr(Find, AddrItem))
                return 2;
            for(var i = 0; i < Arr.length; i++)
            {
                var ArrItem = Arr[i];
                if(ArrItem === Find)
                {
                    Arr.splice(i, 1);
                    Arr.push(ArrItem);
                    
                    Arr.DeltaPosLoop++;
                    
                    return 3;
                }
            }
        }
        else
        {
            Tree.insert(AddrItem);
            AddrItem.ID = Tree.size;
            Engine.InitAddrItem(AddrItem);
        }
        
        AddrItem.IsLocal = IsLocalIP(AddrItem.ip);
        
        Arr.push(AddrItem);
        
        if(AddrItem.ip === Engine.ip && AddrItem.port === Engine.port)
            AddrItem.Self = 1;
        
        if(JINN_EXTERN.NodeRoot && AddrItem.ip === JINN_EXTERN.NodeRoot.ip && AddrItem.port === JINN_EXTERN.NodeRoot.port)
            AddrItem.ROOT_NODE = 1;
        return 1;
    };
    
    Engine.InitAddrItem = function (AddrItem,bStart)
    {
        if(!AddrItem.Score)
            AddrItem.Score = 0;
        
        AddrItem.TestExchangeTime = 0;
        
        AddrItem.SendConnectPeriod = 1000;
        AddrItem.SendConnectLastTime = 0;
        
        AddrItem.SendHotConnectPeriod = 1000;
        AddrItem.SendHotConnectLastTime = 0;
    };
    
    Engine.SetItemSelf = function (AddrItem)
    {
        var Find = Engine.NodesTree.find(AddrItem);
        if(Find)
            Find.Self = 1;
    };
    Engine.SetItemRndHash = function (AddrItem,RndHash)
    {
        if(IsZeroArr(RndHash))
            return;
        
        var Find = Engine.NodesTree.find(AddrItem);
        if(Find)
        {
            Find.RndHash = RndHash;
        }
    };
    Engine.GetNextNodeAddr = function (Iterator,RecurcionNum)
    {
        var Level = Iterator.Level % JINN_CONST.MAX_LEVEL_CONNECTION;
        Iterator.Level = Level + 1;
        
        var Pos = Iterator.Arr[Level];
        if(!Pos)
            Pos = 0;
        
        var Arr = Engine.GetArrByLevel(Level);
        
        var Index = Pos - Arr.DeltaPosLoop;
        if(Index < 0)
            Index = 0;
        
        if(Index < Arr.length)
        {
            Iterator.Arr[Level] = Index + Arr.DeltaPosLoop + 1;
            return Arr[Index];
        }
        else
        {
            
            return undefined;
        }
    };
    Engine.SetParamsNodeAddr = function (WasItem,NewItem)
    {
        if(!WasItem.BlockNum || WasItem.BlockNum < NewItem.BlockNum)
        {
            
            Engine.CalcAddrHash(NewItem);
            
            if(!WasItem.AddrHashPOW)
                WasItem.AddrHashPOW = MAX_ARR_32;
            if(!WasItem.BlockNum)
                WasItem.BlockNum = 0;
            
            var NewAddrPower = Engine.GetAddrPower(NewItem.AddrHashPOW, NewItem.BlockNum);
            var WasAddrPower = Engine.GetAddrPower(WasItem.AddrHashPOW, WasItem.BlockNum);
            if(NewAddrPower > WasAddrPower)
            {
                
                WasItem.portweb = NewItem.portweb;
                
                WasItem.AddrHashPOW = NewItem.AddrHashPOW;
                WasItem.BlockNum = NewItem.BlockNum;
                WasItem.Nonce = NewItem.Nonce;
                
                return 1;
            }
        }
        
        return 0;
    };
    Engine.GetAddrPower = function (AddrHashPOW,BlockNum)
    {
        if(!AddrHashPOW)
            return 0;
        
        if(!BlockNum)
            BlockNum = 0;
        
        var DeltaNum = Engine.CurrentBlockNum - BlockNum;
        if(DeltaNum < 0)
            return 0;
        
        DeltaNum += 1000;
        var Power = 1000 * (GetPowPower(AddrHashPOW)) / DeltaNum;
        return Power;
    };
    Engine.GetAddrPowerFomItem = function (Item)
    {
        if(!Item.AddrHashPOW)
            Engine.CalcAddrHash(Item);
        return Engine.GetAddrPower(Item.AddrHashPOW, Item.BlockNum, Item.Nonce);
    };
    Engine.CalcAddrHash = function (Item)
    {
        Item.AddrHashPOW = GetHashFromArrNum2(Item.IDArr, Item.BlockNum, Item.Nonce);
    };
    
    Engine.GetAddrHashPOW = function (AddrItem,BlockNum,Nonce)
    {
        var Hash = GetHashFromArrNum2(AddrItem.IDArr, BlockNum, Nonce);
        return Hash;
    };
    
    Engine.SetOwnIP = function (ip)
    {
        if(!ip)
            return;
        
        Engine.ip = ip;
        if(Engine.ip === "0.0.0.0")
            return;
        
        if(!IsLocalIP(ip))
            Engine.DirectIP = 1;
        
        var NewIDArr = CalcIDArr(Engine.ip, Engine.port);
        if(!IsEqArr(Engine.IDArr, NewIDArr))
        {
            Engine.IDArr = NewIDArr;
            Engine.IDStr = GetHexFromArr(Engine.IDArr);
            
            Engine.RecreateLevelsArray();
        }
        
        if(!Engine.AddrItem)
            Engine.AddrItem = {Nonce:0, BlockNum:0};
        
        Engine.AddrItem = {IDArr:Engine.IDArr, ip:Engine.ip, port:Engine.port, Nonce:Engine.AddrItem.Nonce, NonceTest:0, BlockNum:Engine.AddrItem.BlockNum,
            portweb:global.HTTP_HOSTING_PORT};
        Engine.CalcAddrHash(Engine.AddrItem);
        
        Engine.OnSetOwnIP(ip);
    };
    
    Engine.OnSetOwnIP = function (ip)
    {
    };
    
    Engine.RecreateLevelsArray = function ()
    {
        if(Engine.NodesTree.size)
        {
            Engine.NodesArrByLevel = [];
            var Count = 0;
            var it = Engine.NodesTree.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                
                var NewLevel = Engine.AddrLevelArr(Engine.IDArr, Item.IDArr, 1);
                var Arr = Engine.GetArrByLevel(NewLevel);
                Arr.push(Item);
                
                if(Item.Level < JINN_CONST.MAX_LEVEL_CONNECTION)
                {
                    if(Item.Level !== NewLevel)
                    {
                        Engine.ToLogNet(Item, "---Recalc node level from: " + Item.Level + " to: " + NewLevel);
                        Item.Level = NewLevel;
                        Count++;
                    }
                }
            }
            
            if(Count)
                Engine.ToLog("Recalc nodes levels: Count=" + Count);
            for(var i = 0; i < Engine.ConnectArray.length; i++)
            {
                var Child = Engine.ConnectArray[i];
                if(!Child)
                    continue;
                if(Child.AddrItem && Child.AddrItem.Level !== undefined)
                    Child.Level = Child.AddrItem.Level;
                else
                    Child.Level = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr, 1);
            }
            for(var n = 0; n < JINN_CONST.MAX_LEVEL_CONNECTION; n++)
            {
                ClearLevel(Engine.LevelArr[n]);
                ClearLevel(Engine.CrossLevelArr[n]);
                
                function ClearLevel(Child)
                {
                    if(Child && Child.Level !== n)
                    {
                        Engine.ToLogNet(Child, "---Delete from hot level: " + n);
                        var CurLevel = Child.Level;
                        Child.Level = n;
                        Engine.DenyHotConnection(Child, 1);
                        Child.Level = CurLevel;
                    }
                };
            }
        }
    };
    
    Engine.RecalcChildLevel = function (Child,Mode)
    {
        var NewLevel = Engine.AddrLevelArr(Engine.IDArr, Child.IDArr, 1);
        if(NewLevel !== Child.Level)
        {
            if(Child.Level !== undefined)
            {
                Engine.ToLogNet(Child, "===Recalc node level from: " + Child.Level + " to: " + NewLevel + "  Mode=" + Mode);
            }
            Child.Level = NewLevel;
        }
    };
    Engine.CaclNextAddrHashPOW = function (Count)
    {
        if(!Engine.AddrItem)
            return;
        
        var BlockNum = Engine.CurrentBlockNum;
        var AddrItem = Engine.AddrItem;
        
        if(AddrItem.ip === "0.0.0.0")
            return;
        
        var MaxAddrHashPOW = MAX_ARR_32;
        var MaxNonce = 0;
        
        for(var i = 0; i < Count; i++)
        {
            AddrItem.NonceTest++;
            var Hash = Engine.GetAddrHashPOW(AddrItem, BlockNum, AddrItem.NonceTest);
            if(CompareArr(Hash, MaxAddrHashPOW) < 0)
            {
                MaxAddrHashPOW = Hash;
                MaxNonce = AddrItem.NonceTest;
            }
        }
        
        if(Engine.GetAddrPower(MaxAddrHashPOW, BlockNum) > Engine.GetAddrPower(AddrItem.AddrHashPOW, AddrItem.BlockNum))
        {
            AddrItem.AddrHashPOW = MaxAddrHashPOW;
            AddrItem.Nonce = MaxNonce;
            AddrItem.BlockNum = BlockNum;
        }
    };
    Engine.GetArrByLevel = function (Level)
    {
        var Arr = Engine.NodesArrByLevel[Level];
        if(!Arr)
        {
            Arr = [];
            Arr.DeltaPosLoop = 0;
            Arr.IndexHotLoop =  - 1;
            Engine.NodesArrByLevel[Level] = Arr;
        }
        return Arr;
    };
    Engine.IsCorrectNode = function (ip,port)
    {
        if(!port || port > 65535)
        {
            Engine.ToLog("Not correct port in address: " + ip, 3);
            return 0;
        }
        if(!ip)
        {
            Engine.ToLog("Not set address", 3);
            return 0;
        }
        
        var Arr = ip.match(/[\w\.]/g);
        if(!Arr || Arr.length !== ip.length)
        {
            if(inet_pton(ip) === false)
            {
                Engine.ToLog("Not correct ip address: " + ip, 3);
                return 0;
            }
        }
        
        if(JINN_CONST.UNIQUE_IP_MODE)
        {
            var CountPorts = Engine.GetCountPortsByIP(ip);
            if(CountPorts >= JINN_CONST.UNIQUE_IP_MODE)
                return 0;
        }
        return 1;
    };
    Engine.GetCountPortsByIP = function (ip)
    {
        var Count = 0;
        var find = {ip:ip, port:65535};
        var it = Engine.NodesTree.lowerBound(find);
        while(it)
        {
            it.prev();
            var item = it.data();
            if(!item || item.ip !== ip)
                break;
            
            Count++;
        }
        
        return Count;
    };
    Engine.FindAddrItemByArr = function (IDArr)
    {
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            if(Item.IDArr && IsEqArr(Item.IDArr, IDArr))
                return Item;
        }
        return undefined;
    };
    
    Engine.SetAddrItemForChild = function (AddrChild,Child,bAddNode)
    {
        if(!Child.AddrItem)
        {
            var FindItem = Engine.NodesTree.find(AddrChild);
            if(!FindItem)
            {
                FindItem = AddrChild;
                if(bAddNode)
                {
                    Child.DirectIP = 1;
                    Engine.AddNodeAddr(AddrChild, Child);
                }
            }
            else
            {
                Child.DirectIP = 1;
            }
            Child.AddrItem = FindItem;
        }
        if(!Child.AddrItem.Score || Child.AddrItem.Score <= 0)
            Child.AddrItem.Score = 0;
        
        if(Child.AddrItem.ID)
            Child.ID = Child.AddrItem.ID;
        else
            Child.AddrItem.ID = Child.ID;
        
        Engine.LinkHotItem(Child);
    };
}


//Engine context

function DoNode(Engine)
{
    if(Engine.TickNum === 1)
        Engine.CaclNextAddrHashPOW(1 << (global.MIN_POW_ADDRES + 3));
    
    Engine.CaclNextAddrHashPOW(10);
    
    if(Engine.TickNum % 10 !== 0)
        return;
    if(!Engine.ConnectArray.length)
        return;
    for(var i = 0; i < COUNT_LIST_LOOP; i++)
    {
        Engine.IndexChildLoop++;
        var Child = Engine.ConnectArray[Engine.IndexChildLoop % Engine.ConnectArray.length];
        if(!Child || Child.Del || !Child.IsOpen())
            continue;
        Engine.SendGetNodesReq(Child);
    }
}

function GetHashFromNum2(Value1,Value2)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    WriteUintToArrOnPos(MeshArr, Value1, 0);
    WriteUintToArrOnPos(MeshArr, Value2, 6);
    
    return sha3(MeshArr, 1);
}
function GetHashFromArrNum2(Arr,Value1,Value2)
{
    var MeshArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0];
    WriteArrToArrOnPos(MeshArr, Arr, 0, 32);
    WriteUintToArrOnPos(MeshArr, Value1, 32);
    WriteUintToArrOnPos(MeshArr, Value2, 38);
    
    return sha3(MeshArr, 2);
    
    function WriteArrToArrOnPos(arr,arr2,Pos,ConstLength)
    {
        for(var i = 0; i < ConstLength; i++)
        {
            arr[Pos + i] = arr2[i];
        }
    };
}

function XORArr(Arr1,Arr2)
{
    var Ret = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for(var i = 0; i < 32; i++)
    {
        Ret[i] = Arr1[i] ^ Arr2[i];
    }
    return Ret;
}

function FNodeAddr(a,b)
{
    if(a.ip < b.ip)
        return  - 1;
    else
        if(a.ip > b.ip)
            return  + 1;
        else
            return a.port - b.port;
}

function CalcIDArr(ip,port)
{
    ip = GetNormalIP(ip);
    var HostName = String(ip) + ":" + port;
    var IDArr = sha3(HostName, 3);
    return IDArr;
}
function GetNormalIP(ip)
{
    if(ip.substr(0, 7) === "::ffff:")
        ip = ip.substr(7);
    
    return ip;
}

function ChildName(Child)
{
    if(!Child)
        return " none";
    
    var HostName = String(Child.ip) + ":" + Child.port;
    return HostName;
}
function IsLocalIP(addr)
{
    if(global.LOCAL_RUN)
        return 0;
    var addr7 = addr.substr(0, 7);
    if(addr === "127.0.0.1" || addr7 === "192.168" || (addr7 >= "100.64." && addr7 <= "100.127") || (addr7 >= "172.16." && addr7 <= "172.31.") || addr.substr(0,
    3) === "10.")
        return 1;
    else
        return 0;
}

function inet_pton(a)
{
    
    var r;
    var m;
    var x;
    var i;
    var j;
    var f = String.fromCharCode;
    m = a.match(/^(?:\d{1,3}(?:\.|$)){4}/);
    if(m)
    {
        m = m[0].split('.');
        m = f(m[0]) + f(m[1]) + f(m[2]) + f(m[3]);
        return m.length === 4 ? m : false;
    }
    r = /^((?:[\da-f]{1,4}(?::|)){0,8})(::)?((?:[\da-f]{1,4}(?::|)){0,8})$/;
    m = a.match(r);
    if(m)
    {
        for(j = 1; j < 4; j++)
        {
            if(j === 2 || m[j].length === 0)
            {
                continue;
            }
            m[j] = m[j].split(':');
            for(i = 0; i < m[j].length; i++)
            {
                m[j][i] = parseInt(m[j][i], 16);
                if(isNaN(m[j][i]))
                {
                    return false;
                }
                m[j][i] = f(m[j][i] >> 8) + f(m[j][i] & 0xFF);
            }
            m[j] = m[j].join('');
        }
        x = m[1].length + m[3].length;
        if(x === 16)
        {
            return m[1] + m[3];
        }
        else
            if(x < 16 && m[2].length > 0)
            {
                return m[1] + (new Array(16 - x + 1)).join('\x00') + m[3];
            }
    }
    return false;
}

global.CalcIDArr = CalcIDArr;
global.FNodeAddr = FNodeAddr;
global.GetNormalIP = GetNormalIP;

global.ChildName = ChildName;
global.IsLocalIP = IsLocalIP;
global.inet_pton = inet_pton;

