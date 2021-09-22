/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Distribution of new transactions between nodes (taking into account the cache of received and sent transactions)
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Tx"});

var glTxNum = 0;

//Engine context

function InitClass(Engine)
{
    Engine.ListArrTx = {};
    
    Engine.GetArrTx = function (BlockNum)
    {
        var Arr = Engine.ListArrTx[BlockNum];
        if(!Arr)
        {
            Arr = [];
            Engine.ListArrTx[BlockNum] = Arr;
        }
        return Arr;
    };
    Engine.AddCurrentProcessingTx = function (BlockNum,TxArr,bInnerAdd)
    {
        if(BlockNum < JINN_CONST.START_ADD_TX)
            return 0;
        
        var ArrTxAll = Engine.GetArrTx(BlockNum);
        var TreeTTAllPrev = Engine.GetTreeTicketAll(BlockNum - 1);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        var Count = 0;
        for(var t = 0; t < TxArr.length; t++)
        {
            var Tx = TxArr[t];
            if(!Engine.IsValidateTx(Tx, "AddCurrentProcessingTx", BlockNum))
                continue;
            if(TreeTTAllPrev.find(Tx))
                continue;
            
            var TxAdd = Engine.AddToTreeWithAll(TreeTTAll, Tx);
            if(TxAdd)
            {
                ArrTxAll.push(TxAdd);
                Engine.RunVTX(TxAdd, BlockNum, bInnerAdd);
                Count++;
            }
        }
        
        if(Count)
        {
            Engine.StepTaskTt[BlockNum] = 1;
            Engine.StepTaskTx[BlockNum] = 1;
            Engine.StepTaskMax[BlockNum] = 1;
        }
        
        return Count;
    };
    
    Engine.SendTx = function (BlockNum)
    {
        
        var ArrTop = Engine.GetTopTxArray(Engine.GetArrTx(BlockNum), BlockNum, 1);
        
        var CurTime = Date.now();
        
        var WasBreak = 0;
        var ArrChilds = Engine.GetTransferSession(BlockNum);
        for(var i = 0; i < ArrChilds.length; i++)
        {
            var ItemChild = ArrChilds[i];
            if(!ItemChild.Child)
            {
                continue;
            }
            
            var Level = ItemChild.Child.Level;
            
            let TxArr = [];
            for(var t = 0; t < ArrTop.length; t++)
            {
                
                var Tx = ArrTop[t];
                
                if(!Engine.IsValidateTx(Tx, "SendTx", BlockNum))
                    continue;
                
                if(GetBit(Tx.TXSend, Level))
                    continue;
                
                var DeltaTimeTT;
                if(Tx.TimeTTSend)
                    DeltaTimeTT = CurTime - Tx.TimeTTSend;
                else
                    DeltaTimeTT = 0;
                
                if(DeltaTimeTT < JINN_CONST.MIN_TIME_SEND_TT_PERIOD)
                {
                    WasBreak = 1;
                    continue;
                }
                
                if(JINN_CONST.TEST_MODE_2 && !GetBit(Tx.TTTXReceive, Level))
                    continue;
                
                if(GetBit(Tx.TTReceive, Level))
                {
                    if(DeltaTimeTT < JINN_CONST.MAX_TIME_SEND_TT_PERIOD)
                    {
                        WasBreak = 1;
                        continue;
                    }
                    
                    if(GetBit(Tx.TTTXSend, Level))
                        continue;
                    TxArr.push({HashTicket:Tx.HashTicket, body:[], TxHolder:Tx});
                    JINN_STAT.TTTXSend++;
                    Tx.TTTXSend = SetBit(Tx.TTTXSend, Level);
                }
                else
                {
                    TxArr.push({HashTicket:Tx.HashTicket, body:Tx.body});
                    JINN_STAT.TXSend++;
                    Tx.TXSend = SetBit(Tx.TXSend, Level);
                }
                
                ItemChild.TXSend++;
                if(JINN_CONST.MAX_TRANSFER_TX && TxArr.length >= JINN_CONST.MAX_TRANSFER_TX)
                {
                    WasBreak = 1;
                    break;
                }
            }
            
            if(!TxArr.length)
                continue;
            
            Engine.Send("TRANSFERTX", ItemChild.Child, {BlockNum:BlockNum, TxArr:TxArr}, OnTxResult);
            
            function OnTxResult(Child,Data)
            {
                if(Data && Data.ReqForLoad.length)
                {
                    var Level = Child.Level;
                    for(var i = 0; i < Data.ReqForLoad.length; i++)
                    {
                        var Num = Data.ReqForLoad[i];
                        var Tx = TxArr[Num];
                        if(Tx)
                        {
                            var Tx2 = Tx.TxHolder;
                            Tx2.TXSend = ResetBit(Tx2.TXSend, Level);
                            Tx2.TTTXSend = ResetBit(Tx2.TTTXSend, Level);
                            Tx2.TTReceive = ResetBit(Tx2.TTReceive, Level);
                            
                            JINN_STAT.TXReq++;
                        }
                    }
                    Engine.StepTaskTx[BlockNum] = 1;
                }
                TxArr.length = 0;
            };
        }
        
        if(!WasBreak)
            Engine.StepTaskTx[BlockNum] = 0;
    };
    
    Engine.TRANSFERTX_SEND = {Reserve:"uint", BlockNum:"uint32", TxArr:[{HashTicket:"arr" + JINN_CONST.TT_TICKET_HASH_LENGTH, body:"tr"}]};
    Engine.TRANSFERTX_RET = {result:"byte", ReqForLoad:["uint16"]};
    Engine.TRANSFERTX = function (Child,Data)
    {
        if(!Data)
            return;
        
        var Level = Child.Level;
        var TxArr = Data.TxArr;
        var BlockNum = Data.BlockNum;
        
        if(!Engine.CanProcessBlock(BlockNum, JINN_CONST.STEP_TX))
        {
            Child.ToError("TRANSFERTX : CanProcessBlock Error BlockNum=" + BlockNum, 4);
            return;
        }
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot())
        {
            JINN_STAT.ErrTx2++;
            return;
        }
        
        Engine.CheckSizeTransferTXArray(Child, TxArr, JINN_CONST.MAX_TRANSFER_TX);
        
        var ArrTxAll = Engine.GetArrTx(BlockNum);
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        
        var ReqForLoad = [];
        
        var ErrCount = 0;
        var CountNew = 0;
        for(var t = 0; t < TxArr.length; t++)
        {
            
            var ItemReceive = TxArr[t];
            var Tx;
            var Find = TreeTTAll.find(ItemReceive);
            
            if(Find && Find.ErrSign)
                continue;
            
            if(ItemReceive.body.length === 0)
            {
                JINN_STAT.TTTXReceive++;
                
                if(Find)
                {
                    Find.TTTXReceive = SetBit(Find.TTTXReceive, Level);
                }
                else
                {
                    JINN_STAT.TxReceiveErr++;
                }
                
                if(!Find || !Find.IsTx)
                    ReqForLoad.push(t);
                
                continue;
            }
            JINN_STAT.TxReceive++;
            JINN_STAT["TxReceive" + Level]++;
            
            if(Find)
            {
                if(Find.IsTx)
                    Tx = Find;
                else
                {
                    Tx = Engine.GetTxFromReceiveBody(Child, Find, ItemReceive.body, BlockNum, 1);
                    if(!Tx)
                        continue;
                    
                    ArrTxAll.push(Tx);
                    Engine.RunVTX(Tx, BlockNum);
                }
            }
            else
            {
                Tx = Engine.GetTx(ItemReceive.body, BlockNum, undefined, 1);
                Tx.FromLevel = Level;
                Tx.FromChildID = Child.ID;
                
                var TxAdd = Engine.AddToTreeWithAll(TreeTTAll, Tx);
                if(TxAdd)
                {
                    ArrTxAll.push(TxAdd);
                    Engine.RunVTX(TxAdd, BlockNum);
                }
            }
            
            if(!Engine.IsValidateTx(Tx, "TRANSFERTX", BlockNum))
                continue;
            Tx.TXReceive = SetBit(Tx.TXReceive, Level);
            
            CountNew++;
        }
        
        if(CountNew)
        {
            Engine.StepTaskTt[BlockNum] = 1;
            Engine.StepTaskTx[BlockNum] = 1;
            Engine.StepTaskMax[BlockNum] = 1;
        }
        
        return {result:1, ReqForLoad:ReqForLoad};
    };
    
    Engine.GetTxFromReceiveBody = function (Child,Tx,body,BlockNum,NumTx)
    {
        var TxRaw;
        
        TxRaw = Engine.GetTx(body, BlockNum, undefined, NumTx);
        if(!Engine.IsValidateTx(TxRaw, "GetTxFromReceiveBody", BlockNum))
            return undefined;
        if(!IsEqArr(Tx.HashTicket, TxRaw.HashTicket))
        {
            Child.ToError("Error tx KEY: " + Tx.KEY + " / " + TxRaw.KEY + "  BlockNum=" + BlockNum, 3);
            return undefined;
        }
        
        Engine.DoTxFromTicket(Tx, TxRaw);
        return Tx;
    };
    
    Engine.RunVTX = function (Tx,BlockNum,bInner)
    {
    };
    
    Engine.CreateTx = function (Params)
    {
        glTxNum++;
        
        var body = [0];
        WriteUintToArr(body, Engine.ID);
        WriteUintToArr(body, glTxNum);
        WriteUintToArr(body, Engine.TickNum);
        for(var i = 0; i < 100; i++)
            body[body.length] = random(255);
        WriteUintToArr(body, Params.BlockNum);
        var Tx = Engine.GetTx(body, Params.BlockNum, undefined, 9);
        
        return Tx;
    };
}

global.CheckTx = function (StrCheckName,Tx,BlockNum,bLog)
{
    if(!Tx || !Tx.HASH)
    {
        if(global.JINN_WARNING >= 2)
        {
            var Str = StrCheckName + " BlockNum=" + BlockNum + " TX=" + JSON.stringify(Tx);
            if(bLog)
                ToLog(Str);
            else
                ToLogTrace(Str);
        }
        
        return 0;
    }
    return 1;
}

