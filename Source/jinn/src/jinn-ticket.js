/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Reduction of the traffic of transactions through the use of tickets - short hash from the transaction
 * Algorithm:
 * First phase of dispatch of the tickets, then the phase of the transaction
 * Sending tickets by condition:
 * 1) Haven't sent yet
 * 2) And either did not receive, or received but it was not a new ticket
 * When you receive a ticket, set the special. flag:
 * - NEW_TIKET when it is a new ticket for us (i.e. did not receive from other nodes)
 * - OLD_TICKET-already in the ticket array
 * Transactions are sent only when the value of the ticket flag is not equal to OLD_TICKET (i.e. sent when the value is empty or equal to NEW_TIKET)
 *
**/
global.DEBUG_KEY = "";

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Ticket"});

global.glUseTicket = 1;

global.NEW_TIKET = "NEW";
global.OLD_TICKET = "OLD";

//Engine context

function InitClass(Engine)
{
    Engine.ListTreeTicketAll = {};
    Engine.ListArrTicket = {};
    
    Engine.GetArrTicket = function (BlockNum)
    {
        var Arr = Engine.ListArrTicket[BlockNum];
        if(!Arr)
        {
            Arr = [];
            Engine.ListArrTicket[BlockNum] = Arr;
        }
        return Arr;
    };
    
    Engine.GetTreeTicketAll = function (BlockNum)
    {
        var Tree = Engine.ListTreeTicketAll[BlockNum];
        if(!Tree)
        {
            Tree = new RBTree(function (a,b)
            {
                return CompareArr(a.HashTicket, b.HashTicket);
            });
            Engine.ListTreeTicketAll[BlockNum] = Tree;
        }
        return Tree;
    };
    
    Engine.InitItemTT = function (Item)
    {
        Item.TTSend = 0;
        Item.TTReceive = 0;
        
        Item.TXSend = 0;
        Item.TXReceive = 0;
        Item.TTTXReceive = 0;
        
        Item.TimeTTSend = 0;
    };
    
    Engine.AddToTreeWithAll = function (Tree,Item)
    {
        
        var Find = Tree.find(Item);
        if(Find)
        {
            if(Item.IsTx && !Find.IsTx)
            {
                Engine.DoTxFromTicket(Find, Item);
                
                return Find;
            }
            
            return 0;
        }
        Tree.insert(Item);
        Engine.InitItemTT(Item);
        
        return Item;
    };
    
    Engine.SendTicket = function (BlockNum)
    {
        if(!glUseTicket)
            return;
        
        var ArrTop = Engine.GetArrayFromTree(Engine.GetTreeTicketAll(BlockNum));
        
        var CurTime = Date.now();
        
        var Count = 0;
        var ArrChilds = Engine.GetTransferSession(BlockNum);
        var WasBreak = 0;
        for(var i = 0; i < ArrChilds.length; i++)
        {
            var ItemChild = ArrChilds[i];
            if(!ItemChild.Child)
            {
                continue;
            }
            
            var Level = ItemChild.Child.Level;
            var TTArr = [];
            var ReqArr = [];
            var ChildCount = 0;
            for(var t = 0; t < ArrTop.length; t++)
            {
                var Tt = ArrTop[t];
                
                if(!Tt.TimeTTSend)
                    Tt.TimeTTSend = CurTime;
                
                if(GetBit(Tt.TTSend, Level))
                {
                    continue;
                }
                
                if(Tt.FromLevel === Level)
                    ReqArr.push(Tt);
                else
                    TTArr.push(Tt);
                Tt.TTSend = SetBit(Tt.TTSend, Level);
                
                JINN_STAT.TTSend++;
                JINN_STAT["TtSend" + Level]++;
                
                Count++;
                ChildCount++;
                
                if(JINN_CONST.MAX_TRANSFER_TT && ChildCount >= JINN_CONST.MAX_TRANSFER_TT)
                {
                    WasBreak = 1;
                    break;
                }
            }
            
            if(!ChildCount)
                continue;
            
            Engine.Send("TRANSFERTT", ItemChild.Child, {BlockNum:BlockNum, TtArr:TTArr, ReqArr:ReqArr});
        }
        
        WasBreak = 1;
        if(!WasBreak)
            Engine.StepTaskTt[BlockNum] = 0;
        
        return Count;
    };
    
    Engine.TRANSFERTT_SEND = {BlockNum:"uint32", TtArr:[{HashTicket:"arr" + JINN_CONST.TT_TICKET_HASH_LENGTH}], ReqArr:[{HashTicket:"arr" + JINN_CONST.TT_TICKET_HASH_LENGTH}]};
    Engine.TRANSFERTT = function (Child,Data)
    {
        if(!Data)
            return;
        
        var BlockNum = Data.BlockNum;
        var ItemChild = Engine.FindTransferSessionByChild(Child, BlockNum);
        if(!ItemChild)
        {
            Child.ToError("TRANSFERTT : Error FindTransferSessionByChild BlockNum=" + BlockNum, 4);
            return {result:0};
        }
        
        if(!Engine.CanProcessBlock(BlockNum, JINN_CONST.STEP_TICKET))
        {
            Child.ToError("TRANSFERTT : CanProcessBlock Error BlockNum=" + BlockNum, 4);
            return {result:0};
        }
        
        Engine.CheckHotConnection(Child);
        if(!Child || !Child.IsHot())
        {
            JINN_STAT.ErrTt2++;
            return {result:0};
        }
        
        var TreeTTAll = Engine.GetTreeTicketAll(BlockNum);
        
        var TTArr = Data.TtArr;
        var ReqArr = Data.ReqArr;
        Engine.CheckSizeTransferTXArray(Child, TTArr, JINN_CONST.MAX_TRANSFER_TT);
        Engine.CheckSizeTransferTXArray(Child, ReqArr, JINN_CONST.MAX_TRANSFER_TT);
        
        var Level = Child.Level;
        
        var CountNew = 0;
        for(var t = 0; t < TTArr.length; t++)
        {
            JINN_STAT.TtReceive++;
            JINN_STAT["TtReceive" + Level]++;
            
            var ItemReceive = TTArr[t];
            var Tt = TreeTTAll.find(ItemReceive);
            if(!Tt)
            {
                CountNew++;
                Tt = Engine.GetTicket(ItemReceive.HashTicket);
                
                Tt.FromLevel = Level;
                
                var Key = GetHexFromArr(ItemReceive.HashTicket);
                
                var TxAdd = Engine.AddToTreeWithAll(TreeTTAll, Tt);
            }
            
            if(GetBit(Tt.TTReceive, Level))
                continue;
            Tt.TTReceive = SetBit(Tt.TTReceive, Level);
        }
        
        for(var t = 0; t < ReqArr.length; t++)
        {
            JINN_STAT.TTTXReceive++;
            JINN_STAT["TtReceive" + Level]++;
            
            var ItemReceive = ReqArr[t];
            var Tt = TreeTTAll.find(ItemReceive);
            if(!Tt)
            {
                Tt = Engine.GetTicket(ItemReceive.HashTicket);
                Child.ToError("Not find item = " + Tt.KEY);
                continue;
            }
            
            if(GetBit(Tt.TTTXReceive, Level))
                continue;
            Tt.TTTXReceive = SetBit(Tt.TTTXReceive, Level);
        }
        
        if(CountNew)
        {
            Engine.StepTaskTt[BlockNum] = 1;
        }
    };
}
