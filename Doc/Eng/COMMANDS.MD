Relationship between command-line parameters and constants (global variables):

````javascript
HTTPPORT:<value>
global.HTTP_PORT_NUMBER=<value>

PASSWORD:<value>
global.HTTP_PORT_PASSWORD=<value>

PATH:<value>
global.DATA_PATH=<value>

PORT:<value>
global.START_PORT_NUMBER=<value>


IP:<value>
global.START_IP=<value>


LISTEN:<value>
global.LISTEN_IP=<value>


HOSTING:<value>
global.HTTP_HOSTING_PORT=<value>

STARTNETWORK:
global.START_NETWORK_DATE=<value>


CREATEONSTART
global.CREATE_ON_START=true;
            
LOCALRUN
global.LOCAL_RUN=1;

TESTRUN
global.TEST_NETWORK=1;

NOLOCALRUN
global.LOCAL_RUN=0;
            

NOAUTOUPDATE
global.USE_AUTO_UPDATE=0;

NOPARAMJS
global.USE_PARAM_JS=0;

DEV_MODE
global.DEV_MODE=1;

API_V2
global.USE_HARD_API_V2=1;

````



Example use:
```
node set port:30010 httpport:8080 password:TeraTowardsTheMoon
```
