/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

"use strict";

switch(global.MODE_RUN)
{
    case "FORK":
        
        if(global.FORK_MODE || global.LOCAL_RUN === 1)
            global.RESYNC_CONDITION = 0;
        global.REST_BLOCK_SCALE = 100;
        global.PERIOD_ACCOUNT_HASH = 10;
        global.START_BLOCK_ACCOUNT_HASH = 1;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_MINING = 60;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 10;
        
        global.TEST_TRANSACTION_GENERATE = 0;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.ALL_VIEW_ROWS = 1;
        
        global.NEW_SIGN_TIME = 0;
        
        global.START_BAD_ACCOUNT_CONTROL = 0;
        global.BLOCKNUM_TICKET_ALGO = 0;
        global.MIN_POWER_POW_TR = 0;
        
        global.CHECK_GLOBAL_TIME = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.UPDATE_CODE_5 = 0;
        global.UPDATE_CODE_6 = 0;
        global.UPDATE_CODE_7 = 0;
        global.EXPERIMENTAL_CODE = 0;
        
        break;
        
    case "TEST_JINN":
        global.JINN_MODE = 1;
        global.NETWORK = "TEST-JINN";
        global.TEST_JINN = 1;
        
        global.START_NETWORK_DATE = 1593818071532;
        global.CONSENSUS_PERIOD_TIME = 3000;
        
        global.RESYNC_CONDITION = 0;
        global.REST_BLOCK_SCALE = 100;
        global.PERIOD_ACCOUNT_HASH = 10;
        global.START_BLOCK_ACCOUNT_HASH = 0;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_MINING = 30;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 10;
        
        global.TEST_TRANSACTION_GENERATE = 0;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3 * 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.ALL_VIEW_ROWS = 0;
        
        global.NEW_SIGN_TIME = 0;
        
        global.START_BAD_ACCOUNT_CONTROL = 500000;
        global.BLOCKNUM_TICKET_ALGO = 0;
        global.MIN_POWER_POW_TR = 0;
        
        global.CHECK_GLOBAL_TIME = 0;
        
        global.UPDATE_CODE_JINN = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.UPDATE_CODE_5 = 0;
        global.UPDATE_CODE_6 = 0;
        global.UPDATE_CODE_7 = 0;
        global.UPDATE_CODE_NEW_ACCHASH = 1;
        global.EXPERIMENTAL_CODE = 0;
        
        global.STAT_MODE = 1;
        
        break;
        
    case "LOCAL_JINN":
        global.NETWORK = "LOCAL-JINN";
        global.LOCAL_RUN = 1;
        global.JINN_MODE = 1;
        global.TEST_JINN = 1;
        
        global.CONSENSUS_PERIOD_TIME = 3000;
        
        global.RESYNC_CONDITION = 0;
        global.REST_BLOCK_SCALE = 100;
        global.PERIOD_ACCOUNT_HASH = 10;
        global.START_BLOCK_ACCOUNT_HASH = 1;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_MINING = 60;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 10;
        
        global.TEST_TRANSACTION_GENERATE = 0;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.ALL_VIEW_ROWS = 1;
        
        global.NEW_SIGN_TIME = 0;
        
        global.START_BAD_ACCOUNT_CONTROL = 0;
        global.BLOCKNUM_TICKET_ALGO = 0;
        global.MIN_POWER_POW_TR = 0;
        global.AUTO_CORRECT_TIME = 0;
        global.CHECK_GLOBAL_TIME = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.UPDATE_CODE_5 = 0;
        global.UPDATE_CODE_6 = 0;
        global.UPDATE_CODE_7 = 0;
        global.EXPERIMENTAL_CODE = 0;
        
        global.UPDATE_CODE_JINN = 0;
        global.UPDATE_CODE_JINN_KTERA = global.UPDATE_CODE_JINN;
        global.NEW_FORMULA_JINN_KTERA = 3 * 3;
        
        global.UPDATE_CODE_SHARDING = 100;
        
        break;
        
    case "MAIN_JINN":
        global.JINN_MODE = 1;
    case "MAIN":
        global.NETWORK = "MAIN-JINN";
        var NewStartNum = 63510000;
        global.UPDATE_CODE_JINN = NewStartNum;
        global.UPDATE_CODE_JINN_KTERA = NewStartNum;
        global.UPDATE_CODE_6 = NewStartNum;
        global.NEW_FORMULA_JINN_KTERA = 3 * 3;
        
        global.CONSENSUS_PERIOD_TIME = 3000;
        var StartSec = 1530446400;
        global.START_NETWORK_DATE = 1000 * (StartSec - NewStartNum * 2);
        
        break;
        
    default:
}
