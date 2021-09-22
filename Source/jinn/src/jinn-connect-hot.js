/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Search algorithms and support for hot links
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Hot"});


var START_TRANSFER_TIMEOUT = 5 * 1000;
var MAX_TRANSFER_TIMEOUT = 5 * 1000;

global.MAX_DENY_HOT_CONNECTION = 7 * 1000;
global.MAX_HOT_CONNECTION_DELAY = 2 * 1000;

//Engine context

function DoNode(Engine)
{
    if(Engine.ROOT_NODE)
        return 0;
    if(Engine.TickNum % 5 !== 0)
        return;
    
    Engine.CheckHotConnections(Engine.LevelArr);
    Engine.CheckHotConnections(Engine.CrossLevelArr, 1);
    Engine.DoConnectHotLevels();
}


function InitClass(Engine)
{
    Engine.LevelArr = [];
    
    Engine.NetConfiguration = 0;
    
    Engine.DisconnectLevel = function (Child,bSend)
    {
        if(bSend && Child.IsOpen())
            Engine.Send("DISCONNECTLEVEL", Child, {});
        
        if(Engine.LevelArr[Child.Level] === Child)
        {
            Engine.LevelArr[Child.Level] = null;
            Child.ToLogNet("*DisconnectLevel* Level=" + Child.Level);
            Engine.NetConfiguration++;
        }
        if(Engine.CrossLevelArr[Child.Level] === Child)
        {
            Engine.CrossLevelArr[Child.Level] = null;
            Child.ToLogNet("*DisconnectLevel* Level=" + Child.Level);
            
            Engine.NetConfiguration++;
        }
        Engine.RecalcChildLevel(Child, 1);
    };
    
    Engine.DISCONNECTLEVEL_SEND = "";
    Engine.DISCONNECTLEVEL = function (Child,Data)
    {
        if(!Data)
            return;
        Engine.DisconnectLevel(Child, 0);
    };
    
    Engine.CheckHotItem = function (Child)
    {
        if(!Child.HotItem)
            Engine.LinkHotItem(Child);
        
        if(!Child.HotItem)
            Child.ToLogNet("Err CheckHotItem");
        
        return !!Child.HotItem;
    };
    
    Engine.DenyHotConnection = function (Child,bSend)
    {
        if(!Engine.CheckHotItem(Child))
            return 0;
        
        Child.HotItem.HotStart = 0;
        Child.HotItem.DenyHotStart = Date.now();
        Engine.DisconnectLevel(Child, bSend);
    };
    
    Engine.CheckHotConnection = function (Child)
    {
        if(!Child.IsHot())
            Engine.DenyHotConnection(Child);
    };
    
    Engine.LinkHotItem = function (Child)
    {
        if(!Child.AddrItem)
            return;
        
        if(!Child.AddrItem.HotItem)
            Child.AddrItem.HotItem = {};
        Child.HotItem = Child.AddrItem.HotItem;
    };
    
    Engine.InHotStart = function (Item)
    {
        if(!Engine.CheckHotItem(Item))
            return 0;
        
        var HotItem = Item.HotItem;
        if(HotItem.HotStart && Date.now() - HotItem.HotStart <= MAX_HOT_CONNECTION_DELAY)
            return 1;
        else
            return 0;
    };
    
    Engine.InHotDeny = function (Item)
    {
        if(!Engine.CheckHotItem(Item))
            return 0;
        
        var HotItem = Item.HotItem;
        if(HotItem.DenyHotStart && Date.now() - HotItem.DenyHotStart <= MAX_DENY_HOT_CONNECTION)
            return 1;
        else
            return 0;
    };
    
    Engine.TryHotConnection = function (Child,bSend)
    {
        if(Engine.ROOT_NODE)
            return 0;
        
        if(!Engine.CheckHotItem(Child))
            return 0;
        
        var CanSet = Engine.CanSetHot(Child);
        if(CanSet <= 0)
        {
            Child.ToLogNet("Err CanSetHot=" + CanSet);
            return 0;
        }
        
        var LevelArr = Engine.GetLevelArr(Child);
        LevelArr[Child.Level] = Child;
        Child.StartHotTransferNum = Engine.CurrentBlockNum;
        Child.ToLogNet("TryHotConnection SetLevel: " + Child.Level);
        
        Child.HotReady = 0;
        Child.HotItem.HotStart = Date.now();
        if(!Child.IsOpen())
        {
            return Engine.SendConnectReq(Child);
        }
        if(!Engine.IsStartingTime || Child.TestExchangeTime === global.BEST_TEST_TIME)
            Engine.UseExtraSlot = 1;
        
        Child.ToLogNet("Send CONNECTLEVEL = " + Child.Level + " Use Extra=" + Engine.UseExtraSlot);
        
        Engine.Send("CONNECTLEVEL", Child, {UseExtraSlot:Engine.UseExtraSlot}, function (Child,Data)
        {
            if(!Data)
                return;
            
            var result2 = Data.result;
            if(result2)
            {
                result2 = Engine.SetHotConnection(Child, 1);
            }
            
            if(result2)
                Child.HotReady = 2;
            
            Child.ToLogNet("RET CONNECTLEVEL Result  = " + Data.result + " HotReady=" + Child.HotReady);
            
            if(!result2)
            {
                Child.ToLogNet("DenyHotConnection: Level=" + Child.Level);
                
                Engine.DenyHotConnection(Child);
            }
        });
        
        return 1;
    };
    
    Engine.CanSetHot = function (Child)
    {
        
        if(global.CLUSTER_HOT_ONLY && !Child.Name)
            return  - 7;
        if(!global.CLUSTER_HOT_ONLY && Child.Level < global.CLUSTER_LEVEL_START && Child.Name)
            return  - 6;
        
        if(!Child.TestExchangeTime)
            return  - 5;
        
        if(Engine.IsStartingTime && Child.TestExchangeTime !== global.BEST_TEST_TIME)
            return  - 4;
        
        if(!Engine.CheckHotItem(Child))
            return  - 1;
        
        if(Engine.InHotDeny(Child))
        {
            return  - 2;
        }
        
        var LevelArr = Engine.GetLevelArr(Child);
        var ChildWas = LevelArr[Child.Level];
        if(ChildWas && ChildWas !== Child)
        {
            return  - 3;
        }
        return 1;
    };
    
    Engine.SetHotConnection = function (Child,bCheckLevel)
    {
        if(bCheckLevel)
            Engine.RecalcChildLevel(Child, 2);
        
        var CanSet = Engine.CanSetHot(Child);
        if(CanSet <= 0)
        {
            Child.ToLogNet("Err CanSetHot=" + CanSet);
            return 0;
        }
        
        if(!Engine.CheckHotItem(Child))
            return 0;
        
        Child.HotItem.HotStart = 0;
        Child.HotItem.DenyHotStart = 0;
        Child.HotReady = 1;
        
        Child.StartHotTransferNum = Engine.CurrentBlockNum;
        var LevelArr = Engine.GetLevelArr(Child);
        LevelArr[Child.Level] = Child;
        Child.ToLogNet("SetHotConnection Level: " + Child.Level + (Child.Level >= JINN_CONST.MAX_LEVEL_CONNECTION ? " (Extra slot)" : ""));
        
        Engine.NetConfiguration++;
        
        return 1;
    };
    
    Engine.CONNECTLEVEL_SEND = {UseExtraSlot:"byte"};
    Engine.CONNECTLEVEL_RET = {result:"byte"};
    Engine.CONNECTLEVEL = function (Child,Data)
    {
        if(!Data)
            return 0;
        
        if(Engine.ROOT_NODE)
            return 0;
        
        var LevelArr = Engine.GetLevelArr(Child);
        var WasChild = LevelArr[Child.Level];
        if(WasChild && (Date.now() - WasChild.ConnectStart) > JINN_CONST.RECONNECT_MIN_TIME * 1000 && WasChild.Score * 2 < Child.Score)
        {
            Child.ToLogNet("DELETE OLD NODE FROM LEVEL", 3);
            Engine.DenyHotConnection(WasChild, 1);
        }
        
        Child.HotReady = 0;
        
        var WasExtra = 0;
        Child.ToLogNet("GOT CONNECTLEVEL UseExtraSlot=" + Data.UseExtraSlot);
        var Ret = Engine.SetHotConnection(Child, 1);
        if(!Ret && Data.UseExtraSlot)
        {
            for(var i = JINN_CONST.MAX_LEVEL_CONNECTION; i < JINN_CONST.MAX_LEVEL_ALL(); i++)
            {
                var Slot = LevelArr[i];
                if(!Slot)
                {
                    WasExtra = 1;
                    Child.Level = i;
                    Ret = Engine.SetHotConnection(Child, 0);
                    break;
                }
            }
        }
        
        if(0 && !Ret && !WasExtra)
        {
            var MinChild = Engine.GetChildInHotWithMinScore();
            if(MinChild && Date.now() - MinChild.ConnectStart > JINN_CONST.RECONNECT_MIN_TIME * 1000)
            {
                if((MinChild.Level === Child.Level || MinChild.Level >= JINN_CONST.MAX_LEVEL_CONNECTION) && MinChild.Score < Child.Score)
                {
                    Child.Level = MinChild.Level;
                    
                    Engine.DenyHotConnection(MinChild, 1);
                    
                    Child.ToLogNet("************* RECONNECT HOT TO NEW NODE", 3);
                    
                    Ret = Engine.SetHotConnection(Child, 0);
                }
            }
        }
        if(!Ret)
        {
            Engine.DenyHotConnection(Child);
        }
        
        Child.ToLogNet("Result CONNECTLEVEL=" + Ret);
        
        return {result:Ret};
    };
    
    Engine.AddrLevelArr0 = function (arr1,arr2)
    {
        var Level = 0;
        for(var i = arr1.length - 1; i >= 0; i--)
        {
            var a1 = arr1[i];
            var a2 = arr2[i];
            for(var b = 0; b < 8; b++)
            {
                if((a1 & 1) !== (a2 & 1))
                    return Level;
                
                a1 = a1 >> 1;
                a2 = a2 >> 1;
                Level++;
            }
        }
        
        return Level;
    };
    
    Engine.LevelOfDensity = function (arr1,arr2,P)
    {
        var Level = 0;
        for(var i = 0; i < 32; i++)
        {
            var n = arr1.length - i - 1;
            var M = P[i];
            if(!M)
                M = 2;
            
            var a1 = arr1[n] % M;
            var a2 = arr2[n] % M;
            if(a1 !== a2)
                return Level + (M + a1 - a2 - 1) % (M - 1);
            Level += (M - 1);
        }
        
        return Level;
    };
    
    Engine.AddrLevelArr = function (arr1,arr2,bLimit)
    {
        var Level = Engine.AddrLevelArr0(arr1, arr2);
        
        if(bLimit && Level >= JINN_CONST.MAX_LEVEL_CONNECTION)
            Level = JINN_CONST.MAX_LEVEL_CONNECTION - 1;
        
        return Level;
    };
    
    Engine.DoConnectHotLevels = function ()
    {
        var Delta = 10 - Math.floor((Date.now() - Engine.StartTime) / 1000);
        if(!Engine.DirectIP && Delta > 0)
        {
            Engine.ToLog("---Wait " + Delta + " s for hot connections", 4);
            return;
        }
        
        var ArrLevels = Engine.GetTransferArrByLevel(3, 0);
        
        for(var L = 0; L < JINN_CONST.MAX_LEVEL_CONNECTION; L++)
        {
            var LevelData = ArrLevels[L];
            if(!LevelData.HotChild && !LevelData.CrossChild)
                LevelConnect(LevelData.HotChild, LevelData);
            if(!LevelData.CrossChild)
                LevelConnect(LevelData.CrossChild, LevelData);
            
            LevelCheck(LevelData.HotChild);
            LevelCheck(LevelData.CrossChild);
            
            function LevelConnect(HotChild,LevelData)
            {
                for(var i = 0; i < LevelData.Connect.length; i++)
                {
                    var Child = LevelData.Connect[i];
                    var Item = Child.AddrItem;
                    if(!Item)
                    {
                        Child.ToLogNet("Cannt Add to Hot - no Child.AddrItem");
                        continue;
                    }
                    
                    if(Item.ROOT_NODE || Item.Self || Engine.InHotDeny(Item) || Engine.WasBanItem(Item))
                    {
                        Child.ToLogNet("Cannt Add to Hot InHotDeny=" + Engine.InHotDeny(Item));
                        continue;
                    }
                    
                    if(!Item.TestExchangeTime)
                    {
                        Child.ToLogNet("Cannt Add to Hot Item.TestExchangeTime=" + Item.TestExchangeTime);
                        continue;
                    }
                    
                    if(Engine.IsStartingTime && Item.TestExchangeTime !== global.BEST_TEST_TIME)
                    {
                        Child.ToLogNet("Cannt Add to Hot IsStartingTime=" + Engine.IsStartingTime + " Item.TestExchangeTime=" + Item.TestExchangeTime);
                        continue;
                    }
                    
                    if(!CanTime(Item, "SendHotConnect", 1000, 1.5))
                    {
                        Child.ToLogNet("Cannt Add to Hot was SendHotConnect");
                        continue;
                    }
                    
                    Child.ToLogNet("Add to Hot  SendHotConnect=" + Item.SendHotConnectPeriod);
                    if(Engine.TryHotConnection(Child, 1))
                        break;
                }
            };
            
            function LevelCheck(HotChild)
            {
                if(HotChild)
                {
                    var Item = HotChild.AddrItem;
                    if(Item.SendHotConnectPeriod !== 1000)
                    {
                        ResetTimePeriod(HotChild.AddrItem, "SendHotConnect", 1000, 20000);
                    }
                }
            };
        }
    };
    
    Engine.CheckHotConnections = function (LevelArr,bCross)
    {
        for(var L = 0; L < JINN_CONST.MAX_LEVEL_ALL(); L++)
        {
            var Child = LevelArr[L];
            if(!Child)
                continue;
            
            var StrError = "";
            var bNeedDisconnect = 0;
            if(bCross && !Child.IsCluster)
            {
                bNeedDisconnect = 1;
                StrError = "5# Disconnect not clustered node " + ChildName(Child);
            }
            else
                if(bCross && Child.ShardName === JINN_CONST.SHARD_NAME)
                {
                    bNeedDisconnect = 1;
                    StrError = "6# Disconnect cross hot node " + ChildName(Child);
                }
                else
                    if(!Engine.InHotStart(Child) && (!Child.IsOpen() || Child.Del))
                    {
                        bNeedDisconnect = 1;
                        StrError = "1# Connect not was open " + ChildName(Child);
                    }
                    else
                        if(Child.HotStart && !Engine.InHotStart(Child))
                        {
                            bNeedDisconnect = 1;
                            StrError = "2# Bad connect time period " + ChildName(Child);
                        }
                        else
                            if(Child.FirstTransferTime)
                            {
                                var NowTime = Date.now();
                                var Delta1 = NowTime - Child.FirstTransferTime;
                                var Delta2 = NowTime - Child.LastTransferTime;
                                if(Child.Name)
                                    Delta2 = Delta2 / 3;
                                
                                if((Delta1 > START_TRANSFER_TIMEOUT) && (Delta2 > MAX_TRANSFER_TIMEOUT))
                                {
                                    bNeedDisconnect = 1;
                                    StrError = "3# Not data exchange a long time " + ChildName(Child);
                                    Child.LastTransferTime = 0;
                                    Child.FirstTransferTime = 0;
                                }
                            }
            if(Child.IsHot() && !Child.IsHotReady())
            {
                bNeedDisconnect = 1;
                StrError = "4# CheckHotConnections - not HotReady " + ChildName(Child);
            }
            
            if(bNeedDisconnect)
            {
                
                Child.ToLogNet(StrError);
                Engine.StartDisconnect(Child, 1, StrError);
                Engine.DenyHotConnection(Child);
            }
        }
    };
}
