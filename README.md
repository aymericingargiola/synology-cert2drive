# synology-cert2drive
Small node.js script for fun, get the let's encrypt certificates from your Synology to specified paths for running an app with https on same specified domain.

Tested on windows, but since i use **scp** you need to install **Windows Subsystem for Linux (WSL)**. 
Also you need create an SSH Key without password to communicate with your Synology (so the cron task can work).
