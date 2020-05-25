const fs = require('fs');
const path = require("path");
const { promisify } = require('util');
const execute = require('child_process');
const inquirer = require('inquirer');
const rmdir = require('rimraf');
const projectPath = __dirname;
module.exports = {
    execShellCommand: function (cmd) {
        return new Promise((resolve, reject) => {
            execute.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.warn(error);
                }
                resolve(stdout ? stdout : stderr);
            });
        });
    },
    asyncForEach: async function (array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    },
    cleanFolder: async function (folder) {
        fs.readdir(folder, (err, files) => {
            if (err) throw err;
            for (const file of files) {
                fs.lstat(folder + "\/" + file, (err, stats) => {
                    if (err) {
                        return err;
                    }
                    if (stats.isDirectory()) {
                        rmdir(folder + "\/" + file, function (error) { return error });
                    }
                    else if (stats.isFile()) {
                        fs.unlink(path.join(folder, file), err => {
                            if (err) throw err;
                        });
                    }
                });
            }
        });
    },
    processPath: function (paths) {
        var array = [];
        var correctPath;
        paths.forEach(function (thisPath) {
            if (thisPath.destination.indexOf(".") === 0) {
                correctPath = thisPath.destination.replace('.', projectPath.toString());
            } else {
                correctPath = thisPath.destination;
            }
            const destination = {
                domain: thisPath.domain,
                destination: path.normalize(correctPath)
            }
            array.push(destination);
        });
        return array;
    },
    missingSetting: async function (type, name, message, defaultValue) {
        const prompt = await inquirer.prompt([
            {
                type: type,
                name: name,
                message: message,
                default: defaultValue ? defaultValue : undefined
            }
        ]);
        return prompt[name];
    }
}