/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Control of transactions received and recorded in the DB (similar to the MemPool function)
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"TxResend"});

//Engine context

function InitClass(Engine)
{
    Engine.ResendBlockNum = 0;
    
    Engine.DoResend = function ()
    {
        
        if(!JINN_CONST.COUNT_RESEND)
            return;
        if(Engine.GetMaxNumBlockDB() < Engine.CurrentBlockNum - JINN_CONST.STEP_CLEAR_MEM * 2)
            return;
        
        var StartNum = Engine.CurrentBlockNum - JINN_CONST.STEP_CLEAR_MEM;
        var FinishNum = Engine.CurrentBlockNum - JINN_CONST.STEP_RESEND;
        if(Engine.ResendBlockNum > StartNum)
            StartNum = Engine.ResendBlockNum;
        
        var MaxNumDB = Engine.GetMaxNumBlockDB();
        if(MaxNumDB < FinishNum)
            FinishNum = MaxNumDB;
        
        var TreeDB = new RBTree(function (a,b)
        {
            return CompareArr(a.HASH, b.HASH);
        });
        
        for(var BlockNum = StartNum; BlockNum <= FinishNum; BlockNum++)
        {
            var Block = Engine.GetBlockDB(BlockNum);
            if(!Block)
            {
                FinishNum = BlockNum - 1;
                break;
            }
            
            for(var t = 0; Block.TxCount && t < Block.TxData.length; t++)
            {
                var Tx = Block.TxData[t];
                if(Engine.IsVirtualTypeTx(Tx.body[0]))
                    continue;
                
                if(!TreeDB.find(Tx))
                    TreeDB.insert(Tx);
            }
            
            Engine.ResendBlockNum = BlockNum + 1;
        }
        for(var BlockNum = FinishNum + 1; BlockNum <= Engine.CurrentBlockNum; BlockNum++)
        {
            var Arr = Engine.GetArrTx(BlockNum);
            for(var t = 0; t < Arr.length; t++)
            {
                var Tx = Arr[t];
                if(Engine.IsVirtualTypeTx(Tx.body[0]))
                    continue;
                
                if(!TreeDB.find(Tx))
                    TreeDB.insert(Tx);
            }
        }
        var ResendArr = [];
        for(var BlockNum = StartNum; BlockNum <= FinishNum; BlockNum++)
        {
            var Arr = Engine.GetArrTx(BlockNum);
            for(var t = 0; t < Arr.length; t++)
            {
                var Tx = Arr[t];
                if(Engine.IsVirtualTypeTx(Tx.body[0]))
                    continue;
                
                if(!TreeDB.find(Tx))
                {
                    if(Tx.ResendCount === undefined)
                        Tx.ResendCount = 0;
                    Tx.ResendCount++;
                    
                    if(Tx.ResendCount <= JINN_CONST.COUNT_RESEND)
                        ResendArr.push(Tx);
                }
            }
        }
        
        if(ResendArr.length)
        {
            Engine.AddCurrentProcessingTx(Engine.CurrentBlockNum, ResendArr);
        }
        
        TreeDB.clear();
    };
}
