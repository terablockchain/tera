# TERA PLATFORM


This is a public blockchain whose main feature is true decentralization through the use of pow consensus and very high performance.


* To learn more about this project, we recommend reading the review article: [Decentralized applications on TERA platform](https://medium.com/@evkara777/decentralized-applications-on-tera-platform-2aa56b597ae9)
* The current Tera 2.0 Protocol is based on the new JINN library
* The following describes how to install it on your device
* Starting from version 2450 you can use sharding, see more details in the discord on the #sharding channel https://discord.gg/Jm9TgkXHTU


## Light-wallet (web-version)
https://terawallet.org
* Note: the light wallet has a decentralized core - i.e. it works with all available nodes in the network


## Installing light wallet from setup on Windows:
* https://gitlab.com/terafoundation/terarun/raw/master/Bin/Light/tera_light_setup.exe
* [Light client (zip)](https://gitlab.com/terafoundation/terarun/raw/master/Bin/Light/Tera-light.zip)

## Mobile wallet apk-file for Android:
* https://gitlab.com/terafoundation/terarun/raw/master/Bin/Mobile/app-release.apk



~~## Installing full node from setup on Windows:~~
~~https://gitlab.com/terafoundation/terarun/raw/master/Bin/Full/tera_full_setup.exe~~


## Installing full node from source code by steps:

Attention:
* After the installation shown below, enter the address your server in the browser. Example: 12.34.56.78:8080
* We recommend putting an additional password on the private key ("Set password" button) - in this case the private key will be stored in file in encrypted form.
* We recommend not storing private keys on remote servers.
* If you do not specify the http password for full-node, you can only access from the local address 127.0.0.1:8080 and only within 10 minutes after the launch of the node
* For remote access to the node only from the specified computer (white IP) set the HTTP_IP_CONNECT constant (for example: "HTTP_IP_CONNECT": "122.22.33.11")
* When installing, pay attention to the **secp256k1** cryptographic library. There should be no errors when compiling it (with command: npm install)
* If you have the auto-update constant enabled ("USE_AUTO_UPDATE": 1), the update is performed automatically. If off, then you need to load it manually and restart the node (see section below).




## Installing on Windows:

1. Download and install Nodejs https://nodejs.org
2. Download and install git https://git-scm.com/download/win
3. Then run the commands (in program: cmd or PowerShell):

```
cd ..\..\..\
git clone https://gitlab.com/terafoundation/tera2.git wallet
npm install --global --production windows-build-tools
npm install -g node-gyp
cd wallet/Source
npm install
node set httpport:8080 password:password_no_spaces
run-node.bat

```
Before starting the node, we recommend downloading a backup of the blockchain (zip file) at the link https://terawallet.org/files/jinn-db.zip
Unpack the archive and put the DB folder in the wallet's DATA folder (with full replacement).
Launch the node with the command:
```
run-node.bat
```

If you want to run the wallet as a background process, then instead of the last command (run-node.bat), do the following:
```
npm install pm2 -g
pm2 start run-node.js
```

### Opening ports:
```
netsh advfirewall firewall add rule name="Open 30000 port" protocol=TCP localport=30000 action=allow dir=IN
```




## Installation on Linux 


### UBUNTU 18.04/20.04:

```
sudo apt-get update
apt-get install unzip
apt-get install -y git
apt-get install -y nodejs
apt-get install -y npm
npm install pm2 -g
git clone https://gitlab.com/terafoundation/tera2.git wallet
apt -y install build-essential
apt group install "Development Tools"
cd ~/wallet/Source
npm install
node set httpport:8080 password:password_no_spaces
```

### open ports:

```
sudo ufw allow 30000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 80/tcp
```


### start node:
Before starting the node, we recommend downloading and installing a backup of the blockchain (zip file), run it:
```
cd ~/wallet/DATA
wget https://terawallet.org/files/jinn-db.zip
rm -r DB
unzip -o jinn-db.zip
```

Then launch the node with the command:
```
cd ~/wallet/Source
pm2 start run-node.js
```


### CentOS 7:


```
yum install install unzip
yum install -y git
curl --silent --location https://rpm.nodesource.com/setup_8.x | sudo bash -
yum  install -y nodejs
yum install gcc gcc-c++
npm install pm2 -g
git clone https://gitlab.com/terafoundation/tera2.git wallet
cd ~/wallet/Source
npm install
node set httpport:8080 password:password_no_spaces
```

### open ports (all):
```
systemctl stop firewalld 
systemctl disable firewalld
```

### start node:
Before starting the node, we recommend downloading and installing a backup of the blockchain (zip file), run it:
```
cd ~/wallet/DATA
wget https://terawallet.org/files/jinn-db.zip
unzip -o jinn-db.zip

```

Then launch the node with the command:
```
cd ~/wallet/Source
pm2 start run-node.js
```


## Updates

```
cd ~/wallet/Source
node update.js
```


## MAIN NETWORK
Default values:
```
port:30000
httpport:8080
```



## TEST NETWORK
Default values:
```
port:33000
httpport:8800
```
Launch: 
```
cd ~/wallet
cp -a Source SourceJinn
cd SourceJinn
node set-jinn httpport:8800 password:password_no_spaces
pm2 start run-jinn.js
```




## Specification

* Name: TERA
* Consensus: PoW
* Algorithm:  Terahash (sha3 + Optimize RAM hashing)
* Total suplay: 1 Bln
* Reward for block: about 3 TERA (one billionth of the remainder of undistributed amount of coins (account 0) multiplied  by 9)
* Block size 350 KB
* Premine: 5%
* Development fund: 1% of the mining amount
* Block generation time: 3 second
* Block confirmation time: 10 seconds
* Speed: 1000 transactions per second
* Commission: free of charge 
* Cryptography: sha3, secp256k1
* Platform: Node.JS


# NOTE

* A public ip address is recommended for starting a node
* Check the firewall (port must open on the computer)



## Refs:
* Web: https://terafoundation.org
* Btt: https://bitcointalk.org/index.php?topic=4573801.0
* Telegram: https://t.me/terafoundation
* Discord: https://discord.gg/CvwrbeG
* [White Paper](https://docs.google.com/document/d/1EaqFg1ncIxsrNE2M9xJOSzQu8z3ANwMuNyTX0z_A1ow/edit?usp=sharing)
* [DApp Paper](https://docs.google.com/document/d/1PXVBbMKdpsAKPkO9UNB5B-LMwIDjylWoHvAAzzrXjvU/edit?usp=sharing)
* [New futures1](https://gitlab.com/terafoundation/tera2/-/blob/master/Doc/Eng/release2468.md)
* [New futures2](https://gitlab.com/terafoundation/tera2/-/blob/master/Doc/Eng/release2600.md)
* [API](https://gitlab.com/terafoundation/tera/blob/master/Doc/Eng/API.md)
* [API-2 for Exchanges](https://gitlab.com/terafoundation/tera/blob/master/Doc/Eng/API2.md)
* [CONSTANTS](https://gitlab.com/terafoundation/tera/blob/master/Doc/Eng/CONSTANTS.MD)
* [DEX-guide](https://docs.google.com/document/d/1qvVRfLq3qcYYF6dcsAAAqoGyBFF4njXUYZXZfTPWd2w/edit?usp=sharing)
* [BTC for DEX](https://docs.google.com/document/d/19vRY6tkbTP8tubZxM01llwnMyz4P6IzY0zvnargrU6k/edit?usp=sharing)
* [DApps repo](https://gitlab.com/terafoundation/dapps)




## Blockchain:
* [WEB-Wallet](https://terawallet.org)
* [Explorer](https://teraexplorer.org)


## Articles:
* [Decentralized applications on TERA platform](https://medium.com/@evkara777/decentralized-applications-on-tera-platform-2aa56b597ae9)
* [How does TERA platform work](https://medium.com/@Blockchainize1/how-does-tera-platform-work-cbfbeefdfc12)
* [More articles...](https://terafoundation.org/blog/)



## Chinese
* [Mining guide (chinese PDF)](https://gitlab.com/terafoundation/tera/raw/master/Doc/Chinese/Mining.pdf?inline=false)
* [Tera White Paper (chinese PDF)](https://gitlab.com/terafoundation/tera/raw/master/Doc/Chinese/WP_chinese.pdf?inline=false)
* [Decentralized applications on TERA platform - Chinese](https://medium.com/@Blockchainize1/tera%E5%B9%B3%E5%8F%B0%E4%B8%8A%E7%9A%84%E5%8E%BB%E4%B8%AD%E5%BF%83%E5%8C%96%E5%BA%94%E7%94%A8-590f7663ecaf)


## RUS
 [Эта же страница на русском](https://gitlab.com/terafoundation/tera2/-/tree/master/Doc/Rus)

