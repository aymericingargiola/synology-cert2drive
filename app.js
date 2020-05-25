const fs = require('fs');
const path = require("path");
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const CronJob = require('cron').CronJob;
const ncp = promisify(require('ncp').ncp);
const config = require('./config.json');
const globalFunctions = require('./global-functions');
const tempFolder = path.normalize(__dirname + "/temp");
const tempFolderArchive = path.normalize(tempFolder + "/_archive");
let settings, domains;

async function getDomainsFolder() {
    let domain; var domainsArray = [];
    const getDirectories = fs.readdirSync(tempFolderArchive).filter(folder => fs.statSync(path.join(tempFolderArchive, folder)).isDirectory());
    await globalFunctions.asyncForEach(getDirectories, async (folder) => {
        try {
            domain = await readFileAsync(`${tempFolderArchive}\\${folder}\\renew.json`, 'utf8');
            domain = JSON.parse(domain);
            domain = domain.domains;
        }
        catch (err) {
            domain = "synology";
        }
        domainsArray.push({ domain: domain, folder: folder });
    });
    console.log(domainsArray);
    return domains = domainsArray;
}

async function updateCert(dest) {
    console.time(`Updated`);
    const domainChecker = domains.filter(domain => domain.domain === dest.domain);
    if (domainChecker.length != 0) {
        const domainFolder = domainChecker[0].folder;
        console.log(`Copy certificates from ${dest.domain} (${domainFolder}) to -> ${dest.destination}`);
        await ncp(`${tempFolderArchive}\\${domainFolder}`, dest.destination);
        return console.timeEnd(`Updated`);
    } else {
        return console.log(`Can't find certificate for domain -> '${dest.domain}'`);
    }
}

function updateCertJob() {
    var thisUpdateCertJob = new CronJob('*/10 * * * * *', async function () {
        console.log("\n### Start")
        console.time("\nTask time");
        if (!fs.existsSync(tempFolder)) {
            fs.mkdirSync(tempFolder);
        } else if (fs.readdirSync(tempFolder).length != 0) {
            console.log("\nClean temp folder");
            await globalFunctions.cleanFolder(tempFolder);
        }
        console.time("\nGet certificates from synology");
        await globalFunctions.execShellCommand(`scp -P ${settings.port} -i ${settings.privateKey} -r ${settings.username}@${settings.host}:/usr/syno/etc/certificate/_archive/ ${tempFolder}`);
        console.timeEnd("\nGet certificates from synology");
        console.group("\nSynology domains found :");
        await getDomainsFolder();
        console.groupEnd("Synology domains found :");
        console.group("\nUpdate certificates :");
        await globalFunctions.asyncForEach(settings.certDestinations, async (dest, index) => {
            await globalFunctions.cleanFolder(dest.destination);
            await updateCert(dest, index);
        });
        console.groupEnd("Update certificates :");
        console.log("\nClean temp folder");
        await globalFunctions.cleanFolder(tempFolder);
        console.timeEnd("\nTask time");
        console.log("\n### End")
    }, null, true, 'Europe/Paris');
    thisUpdateCertJob.start();
}



async function init() {
    return settings = {
        host: config.synologySettings.host != "" ? config.synologySettings.host : await globalFunctions.missingSetting("input", "hostname", "Host name"),
        port: config.synologySettings.port != "" ? config.synologySettings.port : await globalFunctions.missingSetting("input", "port", "port"),
        username: config.synologySettings.username != "" ? config.synologySettings.username : await globalFunctions.missingSetting("input", "username", "User name"),
        privateKey: config.sshSettings.privateKey != "" ? config.sshSettings.privateKey : await globalFunctions.missingSetting("input", "privatekey", "Private Key path"),
        certFolders: config.synologySettings.certFolders != "" ? config.synologySettings.certFolders : await globalFunctions.missingSetting("input", "certpath", "Certification folder name on Synology"),
        certDestinations: config.synologySettings.certDestinations != "" ? config.synologySettings.certDestinations.filter(dest => dest.destination.indexOf(".") === 0).length > 0 ? globalFunctions.processPath(config.synologySettings.certDestinations) : config.synologySettings.certDestinations : await globalFunctions.missingSetting("input", "certpath", "Certification destination path"),
    }
}

init().then(updateCertJob());