/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 * Preliminary identification (calculation) of erroneous transactions
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Tx-err"});

//Engine context

function InitClass(Engine)
{
    Engine.ListArrErrTx = {};
    
    Engine.GetArrErrTx = function (BlockNum)
    {
        var Arr = Engine.ListArrErrTx[BlockNum];
        if(!Arr)
        {
            Arr = [];
            Engine.ListArrErrTx[BlockNum] = Arr;
        }
        return Arr;
    };
    Engine.AddToErr = function (Tree,ArrErr,ItemReceive)
    {
        var Tx = Tree.find(ItemReceive);
        if(Tx && !Tx.ErrSign)
        {
            Tx.ErrSign = 1;
            ArrErr.push(Tx);
        }
    };
    
    Engine.DoCheckErrTx = function (Tx,BlockNum,TreeTTAll,ArrErr)
    {
        if(JINN_CONST.TX_CHECK_OPERATION_ID)
            Engine.DoCheckTxOperationID(Tx, BlockNum, TreeTTAll, ArrErr);
        if(JINN_CONST.TX_CHECK_SIGN_ON_TRANSFER)
            Engine.DoCheckTxSign(Tx, BlockNum, TreeTTAll, ArrErr);
    };
    
    Engine.DoCheckTxOperationID = function (Tx,BlockNum)
    {
        if(Tx.OperationIDForNum === Engine.CurrentBlockNum)
            return;
        Tx.OperationIDForNum = Engine.CurrentBlockNum;
        Tx.ErrOperationID = 0;
        
        if(Tx.SenderNum === undefined)
            Tx.SenderNum = Engine.GetTxSenderNum(Tx, BlockNum);
        
        if(Tx.OperationID === undefined)
            Tx.OperationID = Engine.GetTxSenderOperationID(Tx, BlockNum);
        
        var AccountOperationID = Engine.GetAccountOperationID(Tx.SenderNum, BlockNum);
        
        if(AccountOperationID > Tx.OperationID)
        {
            Tx.ErrOperationID = 1;
        }
    };
    
    Engine.DoCheckTxSign = function (Tx,BlockNum,TreeTTAll,ArrErr)
    {
        
        if(Tx.ErrSign !== undefined)
            return;
        Tx.ErrSign = 0;
        
        if(Tx.SenderNum === undefined)
            Tx.SenderNum = Engine.GetTxSenderNum(Tx, BlockNum);
        
        if(Tx.SenderNum)
        {
            var SintTx = Engine.CheckSignTx(Tx, BlockNum);
            if(!SintTx)
            {
                if(TreeTTAll)
                    Engine.AddToErr(TreeTTAll, ArrErr, Tx);
                
                Tx.ErrSign = 1;
            }
        }
    };
}
