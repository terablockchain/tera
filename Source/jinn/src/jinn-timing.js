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

const OLD_STAT_BLOCKNUM_PERIOD = 1000;

//Engine context
function InitClass(Engine)
{
    
    Engine.WasCorrectTime = 0;
    Engine.StatArray = [];
    Engine.StepTaskTt = {};
    Engine.StepTaskTx = {};
    Engine.StepTaskMax = {};
    
    Engine.TreeTimeStat = new RBTree(function (a,b)
    {
        if(a.BlockNum !== b.BlockNum)
            return a.BlockNum - b.BlockNum;
        if(a.Power !== b.Power)
            return b.Power - a.Power;
        return CompareArr(b.Hash, a.Hash);
    });
    
    Engine.MaxStatItem = {};
    
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
        
        if(Engine.WasCorrectTime >= 2)
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
            if(!NewDelta)
            {
                NewDelta =  - global.DELTA_CURRENT_TIME;
            }
        
        if(NewDelta && global.AUTO_CORRECT_TIME)
        {
            var Value = Math.floor(global.DELTA_CURRENT_TIME + NewDelta);
            ToLog("SET TIME DELTA: " + Value + " ms (" + NewDelta + ")", 4);
            Engine.SetTimeDelta(Value);
        }
        Engine.StatArray = [];
        Engine.WasCorrectTime++;
    };
    
    Engine.CorrectTimeByArr = function (Arr)
    {
        
        var MinCount = JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME;
        if(!Engine.WasCorrectTime)
            MinCount = MinCount * 2;
        
        if(Arr.length < MinCount)
            return;
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
            Engine.StatArray = [];
            return;
        }
        
        var AvgSum2 = Sum / Count;
        Engine.CorrectTimeByDelta( - Math.floor(1000 * AvgSum2));
    };
    
    Engine.GetTimeStatArr = function (StartBlockNum)
    {
        var Arr = [];
        var find = {BlockNum:StartBlockNum - 1, Power:100, Hash:ZERO_ARR_32};
        var it = Engine.TreeTimeStat.lowerBound(find);
        
        var PrevBlockNum = 0;
        while(it)
        {
            
            it.next();
            var item = it.data();
            if(!item)
                break;
            
            if(PrevBlockNum === item.BlockNum)
                continue;
            
            PrevBlockNum = item.BlockNum;
            
            Arr.push(item.Power);
            Arr.push(item.BlockNum);
        }
        
        return Arr;
    };
    Engine.DoTimeCorrect = function (bReglament)
    {
        
        if(bReglament)
            Engine.ClearOldStatTree();
        
        var MaxItem = Engine.MaxStatItem;
        if(!MaxItem.BlockNum || IsEqArr(MaxItem.Hash, MAX_ARR_32))
            return;
        
        MaxItem.DeltaStart = Date.now() - MaxItem.StartTime;
        if(!bReglament && MaxItem.DeltaStart < 2000)
            return;
        
        if(Engine.TreeTimeStat.find(MaxItem))
        {
            Engine.InitMaxStatItem();
            return;
        }
        
        Engine.TreeTimeStat.insert({BlockNum:MaxItem.BlockNum, Power:MaxItem.Power, Hash:MaxItem.Hash});
        
        JINN_STAT.DeltaTime = MaxItem.Delta;
        
        var Delta = MaxItem.Delta;
        Engine.StatArray.push(Delta);
        Engine.InitMaxStatItem();
        
        Engine.CorrectTimeByArr(Engine.StatArray);
    };
    
    Engine.InitMaxStatItem = function ()
    {
        Engine.MaxStatItem = {};
        Engine.MaxStatItem.Power = 0;
        Engine.MaxStatItem.StartTime = 0;
        Engine.MaxStatItem.Hash = MAX_ARR_32;
        Engine.MaxStatItem.PowHash = MAX_ARR_32;
    };
    
    Engine.AddMaxHashToTimeStat = function (Item,BlockNum)
    {
        if(!global.FIRST_TIME_BLOCK)
            return;
        
        if(Engine.TreeTimeStat.find(Item))
            return;
        
        var CurBlockNum = Engine.CurrentBlockNum;
        var Delta = CurBlockNum - BlockNum;
        if(Engine.WasCorrectTime && Math.abs(Delta) > OLD_STAT_BLOCKNUM_PERIOD)
            return;
        var MaxItem = Engine.MaxStatItem;
        Engine.CalcHashMaxLider(Item, BlockNum);
        
        if(Item.Power && MaxItem.Hash && !IsEqArr(Item.Hash, MaxItem.Hash) && Engine.CompareMaxLider(Item, MaxItem) > 0)
        {
            
            var BlockTimeCreate = CONSENSUS_PERIOD_TIME * JINN_CONST.STEP_NEW_BLOCK + JINN_CONST.DELTA_TIME_NEW_BLOCK;
            var BlockTimeNow = CONSENSUS_PERIOD_TIME + Date.now() - BlockNum * CONSENSUS_PERIOD_TIME - global.FIRST_TIME_BLOCK + global.DELTA_CURRENT_TIME;
            
            MaxItem.Delta = (BlockTimeNow - BlockTimeCreate) / 1000;
            MaxItem.StartTime = Date.now();
            MaxItem.BlockNum = BlockNum;
            MaxItem.Power = Item.Power;
            MaxItem.MinerHash = Item.MinerHash;
            MaxItem.Hash = Item.Hash;
            MaxItem.PowHash = Item.PowHash;
            MaxItem.CurBlockNum = CurBlockNum;
            
            ToLog("BlockNum=" + BlockNum + " Power=" + Item.Power + " Time: " + BlockTimeNow + " - " + Delta + " = " + MaxItem.Delta + "  BlockTimeCreate=" + BlockTimeCreate,
            5);
        }
        
        Engine.DoTimeCorrect();
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
    Engine.InitMaxStatItem();
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
    Engine.DoSaveMainWithContinues();
    
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
    }
    var CurBlockNum3 = JINN_EXTERN.GetCurrentBlockNumByTime( - JINN_CONST.DELTA_TIME_NEW_BLOCK);
    if(Engine.LastNewBlockCreate !== CurBlockNum3)
    {
        Engine.LastNewBlockCreate = CurBlockNum3;
        Engine.DoCreateNewBlock();
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
        
        Engine.AfterMiningDoBlockArr(BlockNum);
        
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
    Engine.InitMiningBlockArr();
}
