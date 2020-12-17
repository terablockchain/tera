Description of constants (from version 2360):

````javascript
{
  //IP-PROTOCOL
  "IP_VERSION": 4,                      //version of ip Protocol, valid values are 4 or 6
  "JINN_IP": "10.20.30.40",             //the public IP address of the node, if not specified, is determined automatically
  "JINN_PORT": 30000,                   //port
  "AUTODETECT_IP": 0,                   //ip address detection mode (i.e., the value of the JINN_IP constant is reset at startup)
  "CLIENT_MODE": 0                      //mode works only in client mode without a possibility to accept incoming connections


  //CLUSTERS
  "COMMON_KEY": "Secret1",              //the total key for the trusted nodes (the nodes not to ban each other)
  "NODES_NAME": "Node001",              //the name of the trusted node that appears on the NETWORK page
  "CLUSTER_HOT_ONLY",                   //enable communication only with the nodes of the cluster



  //STATISTICS
  "STAT_MODE": 1,                      //enable statistics-see Counters, Monitor pages
  "MAX_STAT_PERIOD": 600,              //statistics period

  //Informations display
  "LOG_LEVEL":2,                       //logging details, the higher the number, the more messages
  "COUNT_VIEW_ROWS": 20,               //number of rows per page - displayed in all tables with pagination
  "ALL_VIEW_ROWS": 1,                  //view all rows of blockchain tables, even if they are blacklisted (for example, DAPs misleading)
  "START_HISTORY": 16,                 //the account number from which the transaction history is recorded
  "SUM_PRECISION":9,                   //accuracy of visual display of accounts amount (acceptable values from 0 to 9)


  //HTTP access to the full-nodes wallet
  "HTTP_PORT_NUMBER": 8000,            //http access port
  "HTTP_PORT_PASSWORD": "SecretWord",  //password
  "HTTP_IP_CONNECT": "123.111.222.233, 123.11.22.223", //enable IP address filter for remote access
  "WALLET_NAME": "=Node1=",            //the name of the wallet displayed on the tab in the browser


  //MINING:
  "USE_MINING": true,                  //enable mining
  "MINING_ACCOUNT": 0,                 //number of the account that receives the reward for the found block
  "MINING_START_TIME": "6:30",         //mining start time during the day in the format hh:mm: ss time in UTC (mining must be enabled by the constant USE_MINING), if the value is not set then mining is performed all the time
  "MINING_PERIOD_TIME": "16:30",       //the period of mining since the beginning of the format hh: mm:ss
  "POW_MAX_PERCENT": "70",             //max CPU usage as a percentage of each mining process
  "COUNT_MINING_CPU": 0,               //number of processes to run during mining
  "SIZE_MINING_MEMORY": 20000000,      //the total number of memory allocated for mining on all processes (in bytes)
  "POW_RUN_COUNT": 5000,               //the number of hashes (hash1, hash2) calculated at each mining iteration in each process (each iteration is started once in 1 MS - but within this second the POW_MAX_PERCENT parameter is taken)



  //HTTP access to the light node, API1 and API2
  "USE_API_WALLET": 1,                 //enabling light (web) client support
  "USE_API_V1": 1,                     //enabling API1
  "MAX_TX_FROM_WEB_IP": 20,            //limit the number of tx (every 10 minutes)
  "USE_HARD_API_V2": 0,                //enabling API2 node support is not recommended for public access
  //Protocol 
  "HTTP_HOSTING_PORT": 80, 	           // web port number, when setting port 443, the https Protocol is enabled and therefore you need to set the parameters below (HTTPS_HOSTING_DOMAIN and HTTPS_HOSTING_EMAIL) 
  "HTTPS_HOSTING_DOMAIN": "",          //domain name (required for the certificate to work) 
  "HTTPS_HOSTING_EMAIL":"", 	       //email address of the domain owner (required for automatic certificate receipt) 
  //Other parameters
  "HTTP_MAX_COUNT_ROWS": 20,           //limit on the number of rows of data requests
  "HTTP_START_PAGE": "",               //home page (default web wallet)
  "HTTP_CACHE_LONG": 10000,            //page cache time (sec)
  "HTTP_USE_ZIP": 0,                   //using the page archiving
  "WEB_LOG": 0,                        //enabling logging



  //ETC
  "USE_AUTO_UPDATE": 1,                //using online auto-updates
  "JINN_MAX_MEMORY_USE": 400,          //memory limit that is used for the blockchain database cache in MB
  "RESTART_PERIOD_SEC": 0,             //auto restart nodes after a specified period in seconds
  "NOT_RUN": 0,                        //disabling the node
  "DELTA_CURRENT_TIME": -50,           //time deviation relative to Tera network (set automatically)
  "LOG_LEVEL":2,                       //logging details, the higher the number, the more messages


}
````

## Note:
* Constants are stored in JSON format
* In logical constants, such as enabling or disabling something, we recommend using the number 0 or 1
* Any constant can be changed from the command line as follows (run inside the ~/wallet/Source directory):
    ```
    node set NAME=Value
    ```
* Some constants (such as the node port number) are only used when the node starts, so they need to be restarted to apply them


