/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Adjustment of the time
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Time"});

const MAX_STAT_BLOCKNUM_PERIOD = 10;
const OLD_STAT_BLOCKNUM_PERIOD = 1000;

const CLUSTER_TIME_PERIOD = 1000000000;

//Engine context
function InitClass(Engine)
{
    
    Engine.WasCorrectTime = 0;
    Engine.TimeCorrectStartNum = 0;
    
    Engine.TimeMedian = new CTimeMedian(21, 200);
    
    Engine.TreeTimeStat = new RBTree(function (a,b)
    {
        return b.BlockNum - a.BlockNum;
    });
    
    Engine.MaxTimeItem = {StartTime:0, BlockNum:0};
    
    Engine.SetTimeDelta = function (DeltaTime)
    {
        global.DELTA_CURRENT_TIME = DeltaTime;
        Engine.OnSetTimeDelta(DeltaTime);
    };
    Engine.OnSetTimeDelta = function (DeltaTime)
    {
    };
    
    Engine.CorrectTimeByDelta = function (NewDelta)
    {
        
        if(Math.abs(NewDelta) > 1000000000)
            NewDelta = 0;
        
        if(Engine.WasCorrectTime >= 1)
        {
            var NewDeltaAbs = Math.abs(NewDelta);
            if(NewDeltaAbs >= JINN_CONST.CORRECT_TIME_TRIGGER)
            {
                if(NewDeltaAbs > JINN_CONST.CORRECT_TIME_VALUE)
                {
                    if(NewDelta < 0)
                        NewDelta =  - JINN_CONST.CORRECT_TIME_VALUE;
                    else
                        NewDelta = JINN_CONST.CORRECT_TIME_VALUE;
                }
            }
            else
            {
                NewDelta = 0;
            }
            var TestValue = Math.floor(global.DELTA_CURRENT_TIME + NewDelta);
            if(Math.abs(TestValue) > Math.abs(global.DELTA_CURRENT_TIME))
            {
                NewDelta = Math.floor(NewDelta / 2);
            }
        }
        
        if(Math.abs(global.DELTA_CURRENT_TIME) > JINN_CONST.INFLATION_TIME_VALUE)
        {
            if(global.DELTA_CURRENT_TIME > 0)
                NewDelta -= JINN_CONST.INFLATION_TIME_VALUE;
            else
                if(global.DELTA_CURRENT_TIME < 0)
                    NewDelta += JINN_CONST.INFLATION_TIME_VALUE;
        }
        else
            if(!NewDelta && Math.abs(global.DELTA_CURRENT_TIME) <= JINN_CONST.INFLATION_TIME_VALUE)
            {
                NewDelta =  - global.DELTA_CURRENT_TIME;
            }
        
        if(NewDelta && global.AUTO_CORRECT_TIME)
        {
            var Value = Math.floor(global.DELTA_CURRENT_TIME + NewDelta);
            ToLog("SET TIME DELTA: " + Value + " ms (" + NewDelta + ")", 4);
            Engine.SetTimeDelta(Value);
        }
        
        Engine.WasCorrectTime++;
    };
    
    Engine.CorrectTimeByArr = function (Arr)
    {
        
        var MinCount = JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME;
        if(!Engine.WasCorrectTime)
            MinCount = MinCount * 2;
        
        if(Arr.length < MinCount)
            return 0;
        var Sum = 0;
        for(var i = 0; i < Arr.length; i++)
            Sum += Arr[i];
        var AvgSum1 = Sum / Arr.length;
        Sum = 0;
        var Count = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Delta = AvgSum1 - Arr[i];
            Sum += Delta * Delta;
        }
        var AvgDisp = Sum / Arr.length;
        
        Sum = 0;
        var Count = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Delta = AvgSum1 - Arr[i];
            if(Delta * Delta < 3 * AvgDisp)
            {
                Sum += Arr[i];
                Count++;
            }
        }
        
        if(Count < MinCount / 2)
        {
            return 0;
        }
        
        var AvgSum2 = Sum / Count;
        Engine.CorrectTimeByDelta( - Math.floor(1000 * AvgSum2));
        return 1;
    };
    
    Engine.GetTimePowerArr = function (StartBlockNum)
    {
        var Arr = Engine.GetTimeStatArr(StartBlockNum);
        var Arr2 = [];
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            Arr2.push(Item.Power);
            Arr2.push(Item.BlockNum);
        }
        return Arr2;
    };
    
    Engine.GetTimeStatArr = function (StartBlockNum)
    {
        var Arr = [];
        var it = Engine.TreeTimeStat.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            if(Item.BlockNum < StartBlockNum)
                break;
            Arr.push(Item);
        }
        return Arr;
    };
    Engine.DoTimeCorrect = function (bReglament)
    {
        
        if(bReglament)
            Engine.ClearOldStatTree();
        
        if(Engine.TreeTimeStat.size < JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME * 2)
            return;
        
        var Arr = Engine.GetTimeStatArr(Engine.TimeCorrectStartNum);
        
        var ArrDelta = [];
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            if(Engine.MaxTimeItem.BlockNum === Item.BlockNum)
                continue;
            
            ArrDelta.push(Item.Delta);
        }
        
        Engine.LastArrDelta = ArrDelta;
        
        if(Arr.length)
            if(Engine.CorrectTimeByArr(ArrDelta))
            {
                Engine.TimeCorrectStartNum = Arr[0].BlockNum + 1;
            }
    };
    
    Engine.AddMaxHashToTimeStat = function (Item,BlockNum)
    {
        if(!global.FIRST_TIME_BLOCK)
            return;
        
        Engine.CalcHashMaxLider(Item, BlockNum);
        if(!Item.Power)
            return;
        var CurBlockNum = Engine.CurrentBlockNum;
        var Delta = CurBlockNum - BlockNum;
        if(Engine.WasCorrectTime && Math.abs(Delta) > MAX_STAT_BLOCKNUM_PERIOD)
            return;
        var DeltaTime = Date.now() - Engine.MaxTimeItem.StartTime;
        if(DeltaTime < 1000 && Engine.CompareMaxLider(Item, Engine.MaxTimeItem) <= 0)
            return;
        var ItemTree = Engine.TreeTimeStat.find(Item);
        if(ItemTree && Engine.CompareMaxLider(Item, ItemTree) <= 0)
            return;
        if(ItemTree)
            Engine.TreeTimeStat.remove(ItemTree);
        Engine.TreeTimeStat.insert(Item);
        
        Item.StartTime = Date.now();
        var BlockTimeCreate = CONSENSUS_PERIOD_TIME * JINN_CONST.STEP_NEW_BLOCK + JINN_CONST.DELTA_TIME_NEW_BLOCK;
        var BlockTimeNow = CONSENSUS_PERIOD_TIME + Item.StartTime - BlockNum * CONSENSUS_PERIOD_TIME - global.FIRST_TIME_BLOCK + global.DELTA_CURRENT_TIME;
        Item.Delta = (BlockTimeNow - BlockTimeCreate) / 1000;
        Engine.MaxTimeItem = Item;
        
        ToLog("BlockNum=" + BlockNum + " Power=" + Item.Power + " Time: " + BlockTimeNow + " - " + Delta + " = " + Item.Delta, 5);
    };
    
    Engine.ClearOldStatTree = function ()
    {
        if(!Engine.WasCorrectTime)
            return;
        
        var CurBlockNum = Engine.CurrentBlockNum;
        var OldBlockNum = CurBlockNum - OLD_STAT_BLOCKNUM_PERIOD;
        while(1)
        {
            var Item = Engine.TreeTimeStat.min();
            if(!Item || Item.BlockNum >= OldBlockNum)
                break;
            Engine.TreeTimeStat.remove(Item);
        }
    };
    
    Engine.GetTransferTime = function (Child)
    {
        var CurTime = 0;
        if(global.CURRENT_OS_IS_LINUX)
            CurTime = GetCurrentTime() % CLUSTER_TIME_PERIOD;
        return CurTime;
    };
    
    Engine.SetTransferTime = function (Child,NodeTime)
    {
        if(!Child.IsCluster || !global.CLUSTER_TIME_CORRECT || !NodeTime)
            return;
        
        if(typeof global.CLUSTER_TIME_CORRECT === "string" && global.CLUSTER_TIME_CORRECT !== Child.Name && global.CLUSTER_TIME_CORRECT !== Child.ip)
            return;
        
        var CurTime = GetCurrentTime() % CLUSTER_TIME_PERIOD;
        var Delta = NodeTime - CurTime;
        if(Math.abs(Delta) < CLUSTER_TIME_PERIOD / 2)
        {
            Engine.TimeMedian.AddStat(Delta);
            var AvgDelta = Engine.TimeMedian.GetStat();
            if(AvgDelta === undefined)
                return;
            
            if(Math.abs(AvgDelta) > 300)
            {
                ToLog("----- Node " + Child.Name + " set cluster time Delta=" + AvgDelta, 3);
                var Value = Math.floor(global.DELTA_CURRENT_TIME + AvgDelta);
                Engine.SetTimeDelta(Value);
                
                Engine.TimeMedian.Clear();
            }
        }
    };
}

function DoNode(Engine)
{
    if(Engine.Del)
        return;
    if(Engine.ROOT_NODE)
        return;
    
    if(Engine.LastCurBlockNumTime !== Engine.CurrentBlockNum)
    {
        Engine.LastCurBlockNumTime = Engine.CurrentBlockNum;
        Engine.DoTimeCorrect(1);
    }
}
