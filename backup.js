'use strict';

/**
 * @author Błażej Wolańczyk <https://github.com/Junikorn>
 * @name soupBackup
 * @version 1.0.0
 *
 * CMD tool for backing up available soup.io assets taken from soup RSS feed
 * You can find RSS feed on soup.io in options > privacy > export (RSS)
 * If the RSS file won't download at first time (e.g. showing 504 Gateway Timeout) please retry
 *
 * How to run:
 *  - install node.js (http://nodejs.org) at least at version 4.4.3
 *  - open CMD/bash in this directory (on Windows: Shift + Right Click > Open Command Line Here)
 *  - write in command "node backup"
 *  - [optionally] after space write in file name if it is different from "soup.rss" (or rename your file)
 *  - [optionally] after space write in number of simultaneous downloads 
 *      (default is 20, please keep it within reason, your bandwidth, file system and processor are the limit)
 *
 * @license
 * The MIT License (MIT)
 * Copyright (c) 2016 Błażej Wolańczyk
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

console.log('Soup Backup by Błażej Wolańczyk (c) 2016');

var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    backupPath = __dirname + '/backup/',
    feedPath = __dirname + '/' + (process.argv[2] || 'soup.rss'),
    concurrent = process.argv[3] ? +process.argv[3] : 20,
    downloaded = 0,
    available = 0,
    total = 0;

install()
    .then(checkWriteSpace)
    .then(readFeed)
    .then((items) => {
        total = items.length;
        console.log(new Date().toLocaleTimeString(), total, 'entries to process');
        return items;
    }).then(initConcurrent);

function install(){
    return new Promise(resolve => {
        fs.access(__dirname + '/node_modules', fs.R_OK, err => {
            if(err){
                console.log(new Date().toLocaleTimeString(), 'installing dependencies');
                require('child_process').exec('npm install xml2js@0.4.16', err => {
                    if(err) throw err;
                    resolve();
                });
            }else{
                resolve();
            }
        });
    });
}

function checkWriteSpace(){
    return new Promise(resolve => {
        fs.access(backupPath, fs.R_OK, err => {
            if(err && err.code === 'ENOENT'){
                console.log(new Date().toLocaleTimeString(), 'creating backup directory');
                fs.mkdir(backupPath, err => {
                    if(err) throw err;
                    resolve();
                });
            }else if(err) {
                throw err;
            }else{
                resolve();
            }
        });
    });
}

function readFeed(){
    return new Promise(resolve => {
        fs.readFile(feedPath, function (err, data) {
            if(err){
                if(err.code === 'ENOENT'){
                    console.log(new Date().toLocaleTimeString(), 'no feed found at path', feedPath);
                }
                throw err;
            }
            new require('xml2js').Parser({
                explicitArray: false
            }).parseString(data, (err, result) => {
                if (err) throw err;
                resolve(result.rss.channel.item);
            });
        });
    });
}

function initConcurrent(items){
    for(var i =0; i < concurrent; i++){
        processEntry(items);
    }
}

function processEntry(items){
    if(items.length && items.length % 100 === 0){
        console.log(new Date().toLocaleTimeString(), items.length, 'entries left');
    }
    var item = items.shift();
    if(item){
        downloadEntry(item)
            .then(() => processEntry(items));
    }else{
        exit();
    }
}

function downloadEntry(item){
    return new Promise(resolve => {
        if(item.enclosure){
            available++;
            var url = item.enclosure.$.url,
                filePath = backupPath + path.basename(url);
            fs.access(filePath, fs.R_OK, err => {
                if(err && err.code === 'ENOENT'){
                    var file = fs.createWriteStream(filePath);
                    http.get(url, response => {
                        response.pipe(file);
                        response.on('end', () => {
                            downloaded++;
                            resolve();
                        });
                    }).on('error', err => {
                        console.error(new Date().toLocaleTimeString(), err);
                        resolve();
                    });
                }else{
                    resolve();
                }
            });
        }else{
            resolve();
        }
    });
}

function exit(){
    console.log(new Date().toLocaleTimeString(), 'processed', total, 'entries');
    console.log(new Date().toLocaleTimeString(), 'found', available, 'available assets');
    console.log(new Date().toLocaleTimeString(), 'downloaded', downloaded, 'new assets');
    process.exit();
}