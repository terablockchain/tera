/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Asynchronous startup of the processing unit according to the timings
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, DoNodeFirst:DoNodeFirst, Name:"Timing"});

const MAX_STAT_BLOCKNUM_PERIOD = 10;
const OLD_STAT_BLOCKNUM_PERIOD = 1000;

//Engine context
function InitClass(Engine)
{
    
    Engine.WasCorrectTime = 0;
    Engine.TimeCorrectStartNum = 0;
    Engine.StepTaskTt = {};
    Engine.StepTaskTx = {};
    Engine.StepTaskMax = {};
    
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
    
    Engine.GetCurrentBlockNumByTime = function ()
    {
        return Engine.CurrentBlockNum;
    };
    
    Engine.ClearListToNum = function (Map,ToOldBlockNum)
    {
        for(var Key in Map)
        {
            var BlockNum =  + Key;
            if(BlockNum <= ToOldBlockNum)
                delete Map[Key];
        }
    };
}

global.BlockStatCount = 10;
global.BlockStatCountTime = 10;

function DoNodeFirst(Engine)
{
    
    Engine.CurrentBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
}

function DoNode(Engine)
{
    if(Engine.Del)
        return;
    if(Engine.ROOT_NODE)
        return;
    
    var CurBlockNum = Engine.CurrentBlockNum;
    
    Engine.DoSaveMain();
    
    if(Engine.LastCurBlockNum !== CurBlockNum)
    {
        
        if(Engine.DoOnStartBlock)
            Engine.DoOnStartBlock();
        
        Engine.InitTransferSession(CurBlockNum);
        
        Engine.LastCurBlockNum = CurBlockNum;
        
        Engine.DoTimeCorrect(1);
        Engine.ClearListToNum(Engine.StepTaskTt, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
        Engine.ClearListToNum(Engine.StepTaskTx, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
        Engine.ClearListToNum(Engine.StepTaskMax, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
        
        Engine.ClearListToNum(Engine.MiningBlockArr, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
    }
    var CurBlockNum3 = JINN_EXTERN.GetCurrentBlockNumByTime( - JINN_CONST.DELTA_TIME_NEW_BLOCK);
    if(Engine.LastNewBlockCreate !== CurBlockNum3)
    {
        Engine.LastNewBlockCreate = CurBlockNum3;
        Engine.DoCreateNewBlock(1);
    }
    
    if(JINN_CONST.TEST_DELTA_TIMING_HASH)
        for(var Delta = 0; Delta < JINN_CONST.TEST_DELTA_TIMING_HASH; Delta++)
        {
            if(JINN_CONST.TEST_DIV_TIMING_HASH <= 1 || Engine.TickNum % JINN_CONST.TEST_DIV_TIMING_HASH === 0)
                Engine.StepTaskMax[CurBlockNum - JINN_CONST.STEP_NEW_BLOCK - Delta] = 2;
        }
    
    for(var BlockNum = CurBlockNum - JINN_CONST.STEP_LAST - JINN_CONST.MAX_DELTA_PROCESSING; BlockNum <= CurBlockNum; BlockNum++)
    {
        var Delta = CurBlockNum - BlockNum;
        
        if(Delta >= JINN_CONST.STEP_TICKET)
            if(Engine.StepTaskTt[BlockNum])
            {
                Engine.SendTicket(BlockNum);
            }
        
        if(Delta >= JINN_CONST.STEP_TX)
            if(Engine.StepTaskTx[BlockNum])
            {
                Engine.SendTx(BlockNum);
            }
        
        if(Delta >= JINN_CONST.STEP_NEW_BLOCK - JINN_CONST.TEST_NDELTA_TIMING_HASH)
            if(Engine.StepTaskMax[BlockNum])
            {
                Engine.StartSendMaxHash(BlockNum);
                Engine.StepTaskMax[BlockNum] = 0;
            }
    }
}
