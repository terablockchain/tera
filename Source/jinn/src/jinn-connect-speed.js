/*
 * @project: JINN
 * @version: 1.1
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2021 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Checking the node speed
 *
**/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Speed"});

global.BEST_TEST_TIME = 50;

//Engine context

const TEST_TRANSFER_LENGTH = 100;

function InitClass(Engine)
{
    Engine.RandomTransferArr = GetRandomBytes(TEST_TRANSFER_LENGTH);
    Engine.StartSpeedTransfer = function (Child)
    {
        
        Child.ToLogNet("StartSpeed");
        
        var Data = {Arr:Engine.RandomTransferArr, };
        
        Engine.Send("SPEED", Child, Data, function (Child,Data)
        {
            if(!Data)
                return;
            if(Data.result !== TEST_TRANSFER_LENGTH)
            {
                Child.ToLogNet("Result Speed error Data.result=" + Data.result);
                return;
            }
            var Item = Child.AddrItem;
            if(Item)
            {
                
                Item.TestExchangeTime = global.BEST_TEST_TIME - Math.floor(Child.RetDeltaTime / 100);
                if(Item.TestExchangeTime < 0)
                    Item.TestExchangeTime = 0;
                
                Child.ToLogNet("Speed OK, Result = " + Item.TestExchangeTime);
            }
        });
    };
    
    Engine.SPEED_SEND = {Arr:["byte"]};
    Engine.SPEED_RET = {result:"uint"};
    
    Engine.SPEED = function (Child,Data)
    {
        if(!Data)
            return;
        
        Child.ToLogNet("SPEED OK");
        
        var Ret = {result:Data.Arr.length};
        return Ret;
    };
}
