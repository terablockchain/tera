/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Asynchronous startup of the processing unit according to the timings
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, DoNodeFirst:DoNodeFirst, Name:"Timing"});

//Engine context
function InitClass(Engine)
{
    Engine.StepTaskTt = {};
    Engine.StepTaskTx = {};
    Engine.StepTaskMax = {};
    
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
    
    Engine.PrepareSystemTx = function ()
    {
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
    
    Engine.PrepareSystemTx();
    
    Engine.DoSaveMain();
    
    if(Engine.LastCurBlockNum !== CurBlockNum)
    {
        
        if(Engine.DoOnStartBlock)
            Engine.DoOnStartBlock();
        
        Engine.InitTransferSession(CurBlockNum);
        
        Engine.LastCurBlockNum = CurBlockNum;
        Engine.ClearListToNum(Engine.StepTaskTt, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
        Engine.ClearListToNum(Engine.StepTaskTx, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
        Engine.ClearListToNum(Engine.StepTaskMax, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
        
        Engine.ClearListToNum(Engine.MiningBlockArr, CurBlockNum - JINN_CONST.STEP_CLEAR_MEM);
    }
    
    Engine.DoResend();
    
    Engine.DoCreateNewBlock();
    
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
