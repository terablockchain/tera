/*
 * @project: TERA, @copyright: Yuriy Ivanov (Vtools) 2017-2021 [progr76@gmail.com]
*/

"use strict";

//example run in dev mode:  start-node MODE:DEV_JINN PATH:<BlockchainDataPath>


switch(global.MODE_RUN)
{
    case "DEV_JINN":
        global.JINN_MODE = 1;
        global.NETWORK = "LOCAL-JINN";
        global.SHARD_NAME = "TERA";
        global.LOCAL_RUN = 1;
        //global.START_NETWORK_DATE = 0; - auto search last block number from the database

        //small mining for creating blocks:
        global.CREATE_BLOCK_ON_RECEIVE=1;
        global.USE_MINING = 1;
        global.POW_MAX_PERCENT=5;
        global.COUNT_MINING_CPU = 1;
        global.SIZE_MINING_MEMORY = 65000;
        global.MINING_ACCOUNT=9;
        break;

    case "TEST_JINN":
        global.JINN_MODE = 1;
        global.NETWORK = "TEST-JINN";
        global.SHARD_NAME = "TEST";
        global.TEST_JINN = 1;
        global.TEST_NETWORK=1;

        global.START_NETWORK_DATE = 1593818071532;
        global.CONSENSUS_PERIOD_TIME = 3000;
        
        global.PERIOD_ACCOUNT_HASH = 10;
        global.START_BLOCK_ACCOUNT_HASH = 0;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_MINING = 30;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 10;
        
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3 * 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.NEW_SIGN_TIME = 0;
        
        global.START_BAD_ACCOUNT_CONTROL = 500000;
        global.BLOCKNUM_TICKET_ALGO = 0;
        
        global.UPDATE_CODE_JINN = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.UPDATE_CODE_5 = 0;
        global.UPDATE_CODE_6 = 0;
        global.UPDATE_CODE_7 = 0;

        global.UPDATE_CODE_NEW_ACCHASH = 1;
        
        global.STAT_MODE = 1;
        
        global.UPDATE_CODE_SHARDING = 3160000;
        
        global.TEST_MINING = 1;

        global.COIN_STORE_NUM=975;
        global.COIN_SMART_NUM=298;

        break;
        
    case "MAIN_JINN":
        global.JINN_MODE = 1;
        global.NETWORK = "MAIN-JINN";
        global.SHARD_NAME = "TERA";
        var NewStartNum = 63510000;
        global.UPDATE_CODE_JINN = NewStartNum;
        global.UPDATE_CODE_JINN_KTERA = NewStartNum;
        global.NEW_FORMULA_JINN_KTERA = 3 * 3;
        
        global.CONSENSUS_PERIOD_TIME = 3000;
        var StartSec = 1530446400;
        global.START_NETWORK_DATE = 1000 * (StartSec - NewStartNum * 2);
        
        global.PERIOD_ACCOUNT_HASH = 50;
        global.START_BLOCK_ACCOUNT_HASH = 14500000;
        global.START_BLOCK_ACCOUNT_HASH3 = 24015000;
        global.SMART_BLOCKNUM_START = 10000000;
        
        global.START_MINING = 2 * 1000 * 1000;
        global.REF_PERIOD_END = 30 * 1000 * 1000;
        global.REF_PERIOD_MINING = 1 * 1000 * 1000;
        global.MIN_POWER_POW_ACC_CREATE = 16;
        global.NEW_ACCOUNT_INCREMENT = 22305000;
        global.NEW_BLOCK_REWARD1 = 22500000;
        global.NEW_FORMULA_START = 32000000;
        global.NEW_FORMULA_KTERA = 3;
        global.NEW_FORMULA_TARGET1 = 43000000;
        global.NEW_FORMULA_TARGET2 = 45000000;
        global.NEW_SIGN_TIME = 25500000;
        global.START_BAD_ACCOUNT_CONTROL = 200000;
        global.BLOCKNUM_TICKET_ALGO = 16070000;
        
        global.UPDATE_CODE_1 = 36000000;
        global.UPDATE_CODE_2 = 40000000;
        global.UPDATE_CODE_3 = 43000000;
        global.UPDATE_CODE_4 = 57000000;
        global.UPDATE_CODE_5 = 60000000;
        global.UPDATE_CODE_6 = global.UPDATE_CODE_JINN;
        global.UPDATE_CODE_7 = 64000000;

        
        global.UPDATE_CODE_NEW_ACCHASH = 0;
        
        global.UPDATE_CODE_SHARDING = 68600000;

        global.COIN_STORE_NUM=231941;
        global.COIN_SMART_NUM=136;
        
        break;
        
    default:
        break;
}
