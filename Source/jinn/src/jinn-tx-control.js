/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Control the number and size of transactions
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"TxControl"});

//Engine context

function InitClass(Engine)
{
    
    Engine.GetTopTxArray = function (Arr,BlockNum)
    {
        if(JINN_CONST.TEST_MODE_1)
            return Arr;
        
        if(Engine.PrepareLastStatFromDB())
        {
            Engine.SortArrPriority(Arr, BlockNum);
        }
        
        return Arr;
    };
    
    Engine.GetArrayFromTree = function (Tree)
    {
        if(!Tree)
            return [];
        var arr = [];
        var it = Tree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            arr.push(Item);
        }
        return arr;
    };
    Engine.FilterAndCheckSizeBlockTXArray = function (Block)
    {
        var Arr = [];
        for(var i = 0; i < Block.TxData.length; i++)
        {
            var Item = Block.TxData[i];
            var body = Item.body;
            if(body && body.length > 0)
            {
                var Type = body[0];
                if(!Engine.IsVirtualTypeTx(Type))
                    Arr.push(Item);
            }
        }
        
        if(Arr.length > JINN_CONST.MAX_TRANSACTION_COUNT)
            Arr.length = JINN_CONST.MAX_TRANSACTION_COUNT;
        
        var BufLength = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            BufLength += Item.body.length;
            if(BufLength > JINN_CONST.MAX_BLOCK_SIZE)
            {
                Arr.length = i + 1;
                break;
            }
        }
        
        Block.TxData = Arr;
    };
    Engine.CheckSizeTransferTXArray = function (Child,Arr,MaxSize)
    {
        
        if(MaxSize && Arr.length > MaxSize)
        {
            Child.ToError("Error TT/TX Arr length = " + Arr.length, 3);
            Arr.length = MaxSize;
        }
    };
    Engine.IsValidateTx = function (Tx,StrCheckName,BlockNum,IsBlockTx)
    {
        
        if(!Tx || !Tx.IsTx || !Tx.body || Tx.body.length < 8 || Tx.body.length > JINN_CONST.MAX_TX_SIZE)
            return 0;
        var Result = CheckTx(StrCheckName, Tx, BlockNum, 1);
        if(!Result)
            JINN_STAT.NoValidateTx++;
        
        return Engine.IsValidateTxNext(Tx, StrCheckName, BlockNum, IsBlockTx);
    };
    
    Engine.IsValidateTxNext = function (Tx,StrCheckName,BlockNum,IsBlockTx)
    {
        return 1;
    };
    
    Engine.IsVirtualTypeTx = function (Type)
    {
        return 0;
    };
}
