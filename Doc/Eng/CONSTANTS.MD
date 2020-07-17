Description of constants:
````javascript
{
  //IDENTIFICATION OF GLOBAL NETWORK TIME OF TERA
  "AUTO_COORECT_TIME": 1,               //a sign the auto correction time according to network time Tera - must be activated
  "DELTA_CURRENT_TIME": 12345,          //time deviation relative to Tera network (set automatically if auto-correction is enabled)


  //IDENTIFICATION OF NODES
  "COMMON_KEY": "TRUST-CLUSTER",        //the total key for the trusted nodes (the nodes not to ban each other)
  "NODES_NAME": "Node001",              //the name of the trusted node that appears on the NETWORK page
  "SERVER_PRIVATE_KEY_HEX": "222222222222222222222222222222222222222222222",//private key of the node, which is used to set the node address
  "USE_NET_FOR_SERVER_ADDRES": 1,       //indicates whether to add information from the mac address to the node address. Useful when copying nodes - no need to manually change private nodes

  //DIRECT CONNECTION
  "NET_WORK_MODE": {
    "ip": "",                          //the IP address of the node, if not specified, is determined automatically
    "port": 30000,                     //port
    "UseDirectIP": true                //indication of direct connection, if not specified, then the gray ip mode is enabled without the possibility of mining
  },


  //STATISTICS
  "STAT_MODE": 1,                      //enable statistics-see Counters, Monitor pages
  "MAX_STAT_PERIOD": 3600,             //statistics period


  //HTTP access to the wallet and control Noda
  "HTTP_PORT_NUMBER": 8000,            //http access port
  "HTTP_PORT_PASSWORD": "SecretWord",  //password
  "HTTP_IP_CONNECT": "123.111.222.233, 123.11.22.223", //enable IP address filter for remote management (wallet) over http
  "WALLET_NAME": "=Node1=",            //the name of the wallet displayed on the tab in the browser

  //Information display
  "COUNT_VIEW_ROWS": 20,               //number of rows per page - displayed in all tables with pagination
  "ALL_VIEW_ROWS": 1,                  //view all rows of blockchain tables, even if they are blacklisted (for example, accounts created by hackers or DAPs misleading)
  "ALL_LOG_TO_CLIENT": 1,              //displaying the node log in the wallet

  //MINING:
  "USE_MINING": true,                  //enable mining
  "MINING_START_TIME": "6:30",         //mining start time during the day in the format hh:mm: ss time in UTC (mining must be enabled by the constant USE_MINING), if the value is not set then mining is performed all the time
  "MINING_PERIOD_TIME": "16:30",       //the period of mining since the beginning of the format hh: mm:ss
  "POW_MAX_PERCENT": "70",             //max CPU usage as a percentage of each mining process
  "COUNT_MINING_CPU": 0,               //number of processes to run during mining
  "SIZE_MINING_MEMORY": 20000000,      //the total number of memory allocated for mining on all processes (in bytes)
  "POW_RUN_COUNT": 5000,               //the number of hashes (hash1, hash2) calculated at each mining iteration in each process (each iteration is started once in 1 MS - but within this second the POW_MAX_PERCENT parameter is taken)


  //ETC
  "USE_AUTO_UPDATE": 1,                //using online auto-updates
  "RESTART_PERIOD_SEC": 0,             //auto restart nodes after a specified period in seconds
  "MAX_GRAY_CONNECTIONS_TO_SERVER": 10,//the number of servers to which the node connects in gray ip mode
  "TRANSACTION_PROOF_COUNT": 2000000,  //number of transactions stored in the database to be able to roll back the chain

  //WATCHDOG
  "WATCHDOG_BADACCOUNT": 1,            //watching for errors of the type "BAD ACCOUNT"

  "RESYNC_CONDITION": {                //if the last 10 blocks are created by their own node, then their POW should not differ more than 10 times from the previous blocks, otherwise the forced synchronization of the blockchain with the network is started. 
    "OWN_BLOCKS": 10,
    "K_POW": 10
   },    				

  "REST_START_COUNT": 100000,          //The number of blocks that must be checked when loading from the end of the blockchain. If the value is not set, the download mode from the end of the blockchain is not activated
}
````
