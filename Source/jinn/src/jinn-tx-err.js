/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 * The characteristic propagation of errors in the transactions between the nodes (distributed calculation of the validity of the transaction)
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
    
    Engine.SendErrTx = function (BlockNum)
    {
        return;
        
        var ArrErr = Engine.GetArrErrTx(BlockNum);
        
        var WasBreak = 0;
        var ArrChilds = Engine.GetTransferSession(BlockNum);
        for(var i = 0; i < ArrChilds.length; i++)
        {
            var ItemChild = ArrChilds[i];
            if(!ItemChild.Child)
                continue;
            
            var Level = ItemChild.Child.Level;
            
            var TxArr = [];
            for(var t = 0; t < ArrErr.length; t++)
            {
                var Tx = ArrErr[t];
                
                if(!Engine.IsValidateTx(Tx, "SendErrTx", BlockNum))
                    continue;
                if(GetBit(Tx.ErrTXSend, Level))
                    continue;
                Tx.ErrTXSend = SetBit(Tx.ErrTXSend, Level);
                TxArr.push(Tx);
                
                JINN_STAT.ErrTxSend++;
                
                if(JINN_CONST.MAX_TRANSFER_TX && TxArr.length >= JINN_CONST.MAX_TRANSFER_TX)
                {
                    WasBreak = 1;
                    break;
                }
            }
            
            if(!TxArr.length)
                continue;
            
            Engine.Send("ERRTX", ItemChild.Child, {BlockNum:BlockNum, TxArr:TxArr});
        }
        
        if(!WasBreak)
            Engine.StepTaskTx[BlockNum] = 0;
    };
    Engine.ERRTX_SEND = {BlockNum:"uint32", Reserve:"uint", TxArr:[{HashTicket:"arr" + JINN_CONST.TX_TICKET_HASH_LENGTH}]};
    
    Engine.ERRTX = function (Child,Data)
    {
        if(!Data)
            return;
        return;
        
        var BlockNum = Data.BlockNum;
        var TxArr = Data.TxArr;
        
        if(!Engine.CanProcessBlock(BlockNum, JINN_CONST.STEP_TX))
        {
            Child.ToError("ERRTX : CanProcessBlock Error BlockNum=" + BlockNum, 4);
            return;
        }
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot())
        {
            return;
        }
        
        Engine.CheckSizeTransferTXArray(Child, TxArr, JINN_CONST.MAX_TRANSFER_TX);
        
        var ArrErr = Engine.GetArrErrTx(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        for(var i = 0; i < TxArr.length; i++)
        {
            
            var ItemReceive = TxArr[i];
            Engine.AddToErr(TreeTTAll, ArrErr, ItemReceive);
        }
        
        Engine.StepTaskTx[BlockNum] = 1;
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
